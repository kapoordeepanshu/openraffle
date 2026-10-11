import Link from "next/link";
import type { Raffle } from "@prisma/client";
import { money } from "@/lib/format";
import { images } from "@/lib/raffle";
import { SoldProgress } from "./progress";
import { Countdown } from "./countdown";
import { ArrowRight } from "./icons";

export function RaffleCard({ raffle, sold }: { raffle: Raffle; sold: number }) {
  const img = images(raffle)[0];
  return (
    <Link href={`/raffles/${raffle.slug}`} className="group card lift overflow-hidden flex flex-col hover:border-line-strong">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={raffle.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-black/60 backdrop-blur px-3 py-1 text-xs font-semibold">
          {money(raffle.ticketPriceCents)} per ticket
        </span>
        {raffle.cashAlternativeCents ? (
          <span className="absolute right-4 top-4 rounded-full bg-gold text-black px-3 py-1 text-xs font-bold">
            {money(raffle.cashAlternativeCents)} cash alt
          </span>
        ) : null}
        <div className="absolute left-4 bottom-4"><Countdown endsAt={raffle.endsAt.toISOString()} size="sm" /></div>
      </div>
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div>
          <h3 className="display text-xl">{raffle.title}</h3>
          {raffle.subtitle && <p className="text-sm text-muted mt-1.5">{raffle.subtitle}</p>}
        </div>
        <SoldProgress sold={sold} max={raffle.maxTickets} compact />
        <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-accent">
          Enter now <ArrowRight width={16} height={16} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
