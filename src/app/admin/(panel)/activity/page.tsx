import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { PageHeader, Table } from "@/components/admin/ui";

export default async function Activity() {
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  return (
    <>
      <PageHeader title="Activity" subtitle="Audit trail of payments, entries, draws and admin actions." />
      <Table head={["When", "Action", "Actor", "Detail"]} empty={!logs.length}>
        {logs.map((l) => (
          <tr key={l.id}>
            <td className="px-4 py-3 text-muted whitespace-nowrap">{dateTime(l.createdAt)}</td>
            <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
            <td className="px-4 py-3">{l.actor}</td>
            <td className="px-4 py-3 text-xs text-muted break-all max-w-md">{l.detail ?? [l.raffleId, l.orderId].filter(Boolean).join(" · ")}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
