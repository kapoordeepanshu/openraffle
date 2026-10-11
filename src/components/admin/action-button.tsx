"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/admin/actions";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label: string;
  variant?: "primary" | "ghost" | "danger";
  confirm?: string;
  small?: boolean;
};

/** A one-button form for admin actions, with inline success/error feedback. */
export function ActionButton({ action, fields, label, variant = "ghost", confirm, small }: Props) {
  const [state, run, pending] = useActionState(action, null);
  const cls =
    variant === "primary" ? "btn btn-primary" : variant === "danger" ? "btn border border-accent/50 text-accent hover:bg-accent/10" : "btn btn-ghost";
  return (
    <form
      action={run}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-flex flex-col gap-1.5"
    >
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" disabled={pending} className={`${cls} ${small ? "!min-h-8 !px-3 text-xs" : ""}`}>
        {pending ? "Working…" : label}
      </button>
      {state?.error && <span className="text-xs text-accent" role="alert">{state.error}</span>}
      {state?.message && <span className="text-xs text-ok" role="status">{state.message}</span>}
    </form>
  );
}
