import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { z } from 'zod';

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
