/**
 * Demo data: three live car raffles, one already drawn, plus sample orders.
 * Run with `npm run db:seed` (also runs automatically on `npm run setup`).
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, randomInt } from "node:crypto";

const db = new PrismaClient();
const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;
const day = 86400_000;

const FIRST = ["Oliver", "Amelia", "Harry", "Isla", "Jack", "Ava", "George", "Mia", "Noah", "Freya", "Leo", "Grace", "Arthur", "Sophie", "Charlie", "Emily"];
const LAST = ["Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Evans", "Thomas", "Roberts", "Walker", "Wright", "Patel", "Khan", "Hughes"];
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ref = () => "OR-" + Array.from(randomBytes(6), (b) => ALPHA[b % ALPHA.length]).join("");

async function fakeOrders(raffleId: string, count: number, price: number) {
  let n = 1;
  for (let i = 0; i < count; i++) {
    const name = `${FIRST[randomInt(FIRST.length)]} ${LAST[randomInt(LAST.length)]}`;
    const qty = [1, 3, 5, 5, 10, 10, 25][randomInt(7)];
    const paidAt = new Date(Date.now() - randomInt(1, 9) * day);
    await db.order.create({
      data: {
        reference: ref(),
        raffleId,
        name,
        email: `${name.toLowerCase().replace(" ", ".")}${randomInt(99)}@example.com`,
        quantity: qty,
        amountCents: qty * price,
        status: "PAID",
        source: "DEMO",
        skillCorrect: randomInt(20) > 0,
        accessToken: randomBytes(24).toString("base64url"),
        paidAt,
        createdAt: paidAt,
        tickets: { create: Array.from({ length: qty }, () => ({ raffleId, number: n++ })) },
      },
    });
  }
}

async function main() {
  await db.$transaction([db.ticket.deleteMany(), db.order.deleteMany(), db.raffle.deleteMany(), db.auditLog.deleteMany(), db.webhookEvent.deleteMany()]);

  const skill = {
    skillQuestion: "Which country does Porsche come from?",
    skillOptions: JSON.stringify(["Germany", "Italy", "Japan"]),
    skillAnswer: "Germany",
  };

  const gt3 = await db.raffle.create({
    data: {
      slug: "porsche-911-gt3",
      title: "Porsche 911 GT3",
      subtitle: "2023 · 4.0L naturally aspirated flat-six · 503bhp · PDK",
      description:
        "The purest 911 money can buy. Finished in Crayon with Guards Red accents, carbon bucket seats and the Clubsport package, this GT3 has covered just 3,200 miles from new.\n\nThe winner chooses the car, delivered to their door anywhere in the UK, or the tax-free cash alternative.",
      images: JSON.stringify([U("photo-1614162692292-7ac56d7f7f1e"), U("photo-1503376780353-7e6692767b70")]),
      specs: JSON.stringify([
        { label: "Engine", value: "4.0L flat-six" },
        { label: "Power", value: "503bhp" },
        { label: "0–62mph", value: "3.4s" },
        { label: "Gearbox", value: "7-speed PDK" },
        { label: "Mileage", value: "3,200" },
        { label: "Colour", value: "Crayon" },
      ]),
      prizeValueCents: 18_950_000,
      cashAlternativeCents: 15_000_000,
      ticketPriceCents: 499,
      maxTickets: 9999,
      maxPerPerson: 250,
      status: "LIVE",
      startsAt: new Date(Date.now() - 10 * day),
      endsAt: new Date(Date.now() + 4 * day + 7 * 3600_000),
      ...skill,
    },
  });

  const amg = await db.raffle.create({
    data: {
      slug: "mercedes-amg-gt-r",
      title: "Mercedes-AMG GT R",
      subtitle: "Beast of the Green Hell · 577bhp twin-turbo V8",
      description: "Hand-built AMG 4.0-litre V8, active rear-wheel steering and a nine-mode traction control dial. Supplied in Designo Selenite Grey Magno with AMG carbon ceramic brakes.",
      images: JSON.stringify([U("photo-1618843479313-40f8afb4b4d8"), U("photo-1617814076367-b759c7d7e738")]),
      specs: JSON.stringify([
        { label: "Engine", value: "4.0L twin-turbo V8" },
        { label: "Power", value: "577bhp" },
        { label: "Top speed", value: "198mph" },
        { label: "Mileage", value: "8,900" },
      ]),
      prizeValueCents: 11_500_000,
      cashAlternativeCents: 9_500_000,
      ticketPriceCents: 299,
      maxTickets: 7500,
      maxPerPerson: 150,
      status: "LIVE",
      startsAt: new Date(Date.now() - 6 * day),
      endsAt: new Date(Date.now() + 9 * day),
      skillQuestion: "How many cylinders does a V8 engine have?",
      skillOptions: JSON.stringify(["6", "8", "12"]),
      skillAnswer: "8",
    },
  });

  const m4 = await db.raffle.create({
    data: {
      slug: "bmw-m4-competition",
      title: "BMW M4 Competition",
      subtitle: "510bhp · M xDrive · plus £2,000 fuel card",
      description: "A 2022 M4 Competition in Brooklyn Grey with the M Carbon pack, Harman Kardon audio and full BMW service history.",
      images: JSON.stringify([U("photo-1580273916550-e323be2ae537")]),
      specs: JSON.stringify([
        { label: "Engine", value: "3.0L twin-turbo straight-six" },
        { label: "Power", value: "510bhp" },
        { label: "Drive", value: "M xDrive (AWD)" },
      ]),
      prizeValueCents: 6_400_000,
      cashAlternativeCents: 5_200_000,
      ticketPriceCents: 199,
      maxTickets: 4999,
      maxPerPerson: 100,
      status: "LIVE",
      startsAt: new Date(Date.now() - 12 * day),
      endsAt: new Date(Date.now() + 1 * day + 5 * 3600_000),
      skillQuestion: "Which city is BMW headquartered in?",
      skillOptions: JSON.stringify(["Munich", "Stuttgart", "Turin"]),
      skillAnswer: "Munich",
    },
  });

  const stang = await db.raffle.create({
    data: {
      slug: "ford-mustang-gt",
      title: "Ford Mustang GT",
      subtitle: "5.0L V8 Fastback · drawn last month",
      description: "Shadow Black Mustang GT with the Custom Pack, active valve exhaust and MagneRide.",
      images: JSON.stringify([U("photo-1494976388531-d1058494cdd8")]),
      specs: JSON.stringify([{ label: "Engine", value: "5.0L V8" }, { label: "Power", value: "444bhp" }]),
      prizeValueCents: 4_200_000,
      ticketPriceCents: 149,
      maxTickets: 2999,
      status: "CLOSED",
      startsAt: new Date(Date.now() - 40 * day),
      endsAt: new Date(Date.now() - 10 * day),
    },
  });

  await fakeOrders(gt3.id, 260, gt3.ticketPriceCents);
  await fakeOrders(amg.id, 140, amg.ticketPriceCents);
  await fakeOrders(m4.id, 300, m4.ticketPriceCents);
  await fakeOrders(stang.id, 120, stang.ticketPriceCents);

  // Draw the Mustang so the "Winners" section has content.
  const { drawRaffle } = await import("../src/lib/draw");
  await drawRaffle(stang.id, "seed");

  console.log("Seeded 4 raffles with demo orders.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
