import type { Metadata } from "next";
import { config } from "@/config";

export const metadata: Metadata = { title: "Terms & conditions" };

// TEMPLATE ONLY. Every operator must replace this with terms reviewed by a lawyer
// for their own jurisdiction (e.g. UK Gambling Act 2005 s.14 prize competitions,
// US state sweepstakes rules).
export default function Terms() {
  const s = [
    ["Promoter", `These raffles are run by ${config.legalName}. Contact: ${config.supportEmail}.`],
    ["Eligibility", `Entrants must be ${config.minAge} or over and resident in a country where entry is lawful. Employees of the promoter and their households cannot enter.`],
    ["How to enter", `Buy tickets online, or enter free by post${config.freeEntry.enabled ? " (see the free entry page)" : ""}. Where a raffle has a qualifying question, only correct answers are entered into the draw.`],
    ["Ticket limits", "Each raffle has a fixed maximum number of tickets and a per-person limit, both shown on the raffle page."],
    ["The draw", "The winner is selected at random from all eligible tickets after the raffle closes. A record of the draw is published on the raffle page."],
    ["The prize", "The prize is as described on the raffle page. Where a cash alternative is offered, the winner may choose it instead of the prize."],
    ["Refunds", "Tickets are non-refundable except where a raffle is cancelled or sells out before your payment is confirmed, in which case you'll be refunded in full automatically."],
    ["Data", "We use your details to run the raffle and contact the winner. We never sell your data."],
  ];
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="display text-4xl md:text-6xl mt-3">Terms &amp; conditions</h1>
      <p className="mt-6 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
        Template terms for demonstration. Replace with terms reviewed for your jurisdiction before going live.
      </p>
      <div className="mt-10 space-y-8">
        {s.map(([h, b], i) => (
          <section key={h}>
            <h2 className="display text-xl">{i + 1}. {h}</h2>
            <p className="text-muted mt-2 leading-relaxed">{b}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
