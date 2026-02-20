import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  PaymentStatus,
  Prisma,
  RoomStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsGateway } from '../realtime/rooms.gateway';
import { RedisService } from '../redis/redis.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RoomsGateway,
    private readonly redis: RedisService,
  ) {}

  private async ensureAdminOwnsBooking(adminId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: {
          select: {
            id: true,
            hotel: { select: { adminId: true } },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!booking.room.hotel.adminId || booking.room.hotel.adminId !== adminId) {
      throw new ForbiddenException('Not allowed to manage this booking');
    }

    return booking;
  }

  private async maybeReleaseRoom(roomId: string) {
    const hasActiveBookings = await this.prisma.booking.findFirst({
      where: {
        roomId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
      select: { id: true },
    });

    if (!hasActiveBookings) {
      const room = await this.prisma.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.AVAILABLE },
        select: { id: true, status: true, hotelId: true },
      });
      this.gateway.notifyRoomUpdate(room.id, room.status, room.hotelId);
    }

    await this.redis.delByPrefix('hotels:detail:');
    await this.redis.delByPrefix('hotels:list:');
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

    const booking = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "Room" WHERE id = ${roomId} FOR UPDATE`;

      const room = await tx.room.findUnique({
        where: { id: roomId },
        select: { id: true, hotelId: true, pricePerNight: true, status: true },
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

    const roomForEvent = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, hotelId: true },
    });

    this.gateway.notifyRoomUpdate(roomId, RoomStatus.RESERVED, roomForEvent?.hotelId);
    await this.redis.delByPrefix('hotels:detail:');
    await this.redis.delByPrefix('hotels:list:');

    return booking;
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

  async getAdminBookings(adminId: string) {
    return this.prisma.booking.findMany({
      where: {
        room: {
          hotel: {
            adminId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        room: {
          select: {
            id: true,
            type: true,
            pricePerNight: true,
            status: true,
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
        user: {
          select: { id: true, email: true },
        },
      },
    });
  }

  async getAdminBookingById({
    adminId,
    bookingId,
  }: {
    adminId: string;
    bookingId: string;
  }) {
    await this.ensureAdminOwnsBooking(adminId, bookingId);

    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: {
          select: {
            id: true,
            type: true,
            status: true,
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
        user: { select: { id: true, email: true } },
      },
    });
  }

  async updateAdminBookingStatus({
    adminId,
    bookingId,
    status,
  }: {
    adminId: string;
    bookingId: string;
    status: BookingStatus;
  }) {
    const booking = await this.ensureAdminOwnsBooking(adminId, bookingId);

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });

    if (status === BookingStatus.CANCELLED) {
      await this.maybeReleaseRoom(booking.roomId);
    }

    return updated;
  }

  async checkInBooking({
    adminId,
    bookingId,
  }: {
    adminId: string;
    bookingId: string;
  }) {
    const booking = await this.ensureAdminOwnsBooking(adminId, bookingId);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot check in a cancelled booking');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
      select: { id: true, roomId: true, status: true },
    });

    const room = await this.prisma.room.update({
      where: { id: updated.roomId },
      data: { status: RoomStatus.OCCUPIED },
      select: { id: true, status: true, hotelId: true },
    });

    this.gateway.notifyRoomUpdate(room.id, room.status, room.hotelId);
    await this.redis.delByPrefix('hotels:detail:');
    await this.redis.delByPrefix('hotels:list:');

    return { booking: updated, room };
  }

  async checkOutBooking({
    adminId,
    bookingId,
  }: {
    adminId: string;
    bookingId: string;
  }) {
    const booking = await this.ensureAdminOwnsBooking(adminId, bookingId);

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
      select: { id: true, roomId: true, status: true },
    });

    const room = await this.prisma.room.update({
      where: { id: booking.roomId },
      data: { status: RoomStatus.AVAILABLE },
      select: { id: true, status: true, hotelId: true },
    });

    this.gateway.notifyRoomUpdate(room.id, room.status, room.hotelId);
    await this.redis.delByPrefix('hotels:detail:');
    await this.redis.delByPrefix('hotels:list:');

    return { booking: updated, room };
  }

  async deleteAdminBooking({
    adminId,
    bookingId,
  }: {
    adminId: string;
    bookingId: string;
  }) {
    const booking = await this.ensureAdminOwnsBooking(adminId, bookingId);

    await this.prisma.booking.delete({ where: { id: bookingId } });
    await this.maybeReleaseRoom(booking.roomId);

    return { ok: true, deletedId: bookingId };
  }

  async createPaymentStub({
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

    const paymentIntentId = `stub_${booking.id}`;
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { paymentIntentId },
    });

    return {
      clientSecret: 'stub_client_secret',
      paymentIntentId,
      amount: Math.round(Number(booking.totalPrice) * 100),
      currency: 'usd',
      stub: true,
      message: 'Payment is stubbed; replace with your gateway integration later.',
    };
  }

  async handlePaymentWebhookStub(_rawBody: Buffer, _signature: string) {
    return {
      received: true,
      stub: true,
      message: 'Payment webhook is stubbed; replace with your gateway integration later.',
    };
  }
}
