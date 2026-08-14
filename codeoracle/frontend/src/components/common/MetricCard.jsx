import { cn } from "../../lib/cn";

const accents = {
  purple: "text-purple",
  cyan: "text-cyan",
  blue: "text-blue",
  magenta: "text-magenta",
  success: "text-success",
  warning: "text-warning",
  neutral: "text-muted-foreground",
};

export function MetricCard({ label, value, hint, icon: Icon, accent = "purple", badge }) {
  const display = value === null || value === undefined || value === "" ? "—" : value;
  const unavailable = display === "—";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        {Icon ? <Icon size={16} className={cn(accents[accent])} aria-hidden="true" /> : null}
      </div>
      <p
        className={cn(
          "mt-3 font-mono text-2xl font-semibold tabular-nums",
          unavailable ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {display}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        {badge}
        <span className="text-xs text-muted-foreground">{unavailable ? "Not available" : hint}</span>
      </div>
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-brand opacity-0 transition-opacity group-hover:opacity-80"
        aria-hidden="true"
      />
    </div>
  );
}
