"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { checkCredentials, createSession, destroySession, requireAdmin } from "@/lib/auth";
import { drawRaffle } from "@/lib/draw";
import { sendReceiptEmail } from "@/lib/mail";
import { createFreeEntry, EntryError } from "@/lib/orders";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { RaffleStatus } from "@/lib/raffle";
import { stripe } from "@/lib/stripe";
import { lines, parseSpecLines, raffleSchema } from "@/lib/validation";
import { clearStripeSettings, getStripeSettings, saveStripeSettings } from "@/lib/settings";
import { config } from "@/config";

export type ActionState = { ok?: boolean; error?: string; message?: string; fields?: Record<string, string[] | undefined> } | null;

const fail = (e: unknown): ActionState => {
  if (e instanceof EntryError) return { error: e.message };
  console.error("[admin action]", e);
  return { error: e instanceof Error ? e.message : "Something went wrong" };
};

/* ---------------- auth ---------------- */

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}`, 5, 15 * 60_000).ok) return { error: "Too many attempts. Try again in 15 minutes." };
  const email = String(fd.get("email") ?? "");
  if (!checkCredentials(email, String(fd.get("password") ?? ""))) {
    await audit("admin.login_failed", email || "unknown", { detail: ip });
    return { error: "Incorrect email or password." };
  }
  await createSession(email.toLowerCase());
  await audit("admin.login", email.toLowerCase());
  const next = String(fd.get("next") ?? "/admin");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------------- raffles ---------------- */

export async function saveRaffle(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const parsed = raffleSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fields: parsed.error.flatten().fieldErrors };
  const v = parsed.data;

  const data = {
    title: v.title,
    slug: v.slug,
    subtitle: v.subtitle || null,
    description: v.description,
    images: JSON.stringify(lines(v.images)),
    specs: JSON.stringify(parseSpecLines(v.specs)),
    prizeValueCents: v.prizeValue || null,
    cashAlternativeCents: v.cashAlternative || null,
    ticketPriceCents: v.ticketPrice,
    maxTickets: v.maxTickets,
    maxPerPerson: v.maxPerPerson,
    startsAt: v.startsAt,
    endsAt: v.endsAt,
    skillQuestion: v.skillQuestion || null,
    skillOptions: JSON.stringify(lines(v.skillOptions)),
    skillAnswer: v.skillAnswer || null,
  };

  try {
    if (id) {
      const sold = await db.ticket.count({ where: { raffleId: id } });
      if (v.maxTickets < sold) return { error: `Max tickets can't be lower than the ${sold} already sold.` };
      await db.raffle.update({ where: { id }, data });
      await audit("raffle.updated", admin, { raffleId: id });
    } else {
      const r = await db.raffle.create({ data });
      await audit("raffle.created", admin, { raffleId: r.id });
      redirect(`/admin/raffles/${r.id}`);
    }
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") return { error: "That URL slug is already used by another raffle." };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

const TRANSITIONS: Record<string, RaffleStatus[]> = {
  DRAFT: ["LIVE", "CANCELLED"],
  LIVE: ["CLOSED", "CANCELLED"],
  CLOSED: ["LIVE", "CANCELLED"],
  DRAWN: [],
  CANCELLED: ["DRAFT"],
};

export async function setStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id"));
  const to = String(fd.get("status")) as RaffleStatus;
  const r = await db.raffle.findUnique({ where: { id } });
  if (!r) return { error: "Raffle not found" };
  if (!TRANSITIONS[r.status]?.includes(to)) return { error: `Can't move a ${r.status} raffle to ${to}.` };
  await db.raffle.update({ where: { id }, data: { status: to } });
  await audit("raffle.status", admin, { raffleId: id, detail: `${r.status} -> ${to}` });
  revalidatePath("/", "layout");
  return { ok: true, message: `Raffle is now ${to.toLowerCase()}.` };
}

export async function draw(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const proof = await drawRaffle(String(fd.get("id")), admin);
    revalidatePath("/", "layout");
    return { ok: true, message: `Winning ticket #${proof.winningNumber} drawn from ${proof.entryCount} eligible entries.` };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- entries ---------------- */

const entrySchema = z.object({
  raffleId: z.string().min(1),
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  quantity: z.coerce.number().int().min(1).max(1000),
  answer: z.string().optional(),
  source: z.enum(["FREE", "MANUAL"]),
});

export async function addEntry(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = entrySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please fill in name, email and quantity.", fields: parsed.error.flatten().fieldErrors };
  const { source, ...input } = parsed.data;
  try {
    const order = await createFreeEntry({ ...input, answer: input.answer || undefined }, admin, source);
    revalidatePath(`/admin/raffles/${input.raffleId}`);
    return { ok: true, message: `Entry ${order.reference} added.` };
  } catch (e) {
    return fail(e);
  }
}

export async function refundOrder(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const order = await db.order.findUnique({ where: { id: String(fd.get("id")) } });
  if (!order) return { error: "Order not found" };
  if (order.status !== "PAID" && order.status !== "OVERSOLD") return { error: "Only paid orders can be refunded." };
  try {
    if (order.source === "STRIPE" && order.stripePaymentIntentId) {
      await (await stripe()).refunds.create({ payment_intent: order.stripePaymentIntentId });
    }
    await db.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
    await audit("order.refunded", admin, { orderId: order.id, raffleId: order.raffleId });
    revalidatePath(`/admin/raffles/${order.raffleId}`);
    return { ok: true, message: `${order.reference} refunded. Its tickets are excluded from the draw.` };
  } catch (e) {
    return fail(e);
  }
}

export async function resendReceipt(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const sent = await sendReceiptEmail(String(fd.get("id"))).catch(() => false);
  return sent ? { ok: true, message: "Receipt emailed." } : { error: "Email isn't configured (set SMTP_URL)." };
}

/* ---------------- payments (Stripe) ---------------- */

const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "charge.refunded",
] as const;

export async function savePayments(_: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const secretKey = String(fd.get("secretKey") ?? "").trim();
  const webhookSecret = String(fd.get("webhookSecret") ?? "").trim();
  const publishableKey = String(fd.get("publishableKey") ?? "").trim();

  if (secretKey && !/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(secretKey)) return { error: "Secret key should start with sk_test_, sk_live_ or rk_…" };
  if (webhookSecret && !/^whsec_[A-Za-z0-9]+$/.test(webhookSecret)) return { error: "Webhook signing secret should start with whsec_" };
  if (publishableKey && !/^pk_(test|live)_[A-Za-z0-9]+$/.test(publishableKey)) return { error: "Publishable key should start with pk_test_ or pk_live_" };

  if (secretKey) {
    // Verify the key works before saving it.
    try {
      const { default: Stripe } = await import("stripe");
      await new Stripe(secretKey).balance.retrieve();
    } catch {
      return { error: "Stripe rejected that secret key. Please check and try again." };
    }
  }
  await saveStripeSettings({ secretKey: secretKey || undefined, webhookSecret: webhookSecret || undefined, publishableKey: publishableKey || undefined });
  await audit("settings.stripe_saved", admin, { detail: secretKey ? `key mode ${/_live_/.test(secretKey) ? "live" : "test"}` : "webhook/publishable updated" });
  revalidatePath("/", "layout");
  return { ok: true, message: "Stripe settings saved." };
}

export async function testStripe(): Promise<ActionState> {
  await requireAdmin();
  try {
    const s = await stripe();
    const acct = await s.accounts.retrieve();
    const { webhookSecret, keyMode } = await getStripeSettings(true);
    const name = acct.settings?.dashboard?.display_name || acct.business_profile?.name || acct.email || acct.id;
    const parts = [
      `Connected to ${name} (${acct.country ?? "?"}, ${keyMode} mode).`,
      acct.charges_enabled ? "Card payments enabled." : "Charges not enabled yet; finish onboarding in Stripe.",
      webhookSecret ? "Webhook secret set." : "No webhook secret yet.",
    ];
    return { ok: true, message: parts.join(" ") };
  } catch (e) {
    return fail(e);
  }
}

export async function createWebhook(): Promise<ActionState> {
  const admin = await requireAdmin();
  const url = `${config.siteUrl}/api/webhooks/stripe`;
  if (!url.startsWith("https://")) {
    return { error: `Stripe needs a public https URL. SITE_URL is ${config.siteUrl}. For local testing use the Stripe CLI (see README).` };
  }
  try {
    const s = await stripe();
    const existing = await s.webhookEndpoints.list({ limit: 100 });
    for (const ep of existing.data.filter((e) => e.url === url)) await s.webhookEndpoints.del(ep.id);
    const ep = await s.webhookEndpoints.create({ url, enabled_events: [...WEBHOOK_EVENTS], description: `${config.siteName} (OpenRaffle)` });
    if (!ep.secret) return { error: "Stripe didn't return a signing secret." };
    await saveStripeSettings({ webhookSecret: ep.secret });
    await audit("settings.stripe_webhook_created", admin, { detail: ep.id });
    return { ok: true, message: `Webhook created and its signing secret saved (${ep.id}).` };
  } catch (e) {
    return fail(e);
  }
}

export async function disconnectStripe(): Promise<ActionState> {
  const admin = await requireAdmin();
  await clearStripeSettings();
  await audit("settings.stripe_disconnected", admin);
  revalidatePath("/", "layout");
  return { ok: true, message: "Stripe keys removed from the admin. Environment variables (if any) still apply." };
}
