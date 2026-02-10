import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  PaymentStatus,
  Prisma,
  RoomStatus,
} from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STRIPE_EVENT_TTL_SECONDS = 60 * 60 * 24;

@Injectable()
export class BookingsService {
  private readonly stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    this.stripe = secretKey
      ? new Stripe(secretKey, { apiVersion: '2024-06-20' })
      : null;
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
    return this.stripe;
  }

  async createBooking({
    userId,
    roomId,
    checkIn,
    checkOut,
  }: {
    userId: string;
    roomId: string;
    checkIn: Date;
    checkOut: Date;
  }) {
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid check-in/check-out dates');
    }

    if (checkOut <= checkIn) {
      throw new BadRequestException('checkOut must be after checkIn');
    }

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / MS_PER_DAY);
    if (nights <= 0) {
      throw new BadRequestException('Booking must be at least 1 night');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "Room" WHERE id = ${roomId} FOR UPDATE`;

      const room = await tx.room.findUnique({
        where: { id: roomId },
        select: { id: true, pricePerNight: true, status: true },
      });

      if (!room) {
        throw new NotFoundException('Room not found');
      }

      if (room.status !== RoomStatus.AVAILABLE) {
        throw new BadRequestException('Room is not available');
      }

      const overlapping = await tx.booking.findFirst({
        where: {
          roomId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          AND: [
            { checkIn: { lt: checkOut } },
            { checkOut: { gt: checkIn } },
          ],
        },
        select: { id: true },
      });

      if (overlapping) {
        throw new BadRequestException('Room is already booked for those dates');
      }

      const totalPrice = new Prisma.Decimal(room.pricePerNight).mul(nights);

      const booking = await tx.booking.create({
        data: {
          userId,
          roomId,
          checkIn,
          checkOut,
          totalPrice,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
        },
      });

      await tx.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.RESERVED },
      });

      return booking;
    });
  }

  async getUserBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        room: {
          select: {
            id: true,
            type: true,
            pricePerNight: true,
            hotel: {
              select: {
                id: true,
                name: true,
                city: true,
                country: true,
              },
            },
          },
        },
      },
    });
  }

  async createPaymentIntent({
    bookingId,
    userId,
  }: {
    bookingId: string;
    userId: string;
  }) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, userId },
      select: {
        id: true,
        totalPrice: true,
        paymentStatus: true,
        paymentIntentId: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Booking is already paid');
    }

    if (!booking.totalPrice) {
      throw new BadRequestException('Booking total price is missing');
    }

    const stripe = this.getStripe();
    const amount = Math.round(Number(booking.totalPrice) * 100);

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        bookingId: booking.id,
        userId,
      },
    });

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { paymentIntentId: intent.id },
    });

    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount,
      currency: 'usd',
    };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret is not configured');
    }

    const stripe = this.getStripe();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    const eventKey = `stripe:event:${event.id}`;

    const alreadyHandled = await this.redis.get(eventKey);
    if (alreadyHandled) {
      return { received: true, duplicate: true };
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const bookingId = paymentIntent.metadata?.bookingId;

      if (bookingId) {
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: BookingStatus.CONFIRMED,
            paymentIntentId: paymentIntent.id,
          },
        });
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const bookingId = paymentIntent.metadata?.bookingId;

      if (bookingId) {
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            paymentStatus: PaymentStatus.FAILED,
          },
        });
      }
    }

    await this.redis.set(eventKey, '1', STRIPE_EVENT_TTL_SECONDS);

    return { received: true };
  }
}
