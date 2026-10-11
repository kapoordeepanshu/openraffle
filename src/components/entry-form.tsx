"use client";

import { useMemo, useState } from "react";
import { Lock, Minus, Plus } from "./icons";

type Props = {
  raffleId: string;
  priceCents: number;
  currency: string;
  locale: string;
  maxPerPerson: number;
  maxTickets: number;
  remaining: number;
  minAge: number;
  skillQuestion?: string | null;
  skillOptions: string[];
  freeEntry: boolean;
  demo: boolean;
};

const PRESETS = [1, 5, 10, 25, 50];

export function EntryForm(p: Props) {
  const max = Math.max(1, Math.min(p.maxPerPerson, p.remaining));
  const [qty, setQty] = useState(Math.min(5, max));
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});

  const fmt = useMemo(
    () => new Intl.NumberFormat(p.locale, { style: "currency", currency: p.currency.toUpperCase() }),
    [p.locale, p.currency],
  );
  const set = (n: number) => setQty(Math.max(1, Math.min(max, n)));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFields({});
    const f = new FormData(e.currentTarget);
    if (p.skillQuestion && p.skillOptions.length && !answer) {
      setError("Please answer the question to enter.");
      return;
    }
    setBusy(true);
    navigator.vibrate?.(10);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raffleId: p.raffleId,
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          quantity: qty,
          answer: answer || undefined,
          ageConfirmed: f.get("age") === "on",
          termsAccepted: f.get("terms") === "on",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setFields(data.fields ?? {});
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  if (p.remaining <= 0) {
    return <p className="card p-6 text-center font-semibold">Sold out. Thanks to everyone who entered!</p>;
  }

  const err = (k: string) => fields[k]?.[0] && <p className="text-xs text-accent mt-1.5" role="alert">{fields[k]![0]}</p>;

  return (
    <form id="enter" onSubmit={submit} className="space-y-6 scroll-mt-24" noValidate>
      {/* quantity */}
      <fieldset>
        <legend className="label">How many tickets?</legend>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => set(qty - 1)} className="btn btn-ghost !px-0 w-12" aria-label="Fewer tickets"><Minus /></button>
          <input
            aria-label="Ticket quantity"
            inputMode="numeric"
            className="input text-center display text-2xl !min-h-12"
            value={qty}
            onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")) || 1)}
          />
          <button type="button" onClick={() => set(qty + 1)} className="btn btn-ghost !px-0 w-12" aria-label="More tickets"><Plus /></button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {PRESETS.filter((n) => n <= max).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set(n)}
              aria-pressed={qty === n}
              className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${qty === n ? "bg-fg text-bg border-fg" : "border-line-strong text-muted hover:text-fg"}`}
            >
              {n}
            </button>
          ))}
        </div>
        {max > 1 && (
          <input
            type="range"
            min={1}
            max={max}
            value={qty}
            onChange={(e) => set(Number(e.target.value))}
            className="range mt-5"
            aria-label="Ticket quantity slider"
            style={{ background: `linear-gradient(90deg, var(--color-accent) ${((qty - 1) / (max - 1)) * 100}%, var(--color-surface-2) 0)` }}
          />
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2 px-4 py-3">
            <p className="text-[11px] uppercase tracking-widest text-muted">Your odds</p>
            <p className="display text-lg mt-1 tabular-nums" aria-live="polite">1 in {Math.max(1, Math.round(p.maxTickets / qty)).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-surface-2 px-4 py-3">
            <p className="text-[11px] uppercase tracking-widest text-muted">Total</p>
            <p className="display text-lg mt-1 tabular-nums text-accent" aria-live="polite">{fmt.format((p.priceCents * qty) / 100)}</p>
          </div>
        </div>
        <p className="text-xs text-muted mt-2">Max {p.maxPerPerson} per person · {p.remaining.toLocaleString()} left · odds assume every ticket sells</p>
      </fieldset>

      {/* skill question */}
      {p.skillQuestion && p.skillOptions.length > 0 && (
        <fieldset>
          <legend className="label">{p.skillQuestion}</legend>
          <div className="grid gap-2">
            {p.skillOptions.map((o) => (
              <label
                key={o}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${answer === o ? "border-accent bg-accent/10" : "border-line hover:border-line-strong"}`}
              >
                <input type="radio" name="answer" value={o} checked={answer === o} onChange={() => setAnswer(o)} className="accent-[var(--color-accent)]" />
                <span className="text-sm">{o}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted mt-2">Only correct answers are entered into the draw.</p>
        </fieldset>
      )}

      {/* details */}
      <div className="grid gap-4">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" name="name" className="input" autoComplete="name" required />
          {err("name")}
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" required />
          {err("email")}
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone <span className="text-muted font-normal">(so we can call the winner)</span></label>
          <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" />
          {err("phone")}
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <label className="flex gap-3 items-start cursor-pointer">
          <input type="checkbox" name="age" className="mt-1 accent-[var(--color-accent)]" required />
          <span>I confirm I am {p.minAge} or over.</span>
        </label>
        {err("ageConfirmed")}
        <label className="flex gap-3 items-start cursor-pointer">
          <input type="checkbox" name="terms" className="mt-1 accent-[var(--color-accent)]" required />
          <span>I accept the <a href="/terms" target="_blank" className="underline">terms &amp; conditions</a>.</span>
        </label>
        {err("termsAccepted")}
      </div>

      {error && <p className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm" role="alert">{error}</p>}

      <button type="submit" disabled={busy} className="btn btn-primary w-full !min-h-14 text-base">
        <Lock width={18} height={18} />
        {busy ? "Starting secure checkout…" : `Pay ${fmt.format((p.priceCents * qty) / 100)}`}
      </button>
      <p className="text-xs text-center text-muted">
        {p.demo ? "Demo mode: no real payment will be taken." : "Secure payment by Stripe. Cards, Apple Pay and Google Pay accepted."}
        {p.freeEntry && <> · <a href="/free-entry" className="underline">Free entry route</a></>}
      </p>
    </form>
  );
}
