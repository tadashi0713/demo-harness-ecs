import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dayRange, formatDate } from "@/lib/reservation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const today = dayRange(formatDate(new Date()));
  const rooms = await prisma.room.findMany({
    orderBy: { id: "asc" },
    include: {
      _count: { select: { reservations: { where: { startAt: { gte: today.startAt, lt: today.endAt } } } } },
    },
  });

  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">会議室一覧</h1>
      <ul className="grid gap-4 sm:grid-cols-3">
        {rooms.map((room) => (
          <li key={room.id}>
            <Link
              href={`/rooms/${room.id}`}
              className="block rounded-lg border bg-white p-4 shadow-sm hover:border-blue-500"
            >
              <h2 className="font-semibold">{room.name}</h2>
              <p className="text-sm text-slate-600">定員 {room.capacity} 名</p>
              <p className="mt-2 text-sm">本日の予約: {room._count.reservations} 件</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
