import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { dateTime, money, parseJson, ticketNo } from "@/lib/format";
import { capacity, skillOptions } from "@/lib/raffle";
import type { DrawProof } from "@/lib/draw";
import { draw, refundOrder, resendReceipt, setStatus } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/action-button";
import { EntryAdder } from "@/components/admin/entry-adder";
import { Badge, Link, PageHeader, Stat, Table } from "@/components/admin/ui";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string; status?: string }> };

export default async function RaffleAdmin({ params, searchParams }: Props) {
  const { id } = await params;
  const { q = "", status = "" } = await searchParams;
  const r = await db.raffle.findUnique({ where: { id }, include: { winnerTicket: { include: { order: true } } } });
  if (!r) notFound();

  const where = {
    raffleId: id,
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q.toLowerCase() } }, { reference: { contains: q.toUpperCase() } }] } : {}),
  };
  const [cap, revenue, orders, eligible] = await Promise.all([
    capacity(id, r.maxTickets),
    db.order.aggregate({ where: { raffleId: id, status: "PAID" }, _sum: { amountCents: true } }),
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { tickets: { orderBy: { number: "asc" } } } }),
    db.ticket.count({ where: { raffleId: id, order: { status: "PAID", skillCorrect: true } } }),
  ]);
  const proof = parseJson<DrawProof | null>(r.drawProof, null);

  const statusButtons: [string, string, "primary" | "ghost" | "danger", string?][] = (
    {
      DRAFT: [["LIVE", "Publish", "primary"]],
      LIVE: [["CLOSED", "Close entries", "ghost", "Close entries now? Customers won't be able to buy more tickets."]],
      CLOSED: [["LIVE", "Reopen", "ghost"]],
      DRAWN: [],
      CANCELLED: [["DRAFT", "Restore as draft", "ghost"]],
    } as Record<string, [string, string, "primary" | "ghost" | "danger", string?][]>
  )[r.status] ?? [];

  return (
    <>
      <PageHeader
        title={r.title}
        subtitle={`/${r.slug} · closes ${dateTime(r.endsAt)}`}
        actions={
          <>
            <Badge value={r.status} />
            <Link href={`/raffles/${r.slug}`} className="btn btn-ghost" target="_blank">View</Link>
            <Link href={`/admin/raffles/${r.id}/edit`} className="btn btn-ghost">Edit</Link>
            <a href={`/api/admin/raffles/${r.id}/export`} className="btn btn-ghost">Export CSV</a>
          </>
        }
      />

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue" value={money(revenue._sum.amountCents ?? 0)} />
        <Stat label="Tickets sold" value={`${cap.sold.toLocaleString()}`} hint={`of ${r.maxTickets.toLocaleString()} · ${cap.reserved} held in checkout`} />
        <Stat label="Eligible for draw" value={eligible.toLocaleString()} hint="Paid, correct answer" />
        <Stat label="Ticket price" value={money(r.ticketPriceCents)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2 mt-8">
        <div className="card p-6 space-y-5">
          <h2 className="display text-lg">Status &amp; draw</h2>
          {r.status === "DRAWN" && r.winnerTicket ? (
            <div className="space-y-2 text-sm">
              <p>Winner: <strong>{r.winnerTicket.order.name}</strong> ({r.winnerTicket.order.email}, {r.winnerTicket.order.phone ?? "no phone"})</p>
              <p>Winning ticket <strong>{ticketNo(r.winnerTicket.number)}</strong> · order {r.winnerTicket.order.reference}</p>
              {proof && <p className="text-xs text-muted break-all">Seed {proof.seed} · entry list hash {proof.entryListHash}</p>}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 items-start">
              {statusButtons.map(([to, label, variant, confirm]) => (
                <ActionButton key={to} action={setStatus} fields={{ id: r.id, status: to }} label={label} variant={variant} confirm={confirm} />
              ))}
              {r.status === "CLOSED" && (
                <ActionButton action={draw} fields={{ id: r.id }} label="Draw winner" variant="primary" confirm={`Draw a winner from ${eligible} eligible tickets? This can't be undone.`} />
              )}
              {r.status !== "CANCELLED" && (
                <ActionButton action={setStatus} fields={{ id: r.id, status: "CANCELLED" }} label="Cancel raffle" variant="danger" confirm="Cancel this raffle? You'll need to refund paid orders." />
              )}
            </div>
          )}
          <p className="text-xs text-muted">Flow: Draft → Live → Closed → Drawn. Draws use a cryptographically secure RNG and are recorded in the activity log.</p>
        </div>
        <EntryAdder raffleId={r.id} options={skillOptions(r)} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 mt-12 mb-4">
        <h2 className="display text-lg">Entries</h2>
        <form className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Search name, email or ref" className="input !min-h-10 w-64" />
          <select name="status" defaultValue={status} className="input !min-h-10 w-40">
            <option value="">All statuses</option>
            {["PAID", "PENDING", "REFUNDED", "OVERSOLD", "EXPIRED", "FAILED"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-ghost !min-h-10">Filter</button>
        </form>
      </div>
      <Table head={["Ref", "Customer", "Tickets", "Amount", "Source", "Answer", "Status", "", ""]} empty={!orders.length}>
        {orders.map((o) => (
          <tr key={o.id} className="align-top">
            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{o.reference}<div className="text-muted font-sans">{dateTime(o.createdAt)}</div></td>
            <td className="px-4 py-3">{o.name}<div className="text-xs text-muted">{o.email}{o.phone ? ` · ${o.phone}` : ""}</div></td>
            <td className="px-4 py-3 text-xs max-w-56">
              <span className="font-semibold">{o.quantity}</span>
              {o.tickets.length > 0 && <div className="text-muted mt-1 break-words">{o.tickets.slice(0, 12).map((t) => ticketNo(t.number)).join(" ")}{o.tickets.length > 12 ? " …" : ""}</div>}
            </td>
            <td className="px-4 py-3 tabular-nums">{money(o.amountCents)}</td>
            <td className="px-4 py-3 text-xs">{o.source}</td>
            <td className="px-4 py-3 text-xs">{o.skillAnswer ? (o.skillCorrect ? <span className="text-ok">✓ correct</span> : <span className="text-accent">✗ wrong</span>) : "—"}</td>
            <td className="px-4 py-3"><Badge value={o.status} /></td>
            <td className="px-4 py-3">
              {o.status === "PAID" && <ActionButton action={resendReceipt} fields={{ id: o.id }} label="Email receipt" small />}
            </td>
            <td className="px-4 py-3">
              {(o.status === "PAID" || o.status === "OVERSOLD") && r.status !== "DRAWN" && (
                <ActionButton action={refundOrder} fields={{ id: o.id }} label="Refund" variant="danger" small confirm={`Refund ${o.reference} (${money(o.amountCents)})?`} />
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
