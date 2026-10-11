"use client";

import { useActionState, useState } from "react";
import { savePayments } from "@/app/admin/actions";
import { Copy } from "@/components/icons";

export function PaymentsForm({ masked }: { masked: { secretKey: string; webhookSecret: string; publishableKey: string } }) {
  const [state, run, pending] = useActionState(savePayments, null);
  return (
    <form action={run} className="card p-6 space-y-5">
      <div>
        <h2 className="display text-lg">API keys</h2>
        <p className="text-xs text-muted mt-1">
          Find these in Stripe under <strong>Developers → API keys</strong>. Leave a field blank to keep the saved value. Keys are encrypted before they&apos;re stored.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="secretKey">Secret key</label>
        <input id="secretKey" name="secretKey" className="input font-mono text-sm" placeholder={masked.secretKey || "sk_test_… or sk_live_…"} autoComplete="off" spellCheck={false} />
        <p className="text-xs text-muted mt-1.5">A restricted key (rk_…) with Checkout, Refunds and Webhook endpoints write access also works.</p>
      </div>
      <div>
        <label className="label" htmlFor="webhookSecret">Webhook signing secret</label>
        <input id="webhookSecret" name="webhookSecret" className="input font-mono text-sm" placeholder={masked.webhookSecret || "whsec_…"} autoComplete="off" spellCheck={false} />
        <p className="text-xs text-muted mt-1.5">Or use “Create webhook for me” below and we&apos;ll fill this in.</p>
      </div>
      <div>
        <label className="label" htmlFor="publishableKey">Publishable key <span className="text-muted font-normal">(optional)</span></label>
        <input id="publishableKey" name="publishableKey" className="input font-mono text-sm" placeholder={masked.publishableKey || "pk_test_…"} autoComplete="off" spellCheck={false} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Verifying…" : "Save & verify"}</button>
        {state?.error && <span className="text-sm text-accent" role="alert">{state.error}</span>}
        {state?.message && <span className="text-sm text-ok" role="status">{state.message}</span>}
      </div>
    </form>
  );
}

export function CopyField({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex gap-2">
      <code className="input !min-h-10 flex items-center text-xs overflow-x-auto whitespace-nowrap">{value}</code>
      <button
        type="button"
        className="btn btn-ghost !min-h-10 !px-3 shrink-0"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }}
        aria-label="Copy"
      >
        <Copy width={16} height={16} /> <span className="text-xs">{done ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}
