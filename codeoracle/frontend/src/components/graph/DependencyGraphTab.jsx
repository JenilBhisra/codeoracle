import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2, Minimize2, Network, RotateCcw, Search } from "lucide-react";
import { ModuleNode } from "./ModuleNode";
import { GraphLegend } from "./GraphLegend";
import { GraphDetailPanel } from "./GraphDetailPanel";
import { layoutGraph } from "./graphLayout";
import { EmptyState, SkeletonBlock } from "../common/States";
import { Button } from "../common/Button";
import { cn } from "../../lib/cn";

const nodeTypes = { module: ModuleNode };

const SCOPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "internal", label: "Internal" },
  { id: "external", label: "External" },
];

const LANGUAGE_FILTERS = [
  { id: "all", label: "All languages" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
];

const EDGE_STYLES = {
  external: { stroke: "var(--brand-magenta)", strokeDasharray: undefined },
  imports: { stroke: "var(--brand-blue)", strokeDasharray: undefined },
  calls: { stroke: "var(--brand-cyan)", strokeDasharray: "6 4" },
  uncertain: { stroke: "var(--muted-foreground)", strokeDasharray: "1 5" },
};

function edgeStyleFor(edge) {
  if (edge.confidence === "uncertain") return EDGE_STYLES.uncertain;
  if (edge.type === "external") return EDGE_STYLES.external;
  if (edge.type === "calls") return EDGE_STYLES.calls;
  return EDGE_STYLES.imports;
}

function Segmented({ options, value, onChange, label }) {
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
            value === option.id ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function DependencyGraphTab({ graph, loading, onOpenExplanation }) {
  const rawNodes = graph?.nodes ?? [];
  const rawEdges = graph?.edges ?? [];

  const [scope, setScope] = useState("all");
  const [language, setLanguage] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [flow, setFlow] = useState(null);

  const visibleNodes = useMemo(
    () =>
      rawNodes.filter((node) => {
        if (scope === "internal" && node.external) return false;
        if (scope === "external" && !node.external) return false;
        if (language !== "all" && !node.external && node.language !== language) return false;
        return true;
      }),
    [rawNodes, scope, language],
  );

  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);

  const visibleEdges = useMemo(
    () => rawEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    [rawEdges, visibleIds],
  );

  const highlighted = useMemo(() => {
    if (!selectedId) return null;
    const set = new Set([selectedId]);
    visibleEdges.forEach((edge) => {
      if (edge.source === selectedId) set.add(edge.target);
      if (edge.target === selectedId) set.add(edge.source);
    });
    return set;
  }, [selectedId, visibleEdges]);

  const matchIds = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    return new Set(
      visibleNodes
        .filter((node) => `${node.label} ${node.path ?? ""}`.toLowerCase().includes(needle))
        .map((node) => node.id),
    );
  }, [query, visibleNodes]);

  const positions = useMemo(() => layoutGraph(visibleNodes, visibleEdges), [visibleNodes, visibleEdges]);

  const flowNodes = useMemo(
    () =>
      visibleNodes.map((node) => ({
        id: node.id,
        type: "module",
        position: positions.get(node.id) ?? { x: 0, y: 0 },
        data: {
          ...node,
          dimmed:
            (highlighted && !highlighted.has(node.id)) || (matchIds && !matchIds.has(node.id)) || false,
        },
      })),
    [visibleNodes, positions, highlighted, matchIds],
  );

  const flowEdges = useMemo(
    () =>
      visibleEdges.map((edge) => {
        const style = edgeStyleFor(edge);
        const active = !highlighted || highlighted.has(edge.source) === highlighted.has(edge.target);
        const connected = highlighted && (edge.source === selectedId || edge.target === selectedId);
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: Boolean(connected),
          style: {
            ...style,
            strokeWidth: connected ? 2.2 : 1.4,
            opacity: highlighted ? (connected ? 1 : 0.15) : active ? 0.75 : 0.4,
          },
          label: edge.confidence === "uncertain" ? "uncertain" : undefined,
          labelStyle: { fill: "var(--muted-foreground)", fontSize: 10 },
          labelBgStyle: { fill: "var(--card)" },
        };
      }),
    [visibleEdges, highlighted, selectedId],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => setNodes(flowNodes), [flowNodes, setNodes]);
  useEffect(() => setEdges(flowEdges), [flowEdges, setEdges]);

  const selectedNode = rawNodes.find((node) => node.id === selectedId) || null;

  const importsOf = useMemo(
    () => rawEdges.filter((edge) => edge.source === selectedId).map((edge) => edge.target),
    [rawEdges, selectedId],
  );
  const importedBy = useMemo(
    () => rawEdges.filter((edge) => edge.target === selectedId).map((edge) => edge.source),
    [rawEdges, selectedId],
  );

  const resetView = useCallback(() => {
    setSelectedId(null);
    setQuery("");
    setScope("all");
    setLanguage("all");
    flow?.fitView({ padding: 0.2, duration: 400 });
  }, [flow]);

  useEffect(() => {
    if (!fullscreen) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  if (loading) return <SkeletonBlock lines={8} />;

  if (!rawNodes.length) {
    return (
      <EmptyState
        icon={Network}
        title="No dependency graph available"
        description="The backend did not return graph nodes for this analysis. The graph is rendered strictly from backend data."
      />
    );
  }

  return (
    <div
      className={cn(
        "space-y-3",
        fullscreen && "fixed inset-0 z-50 overflow-auto bg-background p-4",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[190px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search modules"
            aria-label="Search modules in the dependency graph"
            className="h-10 w-full rounded-lg border border-input bg-background/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:border-purple/70"
          />
        </div>
        <Segmented options={SCOPE_FILTERS} value={scope} onChange={setScope} label="Filter dependency scope" />
        <Segmented options={LANGUAGE_FILTERS} value={language} onChange={setLanguage} label="Filter by language" />
        <Button variant="ghost" size="sm" onClick={resetView}>
          <RotateCcw size={14} aria-hidden="true" />
          Reset view
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setFullscreen((value) => !value)}>
          {fullscreen ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
          {fullscreen ? "Exit full screen" : "Full screen"}
        </Button>
      </div>

      <div
        className={cn(
          "grid gap-3",
          selectedNode ? "lg:grid-cols-[1fr_320px]" : "grid-cols-1",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-border bg-[var(--code-surface)]",
            fullscreen ? "h-[calc(100vh-8rem)]" : "h-[26rem] sm:h-[34rem]",
          )}
        >
          {visibleEdges.length === 0 ? (
            <p className="absolute left-3 top-3 z-10 rounded-lg border border-warning/35 bg-warning/10 px-3 py-1.5 text-xs text-warning">
              No dependency edges were returned for these nodes.
            </p>
          ) : null}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onInit={setFlow}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
            minZoom={0.2}
            proOptions={{ hideAttribution: true }}
            nodesConnectable={false}
            edgesFocusable={false}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="oklch(0.35 0.03 266)" />
            <Controls showInteractive={false} className="!border-border !bg-card" />
            <MiniMap
              pannable
              zoomable
              className="!border !border-border !bg-card"
              nodeColor={(node) =>
                node.data?.external
                  ? "oklch(0.7 0.19 330)"
                  : node.data?.language === "javascript"
                    ? "oklch(0.82 0.15 85)"
                    : "oklch(0.72 0.13 230)"
              }
            />
          </ReactFlow>
          <div className="pointer-events-none absolute bottom-3 left-3 hidden sm:block">
            <GraphLegend />
          </div>
        </div>

        {selectedNode ? (
          <GraphDetailPanel
            node={selectedNode}
            imports={importsOf}
            importedBy={importedBy}
            onClose={() => setSelectedId(null)}
            onOpenExplanation={onOpenExplanation}
          />
        ) : null}
      </div>

      <div className="sm:hidden">
        <GraphLegend />
      </div>
    </div>
  );
}
