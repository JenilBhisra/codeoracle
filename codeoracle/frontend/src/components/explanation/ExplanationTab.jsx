import { useMemo, useState } from "react";
import { FolderTree, Search } from "lucide-react";
import { ProjectOverview } from "./ProjectOverview";
import { FileTree } from "./FileTree";
import { ModuleAccordion } from "./ModuleAccordion";
import { EmptyState, SkeletonBlock } from "../common/States";
import { cn } from "../../lib/cn";

const LANGUAGE_FILTERS = [
  { id: "all", label: "All" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
];

const RISK_FILTERS = [
  { id: "all", label: "Any risk" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

function FilterGroup({ options, value, onChange, label }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface/70 p-1" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            value === option.id
              ? "bg-surface-2 text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ExplanationTab({ explanation, loading }) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [risk, setRisk] = useState("all");
  const [openModules, setOpenModules] = useState(() => new Set());

  const modules = explanation?.modules ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return modules.filter((mod) => {
      if (language !== "all" && mod.language !== language) return false;
      if (risk !== "all" && mod.risk !== risk) return false;
      if (!needle) return true;
      const inModule = `${mod.path} ${mod.id} ${mod.purpose ?? ""}`.toLowerCase().includes(needle);
      const inFunction = (mod.functions || []).some((fn) =>
        `${fn.name} ${fn.explanation ?? ""}`.toLowerCase().includes(needle),
      );
      return inModule || inFunction;
    });
  }, [modules, query, language, risk]);

  function toggleModule(id) {
    setOpenModules((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openFromTree(node) {
    if (!node.moduleId) return;
    setQuery("");
    setLanguage("all");
    setRisk("all");
    setOpenModules((current) => new Set(current).add(node.moduleId));
    requestAnimationFrame(() => {
      document
        .getElementById(`module-${node.moduleId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock lines={5} />
        <SkeletonBlock lines={7} />
      </div>
    );
  }

  if (!explanation || (!explanation.project_summary && !modules.length)) {
    return (
      <EmptyState
        title="No explanation available"
        description="The backend completed the job without returning explanation data. Other tabs may still contain results."
      />
    );
  }

  return (
    <div className="space-y-4">
      <ProjectOverview explanation={explanation} />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-4 lg:sticky lg:top-24 lg:self-start">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <FolderTree size={15} className="text-cyan" aria-hidden="true" />
            Project structure
          </h3>
          <FileTree tree={explanation.file_tree} onSelectFile={openFromTree} />
        </aside>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search modules or functions"
                aria-label="Search modules or functions"
                className="h-10 w-full rounded-lg border border-input bg-background/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:border-purple/70"
              />
            </div>
            <FilterGroup options={LANGUAGE_FILTERS} value={language} onChange={setLanguage} label="Filter by language" />
            <FilterGroup options={RISK_FILTERS} value={risk} onChange={setRisk} label="Filter by risk" />
          </div>

          <p className="text-xs text-muted-foreground">
            {filtered.length} of {modules.length} modules
          </p>

          {filtered.length ? (
            <div className="space-y-3">
              {filtered.map((mod) => (
                <ModuleAccordion
                  key={mod.id}
                  module={mod}
                  anchorId={`module-${mod.id}`}
                  open={openModules.has(mod.id)}
                  onToggle={() => toggleModule(mod.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="No modules match those filters"
              description="Try a different search term, language or risk level."
            />
          )}
        </div>
      </div>
    </div>
  );
}
