import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
