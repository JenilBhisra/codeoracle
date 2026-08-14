import { Check, Loader2, Circle } from "lucide-react";
import { cn } from "../../lib/cn";

export function ProgressStepper({ steps, activeIndex, failed }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2">
      {steps.map((step, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li
            key={step.key}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
              active && !failed && "border-purple/50 bg-purple/8",
              active && failed && "border-danger/50 bg-danger/8",
              done && "border-border bg-surface/60",
              !done && !active && "border-border/60 bg-surface/30",
            )}
            aria-current={active ? "step" : undefined}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden="true">
              {done ? (
                <Check size={15} className="text-success" />
              ) : active && !failed ? (
                <Loader2 size={15} className="animate-spin text-purple" />
              ) : (
                <Circle size={12} className={failed && active ? "text-danger" : "text-muted-foreground/60"} />
              )}
            </span>
            <span
              className={cn(
                "text-sm",
                done || active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
