import React from 'react';
import { Sparkles, RefreshCw, Activity, Terminal, RotateCcw } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';

/**
 * Application Header Component
 * @param {Object} props
 * @param {{ status: 'checking' | 'connected' | 'degraded' | 'disconnected', message: string }} props.backendHealth
 * @param {Function} [props.onRefreshHealth]
 * @param {Function} [props.onReset]
 * @param {boolean} [props.showReset=false]
 */
export default function Header({
  backendHealth = { status: 'checking', message: 'Checking API...' },
  onRefreshHealth,
  onReset,
  showReset = false,
}) {
  const statusBadge = {
    connected: {
      variant: 'emerald',
      text: 'API Online',
      dot: true,
    },
    checking: {
      variant: 'amber',
      text: 'Checking...',
      dot: true,
    },
    degraded: {
      variant: 'amber',
      text: 'API Degraded',
      dot: true,
    },
    disconnected: {
      variant: 'rose',
      text: 'API Offline',
      dot: true,
    },
  }[backendHealth.status] || {
    variant: 'neutral',
    text: 'API Unknown',
    dot: true,
  };

  return (
    <header className="border-b border-white/[0.06] bg-[#0d0f1c]/80 backdrop-blur-xl sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Track Identity */}
        <div className="flex items-center gap-3.5 cursor-pointer" onClick={onReset}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 p-[1px] shadow-lg shadow-purple-500/20 group hover:shadow-purple-500/40 transition-shadow">
            <div className="w-full h-full bg-[#0a0b12] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent">
                CodeOracle
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 font-mono font-medium">
                PS-06
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-light hidden sm:inline">
              Legacy Codebase Explainer & Modernizer
            </span>
          </div>
        </div>

        {/* Right Action & Status Area */}
        <div className="flex items-center gap-3">
          {/* Reset / New Analysis button if active job exists */}
          {showReset && (
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={onReset}
              className="hidden sm:inline-flex"
            >
              New Analysis
            </Button>
          )}

          {/* Backend Health Status Badge */}
          <div
            className="flex items-center gap-1.5 cursor-pointer group"
            onClick={onRefreshHealth}
            title={`${backendHealth.message} (Click to re-check)`}
          >
            <Badge
              variant={statusBadge.variant}
              size="md"
              dot={statusBadge.dot}
              className="shadow-sm transition-all group-hover:border-white/30"
            >
              {statusBadge.text}
            </Badge>
          </div>

          {/* GitHub Repository Link */}
          <a
            href="https://github.com/JenilBhisra/codeoracle"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-all flex items-center justify-center"
            title="View CodeOracle on GitHub"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
