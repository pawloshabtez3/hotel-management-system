import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Query,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, RoomStatus } from '@prisma/client';
import { RoomsService } from './rooms.service';

const adminRoomStatusSchema = z.enum([
  'AVAILABLE',
  'RESERVED',
  'OCCUPIED',
  'UNAVAILABLE',
  'MAINTENANCE',
]);

const updateRoomStatusSchema = z.object({
  status: adminRoomStatusSchema,
});

const createRoomSchema = z.object({
  hotelId: z.string().uuid(),
  type: z.string().min(1),
  pricePerNight: z.coerce.number().positive(),
  status: adminRoomStatusSchema.optional(),
});

const updateRoomSchema = z.object({
  type: z.string().min(1).optional(),
  pricePerNight: z.coerce.number().positive().optional(),
  status: adminRoomStatusSchema.optional(),
});

function normalizeRoomStatus(status: z.infer<typeof adminRoomStatusSchema>): RoomStatus {
  if (status === 'MAINTENANCE') {
    return RoomStatus.UNAVAILABLE;
  }

  return status as RoomStatus;
}

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ROOM_ADMIN)
  async getAdminStats(@Req() req: Request, @Query('hotelId') hotelId?: string) {
    const user = (req as any).user as { id?: string } | undefined;
    if (!user?.id) {
      throw new BadRequestException('Missing user');
    }

    return this.roomsService.getAdminRoomStats(user.id, hotelId);
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ROOM_ADMIN)
  async getAdminRooms(@Req() req: Request, @Query('hotelId') hotelId?: string) {
    const user = (req as any).user as { id?: string } | undefined;
    if (!user?.id) {
      throw new BadRequestException('Missing user');
    }

    return this.roomsService.getAdminRooms(user.id, hotelId);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ROOM_ADMIN)
  async createRoom(@Req() req: Request, @Body() body: unknown) {
    const parsed = createRoomSchema.parse(body);
    const user = (req as any).user as { id?: string } | undefined;
    if (!user?.id) {
      throw new BadRequestException('Missing user');
    }

    return this.roomsService.createAdminRoom({
      adminId: user.id,
      hotelId: parsed.hotelId,
      type: parsed.type,
      pricePerNight: parsed.pricePerNight,
      status: normalizeRoomStatus(parsed.status ?? 'AVAILABLE'),
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ROOM_ADMIN)
  async updateRoom(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = updateRoomSchema.parse(body);
    const user = (req as any).user as { id?: string } | undefined;
    if (!user?.id) {
      throw new BadRequestException('Missing user');
    }

    return this.roomsService.updateAdminRoom({
      roomId: id,
      adminId: user.id,
      type: parsed.type,
      pricePerNight: parsed.pricePerNight,
      status: parsed.status ? normalizeRoomStatus(parsed.status) : undefined,
    });
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ROOM_ADMIN)
  async updateStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { status } = updateRoomStatusSchema.parse(body);
    const user = (req as any).user as { id?: string } | undefined;
    if (!user?.id) {
      throw new BadRequestException('Missing user');
    }

    return this.roomsService.updateRoomStatus({
      roomId: id,
      adminId: user.id,
      status: normalizeRoomStatus(status),
    });
  }
}
