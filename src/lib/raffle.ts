import type { Raffle } from "@prisma/client";
import { db } from "./db";
import { parseJson } from "./format";

export const RAFFLE_STATUSES = ["DRAFT", "LIVE", "CLOSED", "DRAWN", "CANCELLED"] as const;
export type RaffleStatus = (typeof RAFFLE_STATUSES)[number];

export type Spec = { label: string; value: string };

export function images(r: Pick<Raffle, "images">): string[] {
  return parseJson<string[]>(r.images, []);
}

export function specs(r: Pick<Raffle, "specs">): Spec[] {
  return parseJson<Spec[]>(r.specs, []);
}

export function skillOptions(r: Pick<Raffle, "skillOptions">): string[] {
  return parseJson<string[]>(r.skillOptions, []);
}

/** Pure capacity maths, kept separate so it can be unit tested. */
export function remainingTickets(maxTickets: number, sold: number, reserved: number) {
  return Math.max(0, maxTickets - sold - reserved);
}

export function isOpenForEntries(r: Pick<Raffle, "status" | "startsAt" | "endsAt">, now = new Date()) {
  return r.status === "LIVE" && r.startsAt <= now && r.endsAt > now;
}

/** Tickets sold plus tickets held by unexpired pending checkouts. */
export async function capacity(raffleId: string, maxTickets: number, client = db) {
  const now = new Date();
  const [sold, pending] = await Promise.all([
    client.ticket.count({ where: { raffleId } }),
    client.order.aggregate({
      where: { raffleId, status: "PENDING", expiresAt: { gt: now } },
      _sum: { quantity: true },
    }),
  ]);
  const reserved = pending._sum.quantity ?? 0;
  return { sold, reserved, remaining: remainingTickets(maxTickets, sold, reserved) };
}

export async function ticketsHeldBy(raffleId: string, email: string, client = db) {
  const agg = await client.order.aggregate({
    where: { raffleId, email: email.toLowerCase(), status: { in: ["PAID", "PENDING"] } },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}
