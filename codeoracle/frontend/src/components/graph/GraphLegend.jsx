import React from 'react';
import { Code2, FileCode2, Package, GitCommit } from 'lucide-react';

/**
 * Graph Legend Component
 */
export default function GraphLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 p-3.5 rounded-2xl bg-[#0d0f1a]/90 border border-white/[0.08] backdrop-blur-xl shadow-xl shadow-black/40 text-xs font-mono space-y-2">
      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
        Legend
      </span>
      <div className="flex flex-col gap-1.5 text-[11px]">
        <div className="flex items-center gap-2 text-cyan-300">
          <span className="w-2.5 h-2.5 rounded-md bg-[#0e1424] border border-cyan-400" />
          <span>Python Module</span>
        </div>
        <div className="flex items-center gap-2 text-amber-300">
          <span className="w-2.5 h-2.5 rounded-md bg-[#19150d] border border-amber-400" />
          <span>JavaScript Module</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-2.5 h-2.5 rounded-md bg-[#0d0f1a] border border-slate-500" />
          <span>External Package</span>
        </div>
        <div className="flex items-center gap-2 text-purple-300 pt-0.5 border-t border-white/[0.06]">
          <span className="w-4 h-0.5 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full" />
          <span>Imports Dependency</span>
        </div>
      </div>
    </div>
  );
}
