/** Small decorative code-orbit: connected nodes rotating around a core. */
export function CodeOrbit() {
  return (
    <div className="relative h-32 w-32 shrink-0" aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-gradient-brand-soft blur-xl" />
      <div className="absolute inset-3 rounded-full border border-border" />
      <div className="absolute inset-7 rounded-full border border-border/70" />
      <div className="absolute inset-0 animate-orbit">
        <span className="absolute left-1/2 top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-cyan" />
        <span className="absolute bottom-4 left-3 h-2 w-2 rounded-full bg-purple" />
        <span className="absolute bottom-5 right-2 h-2 w-2 rounded-full bg-magenta" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-lg border border-border bg-surface px-2 py-1 font-mono text-[0.7rem] text-muted-foreground">
          {"{ }"}
        </span>
      </div>
    </div>
  );
}
