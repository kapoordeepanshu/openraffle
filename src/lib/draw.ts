import { createHash, randomBytes, randomInt } from "node:crypto";
import { db } from "./db";
import { audit } from "./audit";
import { EntryError } from "./orders";

export type DrawProof = {
  algorithm: "sha256-entrylist + crypto.randomInt";
  entryCount: number;
  entryListHash: string;
  seed: string;
  winningIndex: number;
  winningNumber: number;
  drawnAt: string;
};

/** Hash of every eligible ticket number, so the entry list can be shown to be unchanged after the draw. */
export function hashEntryList(numbers: number[]) {
  const sorted = [...numbers].sort((a, b) => a - b);
  return createHash("sha256").update(sorted.join(",")).digest("hex");
}

/** Pure winner selection. `rng(n)` must return an integer in [0, n). */
export function pickWinner<T extends { number: number }>(tickets: T[], rng: (n: number) => number = randomInt) {
  if (tickets.length === 0) throw new Error("No eligible tickets");
  const ordered = [...tickets].sort((a, b) => a.number - b.number);
  const index = rng(ordered.length);
  if (!Number.isInteger(index) || index < 0 || index >= ordered.length) throw new Error("RNG out of range");
  return { ticket: ordered[index], index };
}

/**
 * Draws a winner from eligible tickets: paid or free entries with a correct
 * skill-question answer. Refunded and oversold orders are excluded.
 */
export async function drawRaffle(raffleId: string, actor: string) {
  const raffle = await db.raffle.findUnique({ where: { id: raffleId } });
  if (!raffle) throw new EntryError("Raffle not found", 404);
  if (raffle.status === "DRAWN") throw new EntryError("This raffle has already been drawn.");
  if (raffle.status !== "CLOSED") throw new EntryError("Close the raffle before drawing a winner.");

  const tickets = await db.ticket.findMany({
    where: { raffleId, order: { status: "PAID", skillCorrect: true } },
    select: { id: true, number: true },
  });
  if (!tickets.length) throw new EntryError("There are no eligible entries to draw from.");

  const seed = randomBytes(16).toString("hex");
  const { ticket, index } = pickWinner(tickets);
  const proof: DrawProof = {
    algorithm: "sha256-entrylist + crypto.randomInt",
    entryCount: tickets.length,
    entryListHash: hashEntryList(tickets.map((t) => t.number)),
    seed,
    winningIndex: index,
    winningNumber: ticket.number,
    drawnAt: new Date().toISOString(),
  };

  // Conditional update: only one concurrent draw can win the race.
  const updated = await db.raffle.updateMany({
    where: { id: raffleId, status: "CLOSED", winnerTicketId: null },
    data: { status: "DRAWN", winnerTicketId: ticket.id, drawProof: JSON.stringify(proof), drawnAt: new Date() },
  });
  if (updated.count !== 1) throw new EntryError("The raffle was drawn by someone else just now.");

  await audit("raffle.drawn", actor, { raffleId, detail: JSON.stringify(proof) });
  return proof;
}
