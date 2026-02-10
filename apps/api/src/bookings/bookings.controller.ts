import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { BookingsService } from './bookings.service';

const createBookingSchema = z.object({
  roomId: z.string().uuid(),
  checkIn: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'checkIn must be a valid ISO date string',
  }),
  checkOut: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'checkOut must be a valid ISO date string',
  }),
});

@Controller()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('bookings')
  @HttpCode(201)
  async createBooking(@Req() req: Request, @Body() body: unknown) {
    const { roomId, checkIn, checkOut } = createBookingSchema.parse(body);
    const user = (req as any).user as { id: string } | undefined;
    if (!user?.id) {
      throw new BadRequestException('Missing user');
    }

    return this.bookingsService.createBooking({
      userId: user.id,
      roomId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookings')
  async getBookings(@Req() req: Request) {
    const user = (req as any).user as { id: string } | undefined;
    if (!user?.id) {
      throw new BadRequestException('Missing user');
    }

    return this.bookingsService.getUserBookings(user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ROOM_ADMIN)
  @Get('admin/bookings')
  async getAdminBookings(@Req() req: Request) {
    const user = (req as any).user as { id?: string } | undefined;
    if (!user?.id) {
      throw new BadRequestException('Missing user');
    }

    return this.bookingsService.getAdminBookings(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bookings/:id/pay')
  async createPaymentIntent(@Req() req: Request, @Param('id') id: string) {
    const user = (req as any).user as { id: string } | undefined;
    if (!user?.id) {
      throw new BadRequestException('Missing user');
    }

    return this.bookingsService.createPaymentIntent({
      bookingId: id,
      userId: user.id,
    });
  }

  @Post('webhooks/stripe')
  @HttpCode(200)
  async handleStripeWebhook(@Req() req: Request) {
    const rawBody = req.body as Buffer;
    return this.bookingsService.handleStripeWebhook(rawBody, 'stub');
  }
}
