import type { Raffle } from "@prisma/client";
import type { RaffleFormValues } from "@/components/admin/raffle-form";
import { images, skillOptions, specs } from "./raffle";

const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const amount = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));

export function toFormValues(r?: Raffle | null): RaffleFormValues {
  const start = r?.startsAt ?? new Date();
  const end = r?.endsAt ?? new Date(Date.now() + 14 * 86400_000);
  return {
    id: r?.id,
    title: r?.title ?? "",
    slug: r?.slug ?? "",
    subtitle: r?.subtitle ?? "",
    description: r?.description ?? "",
    images: r ? images(r).join("\n") : "",
    specs: r ? specs(r).map((s) => `${s.label}: ${s.value}`).join("\n") : "",
    prizeValue: amount(r?.prizeValueCents),
    cashAlternative: amount(r?.cashAlternativeCents),
    ticketPrice: amount(r?.ticketPriceCents ?? 299),
    maxTickets: String(r?.maxTickets ?? 5000),
    maxPerPerson: String(r?.maxPerPerson ?? 100),
    startsAt: local(start),
    endsAt: local(end),
    skillQuestion: r?.skillQuestion ?? "",
    skillOptions: r ? skillOptions(r).join("\n") : "",
    skillAnswer: r?.skillAnswer ?? "",
  };
}
