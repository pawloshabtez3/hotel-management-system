import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HotelsService {
  private readonly cacheTtlSeconds = 20;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private listCacheKey(input: {
    city?: string;
    q?: string;
    limit: number;
    minPrice?: number;
    maxPrice?: number;
  }): string {
    return `hotels:list:${JSON.stringify(input)}`;
  }

  private detailCacheKey(input: {
    id: string;
    checkIn?: Date;
    checkOut?: Date;
  }): string {
    return `hotels:detail:${input.id}:${input.checkIn?.toISOString() ?? 'none'}:${input.checkOut?.toISOString() ?? 'none'}`;
  }

  async findAll({
    city,
    q,
    limit,
    minPrice,
    maxPrice,
  }: {
    city?: string;
    q?: string;
    limit: number;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const cacheKey = this.listCacheKey({ city, q, limit, minPrice, maxPrice });
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const and: Prisma.HotelWhereInput[] = [];

    if (city) {
      and.push({ city: { contains: city, mode: 'insensitive' } });
    }

    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { address: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { country: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Prisma.DecimalFilter = {};
      if (minPrice !== undefined) {
        priceFilter.gte = new Prisma.Decimal(String(minPrice));
      }
      if (maxPrice !== undefined) {
        priceFilter.lte = new Prisma.Decimal(String(maxPrice));
      }

      and.push({
        rooms: {
          some: {
            pricePerNight: priceFilter,
          },
        },
      });
    }

    const where: Prisma.HotelWhereInput = and.length > 0 ? { AND: and } : {};

    const hotels = await this.prisma.hotel.findMany({
      where,
      take: limit,
      include: {
        rooms: {
          select: { pricePerNight: true },
          orderBy: { pricePerNight: 'asc' },
          take: 1,
        },
      },
    });

    const payload = hotels.map((hotel) => ({
      id: hotel.id,
      name: hotel.name,
      rating: hotel.rating,
      city: hotel.city,
      country: hotel.country,
      startingPrice: hotel.rooms[0]?.pricePerNight || null,
    }));

    await this.redis.set(cacheKey, JSON.stringify(payload), this.cacheTtlSeconds);
    return payload;
  }

  async findOne({
    id,
    checkIn,
    checkOut,
  }: {
    id: string;
    checkIn?: Date;
    checkOut?: Date;
  }) {
    const cacheKey = this.detailCacheKey({ id, checkIn, checkOut });
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const includeRooms = {
      rooms: {
        where:
          checkIn && checkOut
            ? {
                bookings: {
                  none: {
                    status: {
                      in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
                    },
                    AND: [
                      { checkIn: { lt: checkOut } },
                      { checkOut: { gt: checkIn } },
                    ],
                  },
                },
              }
            : undefined,
        orderBy: { pricePerNight: 'asc' as const },
        select: {
          id: true,
          type: true,
          pricePerNight: true,
          services: true,
          status: true,
        },
      },
    };

    const payload = await this.prisma.hotel.findUnique({
      where: { id },
      include: includeRooms,
    });

    if (payload) {
      await this.redis.set(cacheKey, JSON.stringify(payload), this.cacheTtlSeconds);
    }

    return payload;
  }
}
