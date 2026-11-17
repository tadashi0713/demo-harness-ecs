import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CLOSE_HOUR, OPEN_HOUR, dayRange, formatDate, formatTime } from "@/lib/reservation";
import { CancelButton } from "./cancel-button";
import { ReservationForm } from "./reservation-form";

export const dynamic = "force-dynamic";

const HOUR_HEIGHT = 48;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
};

function shiftDate(date: string, days: number) {
  const d = dayRange(date).startAt;
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export default async function RoomPage({ params, searchParams }: Props) {
  const roomId = Number((await params).id);
  const room = Number.isInteger(roomId) ? await prisma.room.findUnique({ where: { id: roomId } }) : null;
  if (!room) notFound();

  const requested = (await searchParams).date;
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : formatDate(new Date());
  const { startAt, endAt } = dayRange(date);
  const reservations = await prisma.reservation.findMany({
    where: { roomId: room.id, startAt: { gte: startAt, lt: endAt } },
    orderBy: { startAt: "asc" },
  });

  const hours = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
  const offset = (d: Date) => ((d.getHours() - OPEN_HOUR) * 60 + d.getMinutes()) * (HOUR_HEIGHT / 60);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {room.name} <span className="text-base font-normal text-slate-600">定員 {room.capacity} 名</span>
        </h1>
        <nav className="flex items-center gap-3 text-sm">
          <Link href={`?date=${shiftDate(date, -1)}`} className="text-blue-600">
            ← 前日
          </Link>
          <span data-testid="current-date" className="font-mono">
            {date}
          </span>
          <Link href={`?date=${shiftDate(date, 1)}`} className="text-blue-600">
            翌日 →
          </Link>
        </nav>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div
          aria-label="タイムライン"
          className="relative rounded-lg border bg-white"
          style={{ height: hours.length * HOUR_HEIGHT }}
        >
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute inset-x-0 border-t text-xs text-slate-400"
              style={{ top: i * HOUR_HEIGHT }}
            >
              <span className="pl-1">{h}:00</span>
            </div>
          ))}
          <ul>
            {reservations.map((r) => (
              <li
                key={r.id}
                className="absolute left-14 right-2 flex items-start justify-between overflow-hidden rounded bg-blue-100 px-2 py-1 text-sm"
                style={{ top: offset(r.startAt), height: offset(r.endAt) - offset(r.startAt) }}
              >
                <span>
                  <span className="font-mono">
                    {formatTime(r.startAt)}-{formatTime(r.endAt)}
                  </span>{" "}
                  <span className="font-semibold">{r.title}</span> ({r.reservedBy})
                </span>
                <CancelButton id={r.id} title={r.title} />
              </li>
            ))}
          </ul>
        </div>

        <ReservationForm roomId={room.id} date={date} />
      </div>
    </section>
  );
}
