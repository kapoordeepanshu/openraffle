import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const csvCell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // block spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const raffle = await db.raffle.findUnique({ where: { id } });
  if (!raffle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tickets = await db.ticket.findMany({
    where: { raffleId: id },
    include: { order: true },
    orderBy: { number: "asc" },
  });

  const header = ["ticket", "order_reference", "name", "email", "phone", "source", "order_status", "skill_correct", "paid_at"];
  const rows = tickets.map((t) => [
    t.number, t.order.reference, t.order.name, t.order.email, t.order.phone, t.order.source,
    t.order.status, t.order.skillCorrect, t.order.paidAt?.toISOString(),
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  await audit("raffle.exported", admin, { raffleId: id });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${raffle.slug}-entries.csv"`,
    },
  });
}
