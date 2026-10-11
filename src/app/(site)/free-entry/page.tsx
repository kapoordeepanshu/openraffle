import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { config } from "@/config";

export const metadata: Metadata = { title: "Free postal entry" };

export default function FreeEntry() {
  if (!config.freeEntry.enabled) notFound();
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="eyebrow">No purchase necessary</p>
      <h1 className="display text-4xl md:text-6xl mt-3">Free postal entry</h1>
      <p className="text-muted mt-6 text-lg">Every raffle can be entered free of charge by post. Postal entries have exactly the same chance of winning as paid entries.</p>
      <ol className="mt-10 space-y-4 list-decimal pl-5 text-muted leading-relaxed">
        <li>Write your <strong className="text-fg">full name, email address, phone number</strong> and the <strong className="text-fg">name of the raffle</strong> on an unenclosed postcard.</li>
        <li>Include your <strong className="text-fg">answer to the raffle&apos;s question</strong>, if it has one.</li>
        <li>Send it by first or second class post to the address below. One postcard = one entry. Postcards must arrive before the raffle closes.</li>
      </ol>
      <div className="card p-6 mt-10">
        <p className="eyebrow mb-2">Send to</p>
        <address className="not-italic text-lg">{config.freeEntry.address}</address>
      </div>
      <p className="text-sm text-muted mt-8">Bulk entries, illegible entries and entries without all required details are not accepted. You&apos;ll get an email with your ticket number once your entry is processed.</p>
    </div>
  );
}
