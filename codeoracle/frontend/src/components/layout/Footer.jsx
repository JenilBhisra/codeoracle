import React from 'react';
import { Terminal, Shield, Code2, Server, Keyboard } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';
import { MAX_SOURCE_LINES } from '../../utils/constants';

/**
 * Application Footer Component
 * @param {Object} props
 * @param {Function} [props.onOpenShortcuts]
 */
export default function Footer({ onOpenShortcuts }) {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0a0b12] py-8 text-xs font-mono text-slate-400 mt-auto z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Hackathon info */}
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal className="w-4 h-4 text-purple-400" />
          <span>CodeOracle • HACKORBIT 2026 • Developer Tools & Education</span>
        </div>

        {/* Middle: Limits & Languages */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.08] text-slate-300">
            Python & JavaScript
          </span>
          <span>•</span>
          <span>Max {MAX_SOURCE_LINES.toLocaleString()} lines</span>
        </div>

        {/* Right: API URL info & Keyboard Shortcuts Trigger */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Server className="w-3.5 h-3.5 text-cyan-400/80" />
            <span className="truncate max-w-[160px]" title={API_BASE_URL}>
              {API_BASE_URL}
            </span>
          </div>

          {onOpenShortcuts && (
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
              title="View Keyboard Shortcuts (Press ?)"
            >
              <Keyboard className="w-3 h-3 text-purple-400" />
              <span>Shortcuts (?)</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
