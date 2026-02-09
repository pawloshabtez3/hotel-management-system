import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HotelsService {
  constructor(private prisma: PrismaService) {}

  async findAll({ city, limit }: { city?: string; limit: number }) {
    const where = city ? { city: { contains: city, mode: 'insensitive' as const } } : {};
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

    return hotels.map((hotel) => ({
      id: hotel.id,
      name: hotel.name,
      rating: hotel.rating,
      city: hotel.city,
      country: hotel.country,
      startingPrice: hotel.rooms[0]?.pricePerNight || null,
    }));
  }
}
