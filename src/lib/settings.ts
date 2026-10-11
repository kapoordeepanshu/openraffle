import { db } from "./db";
import { decrypt, encrypt } from "./crypto";

export type StripeSettings = {
  secretKey: string | null;
  webhookSecret: string | null;
  publishableKey: string | null;
  /** where the secret key came from */
  source: "admin" | "env" | null;
  /** "test" or "live", inferred from the key prefix */
  keyMode: "test" | "live" | null;
};

const KEYS = { secret: "stripe.secretKey", webhook: "stripe.webhookSecret", publishable: "stripe.publishableKey" } as const;

let cache: { at: number; value: StripeSettings } | null = null;
const TTL = 5_000;

async function readSecret(key: string) {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return null;
  try {
    return decrypt(row.value);
  } catch {
    console.error(`[settings] could not decrypt ${key}; was AUTH_SECRET changed?`);
    return null;
  }
}

/**
 * Stripe credentials. Keys saved in the admin take priority over environment
 * variables, so a business can connect Stripe without touching the server.
 */
export async function getStripeSettings(fresh = false): Promise<StripeSettings> {
  if (!fresh && cache && Date.now() - cache.at < TTL) return cache.value;
  const [s, w, p] = await Promise.all([readSecret(KEYS.secret), readSecret(KEYS.webhook), db.setting.findUnique({ where: { key: KEYS.publishable } })]);
  const secretKey = s ?? process.env.STRIPE_SECRET_KEY ?? null;
  const value: StripeSettings = {
    secretKey,
    webhookSecret: w ?? process.env.STRIPE_WEBHOOK_SECRET ?? null,
    publishableKey: p?.value ?? process.env.STRIPE_PUBLISHABLE_KEY ?? null,
    source: s ? "admin" : process.env.STRIPE_SECRET_KEY ? "env" : null,
    keyMode: secretKey ? (/_live_/.test(secretKey) ? "live" : "test") : null,
  };
  cache = { at: Date.now(), value };
  return value;
}

export async function saveStripeSettings(v: { secretKey?: string; webhookSecret?: string; publishableKey?: string }) {
  const ops = [];
  if (v.secretKey) ops.push(db.setting.upsert({ where: { key: KEYS.secret }, create: { key: KEYS.secret, value: encrypt(v.secretKey) }, update: { value: encrypt(v.secretKey) } }));
  if (v.webhookSecret) ops.push(db.setting.upsert({ where: { key: KEYS.webhook }, create: { key: KEYS.webhook, value: encrypt(v.webhookSecret) }, update: { value: encrypt(v.webhookSecret) } }));
  if (v.publishableKey !== undefined) ops.push(db.setting.upsert({ where: { key: KEYS.publishable }, create: { key: KEYS.publishable, value: v.publishableKey }, update: { value: v.publishableKey } }));
  await db.$transaction(ops);
  cache = null;
}

export async function clearStripeSettings() {
  await db.setting.deleteMany({ where: { key: { in: Object.values(KEYS) } } });
  cache = null;
}

/** "stripe" once a secret key exists (admin or env); "demo" otherwise. PAYMENTS_MODE env forces a mode. */
export async function paymentsMode(): Promise<"stripe" | "demo"> {
  const forced = process.env.PAYMENTS_MODE;
  if (forced === "demo" || forced === "stripe") return forced;
  return (await getStripeSettings()).secretKey ? "stripe" : "demo";
}
