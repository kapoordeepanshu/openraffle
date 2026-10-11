import Link from "next/link";
import { config } from "@/config";
import { db } from "@/lib/db";
import { money, publicName, ticketNo } from "@/lib/format";
import { images } from "@/lib/raffle";
import { RaffleCard } from "@/components/raffle-card";
import { SoldProgress } from "@/components/progress";
import { Countdown } from "@/components/countdown";
import { ArrowRight, Dice, File, Lock, Mail, Shield, Ticket, Trophy } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  const [live, drawn] = await Promise.all([
    db.raffle.findMany({ where: { status: "LIVE", endsAt: { gt: now } }, orderBy: { endsAt: "asc" } }),
    db.raffle.findMany({
      where: { status: "DRAWN" },
      orderBy: { drawnAt: "desc" },
      take: 6,
      include: { winnerTicket: { include: { order: true } } },
    }),
  ]);
  const soldCounts = await db.ticket.groupBy({ by: ["raffleId"], _count: true, where: { raffleId: { in: live.map((r) => r.id) } } });
  const sold = (id: string) => soldCounts.find((s) => s.raffleId === id)?._count ?? 0;
  const featured = live[0];

  return (
    <>
      {/* HERO */}
      {featured ? (
        <section className="relative overflow-hidden border-b border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images(featured)[0]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55 kenburns" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
          <div className="relative mx-auto max-w-7xl px-5 py-20 md:py-32 grid lg:grid-cols-[1.3fr_1fr] gap-12 items-end">
            <div className="animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-black/40 px-3 py-1.5 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" /> Live now · ends soon
              </span>
              <h1 className="display text-5xl sm:text-6xl md:text-7xl lg:text-8xl mt-6">{featured.title}</h1>
              {featured.subtitle && <p className="mt-5 text-lg text-muted max-w-xl">{featured.subtitle}</p>}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href={`/raffles/${featured.slug}`} className="btn btn-primary">
                  Enter for {money(featured.ticketPriceCents)} <ArrowRight width={18} height={18} />
                </Link>
                {featured.prizeValueCents ? (
                  <span className="text-sm text-muted">Worth <strong className="text-gold">{money(featured.prizeValueCents)}</strong></span>
                ) : null}
              </div>
            </div>
            <div className="card bg-black/50 backdrop-blur-xl p-6 space-y-6 animate-rise [animation-delay:150ms]">
              <div>
                <p className="eyebrow mb-3">Draw closes in</p>
                <Countdown endsAt={featured.endsAt.toISOString()} size="lg" />
              </div>
              <SoldProgress sold={sold(featured.id)} max={featured.maxTickets} />
            </div>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-5 py-28">
          <h1 className="display text-6xl">{config.siteName}</h1>
          <p className="text-muted mt-4">New raffles are coming soon.</p>
        </section>
      )}

      {/* TRUST STRIP */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          {[
            [Lock, "Secure Stripe checkout"],
            [File, "Instant PDF receipt"],
            [Dice, "Verifiable random draw"],
            [Mail, "Free postal entry route"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof Lock;
            return (
              <div key={label as string} className="flex items-center gap-3 text-muted">
                <I className="text-accent shrink-0" /> <span>{label as string}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* LIVE */}
      <section id="live" className="mx-auto max-w-7xl px-5 pt-20 scroll-mt-20">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <p className="eyebrow">Live raffles</p>
            <h2 className="display text-4xl md:text-5xl mt-3">Pick your ride</h2>
          </div>
          <p className="hidden md:block text-muted text-sm max-w-xs text-right">Every raffle has a fixed number of tickets, so your odds are always clear.</p>
        </div>
        {live.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((r) => <RaffleCard key={r.id} raffle={r} sold={sold(r.id)} />)}
          </div>
        ) : (
          <p className="card p-10 text-center text-muted">No live raffles right now. Check back soon.</p>
        )}
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-7xl px-5 pt-28 scroll-mt-20">
        <p className="eyebrow">How it works</p>
        <h2 className="display text-4xl md:text-5xl mt-3 mb-12">Three steps to the keys</h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {[
            [Ticket, "Choose your tickets", "Pick a car, choose how many tickets you want and answer a simple question."],
            [Shield, "Pay securely", "Checkout is handled by Stripe. Your ticket numbers and PDF receipt arrive instantly."],
            [Trophy, "Watch the draw", "When the raffle closes, a winner is picked at random from every eligible ticket."],
          ].map(([Icon, title, body], i) => {
            const I = Icon as typeof Ticket;
            return (
              <li key={title as string} className="card p-7 relative overflow-hidden">
                <span className="display absolute -right-2 -top-4 text-8xl text-white/[0.04]">{i + 1}</span>
                <I className="text-accent" width={26} height={26} />
                <h3 className="display text-xl mt-6">{title as string}</h3>
                <p className="text-muted mt-3 text-sm leading-relaxed">{body as string}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* WINNERS */}
      <section id="winners" className="mx-auto max-w-7xl px-5 pt-28 scroll-mt-20">
        <p className="eyebrow">Recent winners</p>
        <h2 className="display text-4xl md:text-5xl mt-3 mb-12">Real draws. Real keys.</h2>
        {drawn.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {drawn.map((r) => (
              <Link key={r.id} href={`/raffles/${r.slug}`} className="card overflow-hidden group">
                <div className="aspect-[16/9] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={images(r)[0]} alt={r.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                </div>
                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{r.winnerTicket ? publicName(r.winnerTicket.order.name) : "Winner"}</p>
                    <p className="text-sm text-muted">{r.title}</p>
                  </div>
                  <span className="rounded-full bg-gold/15 text-gold px-3 py-1 text-xs font-bold">
                    {r.winnerTicket ? ticketNo(r.winnerTicket.number) : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="card p-10 text-center text-muted">Our first winner will appear here.</p>
        )}
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pt-28">
        <p className="eyebrow text-center">FAQ</p>
        <h2 className="display text-4xl md:text-5xl mt-3 mb-10 text-center">Good questions</h2>
        <div className="divide-y divide-line border-y border-line">
          {[
            ["How is the winner chosen?", "When a raffle closes we draw one ticket at random from every eligible entry using a cryptographically secure random number generator. The draw record (entry count, a fingerprint of the entry list and the winning number) is published on the raffle page."],
            ["Can I enter for free?", config.freeEntry.enabled ? "Yes. Every raffle has a free postal entry route with the same chance of winning. See the free entry page for details." : "Please see the terms for each raffle."],
            ["What if the raffle doesn't sell out?", "The draw still goes ahead on the closing date. You can only ever win with the tickets that were actually sold."],
            ["Will I get a receipt?", "Yes. You'll see your ticket numbers straight after payment and can download a PDF receipt at any time from your confirmation link."],
          ].map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-semibold">
                {q}
                <span className="text-accent transition-transform group-open:rotate-45 text-2xl leading-none">+</span>
              </summary>
              <p className="text-muted mt-3 text-sm leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
