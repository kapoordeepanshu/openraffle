"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { addEntry } from "@/app/admin/actions";

export function EntryAdder({ raffleId, options }: { raffleId: string; options: string[] }) {
  const [state, run, pending] = useActionState(addEntry, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => run(fd));
      }}
      className="card p-6 space-y-4"
    >
      <div>
        <h2 className="display text-lg">Add an entry</h2>
        <p className="text-xs text-muted mt-1">Record a free postal entry or add tickets manually.</p>
      </div>
      <input type="hidden" name="raffleId" value={raffleId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" placeholder="Full name" className="input" required />
        <input name="email" type="email" placeholder="Email" className="input" required />
        <input name="phone" placeholder="Phone (optional)" className="input" />
        <input name="quantity" type="number" min={1} defaultValue={1} className="input" aria-label="Tickets" />
        {options.length > 0 && (
          <select name="answer" className="input" defaultValue="">
            <option value="">Answer given…</option>
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
        )}
        <select name="source" className="input" defaultValue="FREE">
          <option value="FREE">Free postal entry</option>
          <option value="MANUAL">Manual (e.g. phone sale)</option>
        </select>
      </div>
      <div className="flex items-center gap-4">
        <button className="btn btn-ghost" disabled={pending}>{pending ? "Adding…" : "Add entry"}</button>
        {state?.error && <span className="text-sm text-accent" role="alert">{state.error}</span>}
        {state?.message && <span className="text-sm text-ok" role="status">{state.message}</span>}
      </div>
    </form>
  );
}
