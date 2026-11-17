import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dayRange, errorMessages, formatDate, toDateTime, validateReservation } from "@/lib/reservation";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const createSchema = z.object({
  title: z.string().trim().min(1).max(100),
  reservedBy: z.string().trim().min(1).max(50),
  date: dateSchema,
  start: timeSchema,
  end: timeSchema,
});

type Params = { params: Promise<{ id: string }> };

async function findRoom(id: string) {
  const roomId = Number(id);
  if (!Number.isInteger(roomId)) return null;
  return prisma.room.findUnique({ where: { id: roomId } });
}

export async function GET(req: Request, { params }: Params) {
  const room = await findRoom((await params).id);
  if (!room) return Response.json({ error: "会議室が見つかりません" }, { status: 404 });

  const date = dateSchema.safeParse(new URL(req.url).searchParams.get("date") ?? formatDate(new Date()));
  if (!date.success) return Response.json({ error: "date は YYYY-MM-DD 形式で指定してください" }, { status: 400 });

  const { startAt, endAt } = dayRange(date.data);
  const reservations = await prisma.reservation.findMany({
    where: { roomId: room.id, startAt: { gte: startAt, lt: endAt } },
    orderBy: { startAt: "asc" },
  });
  return Response.json(reservations);
}

export async function POST(req: Request, { params }: Params) {
  const room = await findRoom((await params).id);
  if (!room) return Response.json({ error: "会議室が見つかりません" }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "入力内容が不正です", issues: parsed.error.issues }, { status: 400 });
  }

  const { title, reservedBy, date, start, end } = parsed.data;
  const input = { startAt: toDateTime(date, start), endAt: toDateTime(date, end) };

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const day = dayRange(date);
        const existing = await tx.reservation.findMany({
          where: { roomId: room.id, startAt: { lt: day.endAt }, endAt: { gt: day.startAt } },
        });
        const error = validateReservation(input, existing);
        if (error) return { error };
        return { reservation: await tx.reservation.create({ data: { roomId: room.id, title, reservedBy, ...input } }) };
      },
      { isolationLevel: "Serializable" },
    );

    if ("error" in result && result.error) {
      const status = result.error === "OVERLAP" ? 409 : 400;
      return Response.json({ error: errorMessages[result.error], code: result.error }, { status });
    }
    return Response.json(result.reservation, { status: 201 });
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "P2034") {
      return Response.json({ error: errorMessages.OVERLAP, code: "OVERLAP" }, { status: 409 });
    }
    throw e;
  }
}
