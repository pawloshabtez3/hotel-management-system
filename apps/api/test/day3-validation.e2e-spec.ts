import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, RoomStatus } from '@prisma/client';
import { io } from 'socket.io-client';
import request from 'supertest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

jest.setTimeout(120000);

class InMemoryRedisService {
  private readonly store = new Map<string, string>();

  async ping() {
    return 'PONG';
  }

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string) {
    this.store.set(key, value);
    return 'OK' as const;
  }

  async del(key: string) {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  async onModuleDestroy() {
    this.store.clear();
  }
}

type RecordingStep = {
  at: string;
  step: string;
  details?: Record<string, unknown>;
};

describe('Day 3 Validation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;

  let customerToken = '';
  let adminToken = '';
  let bookingId = '';
  let adminRoomId = '';
  let foreignRoomId = '';

  let adminUserId = '';
  let foreignAdminUserId = '';
  let customerUserId = '';

  const recording: RecordingStep[] = [];
  const runTag = `day3-${Date.now()}`;
  const customerEmail = `${runTag}-customer@example.com`;
  const adminEmail = `${runTag}-admin@example.com`;
  const foreignAdminEmail = `${runTag}-foreign-admin@example.com`;

  const record = (step: string, details?: Record<string, unknown>) => {
    recording.push({ at: new Date().toISOString(), step, details });
  };

  const cleanData = async () => {
    await prisma.booking.deleteMany({
      where: {
        OR: [
          { user: { email: customerEmail } },
          { room: { hotel: { admin: { email: adminEmail } } } },
          { room: { hotel: { admin: { email: foreignAdminEmail } } } },
        ],
      },
    });

    await prisma.room.deleteMany({
      where: {
        OR: [
          { hotel: { admin: { email: adminEmail } } },
          { hotel: { admin: { email: foreignAdminEmail } } },
        ],
      },
    });

    await prisma.hotel.deleteMany({
      where: {
        OR: [{ admin: { email: adminEmail } }, { admin: { email: foreignAdminEmail } }],
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [customerEmail, adminEmail, foreignAdminEmail],
        },
      },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(new InMemoryRedisService())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 0 : address.port;
    baseUrl = `http://127.0.0.1:${port}`;

    prisma = app.get(PrismaService);

    await cleanData();

    const adminUser = await prisma.user.create({
      data: { email: adminEmail, role: Role.ROOM_ADMIN },
      select: { id: true },
    });
    adminUserId = adminUser.id;

    const foreignAdminUser = await prisma.user.create({
      data: { email: foreignAdminEmail, role: Role.ROOM_ADMIN },
      select: { id: true },
    });
    foreignAdminUserId = foreignAdminUser.id;

    const adminHotel = await prisma.hotel.create({
      data: {
        name: `${runTag} Admin Hotel`,
        address: 'Test Address 1',
        city: 'Test City',
        country: 'Test Country',
        adminId: adminUserId,
      },
      select: { id: true },
    });

    const foreignHotel = await prisma.hotel.create({
      data: {
        name: `${runTag} Foreign Hotel`,
        address: 'Test Address 2',
        city: 'Test City',
        country: 'Test Country',
        adminId: foreignAdminUserId,
      },
      select: { id: true },
    });

    const createdAdminRoom = await prisma.room.create({
      data: {
        hotelId: adminHotel.id,
        type: 'Deluxe',
        pricePerNight: '120.00',
        status: RoomStatus.AVAILABLE,
      },
      select: { id: true },
    });
    adminRoomId = createdAdminRoom.id;

    const createdForeignRoom = await prisma.room.create({
      data: {
        hotelId: foreignHotel.id,
        type: 'Suite',
        pricePerNight: '180.00',
        status: RoomStatus.AVAILABLE,
      },
      select: { id: true },
    });
    foreignRoomId = createdForeignRoom.id;

    const adminOtpRes = await request(baseUrl)
      .post('/auth/otp/send')
      .send({ email: adminEmail })
      .expect(200);

    const adminVerifyRes = await request(baseUrl)
      .post('/auth/otp/verify')
      .send({ email: adminEmail, code: adminOtpRes.body.devOtp })
      .expect(200);

    adminToken = adminVerifyRes.body.accessToken as string;

    record('setup:fixtures_created', {
      adminUserId,
      foreignAdminUserId,
      adminRoomId,
      foreignRoomId,
      baseUrl,
    });
  });

  afterAll(async () => {
    record('teardown:start');
    await cleanData();

    const recordingPath = join(__dirname, 'day3-e2e-recording.json');
    await writeFile(recordingPath, JSON.stringify({ recording }, null, 2), 'utf-8');
    record('teardown:recording_saved', { recordingPath });

    await app.close();
  });

  it('runs end-to-end flow: OTP -> booking -> payment stub', async () => {
    const sendOtpRes = await request(baseUrl)
      .post('/auth/otp/send')
      .send({ email: customerEmail })
      .expect(200);

    const otpCode = sendOtpRes.body.devOtp as string;
    expect(otpCode).toMatch(/^\d{6}$/);
    record('e2e:otp_sent', { email: customerEmail, otpCode });

    const verifyRes = await request(baseUrl)
      .post('/auth/otp/verify')
      .send({ email: customerEmail, code: otpCode })
      .expect(200);

    customerToken = verifyRes.body.accessToken as string;
    customerUserId = verifyRes.body.user.id as string;
    expect(customerToken).toBeTruthy();
    record('e2e:otp_verified', { customerUserId });

    const bookingRes = await request(baseUrl)
      .post('/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        roomId: adminRoomId,
        checkIn: '2026-03-01',
        checkOut: '2026-03-03',
      })
      .expect(201);

    bookingId = bookingRes.body.id as string;
    expect(bookingRes.body.status).toBe('PENDING');
    expect(bookingRes.body.paymentStatus).toBe('UNPAID');
    record('e2e:booking_created', { bookingId, roomId: adminRoomId });

    const paymentRes = await request(baseUrl)
      .post(`/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(201);

    expect(paymentRes.body.stub).toBe(true);
    expect(paymentRes.body.clientSecret).toBe('stub_client_secret');
    record('e2e:payment_stub_called', {
      bookingId,
      paymentIntentId: paymentRes.body.paymentIntentId,
    });
  });

  it('validates admin access for GET /admin/bookings', async () => {
    const adminBookingsRes = await request(baseUrl)
      .get('/admin/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const bookingIds = (adminBookingsRes.body as Array<{ id: string }>).map((item) => item.id);
    expect(bookingIds).toContain(bookingId);
    record('admin:get_bookings_ok', { count: adminBookingsRes.body.length });
  });

  it('validates ownership guard for PUT /rooms/:id/status', async () => {
    const ownRoomRes = await request(baseUrl)
      .put(`/rooms/${adminRoomId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'OCCUPIED' })
      .expect(200);

    expect(ownRoomRes.body.status).toBe('OCCUPIED');
    record('admin:update_own_room_ok', { roomId: adminRoomId, status: 'OCCUPIED' });

    await request(baseUrl)
      .put(`/rooms/${foreignRoomId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'OCCUPIED' })
      .expect(403);

    record('admin:update_foreign_room_forbidden', { roomId: foreignRoomId });
  });

  it('validates admin booking CRUD endpoints', async () => {
    const getByIdRes = await request(baseUrl)
      .get(`/admin/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(getByIdRes.body.id).toBe(bookingId);
    record('admin:get_booking_by_id_ok', { bookingId });

    const patchRes = await request(baseUrl)
      .patch(`/admin/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONFIRMED' })
      .expect(200);

    expect(patchRes.body.status).toBe('CONFIRMED');
    record('admin:update_booking_status_ok', { bookingId, status: 'CONFIRMED' });

    const deleteRes = await request(baseUrl)
      .delete(`/admin/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(deleteRes.body.ok).toBe(true);
    expect(deleteRes.body.deletedId).toBe(bookingId);
    record('admin:delete_booking_ok', { bookingId });
  });

  it('verifies realtime room:update for subscribed clients', async () => {
    const client = io(baseUrl, {
      transports: ['websocket'],
      auth: { token: adminToken },
      forceNew: true,
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket connect timeout')), 10000);
      client.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    client.emit('room:join', { roomId: adminRoomId });
    await new Promise((resolve) => setTimeout(resolve, 200));

    const roomUpdatePromise = new Promise<{ roomId: string; status: string }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('room:update timeout')), 10000);
      client.on('room:update', (payload: { roomId: string; status: string }) => {
        clearTimeout(timeout);
        resolve(payload);
      });
    });

    await request(baseUrl)
      .put(`/rooms/${adminRoomId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'AVAILABLE' })
      .expect(200);

    const payload = await roomUpdatePromise;
    expect(payload.roomId).toBe(adminRoomId);
    expect(payload.status).toBe('AVAILABLE');
    record('realtime:room_update_received', payload);

    client.disconnect();
  });
});
