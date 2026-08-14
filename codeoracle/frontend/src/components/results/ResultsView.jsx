import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, FlaskConical, Network, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { ResultsHeader } from "./ResultsHeader";
import { SummaryMetrics } from "./SummaryMetrics";
import { TabBar, TabPanel } from "../common/Tabs";
import { ExplanationTab } from "../explanation/ExplanationTab";
import { DependencyGraphTab } from "../graph/DependencyGraphTab";
import { TestsTab } from "../tests/TestsTab";
import { RefactorTab } from "../refactor/RefactorTab";
import { ErrorState, SkeletonBlock } from "../common/States";
import { downloadJobResults } from "../../services/api";
import { downloadBlob } from "../../lib/download";

const WARNING_TONES = {
  high: "border-danger/40 bg-danger/8 text-danger",
  medium: "border-warning/35 bg-warning/8 text-warning",
  low: "border-border bg-surface/60 text-muted-foreground",
};

export function ResultsView({ results, loading, error, jobId, source, onReset, onRetry }) {
  const [tab, setTab] = useState("explanation");

  const explanation = results?.explanation;
  const graph = results?.dependency_graph;
  const tests = results?.generated_tests;
  const refactors = results?.refactored_files ?? [];
  const warnings = results?.warnings ?? [];

  const tabs = useMemo(
    () => [
      {
        id: "explanation",
        label: "Explanation",
        icon: FileText,
        activeColor: "text-purple",
        count: explanation?.modules?.length ?? null,
      },
      {
        id: "graph",
        label: "Dependency Graph",
        icon: Network,
        activeColor: "text-cyan",
        count: graph?.nodes?.length ?? null,
      },
      {
        id: "tests",
        label: "Generated Tests",
        icon: FlaskConical,
        activeColor: "text-success",
        count: tests?.files?.length ?? null,
      },
      {
        id: "refactor",
        label: "Refactored Code",
        icon: Wand2,
        activeColor: "text-magenta",
        count: refactors.length || null,
      },
    ],
    [explanation, graph, tests, refactors.length],
  );

  useEffect(() => {
    if (warnings.length) {
      toast.warning(`${warnings.length} analysis warning${warnings.length > 1 ? "s" : ""} reported`);
    }
  }, [warnings.length]);

  function openExplanationFor(node) {
    setTab("explanation");
    requestAnimationFrame(() => {
      document.getElementById(`module-${node.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function handleDownload() {
    const blob = await downloadJobResults(jobId);
    downloadBlob(`${results?.summary?.project_name || "codeoracle"}-report.json`, blob);
    toast.success("Report downloaded");
  }

  if (loading) {
    return (
      <div className="space-y-4 pt-6">
        <SkeletonBlock lines={3} />
        <SkeletonBlock lines={8} />
      </div>
    );
  }

  if (error && !results) {
    return (
      <div className="pt-8">
        <ErrorState title="Results could not be loaded" message={error} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-6">
      <ResultsHeader
        summary={results?.summary}
        source={source}
        onReset={onReset}
        onDownload={handleDownload}
      />

      <SummaryMetrics summary={results?.summary} testCount={tests?.files?.length} />

      {warnings.length ? (
        <ul className="space-y-2">
          {warnings.map((warning) => (
            <li
              key={warning.message}
              className={`flex gap-2 rounded-xl border p-3 text-xs leading-relaxed ${
                WARNING_TONES[warning.level] || WARNING_TONES.low
              }`}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                {warning.message}
                {warning.path ? (
                  <span className="ml-1 font-mono text-muted-foreground">({warning.path})</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <TabBar tabs={tabs} value={tab} onChange={setTab} />

      <TabPanel id="explanation" active={tab === "explanation"}>
        <ExplanationTab explanation={explanation} />
      </TabPanel>
      <TabPanel id="graph" active={tab === "graph"}>
        <DependencyGraphTab graph={graph} onOpenExplanation={openExplanationFor} />
      </TabPanel>
      <TabPanel id="tests" active={tab === "tests"}>
        <TestsTab tests={tests} />
      </TabPanel>
      <TabPanel id="refactor" active={tab === "refactor"}>
        <RefactorTab files={refactors} />
      </TabPanel>
    </div>
  );
}
