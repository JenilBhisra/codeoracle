import {
  Upload,
  Cpu,
  BookOpenCheck,
  Wand2,
  GitFork,
  TestTube2,
  MessageSquareCode,
  ShieldCheck,
} from "lucide-react";

const STEPS = [
  {
    title: "Upload",
    description: "Drop a ZIP archive or point CodeOracle at a public repository.",
    icon: Upload,
    color: "text-cyan",
  },
  {
    title: "Analyze",
    description: "Files are parsed and modules, imports and calls are mapped.",
    icon: Cpu,
    color: "text-blue",
  },
  {
    title: "Understand",
    description: "Read module and function explanations in plain language.",
    icon: BookOpenCheck,
    color: "text-purple",
  },
  {
    title: "Modernize",
    description: "Review generated tests and refactor proposals before applying.",
    icon: Wand2,
    color: "text-magenta",
  },
];

const OUTCOMES = [
  {
    title: "Explain unfamiliar code",
    description: "Every module and function gets purpose, parameters, side effects and confidence.",
    icon: MessageSquareCode,
    color: "text-purple",
  },
  {
    title: "Visualize dependencies",
    description: "An interactive graph of internal modules and external packages.",
    icon: GitFork,
    color: "text-cyan",
  },
  {
    title: "Generate meaningful tests",
    description: "Happy path, edge case, error case and mocked-dependency coverage.",
    icon: TestTube2,
    color: "text-success",
  },
  {
    title: "Refactor with confidence",
    description: "Risk levels, breaking changes and migration notes on every proposal.",
    icon: ShieldCheck,
    color: "text-magenta",
  },
];

export function HowItWorks() {
  return (
    <section className="mt-14" aria-labelledby="how-it-works-heading">
      <h2 id="how-it-works-heading" className="text-center text-lg font-semibold">
        How it works
      </h2>

      <ol className="mt-6 grid gap-3 md:grid-cols-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2">
                  <Icon size={17} className={step.color} aria-hidden="true" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              {index < STEPS.length - 1 ? (
                <span
                  className="absolute right-[-10px] top-1/2 hidden h-px w-4 bg-border-strong md:block"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {OUTCOMES.map((outcome) => {
          const Icon = outcome.icon;
          return (
            <div
              key={outcome.title}
              className="rounded-xl border border-border bg-surface/60 p-4 transition-colors hover:border-border-strong"
            >
              <Icon size={18} className={outcome.color} aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">{outcome.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {outcome.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
