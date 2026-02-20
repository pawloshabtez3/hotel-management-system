import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import crypto from 'node:crypto';
import nodemailer, { type Transporter } from 'nodemailer';

type StoredOtp = {
  code: string;
  attempts: number;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpTtlSeconds =
    Number(process.env.OTP_TTL_SECONDS ?? 300) || 300;
  private readonly maxAttempts = 5;
  private transporter: Transporter | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private otpKey(email: string): string {
    return `otp:${email}`;
  }

  private generateOtpCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  private getEmailTransporter(): Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    return this.transporter;
  }

  private async sendOtpEmail(email: string, code: string): Promise<boolean> {
    const transporter = this.getEmailTransporter();
    if (!transporter) {
      this.logger.warn(
        'SMTP is not configured; OTP email was not sent. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL.',
      );
      return false;
    }

    const fromEmail = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER;
    const appName = process.env.APP_NAME ?? 'Hotel Management';

    try {
      await transporter.sendMail({
        from: `${appName} <${fromEmail}>`,
        to: email,
        subject: 'Your login verification code',
        text: `Your verification code is ${code}. It expires in ${this.otpTtlSeconds} seconds.`,
        html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${this.otpTtlSeconds} seconds.</p>`,
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to send OTP email', error as Error);

      if (process.env.NODE_ENV === 'production') {
        throw error;
      }

      return false;
    }
  }

  async sendOtp(input: { email: string }) {
    const email = this.normalizeEmail(input.email);
    const code = this.generateOtpCode();

    const payload: StoredOtp = {
      code,
      attempts: 0,
    };

    await this.redis.set(this.otpKey(email), JSON.stringify(payload), this.otpTtlSeconds);
    const emailSent = await this.sendOtpEmail(email, code);

    const isProd = process.env.NODE_ENV === 'production';

    // NOTE: SMS sending is intentionally not implemented yet.
    // For Day 2 testing via curl/Postman, we optionally echo the OTP in non-production.
    return {
      ok: true,
      ttlSeconds: this.otpTtlSeconds,
      emailSent,
      ...(isProd ? {} : { devOtp: code }),
    };
  }

  async verifyOtp(input: { email: string; code: string }) {
    const email = this.normalizeEmail(input.email);
    const key = this.otpKey(email);

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

    const existingUser = await this.prisma.user.findFirst({
      where: { email },
      select: { id: true, email: true, role: true },
    });

    const user =
      existingUser ??
      (await this.prisma.user.create({
        data: { email },
        select: { id: true, email: true, role: true },
      }));

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user,
    };
  }
}
