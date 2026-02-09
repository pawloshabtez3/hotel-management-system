import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RoomsGateway } from './rooms.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [RoomsGateway],
})
export class RealtimeModule {}
