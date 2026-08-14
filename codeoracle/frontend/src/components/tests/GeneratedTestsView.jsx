import React, { useState } from 'react';
import {
  ShieldCheck,
  FileCode2,
  CheckCircle2,
  ExternalLink,
  Target,
  Sparkles,
  Info,
  FunctionSquare,
} from 'lucide-react';
import CodeViewer from '../common/CodeViewer';
import Badge from '../common/Badge';

/**
 * Generated Tests View Component (Phase 8)
 * @param {Object} props
 * @param {Array} props.tests - Array of generated test suite objects
 */
export default function GeneratedTestsView({ tests = [] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!tests || tests.length === 0) {
    return (
      <div className="text-center py-20 bg-[#0a0b12]/60 rounded-2xl border border-white/[0.06] flex flex-col items-center justify-center space-y-3">
        <ShieldCheck className="w-12 h-12 text-slate-500 mb-1" />
        <h4 className="text-base font-bold text-slate-200">No Generated Tests Available</h4>
        <p className="text-xs text-slate-400 max-w-sm">
          No automated test suites were generated for this analysis run.
        </p>
      </div>
    );
  }

  const activeTest = tests[selectedIndex] || tests[0];

  const {
    filename = 'test_suite.py',
    framework = 'pytest',
    target_file = 'app/main.py',
    code = '# No test code generated',
    covered_functions = [],
    assumptions = [],
    coverage_percentage = null,
    coverage_label = 'Not executed', // 'Measured' | 'Estimated' | 'Not executed'
  } = activeTest;

  // Determine coverage badge color
  const getCoverageBadgeVariant = (label) => {
    const l = label?.toLowerCase() || '';
    if (l.includes('measured')) return 'emerald';
    if (l.includes('estimated')) return 'amber';
    return 'neutral';
  };

  const isPython = filename.endsWith('.py') || framework.toLowerCase().includes('pytest');
  const codeLang = isPython ? 'python' : 'javascript';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Test Suite Selector Tabs (if multiple test files exist) */}
      {tests.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/[0.06]">
          {tests.map((t, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                selectedIndex === idx
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-400/40 shadow-md shadow-purple-500/10'
                  : 'bg-white/[0.02] text-slate-400 border border-white/[0.06] hover:bg-white/[0.05]'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>{t.filename || `Test File #${idx + 1}`}</span>
            </button>
          ))}
        </div>
      )}

      {/* Test Suite Metadata Header */}
      <div className="rounded-2xl bg-[#0e101d] border border-white/[0.08] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-100 font-mono">
                {filename}
              </h3>
              <Badge variant="purple" size="sm" className="uppercase font-semibold">
                {framework}
              </Badge>
              <Badge
                variant={getCoverageBadgeVariant(coverage_label)}
                size="sm"
                dot
              >
                {coverage_percentage !== null
                  ? `${coverage_percentage}% ${coverage_label}`
                  : coverage_label}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <Target className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Target Source: <strong className="text-slate-200">{target_file}</strong></span>
            </div>
          </div>
        </div>

        {/* Covered Functions List */}
        {covered_functions && covered_functions.length > 0 && (
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2 flex items-center gap-1.5">
              <FunctionSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Covered Functions ({covered_functions.length}):</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {covered_functions.map((fn, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[11px]"
                >
                  {typeof fn === 'object' ? fn.name || fn.signature : fn}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Assumptions Callout */}
        {assumptions && assumptions.length > 0 && (
          <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px] font-mono uppercase tracking-wider">
              <Info className="w-3.5 h-3.5" />
              <span>Test Generation Assumptions</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-300">
              {assumptions.map((a, i) => (
                <li key={i}>{typeof a === 'object' ? a.description || a.message : a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Syntax-Highlighted Test Code Block */}
      <CodeViewer
        code={code}
        language={codeLang}
        filename={filename}
      />
    </div>
  );
}
