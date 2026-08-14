import { AlertTriangle, ShieldCheck, ShieldAlert, Braces, FileCode2 } from "lucide-react";
import { cn } from "../../lib/cn";

export function Badge({ children, className, tone = "neutral", icon: Icon }) {
  const tones = {
    neutral: "border-border bg-surface-2 text-muted-foreground",
    purple: "border-purple/40 bg-purple/12 text-purple",
    cyan: "border-cyan/40 bg-cyan/12 text-cyan",
    blue: "border-blue/40 bg-blue/12 text-blue",
    magenta: "border-magenta/40 bg-magenta/12 text-magenta",
    success: "border-success/40 bg-success/12 text-success",
    warning: "border-warning/40 bg-warning/12 text-warning",
    danger: "border-danger/45 bg-danger/12 text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium",
        tones[tone],
        className,
      )}
    >
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function LanguageBadge({ language, className }) {
  const map = {
    python: { label: "Python", tone: "blue", icon: FileCode2 },
    javascript: { label: "JavaScript", tone: "warning", icon: Braces },
    config: { label: "Config", tone: "neutral", icon: FileCode2 },
  };
  const cfg = map[language] || { label: language || "Unknown", tone: "neutral", icon: FileCode2 };
  return (
    <Badge tone={cfg.tone} icon={cfg.icon} className={className}>
      {cfg.label}
    </Badge>
  );
}

export function RiskBadge({ risk, className }) {
  const map = {
    low: { label: "Low risk", tone: "success", icon: ShieldCheck },
    medium: { label: "Medium risk", tone: "warning", icon: ShieldAlert },
    high: { label: "High risk", tone: "danger", icon: AlertTriangle },
  };
  const cfg = map[risk];
  if (!cfg) return <Badge className={className}>Risk not assessed</Badge>;
  return (
    <Badge tone={cfg.tone} icon={cfg.icon} className={className}>
      {cfg.label}
    </Badge>
  );
}

export function ConfidenceBadge({ confidence }) {
  const tone = confidence === "high" ? "success" : confidence === "medium" ? "warning" : "neutral";
  return <Badge tone={tone}>{confidence ? `${confidence} confidence` : "Confidence unknown"}</Badge>;
}

const COVERAGE_LABELS = {
  measured: { label: "Measured", tone: "success" },
  estimated: { label: "Estimated", tone: "warning" },
  not_executed: { label: "Not executed", tone: "neutral" },
};

export function CoverageBadge({ label }) {
  const cfg = COVERAGE_LABELS[label] || COVERAGE_LABELS.not_executed;
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}

export function coverageLabelText(label) {
  return (COVERAGE_LABELS[label] || COVERAGE_LABELS.not_executed).label;
}
