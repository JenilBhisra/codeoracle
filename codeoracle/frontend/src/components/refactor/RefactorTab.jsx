import { useState } from "react";
import { AlertOctagon, GitCompareArrows, Info, ShieldCheck, Wand2 } from "lucide-react";
import { Badge, LanguageBadge, RiskBadge } from "../common/Badges";
import { CodeBlock } from "../common/CodeBlock";
import { EmptyState, SkeletonBlock } from "../common/States";
import { cn } from "../../lib/cn";

const VIEWS = [
  { id: "refactored", label: "Refactored" },
  { id: "original", label: "Original" },
];

export function RefactorTab({ files = [], loading }) {
  const [selectedId, setSelectedId] = useState(files[0]?.id ?? null);
  const [view, setView] = useState("refactored");

  if (loading) return <SkeletonBlock lines={8} />;

  if (!files.length) {
    return (
      <EmptyState
        icon={Wand2}
        title="No refactor proposals"
        description="The analysis did not produce refactoring suggestions for this codebase."
      />
    );
  }

  const selected = files.find((file) => file.id === selectedId) ?? files[0];
  const showingOriginal = view === "original" && selected.original_code;

  return (
    <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
      <div className="rounded-xl border border-border bg-card p-3">
        <label
          htmlFor="refactor-file-select"
          className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground lg:hidden"
        >
          Refactored file
        </label>
        <select
          id="refactor-file-select"
          value={selected.id}
          onChange={(event) => setSelectedId(event.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-input bg-background/60 px-2 text-sm lg:hidden"
        >
          {files.map((file) => (
            <option key={file.id} value={file.id}>
              {file.path}
            </option>
          ))}
        </select>

        <ul className="hidden space-y-1 lg:block" aria-label="Refactored files">
          {files.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                aria-current={file.id === selected.id}
                onClick={() => setSelectedId(file.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left transition-colors",
                  file.id === selected.id
                    ? "bg-purple/12 text-foreground"
                    : "text-muted-foreground hover:bg-surface-2",
                )}
              >
                <span className="block truncate font-mono text-xs">{file.path}</span>
                <span className="mt-1 block">
                  <RiskBadge risk={file.risk} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-sm font-semibold">{selected.path}</h3>
            <LanguageBadge language={selected.language} />
            <RiskBadge risk={selected.risk} />
            {selected.requires_human_review ? (
              <Badge tone="warning" icon={ShieldCheck}>
                Human review required
              </Badge>
            ) : null}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-foreground/90">
            {selected.summary || "No refactor summary provided."}
          </p>

          {selected.benefit ? (
            <p className="mt-3 flex gap-2 rounded-lg border border-success/30 bg-success/6 p-3 text-xs leading-relaxed text-success">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {selected.benefit}
            </p>
          ) : null}

          {selected.breaking_changes?.length ? (
            <div className="mt-3 rounded-lg border-2 border-danger/45 bg-danger/8 p-3">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-danger">
                <AlertOctagon size={14} aria-hidden="true" />
                Breaking changes
              </h4>
              <ul className="mt-2 space-y-1.5">
                {selected.breaking_changes.map((item) => (
                  <li key={item} className="text-xs leading-relaxed text-foreground/90">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No breaking changes reported.</p>
          )}

          {selected.impact_areas?.length ? (
            <div className="mt-3">
              <h4 className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Review these areas
              </h4>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {selected.impact_areas.map((area) => (
                  <Badge key={area} tone="warning">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Migration notes
              </h4>
              <ul className="mt-1.5 space-y-1">
                {selected.migration_notes?.length ? (
                  selected.migration_notes.map((note) => (
                    <li key={note} className="text-xs leading-relaxed text-muted-foreground">
                      {note}
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-muted-foreground">None.</li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Assumptions
              </h4>
              <ul className="mt-1.5 space-y-1">
                {selected.assumptions?.length ? (
                  selected.assumptions.map((note) => (
                    <li key={note} className="text-xs leading-relaxed text-muted-foreground">
                      {note}
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-muted-foreground">None.</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {selected.original_code ? (
          <div
            className="flex items-center gap-1 self-start rounded-lg border border-border bg-surface/70 p-1"
            role="group"
            aria-label="Choose code version"
          >
            <GitCompareArrows size={14} className="mx-1.5 text-muted-foreground" aria-hidden="true" />
            {VIEWS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={view === option.id}
                onClick={() => setView(option.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  view === option.id
                    ? "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        <CodeBlock
          code={showingOriginal ? selected.original_code : selected.refactored_code}
          language={selected.language}
          filename={`${selected.path}${showingOriginal ? " (original)" : " (refactored)"}`}
          downloadName={selected.path.split("/").pop()}
        />
      </div>
    </div>
  );
}
