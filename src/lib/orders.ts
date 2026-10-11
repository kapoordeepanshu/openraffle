import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { config } from "@/config";
import { db } from "./db";
import { capacity, isOpenForEntries, skillOptions, ticketsHeldBy } from "./raffle";
import { audit } from "./audit";
import { sendReceiptEmail } from "./mail";

export class EntryError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newReference() {
  const bytes = randomBytes(6);
  return "OR-" + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function newAccessToken() {
  return randomBytes(24).toString("base64url");
}

export type EntryInput = {
  raffleId: string;
  name: string;
  email: string;
  phone?: string;
  quantity: number;
  answer?: string;
};

/**
 * Validates an entry and reserves tickets by creating a PENDING order.
 * The reservation expires after `config.reservationMinutes` if payment never completes.
 */
export async function createPendingOrder(
  input: EntryInput,
  opts: { source?: "STRIPE" | "DEMO" | "FREE" | "MANUAL"; ip?: string; enforceWindow?: boolean } = {},
) {
  const source = opts.source ?? "STRIPE";
  const email = input.email.trim().toLowerCase();

  return db.$transaction(async (tx) => {
    const raffle = await tx.raffle.findUnique({ where: { id: input.raffleId } });
    if (!raffle) throw new EntryError("Raffle not found", 404);
    if (opts.enforceWindow !== false && !isOpenForEntries(raffle)) {
      throw new EntryError("This raffle is not open for entries.");
    }

    const options = skillOptions(raffle);
    if (raffle.skillQuestion && options.length && input.answer && !options.includes(input.answer)) {
      throw new EntryError("Please choose one of the answers provided.");
    }
    const skillCorrect = raffle.skillAnswer ? input.answer === raffle.skillAnswer : true;

    const held = await ticketsHeldBy(raffle.id, email, tx as typeof db);
    if (held + input.quantity > raffle.maxPerPerson) {
      const left = Math.max(0, raffle.maxPerPerson - held);
      throw new EntryError(
        left ? `You can buy ${left} more ticket${left === 1 ? "" : "s"} for this raffle.` : "You've reached the ticket limit for this raffle.",
      );
    }

    const cap = await capacity(raffle.id, raffle.maxTickets, tx as typeof db);
    if (input.quantity > cap.remaining) {
      throw new EntryError(cap.remaining ? `Only ${cap.remaining} tickets left.` : "Sold out.", 409);
    }

    const free = source === "FREE" || source === "MANUAL";
    return tx.order.create({
      data: {
        reference: newReference(),
        raffleId: raffle.id,
        name: input.name.trim(),
        email,
        phone: input.phone?.trim() || null,
        quantity: input.quantity,
        amountCents: free ? 0 : raffle.ticketPriceCents * input.quantity,
        source,
        skillAnswer: input.answer ?? null,
        skillCorrect,
        accessToken: newAccessToken(),
        ip: opts.ip,
        expiresAt: new Date(Date.now() + config.reservationMinutes * 60_000),
      },
      include: { raffle: true },
    });
  });
}

type FulfilResult = { status: "PAID" | "ALREADY_PAID" | "OVERSOLD" | "NOT_FOUND"; orderId: string };

/**
 * Confirms payment and allocates sequential ticket numbers.
 * Safe to call more than once (webhook retries): a PAID order is left untouched.
 * The unique (raffleId, number) constraint guards against concurrent allocation;
 * on a clash we simply retry with fresh numbers.
 */
export async function fulfilOrder(orderId: string, payment: { paymentIntentId?: string } = {}): Promise<FulfilResult> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await db.$transaction(async (tx): Promise<FulfilResult> => {
        const order = await tx.order.findUnique({ where: { id: orderId }, include: { raffle: true } });
        if (!order) return { status: "NOT_FOUND", orderId };
        if (order.status === "PAID") return { status: "ALREADY_PAID", orderId };

        const sold = await tx.ticket.count({ where: { raffleId: order.raffleId } });
        if (sold + order.quantity > order.raffle.maxTickets) {
          await tx.order.update({ where: { id: order.id }, data: { status: "OVERSOLD" } });
          return { status: "OVERSOLD", orderId };
        }

        const last = await tx.ticket.findFirst({ where: { raffleId: order.raffleId }, orderBy: { number: "desc" } });
        const start = (last?.number ?? 0) + 1;
        await tx.ticket.createMany({
          data: Array.from({ length: order.quantity }, (_, i) => ({
            raffleId: order.raffleId,
            orderId: order.id,
            number: start + i,
          })),
        });
        await tx.order.update({
          where: { id: order.id },
          data: { status: "PAID", paidAt: new Date(), stripePaymentIntentId: payment.paymentIntentId ?? order.stripePaymentIntentId },
        });
        return { status: "PAID", orderId };
      });

      if (result.status === "PAID") {
        await audit("order.paid", "system", { orderId });
        await sendReceiptEmail(orderId).catch((e) => console.error("[mail] receipt failed", e));
      }
      if (result.status === "OVERSOLD") {
        await audit("order.oversold", "system", { orderId, detail: "Raffle sold out before payment confirmed; refund required." });
      }
      return result;
    } catch (e) {
      const clash = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!clash || attempt === 4) throw e;
    }
  }
  throw new Error("unreachable");
}

/** Records a free postal entry or a manual entry added by an admin. */
export async function createFreeEntry(input: EntryInput, actor: string, source: "FREE" | "MANUAL" = "FREE") {
  const order = await createPendingOrder(input, { source, enforceWindow: false });
  await audit(source === "FREE" ? "entry.free" : "entry.manual", actor, { raffleId: order.raffleId, orderId: order.id });
  await fulfilOrder(order.id);
  return order;
}

export async function getOrderForCustomer(id: string, token: string) {
  const order = await db.order.findUnique({
    where: { id },
    include: { raffle: true, tickets: { orderBy: { number: "asc" } } },
  });
  if (!order || order.accessToken !== token) return null;
  return order;
}
