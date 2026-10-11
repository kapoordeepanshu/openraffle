"use client";

import { startTransition, useActionState } from "react";
import { saveRaffle } from "@/app/admin/actions";

export type RaffleFormValues = {
  id?: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  images: string;
  specs: string;
  prizeValue: string;
  cashAlternative: string;
  ticketPrice: string;
  maxTickets: string;
  maxPerPerson: string;
  startsAt: string;
  endsAt: string;
  skillQuestion: string;
  skillOptions: string;
  skillAnswer: string;
};

export function RaffleForm({ initial }: { initial: RaffleFormValues }) {
  const [state, run, pending] = useActionState(saveRaffle, null);
  const err = (k: string) => state?.fields?.[k]?.[0] && <p className="text-xs text-accent mt-1.5">{state.fields[k]![0]}</p>;

  const field = (name: keyof RaffleFormValues, label: string, opts: { type?: string; hint?: string; rows?: number; placeholder?: string; step?: string } = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {opts.rows ? (
        <textarea id={name} name={name} rows={opts.rows} defaultValue={initial[name]} placeholder={opts.placeholder} className="input font-mono text-sm" />
      ) : (
        <input id={name} name={name} type={opts.type ?? "text"} step={opts.step} defaultValue={initial[name]} placeholder={opts.placeholder} className="input" />
      )}
      {opts.hint && <p className="text-xs text-muted mt-1.5">{opts.hint}</p>}
      {err(name)}
    </div>
  );

  return (
    <form
      // onSubmit (not action=) so a validation error doesn't wipe what the admin typed
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => run(fd));
      }}
      className="space-y-8 max-w-4xl"
    >
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <section className="card p-6 grid gap-5 md:grid-cols-2">
        <h2 className="display text-lg md:col-span-2">The prize</h2>
        {field("title", "Title", { placeholder: "Porsche 911 GT3" })}
        {field("slug", "URL slug", { placeholder: "porsche-911-gt3", hint: "Used in the raffle's web address" })}
        <div className="md:col-span-2">{field("subtitle", "Subtitle", { placeholder: "2023 · 4.0L flat-six · 503bhp" })}</div>
        <div className="md:col-span-2">{field("description", "Description", { rows: 5 })}</div>
        <div className="md:col-span-2">{field("images", "Image URLs", { rows: 4, hint: "One URL per line. The first image is the cover." })}</div>
        <div className="md:col-span-2">{field("specs", "Specification", { rows: 5, hint: "One per line, as Label: Value", placeholder: "Engine: 4.0L flat-six\nMileage: 3,200" })}</div>
        {field("prizeValue", "Prize value", { type: "number", step: "0.01" })}
        {field("cashAlternative", "Cash alternative", { type: "number", step: "0.01" })}
      </section>

      <section className="card p-6 grid gap-5 md:grid-cols-3">
        <h2 className="display text-lg md:col-span-3">Tickets &amp; timing</h2>
        {field("ticketPrice", "Ticket price", { type: "number", step: "0.01" })}
        {field("maxTickets", "Max tickets", { type: "number" })}
        {field("maxPerPerson", "Max per person", { type: "number" })}
        {field("startsAt", "Opens", { type: "datetime-local" })}
        {field("endsAt", "Closes (draw date)", { type: "datetime-local" })}
      </section>

      <section className="card p-6 grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="display text-lg">Qualifying question</h2>
          <p className="text-xs text-muted mt-1">Recommended in the UK so the raffle counts as a prize competition. Leave blank to turn it off.</p>
        </div>
        <div className="md:col-span-2">{field("skillQuestion", "Question", { placeholder: "Which country is Porsche from?" })}</div>
        {field("skillOptions", "Answer options", { rows: 4, hint: "One per line" })}
        {field("skillAnswer", "Correct answer", { hint: "Must match one option exactly" })}
      </section>

      <div className="flex items-center gap-4">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : initial.id ? "Save changes" : "Create raffle"}</button>
        {state?.error && <span className="text-sm text-accent" role="alert">{state.error}</span>}
        {state?.message && <span className="text-sm text-ok" role="status">{state.message}</span>}
      </div>
    </form>
  );
}
