import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const rooms = await prisma.room.findMany({ orderBy: { id: "asc" } });
  return Response.json(rooms);
}
