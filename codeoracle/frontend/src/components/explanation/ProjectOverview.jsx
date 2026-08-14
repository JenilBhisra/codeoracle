import { AlertTriangle, Boxes, Info, Package, Rocket } from "lucide-react";
import { Badge, ConfidenceBadge, LanguageBadge } from "../common/Badges";

export function ProjectOverview({ explanation }) {
  if (!explanation) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Info size={15} className="text-purple" aria-hidden="true" />
            Project overview
          </h3>
          <ConfidenceBadge confidence={explanation.confidence} />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
          {explanation.project_summary || "No project summary was generated."}
        </p>

        <h4 className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Boxes size={13} aria-hidden="true" />
          Architecture
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {explanation.architecture_overview || "Not available."}
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Detected languages
          </h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {explanation.languages?.length ? (
              explanation.languages.map((language) => (
                <LanguageBadge key={language} language={language} />
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Not available</span>
            )}
          </div>

          <h4 className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Rocket size={13} aria-hidden="true" />
            Entry points
          </h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {explanation.entry_points?.length ? (
              explanation.entry_points.map((entry) => (
                <Badge key={entry} tone="cyan" className="font-mono">
                  {entry}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Not available</span>
            )}
          </div>

          <h4 className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Package size={13} aria-hidden="true" />
            External dependencies
          </h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {explanation.external_dependencies?.length ? (
              explanation.external_dependencies.map((dep) => (
                <Badge key={dep} tone="magenta" className="font-mono">
                  {dep}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Not available</span>
            )}
          </div>
        </div>

        {explanation.limitations?.length ? (
          <div className="rounded-xl border border-warning/35 bg-warning/6 p-5">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-warning">
              <AlertTriangle size={13} aria-hidden="true" />
              Important limitations
            </h4>
            <ul className="mt-2 space-y-2">
              {explanation.limitations.map((item) => (
                <li key={item} className="text-xs leading-relaxed text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
