import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, type RedisClientType } from 'redis';

type JwtPayload = {
  sub: string;
  email?: string | null;
  role?: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RoomsGateway {
  @WebSocketServer()
  server!: Server;

  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;

  constructor(private readonly jwt: JwtService) {}

  private getTokenFromSocket(client: Socket): string | null {
    const authToken = (client.handshake.auth as any)?.token as string | undefined;
    if (authToken && authToken.trim().length > 0) {
      return authToken.trim();
    }

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
      return header.slice('bearer '.length).trim();
    }

    return null;
  }

  async afterInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return;
    }

    try {
      this.pubClient = createClient({ url: redisUrl });
      this.subClient = this.pubClient.duplicate();

      this.pubClient.on('error', (error) => {
        // eslint-disable-next-line no-console
        console.warn('[ws] redis pub error:', (error as any)?.message ?? error);
      });

      this.subClient.on('error', (error) => {
        // eslint-disable-next-line no-console
        console.warn('[ws] redis sub error:', (error as any)?.message ?? error);
      });

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      this.server.adapter(createAdapter(this.pubClient, this.subClient));
      // eslint-disable-next-line no-console
      console.log('[ws] redis adapter enabled');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[ws] redis adapter disabled:', (error as any)?.message ?? error);
    }
  }

  async handleConnection(client: Socket) {
    const token = this.getTokenFromSocket(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = (await this.jwt.verifyAsync(token)) as JwtPayload;
      if (!payload?.sub) {
        client.disconnect(true);
        return;
      }

      client.data.user = {
        id: payload.sub,
        email: payload.email ?? null,
        role: payload.role ?? null,
      };
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('room:join')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId?: string },
  ) {
    const roomId = body?.roomId?.trim();
    if (!roomId) {
      throw new WsException('roomId is required');
    }

    await client.join(`room:${roomId}`);
    return { ok: true };
  }

  @SubscribeMessage('room:update')
  async roomUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId?: string; status?: string },
  ) {
    const user = client.data.user as { role?: string } | undefined;
    if (user?.role !== 'ROOM_ADMIN') {
      throw new WsException('Forbidden');
    }

    const roomId = body?.roomId?.trim();
    if (!roomId) {
      throw new WsException('roomId is required');
    }

    const payload = {
      roomId,
      status: body?.status ?? null,
      at: new Date().toISOString(),
    };

    this.server.to(`room:${roomId}`).emit('room:update', payload);
    return { ok: true };
  }

  notifyRoomUpdate(roomId: string, status: string) {
    const payload = {
      roomId,
      status,
      at: new Date().toISOString(),
      source: 'server',
    };

    this.server.to(`room:${roomId}`).emit('room:update', payload);
  }
}
