import { PageHeader } from "@/components/admin/ui";
import { RaffleForm } from "@/components/admin/raffle-form";
import { toFormValues } from "@/lib/raffle-form-values";

export default function NewRaffle() {
  return (
    <>
      <PageHeader title="New raffle" subtitle="Raffles start as drafts. Publish when you're ready." />
      <RaffleForm initial={toFormValues()} />
    </>
  );
}
