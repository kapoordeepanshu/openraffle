import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { config } from "@/config";
import { db } from "@/lib/db";
import { money, parseJson, publicName, ticketNo, dateTime, timeAgo } from "@/lib/format";
import { capacity, images, isOpenForEntries, skillOptions, specs } from "@/lib/raffle";
import type { DrawProof } from "@/lib/draw";
import { EntryForm } from "@/components/entry-form";
import { paymentsMode } from "@/lib/settings";
import { Countdown } from "@/components/countdown";
import { SoldProgress } from "@/components/progress";
import { Gallery } from "@/components/gallery";
import { Dice, Trophy } from "@/components/icons";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ cancelled?: string }> };

async function load(slug: string) {
  return db.raffle.findFirst({
    where: { slug, status: { not: "DRAFT" } },
    include: { winnerTicket: { include: { order: true } } },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const r = await load((await params).slug);
  if (!r) return {};
  return {
    title: `Win a ${r.title}`,
    description: r.subtitle ?? r.description.slice(0, 150),
    // og:image comes from ./opengraph-image.tsx (branded share card)
  };
}

export default async function RafflePage({ params, searchParams }: Params) {
  const r = await load((await params).slug);
  if (!r) notFound();
  const { cancelled } = await searchParams;
  const [cap, mode, recent] = await Promise.all([
    capacity(r.id, r.maxTickets),
    paymentsMode(),
    db.order.findMany({ where: { raffleId: r.id, status: "PAID" }, orderBy: { paidAt: "desc" }, take: 6, select: { id: true, name: true, quantity: true, paidAt: true } }),
  ]);
  const open = isOpenForEntries(r);
  const proof = parseJson<DrawProof | null>(r.drawProof, null);
  const odds = r.maxTickets.toLocaleString();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: r.title,
    image: images(r),
    description: r.description,
    offers: { "@type": "Offer", price: (r.ticketPriceCents / 100).toFixed(2), priceCurrency: config.currency.toUpperCase(), availability: open ? "https://schema.org/InStock" : "https://schema.org/SoldOut" },
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pt-10 pb-28 lg:pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {cancelled && (
        <p className="mb-6 rounded-xl border border-line-strong bg-surface px-4 py-3 text-sm">Checkout was cancelled. Your tickets weren&apos;t charged and have been released.</p>
      )}

      <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr]">
        {/* LEFT */}
        <div className="space-y-10 min-w-0">
          <Gallery images={images(r)} title={r.title} />
          <div>
            <p className="eyebrow">{r.status === "DRAWN" ? "Raffle complete" : open ? "Live raffle" : "Entries closed"}</p>
            <h1 className="display text-4xl md:text-6xl mt-3">{r.title}</h1>
            {r.subtitle && <p className="text-muted text-lg mt-4">{r.subtitle}</p>}
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Ticket price", money(r.ticketPriceCents)],
              ["Prize value", r.prizeValueCents ? money(r.prizeValueCents) : "—"],
              ["Cash alternative", r.cashAlternativeCents ? money(r.cashAlternativeCents) : "—"],
              ["Max tickets", odds],
            ].map(([k, v]) => (
              <div key={k} className="card p-4">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="display text-xl mt-2">{v}</dd>
              </div>
            ))}
          </dl>

          <section>
            <h2 className="display text-2xl mb-4">About the car</h2>
            <div className="text-muted leading-relaxed whitespace-pre-line">{r.description}</div>
          </section>

          {recent.length > 0 && (
            <section aria-label="Recent entries">
              <h2 className="display text-2xl mb-4 flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ok" /></span>
                Recent entries
              </h2>
              <ul className="card divide-y divide-line">
                {recent.map((o, i) => (
                  <li key={o.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm" style={{ animation: `ticker .5s ${i * 80}ms both` }}>
                    <span><strong>{publicName(o.name)}</strong> <span className="text-muted">entered with {o.quantity} ticket{o.quantity > 1 ? "s" : ""}</span></span>
                    <span className="text-xs text-muted whitespace-nowrap">{o.paidAt ? timeAgo(o.paidAt) : ""}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {specs(r).length > 0 && (
            <section>
              <h2 className="display text-2xl mb-4">Specification</h2>
              <dl className="card divide-y divide-line">
                {specs(r).map((s) => (
                  <div key={s.label} className="flex justify-between gap-6 px-5 py-3.5 text-sm">
                    <dt className="text-muted">{s.label}</dt>
                    <dd className="font-medium text-right">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        {/* RIGHT */}
        <aside className="self-start space-y-5">
          {r.status === "DRAWN" && r.winnerTicket ? (
            <div className="card p-6 space-y-5 border-gold/40">
              <div className="flex items-center gap-3 text-gold"><Trophy /> <span className="eyebrow !text-gold">Winner</span></div>
              <p className="display text-4xl">{publicName(r.winnerTicket.order.name)}</p>
              <p className="text-muted">Winning ticket <strong className="text-fg">{ticketNo(r.winnerTicket.number)}</strong></p>
              {proof && (
                <div className="rounded-xl bg-surface-2 p-4 text-xs space-y-2 break-all">
                  <p className="flex items-center gap-2 font-semibold text-sm"><Dice width={16} height={16} /> Draw record</p>
                  <p><span className="text-muted">Drawn:</span> {dateTime(proof.drawnAt)}</p>
                  <p><span className="text-muted">Eligible entries:</span> {proof.entryCount.toLocaleString()}</p>
                  <p><span className="text-muted">Entry list SHA-256:</span> <code>{proof.entryListHash}</code></p>
                  <p><span className="text-muted">Seed:</span> <code>{proof.seed}</code></p>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-6 space-y-6">
              <div className="flex items-baseline justify-between">
                <span className="display text-4xl">{money(r.ticketPriceCents)}</span>
                <span className="text-sm text-muted">per ticket</span>
              </div>
              <div>
                <p className="eyebrow mb-3">{open ? "Closes in" : "Draw"}</p>
                {open ? <Countdown endsAt={r.endsAt.toISOString()} /> : <p className="text-sm">The draw takes place shortly after {dateTime(r.endsAt)}.</p>}
              </div>
              <SoldProgress sold={cap.sold} max={r.maxTickets} />
              {open ? (
                <EntryForm
                  raffleId={r.id}
                  priceCents={r.ticketPriceCents}
                  currency={config.currency}
                  locale={config.locale}
                  maxPerPerson={r.maxPerPerson}
                  maxTickets={r.maxTickets}
                  remaining={cap.remaining}
                  minAge={config.minAge}
                  skillQuestion={r.skillQuestion}
                  skillOptions={skillOptions(r)}
                  freeEntry={config.freeEntry.enabled}
                  demo={mode === "demo"}
                />
              ) : (
                <p className="rounded-xl bg-surface-2 p-4 text-sm text-muted">Entries for this raffle are closed.</p>
              )}
            </div>
          )}
          <p className="text-xs text-muted px-2">
            Draw date {dateTime(r.endsAt)}. Maximum {odds} tickets, so your odds are never worse than 1 in {odds} per ticket.
          </p>
        </aside>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur-xl px-5 py-3 flex items-center justify-between gap-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div>
            <p className="display text-xl">{money(r.ticketPriceCents)}</p>
            <p className="text-xs text-muted">{cap.remaining.toLocaleString()} tickets left</p>
          </div>
          <a href="#enter" className="btn btn-primary">Enter now</a>
        </div>
      )}
    </div>
  );
}
