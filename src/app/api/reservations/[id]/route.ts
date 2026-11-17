import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "予約が見つかりません" }, { status: 404 });

  const { count } = await prisma.reservation.deleteMany({ where: { id } });
  if (count === 0) return Response.json({ error: "予約が見つかりません" }, { status: 404 });

  return new Response(null, { status: 204 });
}
