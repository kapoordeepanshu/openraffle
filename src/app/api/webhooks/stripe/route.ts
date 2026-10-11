import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { fulfilOrder } from "@/lib/orders";
import { stripe } from "@/lib/stripe";
import { getStripeSettings } from "@/lib/settings";

export const runtime = "nodejs";

/**
 * Stripe webhook. Configure in the Stripe dashboard (or `stripe listen`) with:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.async_payment_failed, checkout.session.expired, charge.refunded
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = (await getStripeSettings()).webhookSecret;
  if (!signature || !secret) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = (await stripe()).webhooks.constructEvent(await req.text(), signature, secret);
  } catch (e) {
    console.warn("[webhook] signature verification failed", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: Stripe retries and may deliver an event more than once.
  if (await db.webhookEvent.findUnique({ where: { id: event.id } })) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handle(event);
  } catch (e) {
    console.error("[webhook] handler failed", event.type, e);
    // 500 so Stripe retries later; fulfilment is idempotent.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  await db.webhookEvent.create({ data: { id: event.id, type: event.type } }).catch(() => undefined);
  return NextResponse.json({ received: true });
}

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.payment_status !== "paid") return; // async methods confirm later
      const orderId = s.metadata?.orderId ?? s.client_reference_id;
      if (!orderId) return;
      const paymentIntentId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
      const result = await fulfilOrder(orderId, { paymentIntentId });
      if (result.status === "OVERSOLD" && paymentIntentId && process.env.AUTO_REFUND_OVERSOLD !== "false") {
        await (await stripe()).refunds.create({ payment_intent: paymentIntentId, reason: "requested_by_customer" });
        await db.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
        await audit("order.refunded", "system", { orderId, detail: "Automatic refund: raffle sold out" });
      }
      return;
    }
    case "checkout.session.async_payment_failed": {
      const s = event.data.object as Stripe.Checkout.Session;
      await db.order.updateMany({ where: { stripeSessionId: s.id, status: "PENDING" }, data: { status: "FAILED" } });
      return;
    }
    case "checkout.session.expired": {
      const s = event.data.object as Stripe.Checkout.Session;
      await db.order.updateMany({ where: { stripeSessionId: s.id, status: "PENDING" }, data: { status: "EXPIRED" } });
      return;
    }
    case "charge.refunded": {
      const c = event.data.object as Stripe.Charge;
      const pi = typeof c.payment_intent === "string" ? c.payment_intent : c.payment_intent?.id;
      if (!pi || !c.refunded) return; // partial refunds keep the entry
      const order = await db.order.findFirst({ where: { stripePaymentIntentId: pi } });
      if (order && order.status !== "REFUNDED") {
        await db.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
        await audit("order.refunded", "stripe", { orderId: order.id, raffleId: order.raffleId });
      }
      return;
    }
  }
}
