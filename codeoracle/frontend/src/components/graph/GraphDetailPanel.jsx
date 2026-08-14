import { ArrowDownLeft, ArrowUpRight, ExternalLink, X } from "lucide-react";
import { Badge, LanguageBadge } from "../common/Badges";
import { Button } from "../common/Button";

function List({ title, items, icon: Icon }) {
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon ? <Icon size={12} aria-hidden="true" /> : null}
        {title}
      </h4>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items?.length ? (
          items.map((item) => (
            <Badge key={item} className="font-mono">
              {item}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        )}
      </div>
    </div>
  );
}

export function GraphDetailPanel({ node, imports, importedBy, onClose, onOpenExplanation }) {
  if (!node) return null;

  return (
    <aside
      aria-label={`Details for ${node.label}`}
      className="flex max-h-full flex-col overflow-auto scrollbar-thin-custom rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-mono text-sm font-semibold text-foreground">{node.label}</h3>
          {node.path ? (
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{node.path}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details panel"
          className="rounded-md p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {node.language ? <LanguageBadge language={node.language} /> : null}
        <Badge tone={node.external ? "magenta" : "blue"}>
          {node.external ? "External" : "Internal"}
        </Badge>
        {node.is_entry_point ? <Badge tone="cyan">Entry point</Badge> : null}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        {node.summary || "No summary was provided for this node."}
      </p>

      {!node.external ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-surface/60 p-2.5">
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Functions</p>
            <p className="mt-0.5 text-lg font-semibold text-foreground">{node.function_count ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface/60 p-2.5">
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Classes</p>
            <p className="mt-0.5 text-lg font-semibold text-foreground">{node.class_count ?? "—"}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        <List title="Imports" items={imports} icon={ArrowUpRight} />
        <List title="Imported by" items={importedBy} icon={ArrowDownLeft} />
      </div>

      {node.risk_notes?.length ? (
        <div className="mt-4 rounded-lg border border-warning/35 bg-warning/6 p-3">
          <h4 className="text-[0.7rem] font-semibold uppercase tracking-wider text-warning">
            Risk notes
          </h4>
          <ul className="mt-1.5 space-y-1">
            {node.risk_notes.map((note) => (
              <li key={note} className="text-xs text-muted-foreground">
                {note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!node.external ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => onOpenExplanation?.(node)}>
          <ExternalLink size={14} aria-hidden="true" />
          Open explanation
        </Button>
      ) : null}
    </aside>
  );
}
