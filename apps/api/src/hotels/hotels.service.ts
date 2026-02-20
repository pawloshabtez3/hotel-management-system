import { Injectable, NotFoundException } from '@nestjs/common';
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
          select: { pricePerNight: true, services: true },
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
      keyService:
        ((hotel.rooms[0]?.services as { breakfastIncluded?: boolean; tags?: string[] } | null)
          ?.breakfastIncluded ?? false)
          ? 'Breakfast included'
          : (hotel.rooms[0]?.services as { tags?: string[] } | null)?.tags?.[0] ??
            'Standard room services',
    }));

    await this.redis.set(cacheKey, JSON.stringify(payload), this.cacheTtlSeconds);
    return payload;
  }

  async getAdminSettings(adminId: string) {
    const hotel = await this.prisma.hotel.findFirst({
      where: { adminId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        country: true,
      },
    });

    if (!hotel) {
      return {
        hotel: null,
        roomTypes: [],
        allowPayLater: true,
      };
    }

    const [roomTypesRaw, allowPayLaterRaw] = await Promise.all([
      this.prisma.room.findMany({
        where: { hotelId: hotel.id },
        select: { type: true },
      }),
      this.redis.get(`hotel:settings:payLater:${hotel.id}`),
    ]);

    const roomTypes = Array.from(new Set(roomTypesRaw.map((room) => room.type))).sort();

    return {
      hotel,
      roomTypes,
      allowPayLater: allowPayLaterRaw ? allowPayLaterRaw === 'true' : true,
    };
  }

  async updateAdminSettings(
    adminId: string,
    input: {
      hotelName?: string;
      location?: string;
      city?: string;
      country?: string;
      roomTypes?: string[];
      allowPayLater?: boolean;
    },
  ) {
    const hotel = await this.prisma.hotel.findFirst({
      where: { adminId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!hotel) {
      throw new NotFoundException('No hotel found for this admin');
    }

    await this.prisma.hotel.update({
      where: { id: hotel.id },
      data: {
        ...(input.hotelName !== undefined ? { name: input.hotelName } : {}),
        ...(input.location !== undefined ? { address: input.location } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
      },
    });

    if (input.allowPayLater !== undefined) {
      await this.redis.set(
        `hotel:settings:payLater:${hotel.id}`,
        String(input.allowPayLater),
      );
    }

    if (input.roomTypes && input.roomTypes.length > 0) {
      const existingRooms = await this.prisma.room.findMany({
        where: { hotelId: hotel.id },
        select: { id: true, type: true },
        orderBy: { createdAt: 'asc' },
      });

      const uniqueTypes = Array.from(new Set(input.roomTypes.map((type) => type.trim()).filter(Boolean)));
      for (let index = 0; index < existingRooms.length; index += 1) {
        const nextType = uniqueTypes[index % uniqueTypes.length];
        if (nextType && existingRooms[index].type !== nextType) {
          await this.prisma.room.update({
            where: { id: existingRooms[index].id },
            data: { type: nextType },
          });
        }
      }
    }

    await this.redis.delByPrefix('hotels:detail:');
    await this.redis.delByPrefix('hotels:list:');

    return this.getAdminSettings(adminId);
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
