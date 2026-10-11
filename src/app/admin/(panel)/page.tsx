import { db } from "@/lib/db";
import { dateTime, money } from "@/lib/format";
import { Badge, Link, PageHeader, Stat, Table, linkCls } from "@/components/admin/ui";

export default async function Dashboard() {
  const since = new Date(Date.now() - 24 * 3600_000);
  const [revenue, tickets, live, today, oversold, recent, raffles] = await Promise.all([
    db.order.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
    db.ticket.count({ where: { order: { status: "PAID" } } }),
    db.raffle.count({ where: { status: "LIVE" } }),
    db.order.aggregate({ where: { status: "PAID", paidAt: { gte: since } }, _sum: { amountCents: true }, _count: true }),
    db.order.count({ where: { status: "OVERSOLD" } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { raffle: { select: { title: true, id: true } } } }),
    db.raffle.findMany({ where: { status: { in: ["LIVE", "CLOSED"] } }, orderBy: { endsAt: "asc" }, include: { _count: { select: { tickets: true } } } }),
  ]);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Everything happening across your raffles." actions={<Link href="/admin/raffles/new" className="btn btn-primary">New raffle</Link>} />

      {oversold > 0 && (
        <p className="mb-6 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          {oversold} order{oversold > 1 ? "s" : ""} paid after a raffle sold out and need{oversold > 1 ? "" : "s"} a refund. <Link className="underline" href="/admin/orders?status=OVERSOLD">Review</Link>
        </p>
      )}

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <Stat label="Total revenue" value={money(revenue._sum.amountCents ?? 0)} />
        <Stat label="Last 24 hours" value={money(today._sum.amountCents ?? 0)} hint={`${today._count} paid orders`} />
        <Stat label="Tickets sold" value={tickets.toLocaleString()} />
        <Stat label="Live raffles" value={String(live)} />
      </div>

      <h2 className="display text-lg mt-12 mb-4">Live &amp; closing</h2>
      <Table head={["Raffle", "Status", "Sold", "Ends", ""]} empty={!raffles.length}>
        {raffles.map((r) => {
          const pct = Math.round((r._count.tickets / r.maxTickets) * 100);
          return (
            <tr key={r.id}>
              <td className="px-4 py-3"><Link className={linkCls} href={`/admin/raffles/${r.id}`}>{r.title}</Link></td>
              <td className="px-4 py-3"><Badge value={r.status} /></td>
              <td className="px-4 py-3 min-w-44">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
                  <span className="text-xs text-muted tabular-nums">{r._count.tickets}/{r.maxTickets}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted whitespace-nowrap">{dateTime(r.endsAt)}</td>
              <td className="px-4 py-3 text-right"><Link className={linkCls} href={`/admin/raffles/${r.id}`}>Manage</Link></td>
            </tr>
          );
        })}
      </Table>

      <h2 className="display text-lg mt-12 mb-4">Latest orders</h2>
      <Table head={["Reference", "Customer", "Raffle", "Qty", "Amount", "Status", "When"]} empty={!recent.length}>
        {recent.map((o) => (
          <tr key={o.id}>
            <td className="px-4 py-3 font-mono text-xs">{o.reference}</td>
            <td className="px-4 py-3">{o.name}<div className="text-xs text-muted">{o.email}</div></td>
            <td className="px-4 py-3"><Link className={linkCls} href={`/admin/raffles/${o.raffle.id}`}>{o.raffle.title}</Link></td>
            <td className="px-4 py-3 tabular-nums">{o.quantity}</td>
            <td className="px-4 py-3 tabular-nums">{money(o.amountCents)}</td>
            <td className="px-4 py-3"><Badge value={o.status} /></td>
            <td className="px-4 py-3 text-muted whitespace-nowrap">{dateTime(o.createdAt)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
