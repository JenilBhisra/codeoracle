import React from 'react';
import { X, Layers, ArrowRight, ArrowLeft, FileCode2, Package, Globe, ExternalLink } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';

/**
 * Slide-out / Floating details panel for the selected node in the Dependency Graph
 * @param {Object} props
 * @param {Object} props.node - Selected node object
 * @param {Array} props.edges - All graph edges
 * @param {Array} props.nodes - All graph nodes
 * @param {Function} props.onClose
 * @param {Function} props.onSelectNode
 */
export default function NodeDetailPanel({
  node,
  edges = [],
  nodes = [],
  onClose,
  onSelectNode,
}) {
  if (!node) return null;

  const data = node.data || {};
  const nodeId = node.id;

  // Find incoming and outgoing edges
  const outgoingEdges = edges.filter((e) => e.source === nodeId);
  const incomingEdges = edges.filter((e) => e.target === nodeId);

  const getNodeLabel = (id) => {
    const targetNode = nodes.find((n) => n.id === id);
    return targetNode?.data?.label || id;
  };

  const isPython = data.language?.toLowerCase().includes('py');
  const isJS = data.language?.toLowerCase().includes('js');

  return (
    <div className="absolute top-4 right-4 z-20 w-80 sm:w-96 rounded-3xl bg-[#0e101d]/95 border border-purple-500/30 p-5 sm:p-6 backdrop-blur-2xl shadow-2xl shadow-black/60 space-y-5 animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-300 shrink-0 mt-0.5">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm sm:text-base font-bold text-slate-100 font-mono truncate">
              {data.label || nodeId}
            </h4>
            <span className="text-xs text-slate-400 font-mono truncate block">
              {data.path || (data.external ? 'External package' : 'Internal source')}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-colors cursor-pointer"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metadata Badges */}
      <div className="flex flex-wrap gap-2 text-xs font-mono">
        <Badge
          variant={data.external ? 'neutral' : isPython ? 'cyan' : isJS ? 'amber' : 'purple'}
          dot
          size="sm"
        >
          {data.external ? 'External Library' : data.language || 'Module'}
        </Badge>
        <Badge variant="indigo" size="sm">
          Type: {data.type || 'module'}
        </Badge>
      </div>

      {/* 1. Outgoing Dependencies (This module imports) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-cyan-300 font-semibold">
          <span className="flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Imports ({outgoingEdges.length})</span>
          </span>
        </div>

        {outgoingEdges.length > 0 ? (
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {outgoingEdges.map((edge) => {
              const targetLabel = getNodeLabel(edge.target);
              return (
                <button
                  key={edge.id}
                  type="button"
                  onClick={() => onSelectNode(edge.target)}
                  className="w-full p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-cyan-500/40 text-left text-xs font-mono text-slate-200 flex items-center justify-between gap-2 transition-all cursor-pointer"
                >
                  <span className="truncate">{targetLabel}</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0 opacity-60" />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 italic bg-white/[0.01] p-2 rounded-xl border border-white/[0.04]">
            Does not import any internal or declared modules.
          </p>
        )}
      </div>

      {/* 2. Incoming Dependencies (Imported by) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-purple-300 font-semibold">
          <span className="flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Imported By ({incomingEdges.length})</span>
          </span>
        </div>

        {incomingEdges.length > 0 ? (
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {incomingEdges.map((edge) => {
              const sourceLabel = getNodeLabel(edge.source);
              return (
                <button
                  key={edge.id}
                  type="button"
                  onClick={() => onSelectNode(edge.source)}
                  className="w-full p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-purple-500/40 text-left text-xs font-mono text-slate-200 flex items-center justify-between gap-2 transition-all cursor-pointer"
                >
                  <span className="truncate">{sourceLabel}</span>
                  <ArrowLeft className="w-3 h-3 text-purple-400 shrink-0 opacity-60" />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 italic bg-white/[0.01] p-2 rounded-xl border border-white/[0.04]">
            Top-level entry point or unreferenced directly.
          </p>
        )}
      </div>
    </div>
  );
}
