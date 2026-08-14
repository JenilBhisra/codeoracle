const NODE_KEYS = [
  { label: "Python module", className: "bg-py" },
  { label: "JavaScript module", className: "bg-js" },
  { label: "External package", className: "bg-magenta" },
  { label: "Entry point", className: "bg-cyan" },
];

const EDGE_KEYS = [
  { label: "Confirmed import", style: "border-t-2 border-solid border-blue" },
  { label: "External dependency", style: "border-t-2 border-solid border-magenta" },
  { label: "Inferred call", style: "border-t-2 border-dashed border-cyan" },
  { label: "Uncertain relation", style: "border-t-2 border-dotted border-muted-foreground" },
];

export function GraphLegend() {
  return (
    <div className="rounded-xl border border-border bg-card/85 p-3 backdrop-blur-sm">
      <h4 className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
        Legend
      </h4>
      <ul className="mt-2 space-y-1.5">
        {NODE_KEYS.map((key) => (
          <li key={key.label} className="flex items-center gap-2 text-[0.7rem] text-muted-foreground">
            <span className={`h-2.5 w-2.5 rounded-sm ${key.className}`} aria-hidden="true" />
            {key.label}
          </li>
        ))}
        {EDGE_KEYS.map((key) => (
          <li key={key.label} className="flex items-center gap-2 text-[0.7rem] text-muted-foreground">
            <span className={`w-4 ${key.style}`} aria-hidden="true" />
            {key.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
