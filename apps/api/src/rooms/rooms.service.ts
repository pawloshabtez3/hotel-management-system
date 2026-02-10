import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsGateway } from '../realtime/rooms.gateway';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RoomsGateway,
  ) {}

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

    this.gateway.notifyRoomUpdate(updated.id, updated.status);

    return updated;
  }
}
