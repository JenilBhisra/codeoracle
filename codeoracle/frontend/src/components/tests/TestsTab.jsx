import { useState } from "react";
import { AlertTriangle, FlaskConical, ListChecks } from "lucide-react";
import { Badge, CoverageBadge, LanguageBadge } from "../common/Badges";
import { CodeBlock } from "../common/CodeBlock";
import { EmptyState, SkeletonBlock } from "../common/States";
import { cn } from "../../lib/cn";

const TYPE_LABELS = {
  happy_path: "Happy path",
  edge_case: "Edge case",
  error_case: "Error case",
  mocked_dependency: "Mocked dependency",
};

const TYPE_TONES = {
  happy_path: "success",
  edge_case: "cyan",
  error_case: "danger",
  mocked_dependency: "purple",
};

function coverageTone(label) {
  if (label === "measured") return "text-success";
  if (label === "estimated") return "text-warning";
  return "text-muted-foreground";
}

export function TestsTab({ tests, loading }) {
  const files = tests?.files ?? [];
  const [selectedId, setSelectedId] = useState(files[0]?.id ?? null);

  if (loading) return <SkeletonBlock lines={8} />;

  if (!files.length) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No generated tests"
        description="Test generation produced no files for this analysis. Explanation and graph results may still be available."
      />
    );
  }

  const selected = files.find((file) => file.id === selectedId) ?? files[0];
  const coverage = tests?.coverage;
  const coverageLabel = coverage?.label ?? "not_executed";
  const coverageValue = coverageLabel === "not_executed" ? null : coverage?.value;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks size={15} className="text-success" aria-hidden="true" />
              Test summary
            </h3>
            {tests?.framework ? <Badge tone="blue">{tests.framework}</Badge> : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">Test files</p>
              <p className="mt-0.5 text-xl font-semibold">{files.length}</p>
            </div>
            <div>
              <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                Covered functions
              </p>
              <p className="mt-0.5 text-xl font-semibold">{tests?.covered_functions ?? "—"}</p>
            </div>
            <div>
              <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">Coverage</p>
              <p className={cn("mt-0.5 text-xl font-semibold", coverageTone(coverageLabel))}>
                {coverageValue != null ? `${coverageValue}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                Coverage status
              </p>
              <div className="mt-1">
                <CoverageBadge label={coverageLabel} />
              </div>
            </div>
          </div>

          {coverageValue != null ? (
            <div
              className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-2"
              role="img"
              aria-label={`Coverage ${coverageValue} percent, ${coverageLabel.replace("_", " ")}`}
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  coverageLabel === "measured" ? "bg-success" : "bg-warning",
                )}
                style={{ width: `${Math.min(100, coverageValue)}%` }}
              />
            </div>
          ) : null}

          {coverageLabel === "estimated" ? (
            <p className="mt-4 flex gap-2 rounded-lg border border-warning/35 bg-warning/6 p-3 text-xs leading-relaxed text-warning">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              Estimated coverage is based on generated test targets and has not been measured by
              executing untrusted code.
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Test types</h3>
          <ul className="mt-3 space-y-2.5">
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <li key={key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{tests?.breakdown?.[key] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl border border-border bg-card p-3">
          <label
            htmlFor="test-file-select"
            className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground lg:hidden"
          >
            Test file
          </label>
          <select
            id="test-file-select"
            value={selected?.id}
            onChange={(event) => setSelectedId(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-input bg-background/60 px-2 text-sm lg:hidden"
          >
            {files.map((file) => (
              <option key={file.id} value={file.id}>
                {file.filename}
              </option>
            ))}
          </select>

          <ul className="hidden space-y-1 lg:block" aria-label="Generated test files">
            {files.map((file) => (
              <li key={file.id}>
                <button
                  type="button"
                  aria-current={file.id === selected?.id}
                  onClick={() => setSelectedId(file.id)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left transition-colors",
                    file.id === selected?.id
                      ? "bg-purple/12 text-foreground"
                      : "text-muted-foreground hover:bg-surface-2",
                  )}
                >
                  <span className="block truncate font-mono text-xs">{file.filename}</span>
                  <span className="mt-0.5 block truncate text-[0.68rem] text-muted-foreground">
                    {file.target_file}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {selected ? (
          <div className="min-w-0 space-y-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-mono text-sm font-semibold">{selected.filename}</h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Tests {selected.target_file}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <LanguageBadge language={selected.language} />
                {selected.framework ? <Badge tone="blue">{selected.framework}</Badge> : null}
                {(selected.types || []).map((type) => (
                  <Badge key={type} tone={TYPE_TONES[type]}>
                    {TYPE_LABELS[type] ?? type}
                  </Badge>
                ))}
              </div>

              <h4 className="mt-4 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Covered functions
              </h4>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {selected.covered_functions?.length ? (
                  selected.covered_functions.map((fn) => (
                    <Badge key={fn} className="font-mono">
                      {fn}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Not available</span>
                )}
              </div>

              {selected.assumptions?.length ? (
                <>
                  <h4 className="mt-4 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Assumptions
                  </h4>
                  <ul className="mt-1.5 space-y-1">
                    {selected.assumptions.map((item) => (
                      <li key={item} className="text-xs text-muted-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>

            <CodeBlock
              code={selected.code}
              language={selected.language}
              filename={selected.filename}
              downloadName={selected.filename.split("/").pop()}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
