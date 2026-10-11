import { db } from "@/lib/db";
import { dateTime, money } from "@/lib/format";
import { Badge, Link, PageHeader, Table, linkCls } from "@/components/admin/ui";

export default async function Raffles() {
  const raffles = await db.raffle.findMany({
    orderBy: [{ status: "asc" }, { endsAt: "desc" }],
    include: { _count: { select: { tickets: true } } },
  });
  return (
    <>
      <PageHeader title="Raffles" subtitle={`${raffles.length} total`} actions={<Link href="/admin/raffles/new" className="btn btn-primary">New raffle</Link>} />
      <Table head={["Raffle", "Status", "Price", "Sold", "Ends", ""]} empty={!raffles.length}>
        {raffles.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3"><Link className={linkCls} href={`/admin/raffles/${r.id}`}>{r.title}</Link><div className="text-xs text-muted">/{r.slug}</div></td>
            <td className="px-4 py-3"><Badge value={r.status} /></td>
            <td className="px-4 py-3 tabular-nums">{money(r.ticketPriceCents)}</td>
            <td className="px-4 py-3 tabular-nums">{r._count.tickets.toLocaleString()} / {r.maxTickets.toLocaleString()}</td>
            <td className="px-4 py-3 text-muted whitespace-nowrap">{dateTime(r.endsAt)}</td>
            <td className="px-4 py-3 text-right whitespace-nowrap"><Link className={linkCls} href={`/admin/raffles/${r.id}/edit`}>Edit</Link></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
