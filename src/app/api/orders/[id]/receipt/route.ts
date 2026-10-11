import { NextResponse } from "next/server";
import { getOrderForCustomer } from "@/lib/orders";
import { buildReceiptPdf } from "@/lib/receipt";
import { receiptDataFor } from "@/lib/receipt-data";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const order = await getOrderForCustomer(id, token);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "PAID") return NextResponse.json({ error: "Receipt is available once payment is confirmed" }, { status: 409 });

  const pdf = await buildReceiptPdf(receiptDataFor(order));
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${order.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
