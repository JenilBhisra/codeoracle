import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  FileCode2,
  FunctionSquare,
  Boxes,
  ArrowRight,
  AlertTriangle,
  Layers,
  Sparkles,
  ExternalLink,
  Code2,
} from 'lucide-react';
import Badge from '../common/Badge';

/**
 * Collapsible Module Accordion Item
 * Displays classes, functions, inputs/outputs, side effects, and dependencies
 * @param {Object} props
 * @param {Object} props.module - Module explanation object
 * @param {boolean} [props.defaultOpen=false]
 */
export default function ModuleAccordion({ module, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [openFunctions, setOpenFunctions] = useState({});

  const toggleFunction = (fnName) => {
    setOpenFunctions((prev) => ({
      ...prev,
      [fnName]: !prev[fnName],
    }));
  };

  const {
    name = 'Unnamed Module',
    path = '',
    language = 'python',
    role = 'Module description',
    explanation = '',
    classes = [],
    functions = [],
    dependencies = [],
    side_effects = [],
    risks = [],
  } = module;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isOpen
          ? 'bg-[#121424]/90 border-purple-500/30 shadow-xl shadow-purple-500/5'
          : 'bg-[#0f111e]/70 border-white/[0.06] hover:border-white/15'
      }`}
    >
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer select-none focus:outline-none"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm sm:text-base font-bold text-slate-100 font-mono truncate">
                {name}
              </span>
              <Badge
                variant={language.toLowerCase().includes('py') ? 'cyan' : 'purple'}
                size="sm"
                className="capitalize"
              >
                {language}
              </Badge>
              {classes.length > 0 && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400">
                  {classes.length} class{classes.length > 1 ? 'es' : ''}
                </span>
              )}
              {functions.length > 0 && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400">
                  {functions.length} fn{functions.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {path && (
              <span className="text-xs text-slate-400 font-mono truncate block">
                {path}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            {isOpen ? 'Collapse' : 'Expand'}
          </span>
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-300">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Accordion Expanded Body */}
      {isOpen && (
        <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-white/[0.06] space-y-6 text-xs sm:text-sm">
          {/* Module Role / Overview */}
          <div>
            <h5 className="text-[11px] font-mono uppercase tracking-wider text-purple-300 mb-1.5 font-semibold">
              Module Purpose & Architecture Role
            </h5>
            <p className="text-slate-300 leading-relaxed bg-[#0a0b12]/50 p-4 rounded-xl border border-white/[0.04]">
              {explanation || role}
            </p>
          </div>

          {/* External Dependencies */}
          {dependencies && dependencies.length > 0 && (
            <div>
              <h5 className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 mb-2 font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>External & Internal Imports ({dependencies.length})</span>
              </h5>
              <div className="flex flex-wrap gap-2">
                {dependencies.map((dep, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-slate-300 font-mono text-[11px]"
                  >
                    {typeof dep === 'object' ? dep.name || dep.target : dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Classes Breakdown */}
          {classes && classes.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-[11px] font-mono uppercase tracking-wider text-indigo-300 font-semibold flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" />
                <span>Declared Classes ({classes.length})</span>
              </h5>
              <div className="space-y-2.5">
                {classes.map((cls, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#0a0b12]/60 border border-white/[0.06] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-100 font-mono text-sm text-cyan-300">
                        class {cls.name}
                      </span>
                      {cls.inherits && (
                        <span className="text-[11px] font-mono text-slate-400">
                          inherits: {cls.inherits}
                        </span>
                      )}
                    </div>
                    {cls.explanation && (
                      <p className="text-slate-300 text-xs leading-relaxed">
                        {cls.explanation}
                      </p>
                    )}
                    {cls.methods && cls.methods.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-slate-400 font-mono">Methods:</span>
                        {cls.methods.map((m, mIdx) => (
                          <span
                            key={mIdx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-purple-200 border border-white/[0.06]"
                          >
                            {typeof m === 'object' ? m.name : m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Functions Breakdown */}
          {functions && functions.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 font-semibold flex items-center gap-1.5">
                <FunctionSquare className="w-3.5 h-3.5" />
                <span>Functions & Methods ({functions.length})</span>
              </h5>
              <div className="space-y-2">
                {functions.map((fn, idx) => {
                  const fnKey = `${name}-${fn.name || idx}`;
                  const isFnOpen = openFunctions[fnKey] !== undefined ? openFunctions[fnKey] : true;

                  return (
                    <div
                      key={idx}
                      className="rounded-xl bg-[#0a0b12]/60 border border-white/[0.06] overflow-hidden"
                    >
                      {/* Function Header */}
                      <button
                        type="button"
                        onClick={() => toggleFunction(fnKey)}
                        className="w-full p-3.5 text-left flex items-center justify-between gap-3 hover:bg-white/[0.02] cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-purple-400 font-mono text-xs">def</span>
                          <span className="font-bold text-slate-200 font-mono text-xs truncate">
                            {fn.signature || `${fn.name || 'anonymous'}()`}
                          </span>
                        </div>
                        <div className="text-slate-400">
                          {isFnOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </button>

                      {/* Function Details */}
                      {isFnOpen && (
                        <div className="px-4 pb-4 pt-1 border-t border-white/[0.04] space-y-2 text-xs">
                          {fn.explanation && (
                            <p className="text-slate-300 leading-relaxed">
                              {fn.explanation}
                            </p>
                          )}

                          {/* Inputs & Outputs Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {fn.inputs && (
                              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                                  Inputs / Parameters:
                                </span>
                                <span className="text-slate-200 font-mono text-[11px]">
                                  {Array.isArray(fn.inputs) ? fn.inputs.join(', ') : String(fn.inputs)}
                                </span>
                              </div>
                            )}

                            {fn.outputs && (
                              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                                  Return Value:
                                </span>
                                <span className="text-emerald-300 font-mono text-[11px]">
                                  {Array.isArray(fn.outputs) ? fn.outputs.join(', ') : String(fn.outputs)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Side Effects */}
                          {fn.side_effects && fn.side_effects.length > 0 && (
                            <div className="pt-1 flex items-start gap-2 text-amber-300 text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                              <span>
                                <strong>Side effects:</strong>{' '}
                                {Array.isArray(fn.side_effects) ? fn.side_effects.join(', ') : String(fn.side_effects)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Module-level Side Effects & Risks */}
          {side_effects && side_effects.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong className="block mb-0.5">Module Side Effects:</strong>
                <span className="text-slate-300">
                  {Array.isArray(side_effects) ? side_effects.join(' • ') : String(side_effects)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
