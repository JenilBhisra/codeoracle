import { ChevronDown, Boxes, FunctionSquare } from "lucide-react";
import { Badge, LanguageBadge, RiskBadge } from "../common/Badges";
import { FunctionCard } from "./FunctionCard";
import { cn } from "../../lib/cn";

export function ModuleAccordion({ module: mod, open, onToggle, anchorId }) {
  const panelId = `module-panel-${mod.id}`;

  return (
    <section
      id={anchorId}
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-xl border bg-card transition-colors",
        open ? "border-border-strong" : "border-border",
      )}
    >
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-start gap-3 p-4 text-left hover:bg-surface-2/60"
        >
          <ChevronDown
            size={16}
            className={cn("mt-1 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate font-mono text-sm font-semibold">{mod.path}</span>
              <LanguageBadge language={mod.language} />
              <RiskBadge risk={mod.risk} />
            </span>
            <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
              {mod.purpose || "No module summary was generated."}
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-3 text-[0.7rem] text-muted-foreground">
              <span className="flex items-center gap-1">
                <FunctionSquare size={12} aria-hidden="true" />
                {mod.function_count ?? mod.functions?.length ?? 0} functions
              </span>
              <span className="flex items-center gap-1">
                <Boxes size={12} aria-hidden="true" />
                {mod.class_count ?? 0} classes
              </span>
            </span>
          </span>
        </button>
      </h3>

      <div id={panelId} hidden={!open} className="border-t border-border p-4">
        {mod.imports?.length ? (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">
              Imports
            </span>
            {mod.imports.map((imp) => (
              <Badge key={imp} className="font-mono">
                {imp}
              </Badge>
            ))}
          </div>
        ) : null}

        {mod.responsibilities?.length ? (
          <ul className="mb-5 space-y-1.5">
            {mod.responsibilities.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-purple" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        {mod.functions?.length ? (
          <div className="space-y-3">
            {mod.functions.map((fn) => (
              <FunctionCard key={fn.name} fn={fn} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No function explanations were generated for this module.
          </p>
        )}
      </div>
    </section>
  );
}
