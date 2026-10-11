import Link from "next/link";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="display text-3xl">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="display text-3xl mt-3 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted mt-2">{hint}</p>}
    </div>
  );
}

const TONES: Record<string, string> = {
  LIVE: "bg-ok/15 text-ok",
  PAID: "bg-ok/15 text-ok",
  DRAFT: "bg-white/10 text-muted",
  PENDING: "bg-warn/15 text-warn",
  CLOSED: "bg-warn/15 text-warn",
  DRAWN: "bg-gold/15 text-gold",
  CANCELLED: "bg-accent/15 text-accent",
  REFUNDED: "bg-accent/15 text-accent",
  OVERSOLD: "bg-accent/15 text-accent",
  FAILED: "bg-accent/15 text-accent",
  EXPIRED: "bg-white/10 text-muted",
};

export function Badge({ value }: { value: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${TONES[value] ?? "bg-white/10"}`}>{value}</span>;
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted border-b border-line">
            {head.map((h) => <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-sm text-muted">Nothing here yet.</p>}
    </div>
  );
}

export const linkCls = "text-fg hover:text-accent underline-offset-4 hover:underline";
export { Link };
