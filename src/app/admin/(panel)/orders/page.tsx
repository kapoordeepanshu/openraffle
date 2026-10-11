import { db } from "@/lib/db";
import { dateTime, money } from "@/lib/format";
import { Badge, Link, PageHeader, Table, linkCls } from "@/components/admin/ui";

type Props = { searchParams: Promise<{ q?: string; status?: string }> };

export default async function Orders({ searchParams }: Props) {
  const { q = "", status = "" } = await searchParams;
  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q.toLowerCase() } }, { reference: { contains: q.toUpperCase() } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { raffle: { select: { id: true, title: true } } },
  });
  return (
    <>
      <PageHeader title="Orders" subtitle="Every checkout across all raffles (latest 300)." />
      <form className="flex flex-wrap gap-2 mb-4">
        <input name="q" defaultValue={q} placeholder="Search name, email or ref" className="input !min-h-10 w-64" />
        <select name="status" defaultValue={status} className="input !min-h-10 w-40">
          <option value="">All statuses</option>
          {["PAID", "PENDING", "REFUNDED", "OVERSOLD", "EXPIRED", "FAILED"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn btn-ghost !min-h-10">Filter</button>
      </form>
      <Table head={["Reference", "Customer", "Raffle", "Qty", "Amount", "Source", "Status", "Created"]} empty={!orders.length}>
        {orders.map((o) => (
          <tr key={o.id}>
            <td className="px-4 py-3 font-mono text-xs">{o.reference}</td>
            <td className="px-4 py-3">{o.name}<div className="text-xs text-muted">{o.email}</div></td>
            <td className="px-4 py-3"><Link className={linkCls} href={`/admin/raffles/${o.raffle.id}`}>{o.raffle.title}</Link></td>
            <td className="px-4 py-3 tabular-nums">{o.quantity}</td>
            <td className="px-4 py-3 tabular-nums">{money(o.amountCents)}</td>
            <td className="px-4 py-3 text-xs">{o.source}</td>
            <td className="px-4 py-3"><Badge value={o.status} /></td>
            <td className="px-4 py-3 text-muted whitespace-nowrap">{dateTime(o.createdAt)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
