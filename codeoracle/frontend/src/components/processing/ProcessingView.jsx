import { AlertTriangle, Clock, FileArchive, Github, RotateCcw } from "lucide-react";
import { CodeOrbit } from "./CodeOrbit";
import { ProgressStepper } from "./ProgressStepper";
import { Button } from "../common/Button";
import { Badge } from "../common/Badges";
import { PROCESSING_STEPS, stepIndexForStatus } from "../../hooks/processingSteps";
import { cn } from "../../lib/cn";

function formatElapsed(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function ProcessingView({ job, source, elapsedSeconds, transientError, onCancel, onRetry }) {
  const status = job?.status || "queued";
  const failed = status === "failed";
  const activeIndex = stepIndexForStatus(status);
  const progress = Math.max(0, Math.min(100, Number(job?.progress ?? 0)));

  return (
    <section className="mx-auto max-w-4xl pt-10" aria-labelledby="processing-heading">
      <div className="glass-panel rounded-2xl p-5 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <CodeOrbit />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={source?.kind === "github" ? "purple" : "cyan"} icon={source?.kind === "github" ? Github : FileArchive}>
                {source?.kind === "github" ? "GitHub repository" : "ZIP upload"}
              </Badge>
              <Badge tone={failed ? "danger" : "blue"}>{status.replace(/_/g, " ")}</Badge>
            </div>
            <h1 id="processing-heading" className="mt-3 truncate text-xl font-semibold sm:text-2xl">
              {source?.label || "Analyzing your codebase"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {job?.message || "Waiting for the backend to pick up this job."}
            </p>
            <p className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock size={13} aria-hidden="true" />
                <span className="font-mono tabular-nums">{formatElapsed(elapsedSeconds)}</span> elapsed
              </span>
              <span className="font-mono tabular-nums">{progress}%</span>
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Analysis progress"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700 ease-out",
                failed ? "bg-danger" : "bg-gradient-brand",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-6">
          <ProgressStepper steps={PROCESSING_STEPS} activeIndex={activeIndex} failed={failed} />
        </div>

        {transientError && !failed ? (
          <p className="mt-5 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/8 px-3 py-2.5 text-xs text-warning">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {transientError} Retrying automatically — the backend may still be starting up.
          </p>
        ) : null}

        {failed ? (
          <div className="mt-5 rounded-lg border border-danger/45 bg-danger/8 p-4">
            <p className="text-sm font-semibold text-foreground">Analysis failed</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {job?.error || job?.message || "The backend reported a failure without a message."}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              <RotateCcw size={14} aria-hidden="true" />
              Start a new analysis
            </Button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-border pt-5 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              You can keep this tab open — progress is restored if you refresh.
            </p>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel and start over
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
