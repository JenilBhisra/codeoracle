import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../lib/cn";

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground">
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry, className }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border border-danger/40 bg-danger/8 p-5 sm:flex-row sm:items-center",
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger/15 text-danger">
        <AlertCircle size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {message ? <p className="mt-1 text-sm break-words text-muted-foreground">{message}</p> : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-lg bg-surface-2", className)}
      aria-hidden="true"
    >
      <span className="absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-foreground/8 to-transparent animate-shimmer" />
    </div>
  );
}

export function SkeletonBlock({ lines = 4 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={index % 3 === 2 ? "h-4 w-2/3" : "h-4 w-full"} />
      ))}
    </div>
  );
}
