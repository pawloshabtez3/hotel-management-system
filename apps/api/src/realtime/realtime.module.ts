import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoomsGateway } from './rooms.gateway';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('JWT_SECRET') ??
          process.env.JWT_SECRET ??
          'test_jwt_secret_which_is_long_enough_123456',
      }),
    }),
  ],
  providers: [RoomsGateway],
  exports: [RoomsGateway],
})
export class RealtimeModule {}
