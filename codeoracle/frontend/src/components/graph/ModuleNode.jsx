import { Handle, Position } from "@xyflow/react";
import { Boxes, Braces, FileCode2, FunctionSquare, Package, Star } from "lucide-react";
import { cn } from "../../lib/cn";

const ACCENTS = {
  python: {
    ring: "border-py/50",
    bg: "bg-py/8",
    text: "text-py",
    Icon: FileCode2,
  },
  javascript: {
    ring: "border-js/50",
    bg: "bg-js/8",
    text: "text-js",
    Icon: Braces,
  },
  external: {
    ring: "border-magenta/50",
    bg: "bg-magenta/8",
    text: "text-magenta",
    Icon: Package,
  },
};

export function ModuleNode({ data, selected }) {
  const accent = data.external ? ACCENTS.external : ACCENTS[data.language] || ACCENTS.python;
  const { Icon } = accent;

  return (
    <div
      className={cn(
        "w-[224px] rounded-xl border bg-card/95 px-3 py-2.5 text-left transition-all",
        accent.ring,
        accent.bg,
        data.dimmed && "opacity-25",
        data.is_entry_point && "border-2 shadow-[0_0_20px_-4px_var(--brand-cyan)]",
        selected && "ring-2 ring-purple",
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-border-strong" />
      <div className="flex items-center gap-2">
        <Icon size={14} className={cn("shrink-0", accent.text)} aria-hidden="true" />
        <span className="truncate font-mono text-[0.78rem] font-semibold text-foreground">
          {data.label}
        </span>
        {data.is_entry_point ? (
          <span className="ml-auto flex items-center gap-0.5 rounded-full bg-cyan/15 px-1.5 py-0.5 text-[0.6rem] font-semibold text-cyan">
            <Star size={9} aria-hidden="true" />
            entry
          </span>
        ) : null}
      </div>

      {data.external ? (
        <p className="mt-1 text-[0.65rem] uppercase tracking-wider text-magenta/80">
          External package
        </p>
      ) : (
        <>
          <p className="mt-1 truncate font-mono text-[0.65rem] text-muted-foreground">{data.path}</p>
          <div className="mt-1.5 flex items-center gap-3 text-[0.65rem] text-muted-foreground">
            <span className="flex items-center gap-1">
              <FunctionSquare size={10} aria-hidden="true" />
              {data.function_count ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <Boxes size={10} aria-hidden="true" />
              {data.class_count ?? 0}
            </span>
          </div>
        </>
      )}
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-border-strong" />
    </div>
  );
}
