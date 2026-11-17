import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { formatDate, toDateTime } from "../src/lib/reservation";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const rooms = [
  { name: "会議室 A", capacity: 4 },
  { name: "会議室 B", capacity: 8 },
  { name: "大会議室", capacity: 20 },
];

async function main() {
  for (const room of rooms) {
    await prisma.room.upsert({ where: { name: room.name }, update: {}, create: room });
  }

  if ((await prisma.reservation.count()) > 0) return;

  const today = formatDate(new Date());
  const roomA = await prisma.room.findUniqueOrThrow({ where: { name: "会議室 A" } });
  const big = await prisma.room.findUniqueOrThrow({ where: { name: "大会議室" } });

  await prisma.reservation.createMany({
    data: [
      { roomId: roomA.id, title: "朝会", reservedBy: "山田", startAt: toDateTime(today, "09:30"), endAt: toDateTime(today, "10:00") },
      { roomId: roomA.id, title: "1on1", reservedBy: "佐藤", startAt: toDateTime(today, "14:00"), endAt: toDateTime(today, "14:30") },
      { roomId: big.id, title: "全社定例", reservedBy: "鈴木", startAt: toDateTime(today, "16:00"), endAt: toDateTime(today, "17:00") },
    ],
  });
}

main()
  .then(() => console.log("Seed completed"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
