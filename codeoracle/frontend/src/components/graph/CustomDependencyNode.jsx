import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Code2, FileCode2, Package, Globe } from 'lucide-react';

/**
 * Custom React Flow Node for Codebase Dependencies
 * Styles differently for Python, JavaScript, and External Packages
 */
function CustomDependencyNode({ data, selected }) {
  const {
    label = 'module',
    language = 'python',
    path = '',
    external = false,
    type = 'module',
  } = data || {};

  const isPython = language?.toLowerCase().includes('py');
  const isJS = language?.toLowerCase().includes('js');

  // Styling configuration based on language & external status
  const nodeStyles = external
    ? {
        border: 'border-slate-600/60 bg-[#0d0f1a]/95 text-slate-300',
        badge: 'bg-white/[0.06] text-slate-400 border-white/10',
        icon: <Package className="w-4 h-4 text-slate-400" />,
        glow: selected ? 'ring-2 ring-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.3)]' : '',
      }
    : isPython
    ? {
        border: 'border-cyan-500/40 bg-[#0e1424]/95 text-cyan-100',
        badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        icon: <Code2 className="w-4 h-4 text-cyan-400" />,
        glow: selected ? 'ring-2 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)]' : '',
      }
    : isJS
    ? {
        border: 'border-amber-500/40 bg-[#19150d]/95 text-amber-100',
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        icon: <FileCode2 className="w-4 h-4 text-amber-400" />,
        glow: selected ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.4)]' : '',
      }
    : {
        border: 'border-purple-500/40 bg-[#140e24]/95 text-purple-100',
        badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        icon: <Package className="w-4 h-4 text-purple-400" />,
        glow: selected ? 'ring-2 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.4)]' : '',
      };

  return (
    <div
      className={`min-w-[180px] max-w-[260px] rounded-2xl border p-3.5 shadow-xl transition-all duration-200 cursor-pointer ${nodeStyles.border} ${nodeStyles.glow}`}
    >
      {/* Incoming Connection Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-purple-400 !border-2 !border-[#0a0b12]"
      />

      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0">
          {nodeStyles.icon}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold font-mono truncate block leading-tight">
            {label}
          </span>
          <span className="text-[10px] text-slate-400 font-mono truncate block">
            {path || (external ? 'external library' : 'module')}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-white/[0.06] text-[10px] font-mono">
        <span className={`px-2 py-0.5 rounded-md border ${nodeStyles.badge} uppercase tracking-wider`}>
          {external ? 'External' : language || type}
        </span>
        {external ? (
          <span className="text-slate-500 flex items-center gap-1">
            <Globe className="w-3 h-3" /> third-party
          </span>
        ) : (
          <span className="text-slate-400">internal</span>
        )}
      </div>

      {/* Outgoing Connection Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-[#0a0b12]"
      />
    </div>
  );
}

export default memo(CustomDependencyNode);
