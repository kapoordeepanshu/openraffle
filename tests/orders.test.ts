import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createFreeEntry, createPendingOrder, fulfilOrder } from "@/lib/orders";
import { drawRaffle } from "@/lib/draw";

async function raffle(overrides: Record<string, unknown> = {}) {
  return db.raffle.create({
    data: {
      slug: `r-${Math.random().toString(36).slice(2)}`,
      title: "Test Car",
      description: "A test car",
      ticketPriceCents: 500,
      maxTickets: 10,
      maxPerPerson: 8,
      status: "LIVE",
      startsAt: new Date(Date.now() - 86400_000),
      endsAt: new Date(Date.now() + 86400_000),
      skillQuestion: "2+2?",
      skillOptions: JSON.stringify(["3", "4"]),
      skillAnswer: "4",
      ...overrides,
    },
  });
}

const entry = (raffleId: string, quantity: number, email = "a@test.dev", answer = "4") => ({
  raffleId, name: "Test Person", email, quantity, answer,
});

beforeEach(async () => {
  await db.ticket.deleteMany();
  await db.order.deleteMany();
  await db.raffle.deleteMany();
});

describe("orders", () => {
  it("issues sequential tickets and is idempotent", async () => {
    const r = await raffle();
    const a = await createPendingOrder(entry(r.id, 3));
    const b = await createPendingOrder(entry(r.id, 2, "b@test.dev"));
    expect((await fulfilOrder(a.id)).status).toBe("PAID");
    expect((await fulfilOrder(b.id)).status).toBe("PAID");
    expect((await fulfilOrder(a.id)).status).toBe("ALREADY_PAID"); // webhook retry

    const nums = (await db.ticket.findMany({ where: { raffleId: r.id }, orderBy: { number: "asc" } })).map((t) => t.number);
    expect(nums).toEqual([1, 2, 3, 4, 5]);
  });

  it("holds tickets for pending checkouts so the raffle can't be oversold", async () => {
    const r = await raffle({ maxTickets: 5 });
    await createPendingOrder(entry(r.id, 4));
    await expect(createPendingOrder(entry(r.id, 2, "b@test.dev"))).rejects.toThrow(/Only 1 tickets left/);
  });

  it("releases expired reservations", async () => {
    const r = await raffle({ maxTickets: 5 });
    const held = await createPendingOrder(entry(r.id, 5));
    await db.order.update({ where: { id: held.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(createPendingOrder(entry(r.id, 5, "b@test.dev"))).resolves.toBeTruthy();
  });

  it("marks a late payment as OVERSOLD instead of exceeding the cap", async () => {
    const r = await raffle({ maxTickets: 5 });
    const late = await createPendingOrder(entry(r.id, 3));
    await db.order.update({ where: { id: late.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const other = await createPendingOrder(entry(r.id, 4, "b@test.dev"));
    await fulfilOrder(other.id);
    expect((await fulfilOrder(late.id)).status).toBe("OVERSOLD");
    expect(await db.ticket.count({ where: { raffleId: r.id } })).toBe(4);
  });

  it("enforces the per-person limit", async () => {
    const r = await raffle({ maxPerPerson: 3 });
    await fulfilOrder((await createPendingOrder(entry(r.id, 2))).id);
    await expect(createPendingOrder(entry(r.id, 2))).rejects.toThrow(/1 more ticket/);
  });

  it("rejects closed raffles", async () => {
    const r = await raffle({ status: "CLOSED" });
    await expect(createPendingOrder(entry(r.id, 1))).rejects.toThrow(/not open/);
  });
});

describe("draw", () => {
  it("only draws from paid tickets with a correct answer", async () => {
    const r = await raffle();
    await fulfilOrder((await createPendingOrder(entry(r.id, 5, "wrong@test.dev", "3"))).id);
    const good = await createFreeEntry(entry(r.id, 1, "right@test.dev"), "test");
    await db.raffle.update({ where: { id: r.id }, data: { status: "CLOSED" } });

    const proof = await drawRaffle(r.id, "test");
    const winner = await db.raffle.findUnique({ where: { id: r.id }, include: { winnerTicket: true } });
    expect(proof.entryCount).toBe(1);
    expect(winner?.winnerTicket?.orderId).toBe(good.id);
    await expect(drawRaffle(r.id, "test")).rejects.toThrow(/already been drawn/);
  });

  it("refuses to draw a live raffle", async () => {
    const r = await raffle();
    await expect(drawRaffle(r.id, "test")).rejects.toThrow(/Close the raffle/);
  });
});
