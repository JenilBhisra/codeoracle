import { ArrowRight, CornerDownRight, Zap } from "lucide-react";
import { Badge, ConfidenceBadge, RiskBadge } from "../common/Badges";

export function FunctionCard({ fn }) {
  return (
    <article className="rounded-xl border border-border bg-surface/60 p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h5 className="font-mono text-sm font-semibold text-cyan">{fn.name}</h5>
        <RiskBadge risk={fn.risk} />
        <ConfidenceBadge confidence={fn.confidence} />
      </header>

      {fn.signature ? (
        <p className="mt-2 overflow-x-auto scrollbar-thin-custom rounded-lg border border-border bg-background/60 px-3 py-2 font-mono text-xs whitespace-pre text-muted-foreground">
          {fn.signature}
        </p>
      ) : null}

      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        {fn.explanation || "No explanation was generated for this function."}
      </p>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Parameters
          </dt>
          <dd className="mt-1.5 space-y-1.5">
            {fn.parameters?.length ? (
              fn.parameters.map((param) => (
                <p key={param.name} className="text-xs text-muted-foreground">
                  <span className="font-mono text-foreground">{param.name}</span>
                  {param.type ? <span className="font-mono text-purple"> : {param.type}</span> : null}
                  {param.description ? ` — ${param.description}` : null}
                </p>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No parameters.</p>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Returns
          </dt>
          <dd className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
            <ArrowRight size={12} className="mt-0.5 shrink-0 text-cyan" aria-hidden="true" />
            {fn.returns || "Not documented."}
          </dd>

          <dt className="mt-3 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Side effects
          </dt>
          <dd className="mt-1.5 space-y-1">
            {fn.side_effects?.length ? (
              fn.side_effects.map((effect) => (
                <p key={effect} className="flex items-start gap-1.5 text-xs text-warning">
                  <Zap size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {effect}
                </p>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">None detected.</p>
            )}
          </dd>
        </div>
      </dl>

      {fn.calls?.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <CornerDownRight size={13} className="text-muted-foreground" aria-hidden="true" />
          <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">Calls</span>
          {fn.calls.map((call) => (
            <Badge key={call} tone="blue" className="font-mono">
              {call}
            </Badge>
          ))}
        </div>
      ) : null}
    </article>
  );
}
