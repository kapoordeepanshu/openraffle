import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Link, PageHeader } from "@/components/admin/ui";
import { RaffleForm } from "@/components/admin/raffle-form";
import { toFormValues } from "@/lib/raffle-form-values";

export default async function EditRaffle({ params }: { params: Promise<{ id: string }> }) {
  const r = await db.raffle.findUnique({ where: { id: (await params).id } });
  if (!r) notFound();
  return (
    <>
      <PageHeader title={`Edit: ${r.title}`} actions={<Link href={`/admin/raffles/${r.id}`} className="btn btn-ghost">Back to raffle</Link>} />
      <RaffleForm initial={toFormValues(r)} />
    </>
  );
}
