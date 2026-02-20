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
  email: z.string().email(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  @HttpCode(200)
  async sendOtp(@Body() body: unknown) {
    const { email } = sendOtpSchema.parse(body);
    return this.authService.sendOtp({ email });
  }

  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(@Body() body: unknown) {
    const { email, code } = verifyOtpSchema.parse(body);
    return this.authService.verifyOtp({ email, code });
  }

  @Post('admin/login')
  @HttpCode(200)
  async adminLogin(@Body() body: unknown) {
    const { email, password } = adminLoginSchema.parse(body);
    return this.authService.adminLogin({ email, password });
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
