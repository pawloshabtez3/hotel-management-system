import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@prisma/client';

const sendOtpSchema = z.object({
  phoneNumber: z.string().min(5),
});

const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(5),
  code: z.string().regex(/^\d{6}$/),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  @HttpCode(200)
  async sendOtp(@Body() body: unknown) {
    const { phoneNumber } = sendOtpSchema.parse(body);
    return this.authService.sendOtp({ phoneNumber });
  }

  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(@Body() body: unknown) {
    const { phoneNumber, code } = verifyOtpSchema.parse(body);
    return this.authService.verifyOtp({ phoneNumber, code });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    return { user: (req as any).user };
  }

  @Get('room-admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ROOM_ADMIN)
  async roomAdminOnly() {
    return { ok: true };
  }
}
