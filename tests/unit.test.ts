import { describe, expect, it } from "vitest";
import { hashEntryList, pickWinner } from "@/lib/draw";
import { isOpenForEntries, remainingTickets } from "@/lib/raffle";
import { buildReceiptPdf, type ReceiptData } from "@/lib/receipt";
import { entrySchema, parseSpecLines, raffleSchema } from "@/lib/validation";
import { decrypt, encrypt, mask } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { publicName, ticketNo } from "@/lib/format";

describe("draw", () => {
  const tickets = [{ number: 30 }, { number: 10 }, { number: 20 }];

  it("orders tickets before indexing so the result is reproducible", () => {
    expect(pickWinner(tickets, () => 0).ticket.number).toBe(10);
    expect(pickWinner(tickets, () => 2).ticket.number).toBe(30);
  });

  it("rejects an out-of-range RNG and empty entry lists", () => {
    expect(() => pickWinner(tickets, () => 3)).toThrow();
    expect(() => pickWinner([], () => 0)).toThrow();
  });

  it("hashes the entry list independent of order", () => {
    expect(hashEntryList([3, 1, 2])).toBe(hashEntryList([1, 2, 3]));
    expect(hashEntryList([1, 2, 3])).not.toBe(hashEntryList([1, 2, 4]));
  });

  it("is roughly uniform with the real RNG", () => {
    const counts = [0, 0, 0];
    for (let i = 0; i < 3000; i++) counts[pickWinner(tickets).index]++;
    counts.forEach((c) => expect(c).toBeGreaterThan(800));
  });
});

describe("capacity", () => {
  it("never goes negative", () => {
    expect(remainingTickets(100, 60, 30)).toBe(10);
    expect(remainingTickets(100, 90, 30)).toBe(0);
  });

  it("only accepts entries while live and inside the window", () => {
    const now = new Date("2026-01-10");
    const base = { startsAt: new Date("2026-01-01"), endsAt: new Date("2026-01-20") };
    expect(isOpenForEntries({ ...base, status: "LIVE" }, now)).toBe(true);
    expect(isOpenForEntries({ ...base, status: "DRAFT" }, now)).toBe(false);
    expect(isOpenForEntries({ ...base, status: "LIVE" }, new Date("2026-01-21"))).toBe(false);
  });
});

describe("receipt PDF", () => {
  const data: ReceiptData = {
    siteName: "Test Motors", legalName: "Test Ltd", supportEmail: "s@test.dev", siteUrl: "https://test.dev",
    reference: "OR-TEST01", raffleTitle: "Porsche 911", drawDate: "1 Jan 2027", name: "Jane Smith",
    email: "jane@test.dev", purchasedAt: "1 Dec 2026", quantity: 3, unitPrice: "£4.99", total: "£14.97",
    source: "STRIPE", ticketNumbers: ["#00001", "#00002", "#00003"], skillCorrect: true,
  };

  it("produces a valid PDF", async () => {
    const bytes = await buildReceiptPdf(data);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });

  it("spills large orders onto extra pages", async () => {
    const many = Array.from({ length: 3000 }, (_, i) => ticketNo(i + 1));
    const small = await buildReceiptPdf(data);
    const big = await buildReceiptPdf({ ...data, ticketNumbers: many, quantity: 3000 });
    expect(big.length).toBeGreaterThan(small.length * 2);
  });
});

describe("validation", () => {
  const ok = { raffleId: "r1", name: "Jane Smith", email: "jane@test.dev", quantity: 2, ageConfirmed: true, termsAccepted: true };

  it("requires age and terms confirmation", () => {
    expect(entrySchema.safeParse(ok).success).toBe(true);
    expect(entrySchema.safeParse({ ...ok, ageConfirmed: false }).success).toBe(false);
    expect(entrySchema.safeParse({ ...ok, termsAccepted: undefined }).success).toBe(false);
  });

  it("checks the skill answer is one of the options", () => {
    const base = {
      title: "Car", slug: "car", description: "A lovely car to win", ticketPrice: "2.50", maxTickets: "100",
      maxPerPerson: "10", startsAt: "2026-01-01T00:00", endsAt: "2026-02-01T00:00",
      skillQuestion: "2+2?", skillOptions: "3\n4\n5",
    };
    expect(raffleSchema.safeParse({ ...base, skillAnswer: "4" }).success).toBe(true);
    expect(raffleSchema.safeParse({ ...base, skillAnswer: "6" }).success).toBe(false);
    expect(raffleSchema.safeParse({ ...base, skillAnswer: "4" }).data?.ticketPrice).toBe(250);
  });

  it("parses spec lines", () => {
    expect(parseSpecLines("Engine: V8\n\nPower: 500bhp")).toEqual([
      { label: "Engine", value: "V8" },
      { label: "Power", value: "500bhp" },
    ]);
  });
});

describe("secrets", () => {
  it("round-trips and detects tampering", () => {
    const enc = encrypt("sk_test_123");
    expect(enc).not.toContain("sk_test");
    expect(decrypt(enc)).toBe("sk_test_123");
    const parts = enc.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decrypt(parts.join("."))).toThrow();
  });

  it("masks keys", () => {
    expect(mask("sk_live_abcdefgh1234")).toBe("sk_live_••••1234");
    expect(mask("whsec_abcdef9999")).toBe("whsec_••••9999");
  });
});

describe("helpers", () => {
  it("rate limits per key", () => {
    const t = 1_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 60_000, t).ok).toBe(true);
    expect(rateLimit("k", 3, 60_000, t).ok).toBe(false);
    expect(rateLimit("k", 3, 60_000, t + 61_000).ok).toBe(true);
  });

  it("shows winners by first name and initial", () => {
    expect(publicName("Jane Mary Smith")).toBe("Jane S.");
    expect(publicName("Cher")).toBe("Cher");
  });
});
