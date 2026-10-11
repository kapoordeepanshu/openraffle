"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function Countdown({ endsAt, size = "md" }: { endsAt: string; size?: "sm" | "md" | "lg" }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const end = new Date(endsAt).getTime();
  if (now !== null && end <= now) return <span className="text-sm font-semibold text-accent">Entries closed</span>;
  const p = parts(now === null ? 0 : end - now);
  const cells: [number, string][] = [[p.d, "days"], [p.h, "hrs"], [p.m, "min"], [p.s, "sec"]];
  const num = size === "lg" ? "text-3xl md:text-4xl" : size === "sm" ? "text-base" : "text-2xl";

  return (
    <div className="flex gap-2" aria-label="Time remaining" suppressHydrationWarning>
      {cells.map(([v, l]) => (
        <div key={l} className={`text-center rounded-xl bg-surface-2 border border-line ${size === "sm" ? "px-2 py-1 min-w-11" : "px-3 py-2 min-w-16"}`}>
          <div className={`display ${num} tabular-nums`}>{now === null ? "--" : String(v).padStart(2, "0")}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted mt-1">{l}</div>
        </div>
      ))}
    </div>
  );
}
