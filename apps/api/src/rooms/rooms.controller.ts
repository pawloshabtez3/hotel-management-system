import {
  BadRequestException,
  Body,
  Controller,
  Param,
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

const updateRoomStatusSchema = z.object({
  status: z.nativeEnum(RoomStatus),
});

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

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
      status,
    });
  }
}
