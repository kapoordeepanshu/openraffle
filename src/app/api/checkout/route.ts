import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPendingOrder, EntryError, fulfilOrder } from "@/lib/orders";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createCheckoutSession } from "@/lib/stripe";
import { paymentsMode } from "@/lib/settings";
import { entrySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`checkout:${ip}`, 10, 60_000).ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  }

  const parsed = entrySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the form.", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { raffleId, name, email, phone, quantity, answer } = parsed.data;

  try {
    const demo = (await paymentsMode()) === "demo";
    const order = await createPendingOrder(
      { raffleId, name, email, phone: phone || undefined, quantity, answer },
      { source: demo ? "DEMO" : "STRIPE", ip },
    );
    const thanks = `/orders/${order.id}?token=${order.accessToken}`;

    if (demo) {
      await fulfilOrder(order.id);
      return NextResponse.json({ url: thanks });
    }

    const session = await createCheckoutSession(order);
    await db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    if (e instanceof EntryError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[checkout]", e);
    return NextResponse.json({ error: "Something went wrong starting checkout. Please try again." }, { status: 500 });
  }
}
