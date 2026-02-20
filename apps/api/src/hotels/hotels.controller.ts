import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Body,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { HotelsService } from './hotels.service';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

const listQuerySchema = z
  .object({
    city: z.string().min(1).optional(),
    q: z.string().min(1).optional(),
    limit: z.coerce.number().int().positive().max(50).optional(),
    price: z.coerce.number().positive().optional(),
    minPrice: z.coerce.number().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
  })
  .passthrough();

const detailQuerySchema = z
  .object({
    checkIn: z.string().min(1).optional(),
    checkOut: z.string().min(1).optional(),
  })
  .passthrough();

const updateAdminSettingsSchema = z.object({
  hotelName: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  roomTypes: z.array(z.string().min(1)).optional(),
  allowPayLater: z.boolean().optional(),
});

@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get()
  async findAll(@Query() rawQuery: unknown) {
    const parsed = listQuerySchema.parse(rawQuery);

    const limit = parsed.limit ?? 10;
    const maxPrice = parsed.maxPrice ?? parsed.price;

    return this.hotelsService.findAll({
      city: parsed.city,
      q: parsed.q,
      limit,
      minPrice: parsed.minPrice,
      maxPrice,
    });
  }

  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ROOM_ADMIN)
  async getAdminSettings(@Req() req: Request) {
    const user = (req as any).user as { id?: string } | undefined;
    if (!user?.id) {
      throw new BadRequestException('Missing user');
    }

    return this.hotelsService.getAdminSettings(user.id);
  }

  @Put('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ROOM_ADMIN)
  async updateAdminSettings(@Req() req: Request, @Body() body: unknown) {
    const user = (req as any).user as { id?: string } | undefined;
    if (!user?.id) {
      throw new BadRequestException('Missing user');
    }

    const parsed = updateAdminSettingsSchema.parse(body);
    return this.hotelsService.updateAdminSettings(user.id, parsed);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query() rawQuery: unknown) {
    const parsed = detailQuerySchema.parse(rawQuery);

    const checkIn = parsed.checkIn ? new Date(parsed.checkIn) : null;
    const checkOut = parsed.checkOut ? new Date(parsed.checkOut) : null;

    if ((checkIn && isNaN(checkIn.getTime())) || (checkOut && isNaN(checkOut.getTime()))) {
      throw new BadRequestException('Invalid checkIn/checkOut');
    }

    if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
      throw new BadRequestException('Provide both checkIn and checkOut');
    }

    if (checkIn && checkOut && checkOut <= checkIn) {
      throw new BadRequestException('checkOut must be after checkIn');
    }

    const hotel = await this.hotelsService.findOne({
      id,
      checkIn: checkIn ?? undefined,
      checkOut: checkOut ?? undefined,
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    return hotel;
  }
}
