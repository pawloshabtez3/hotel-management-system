import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import crypto from 'node:crypto';

type StoredOtp = {
  code: string;
  attempts: number;
};

@Injectable()
export class AuthService {
  private readonly otpTtlSeconds =
    Number(process.env.OTP_TTL_SECONDS ?? 300) || 300;
  private readonly maxAttempts = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
  ) {}

  private normalizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.trim();
  }

  private otpKey(phoneNumber: string): string {
    return `otp:${phoneNumber}`;
  }

  private generateOtpCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  async sendOtp(input: { phoneNumber: string }) {
    const phoneNumber = this.normalizePhoneNumber(input.phoneNumber);
    const code = this.generateOtpCode();

    const payload: StoredOtp = {
      code,
      attempts: 0,
    };

    await this.redis.set(this.otpKey(phoneNumber), JSON.stringify(payload), this.otpTtlSeconds);

    const isProd = process.env.NODE_ENV === 'production';

    // NOTE: SMS sending is intentionally not implemented yet.
    // For Day 2 testing via curl/Postman, we optionally echo the OTP in non-production.
    return {
      ok: true,
      ttlSeconds: this.otpTtlSeconds,
      ...(isProd ? {} : { devOtp: code }),
    };
  }

  async verifyOtp(input: { phoneNumber: string; code: string }) {
    const phoneNumber = this.normalizePhoneNumber(input.phoneNumber);
    const key = this.otpKey(phoneNumber);

    const raw = await this.redis.get(key);
    if (!raw) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    let stored: StoredOtp;
    try {
      stored = JSON.parse(raw) as StoredOtp;
    } catch {
      await this.redis.del(key);
      throw new UnauthorizedException('OTP invalid');
    }

    if ((stored.attempts ?? 0) >= this.maxAttempts) {
      await this.redis.del(key);
      throw new BadRequestException('Too many attempts');
    }

    if (stored.code !== input.code) {
      stored.attempts = (stored.attempts ?? 0) + 1;
      await this.redis.set(key, JSON.stringify(stored), this.otpTtlSeconds);
      throw new UnauthorizedException('OTP invalid');
    }

    await this.redis.del(key);

    const user = await this.prisma.user.upsert({
      where: { phoneNumber },
      update: {},
      create: { phoneNumber },
      select: { id: true, phoneNumber: true, role: true },
    });

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user,
    };
  }
}
