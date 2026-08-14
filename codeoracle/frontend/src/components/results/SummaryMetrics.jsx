import { Boxes, FileCode2, FlaskConical, GitFork, Hash, ShieldCheck } from "lucide-react";
import { MetricCard } from "../common/MetricCard";
import { CoverageBadge, coverageLabelText } from "../common/Badges";

function value(input) {
  return input === null || input === undefined ? "—" : input.toLocaleString?.() ?? input;
}

export function SummaryMetrics({ summary, testCount }) {
  const coverage = summary?.coverage;
  const coverageLabel = coverage?.label ?? "not_executed";
  const coverageValue =
    coverageLabel === "not_executed" || coverage?.value == null ? "—" : `${coverage.value}%`;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <MetricCard label="Source files" value={value(summary?.file_count)} icon={FileCode2} accent="blue" />
      <MetricCard label="Total lines" value={value(summary?.line_count)} icon={Hash} accent="cyan" />
      <MetricCard label="Modules" value={value(summary?.module_count)} icon={Boxes} accent="purple" />
      <MetricCard label="Dependencies" value={value(summary?.dependency_count)} icon={GitFork} accent="magenta" />
      <MetricCard
        label="Generated tests"
        value={value(testCount ?? summary?.generated_test_count)}
        icon={FlaskConical}
        accent="cyan"
      />
      <MetricCard
        label="Coverage"
        value={coverageValue}
        icon={ShieldCheck}
        accent={coverageLabel === "measured" ? "cyan" : "purple"}
        hint={coverageLabelText(coverageLabel)}
        badge={<CoverageBadge label={coverageLabel} />}
      />
    </div>
  );
}
