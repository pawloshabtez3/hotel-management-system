import {
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

  async getAdminRooms(adminId: string, hotelId?: string) {
    return this.prisma.room.findMany({
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
  }

  async getAdminRoomStats(adminId: string, hotelId?: string) {
    const rooms = await this.getAdminRooms(adminId, hotelId);

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

    return totals;
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
