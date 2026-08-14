import { CheckCircle2, FileArchive, Github, RotateCcw } from "lucide-react";
import { Badge, LanguageBadge } from "../common/Badges";
import { Button } from "../common/Button";
import { DownloadButton } from "../common/DownloadButton";

export function ResultsHeader({ summary, source, onReset, onDownload }) {
  const sourceKind = source?.kind || summary?.source_type;
  const sourceLabel = source?.label || summary?.source_label || "Unknown source";
  const SourceIcon = sourceKind === "zip" ? FileArchive : Github;

  return (
    <header className="rounded-2xl border border-border bg-card p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-semibold tracking-tight">
              {summary?.project_name || "Analysis results"}
            </h2>
            <Badge tone="success" icon={CheckCircle2}>
              Analysis complete
            </Badge>
          </div>
          <p className="mt-2 flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <SourceIcon size={13} aria-hidden="true" />
            <span className="truncate">{sourceLabel}</span>
            <span className="text-border-strong">•</span>
            {sourceKind === "zip" ? "ZIP upload" : "GitHub repository"}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {summary?.languages?.length ? (
              summary.languages.map((language) => <LanguageBadge key={language} language={language} />)
            ) : (
              <span className="text-xs text-muted-foreground">Languages not available</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <DownloadButton variant="secondary" size="md" label="Download analysis report" onDownload={onDownload}>
            <span>Download report</span>
          </DownloadButton>
          <Button variant="primary" size="md" onClick={onReset}>
            <RotateCcw size={15} aria-hidden="true" />
            Analyze another project
          </Button>
        </div>
      </div>
    </header>
  );
}
