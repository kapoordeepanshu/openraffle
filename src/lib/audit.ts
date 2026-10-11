import { db } from "./db";

export async function audit(
  action: string,
  actor: string,
  ctx: { raffleId?: string; orderId?: string; detail?: string } = {},
) {
  try {
    await db.auditLog.create({ data: { action, actor, ...ctx } });
  } catch (e) {
    // Never let audit logging break a payment or entry flow.
    console.error("[audit] failed", action, e);
  }
}
