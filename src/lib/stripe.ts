import Stripe from "stripe";
import type { Order, Raffle } from "@prisma/client";
import { config } from "@/config";
import { images } from "./raffle";
import { getStripeSettings } from "./settings";

let client: { key: string; stripe: Stripe } | null = null;

/** Stripe client for the currently configured secret key (admin settings or env). */
export async function stripe() {
  const { secretKey } = await getStripeSettings();
  if (!secretKey) throw new Error("Stripe is not connected. Add your keys in Admin → Settings → Payments.");
  if (client?.key !== secretKey) client = { key: secretKey, stripe: new Stripe(secretKey) };
  return client.stripe;
}

/** Creates a hosted Stripe Checkout session for a pending order. */
export async function createCheckoutSession(order: Order & { raffle: Raffle }) {
  const img = images(order.raffle)[0];
  // Stripe sessions must live at least 30 minutes.
  const expiresAt = Math.floor(Math.max(order.expiresAt?.getTime() ?? 0, Date.now() + 31 * 60_000) / 1000);

  return (await stripe()).checkout.sessions.create({
    mode: "payment",
    customer_email: order.email,
    client_reference_id: order.id,
    metadata: { orderId: order.id, raffleId: order.raffleId },
    payment_intent_data: { metadata: { orderId: order.id, raffleId: order.raffleId } },
    line_items: [
      {
        quantity: order.quantity,
        price_data: {
          currency: config.currency,
          unit_amount: order.raffle.ticketPriceCents,
          product_data: {
            name: `${order.raffle.title}: entry ticket`,
            ...(img ? { images: [img] } : {}),
          },
        },
      },
    ],
    expires_at: expiresAt,
    success_url: `${config.siteUrl}/orders/${order.id}?token=${order.accessToken}`,
    cancel_url: `${config.siteUrl}/raffles/${order.raffle.slug}?cancelled=1`,
  });
}
