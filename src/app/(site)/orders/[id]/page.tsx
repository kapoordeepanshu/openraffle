import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrderForCustomer } from "@/lib/orders";
import { dateTime, money, ticketNo } from "@/lib/format";
import { Check, Clock, Download } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your entry", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token = "" } = await searchParams;
  const order = await getOrderForCustomer(id, token);
  if (!order) notFound();

  const paid = order.status === "PAID";
  const pending = order.status === "PENDING";

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      {pending && <meta httpEquiv="refresh" content="3" />}
      <div className="card p-8 md:p-10 text-center">
        <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${paid ? "bg-ok/15 text-ok ring-pulse pop" : "bg-warn/15 text-warn"}`}>
          {paid ? <Check width={28} height={28} /> : <Clock width={28} height={28} />}
        </div>
        <h1 className="display text-3xl md:text-4xl mt-6">
          {paid ? "You're in!" : pending ? "Confirming payment…" : `Order ${order.status.toLowerCase()}`}
        </h1>
        <p className="text-muted mt-3">
          {paid
            ? `Good luck, ${order.name.split(" ")[0]}. Here are your tickets for ${order.raffle.title}.`
            : pending
              ? "This usually takes a few seconds. The page will refresh automatically."
              : "This order didn't complete. If you were charged, please contact us with your reference."}
        </p>

        {paid && (
          <>
            {!order.skillCorrect && (
              <p className="mt-6 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
                Your answer to the qualifying question was incorrect, so these tickets aren&apos;t eligible for the draw.
              </p>
            )}
            <ul className="mt-8 flex flex-wrap justify-center gap-2" aria-label="Your ticket numbers">
              {order.tickets.map((t, i) => (
                <li key={t.id} className="pop rounded-lg border border-line-strong bg-surface-2 px-3 py-1.5 display text-sm tabular-nums" style={{ animationDelay: `${Math.min(i, 40) * 45}ms` }}>
                  {ticketNo(t.number)}
                </li>
              ))}
            </ul>
            <a href={`/api/orders/${order.id}/receipt?token=${token}`} className="btn btn-primary mt-8">
              <Download width={18} height={18} /> Download PDF receipt
            </a>
          </>
        )}

        <dl className="mt-10 grid grid-cols-2 gap-4 text-left text-sm border-t border-line pt-6">
          <div><dt className="text-muted">Reference</dt><dd className="font-semibold">{order.reference}</dd></div>
          <div><dt className="text-muted">Total</dt><dd className="font-semibold">{money(order.amountCents)}</dd></div>
          <div><dt className="text-muted">Tickets</dt><dd className="font-semibold">{order.quantity}</dd></div>
          <div><dt className="text-muted">Draw</dt><dd className="font-semibold">{dateTime(order.raffle.endsAt)}</dd></div>
        </dl>
      </div>
      <p className="text-center mt-6 text-sm text-muted">
        Bookmark this page to see your tickets any time. <Link className="underline" href={`/raffles/${order.raffle.slug}`}>Back to the raffle</Link>
      </p>
    </div>
  );
}
