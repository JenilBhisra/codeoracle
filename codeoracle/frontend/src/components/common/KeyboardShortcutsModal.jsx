import React from 'react';
import { X, Command, Keyboard, Sparkles } from 'lucide-react';
import Button from './Button';

/**
 * Keyboard Shortcuts Help Modal
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 */
export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '?', label: 'Open Keyboard Shortcuts Help' },
    { key: 'D', label: 'Open Live API Diagnostics Modal' },
    { key: '1', label: 'Switch to Explanation Tab' },
    { key: '2', label: 'Switch to Dependency Graph Tab' },
    { key: '3', label: 'Switch to Generated Tests Tab' },
    { key: '4', label: 'Switch to Refactored Code Tab' },
    { key: 'N', label: 'Reset & Start New Analysis' },
    { key: 'Esc', label: 'Close Active Modals / Drawers' },
  ];

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-3xl bg-[#0e101d] border border-purple-500/30 p-6 sm:p-8 shadow-2xl shadow-black/80 z-10 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-300">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-slate-400">
                Power-user navigation for CodeOracle
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-2">
          {shortcuts.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs font-mono"
            >
              <span className="text-slate-300">{sc.label}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-[#181c30] border border-white/15 text-cyan-300 font-bold shadow-sm text-[11px]">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Press <kbd className="text-purple-300 font-mono font-bold">Esc</kbd> anytime to exit</span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Got It
          </Button>
        </div>
      </div>
    </div>
  );
}
