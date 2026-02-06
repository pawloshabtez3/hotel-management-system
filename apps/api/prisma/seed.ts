import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

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

  const hotel = await prisma.hotel.upsert({
    where: { id: "seed-hotel-1" },
    update: {},
    create: {
      id: "seed-hotel-1",
      name: "Harbor Vista Hotel",
      description: "Waterfront stay with modern rooms and breakfast options.",
      address: "123 Seaside Blvd",
      city: "Lagos",
      country: "Nigeria",
      latitude: 6.5244,
      longitude: 3.3792,
      adminId: admin.id,
    },
  });

  const existingRooms = await prisma.room.count({
    where: { hotelId: hotel.id },
  });

  if (existingRooms === 0) {
    await prisma.room.createMany({
      data: [
        {
          hotelId: hotel.id,
          type: "Standard",
          pricePerNight: new Prisma.Decimal("85.00"),
          services: { breakfast: false, wifi: true },
          status: "AVAILABLE",
        },
        {
          hotelId: hotel.id,
          type: "Deluxe",
          pricePerNight: new Prisma.Decimal("120.00"),
          services: { breakfast: true, wifi: true },
          status: "AVAILABLE",
        },
        {
          hotelId: hotel.id,
          type: "Suite",
          pricePerNight: new Prisma.Decimal("200.00"),
          services: { breakfast: true, wifi: true, minibar: true },
          status: "AVAILABLE",
        },
      ],
    });
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
