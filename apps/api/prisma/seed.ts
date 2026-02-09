import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type HotelJson = {
  value: Array<{
    HotelId: string;
    HotelName: string;
    Description?: string;
    Rating?: number;
    IsDeleted?: boolean;
    Address?: {
      StreetAddress?: string;
      City?: string;
      Country?: string;
    };
    Location?: {
      coordinates?: [number, number];
    };
    Rooms?: Array<{
      Description?: string;
      Description_fr?: string;
      Type?: string;
      BaseRate?: number;
      BedOptions?: string;
      SleepsCount?: number;
      SmokingAllowed?: boolean;
      Tags?: string[];
    }>;
  }>;
};

async function main() {
  const adminPhone = "+10000000001";

  const admin = await prisma.user.upsert({
    where: { phoneNumber: adminPhone },
    update: { role: "ROOM_ADMIN" },
    create: {
      phoneNumber: adminPhone,
      role: "ROOM_ADMIN",
    },
  });

  const hotelJsonPath = path.resolve(__dirname, "../../..", "hotel.json");
  const raw = fs.readFileSync(hotelJsonPath, "utf-8");
  const parsed = JSON.parse(raw) as HotelJson;

  const hotels = (parsed.value ?? []).filter((h) => !h.IsDeleted);

  await prisma.booking.deleteMany();
  await prisma.room.deleteMany();
  await prisma.hotel.deleteMany();

  for (const h of hotels) {
    const coords = h.Location?.coordinates;
    const longitude = Array.isArray(coords) ? coords[0] : undefined;
    const latitude = Array.isArray(coords) ? coords[1] : undefined;

    const hotel = await prisma.hotel.create({
      data: {
        id: h.HotelId,
        name: h.HotelName,
        description: h.Description ?? null,
        rating: typeof h.Rating === "number" ? h.Rating : null,
        address: h.Address?.StreetAddress ?? "",
        city: h.Address?.City ?? "",
        country: h.Address?.Country ?? "",
        latitude: typeof latitude === "number" ? latitude : null,
        longitude: typeof longitude === "number" ? longitude : null,
        adminId: admin.id,
      },
    });

    const rooms = (h.Rooms ?? []).map((r) => ({
      hotelId: hotel.id,
      type: r.Type ?? "",
      pricePerNight: new Prisma.Decimal(String(r.BaseRate ?? 0)),
      services: {
        description: r.Description ?? null,
        description_fr: r.Description_fr ?? null,
        bedOptions: r.BedOptions ?? null,
        sleepsCount: r.SleepsCount ?? null,
        smokingAllowed: r.SmokingAllowed ?? null,
        tags: r.Tags ?? [],
      },
      status: "AVAILABLE" as const,
    }));

    if (rooms.length > 0) {
      await prisma.room.createMany({
        data: rooms,
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
