export function SoldProgress({ sold, max, compact = false }: { sold: number; max: number; compact?: boolean }) {
  const pct = max ? Math.min(100, Math.round((sold / max) * 100)) : 0;
  return (
    <div>
      <div className={`flex justify-between ${compact ? "text-xs" : "text-sm"} text-muted mb-2`}>
        <span>
          <strong className="text-fg font-semibold">{sold.toLocaleString()}</strong> / {max.toLocaleString()} sold
        </span>
        <span className={pct >= 80 ? "text-accent font-semibold" : ""}>{pct}%</span>
      </div>
      <div
        className="h-1.5 rounded-full bg-surface-2 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Tickets sold"
      >
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#ff7a45]" style={{ width: `${pct}%`, animation: "fill 1.2s cubic-bezier(.2,.7,.2,1) both" }} />
      </div>
    </div>
  );
}
