import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsGateway } from '../realtime/rooms.gateway';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RoomsGateway,
    private readonly redis: RedisService,
  ) {}

  private async ensureAdminOwnsHotel(adminId: string, hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true, adminId: true },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    if (!hotel.adminId || hotel.adminId !== adminId) {
      throw new ForbiddenException('Not allowed to manage this hotel');
    }
  }

  async getAdminRooms(adminId: string, hotelId?: string) {
    const rooms = await this.prisma.room.findMany({
      where: {
        hotel: {
          adminId,
          ...(hotelId ? { id: hotelId } : {}),
        },
      },
      orderBy: [{ hotel: { name: 'asc' } }, { type: 'asc' }],
      select: {
        id: true,
        hotelId: true,
        type: true,
        status: true,
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
    });

    return rooms.map((room) => ({
      ...room,
      roomNumber: room.id.slice(0, 8).toUpperCase(),
    }));
  }

  async getAdminRoomStats(adminId: string, hotelId?: string) {
    const rooms = await this.getAdminRooms(adminId, hotelId);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const [todayCheckIns, todayCheckOuts] = await Promise.all([
      this.prisma.booking.count({
        where: {
          room: {
            hotel: {
              adminId,
              ...(hotelId ? { id: hotelId } : {}),
            },
          },
          checkIn: {
            gte: startOfToday,
            lt: endOfToday,
          },
        },
      }),
      this.prisma.booking.count({
        where: {
          room: {
            hotel: {
              adminId,
              ...(hotelId ? { id: hotelId } : {}),
            },
          },
          checkOut: {
            gte: startOfToday,
            lt: endOfToday,
          },
        },
      }),
    ]);

    const totals = {
      total: rooms.length,
      available: 0,
      reserved: 0,
      occupied: 0,
      unavailable: 0,
      occupancyRate: 0,
    };

    for (const room of rooms) {
      if (room.status === RoomStatus.AVAILABLE) totals.available += 1;
      if (room.status === RoomStatus.RESERVED) totals.reserved += 1;
      if (room.status === RoomStatus.OCCUPIED) totals.occupied += 1;
      if (room.status === RoomStatus.UNAVAILABLE) totals.unavailable += 1;
    }

    totals.occupancyRate =
      totals.total === 0
        ? 0
        : Number((((totals.reserved + totals.occupied) / totals.total) * 100).toFixed(1));

    return {
      ...totals,
      todayCheckIns,
      todayCheckOuts,
    };
  }

  async createAdminRoom({
    adminId,
    hotelId,
    type,
    pricePerNight,
    status,
  }: {
    adminId: string;
    hotelId: string;
    type: string;
    pricePerNight: number;
    status: RoomStatus;
  }) {
    if (pricePerNight <= 0) {
      throw new BadRequestException('pricePerNight must be positive');
    }

    await this.ensureAdminOwnsHotel(adminId, hotelId);

    const created = await this.prisma.room.create({
      data: {
        hotelId,
        type,
        pricePerNight,
        status,
      },
      select: {
        id: true,
        hotelId: true,
        type: true,
        status: true,
        pricePerNight: true,
      },
    });

    this.gateway.notifyRoomUpdate(created.id, created.status, created.hotelId);
    await this.redis.delByPrefix('hotels:detail:');
    await this.redis.delByPrefix('hotels:list:');

    return created;
  }

  async updateAdminRoom({
    roomId,
    adminId,
    type,
    pricePerNight,
    status,
  }: {
    roomId: string;
    adminId: string;
    type?: string;
    pricePerNight?: number;
    status?: RoomStatus;
  }) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        hotelId: true,
        hotel: {
          select: { adminId: true },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (!room.hotel?.adminId || room.hotel.adminId !== adminId) {
      throw new ForbiddenException('Not allowed to manage this room');
    }

    if (pricePerNight !== undefined && pricePerNight <= 0) {
      throw new BadRequestException('pricePerNight must be positive');
    }

    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: {
        ...(type !== undefined ? { type } : {}),
        ...(pricePerNight !== undefined ? { pricePerNight } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      select: {
        id: true,
        hotelId: true,
        type: true,
        status: true,
        pricePerNight: true,
      },
    });

    this.gateway.notifyRoomUpdate(updated.id, updated.status, updated.hotelId);
    await this.redis.delByPrefix('hotels:detail:');
    await this.redis.delByPrefix('hotels:list:');

    return updated;
  }

  async updateRoomStatus({
    roomId,
    adminId,
    status,
  }: {
    roomId: string;
    adminId: string;
    status: RoomStatus;
  }) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        hotel: {
          select: { adminId: true },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (!room.hotel?.adminId || room.hotel.adminId !== adminId) {
      throw new ForbiddenException('Not allowed to manage this room');
    }

    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: { status },
      select: { id: true, status: true, hotelId: true },
    });

    this.gateway.notifyRoomUpdate(updated.id, updated.status, updated.hotelId);
    await this.redis.delByPrefix('hotels:detail:');
    await this.redis.delByPrefix('hotels:list:');

    return updated;
  }
}
