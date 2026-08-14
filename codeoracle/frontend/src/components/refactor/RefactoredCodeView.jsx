import React, { useState } from 'react';
import {
  Code2,
  FileCode2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  Info,
  Layers,
  Split,
  FileText,
} from 'lucide-react';
import CodeViewer from '../common/CodeViewer';
import DiffViewer from '../common/DiffViewer';
import Badge from '../common/Badge';

/**
 * Refactored Code View Component with Diff Viewer Mode
 * @param {Object} props
 * @param {Array} props.refactoredFiles - Array of proposed refactored file objects
 */
export default function RefactoredCodeView({ refactoredFiles = [] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCodeMode, setActiveCodeMode] = useState('diff'); // 'diff' | 'full'

  if (!refactoredFiles || refactoredFiles.length === 0) {
    return (
      <div className="text-center py-20 bg-[#0a0b12]/60 rounded-2xl border border-white/[0.06] flex flex-col items-center justify-center space-y-3">
        <Code2 className="w-12 h-12 text-slate-500 mb-1" />
        <h4 className="text-base font-bold text-slate-200">No Refactored Code Proposals</h4>
        <p className="text-xs text-slate-400 max-w-sm">
          No automated modernization refactoring proposals were generated for this codebase.
        </p>
      </div>
    );
  }

  const activeFile = refactoredFiles[selectedIndex] || refactoredFiles[0];

  const {
    file_path = 'app/main.py',
    original_code = '# Legacy Code',
    refactored_code = '# No refactored code provided',
    reason = 'Modernize legacy implementation patterns.',
    expected_benefit = 'Improved maintainability, security, and performance.',
    risk_level = 'medium', // 'low' | 'medium' | 'high'
    breaking_changes = [],
    migration_notes = [],
    assumptions = [],
    human_review_required = true,
  } = activeFile;

  const isHighRisk = risk_level?.toLowerCase() === 'high';
  const isMediumRisk = risk_level?.toLowerCase() === 'medium';

  const riskBadgeConfig = isHighRisk
    ? { variant: 'rose', text: 'High Risk Proposal', dot: true }
    : isMediumRisk
    ? { variant: 'amber', text: 'Medium Risk Proposal', dot: true }
    : { variant: 'emerald', text: 'Low Risk Proposal', dot: true };

  const isPython = file_path.endsWith('.py');
  const codeLang = isPython ? 'python' : 'javascript';
  const filename = file_path.split('/').pop() || 'code';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* File Switcher Tabs (if multiple files refactored) */}
      {refactoredFiles.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/[0.06]">
          {refactoredFiles.map((file, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                selectedIndex === idx
                  ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-400/40 shadow-md shadow-indigo-500/10'
                  : 'bg-white/[0.02] text-slate-400 border border-white/[0.06] hover:bg-white/[0.05]'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>{file.file_path || `Refactored File #${idx + 1}`}</span>
            </button>
          ))}
        </div>
      )}

      {/* Modernization Metadata & Risk Summary */}
      <div className="rounded-2xl bg-[#0e101d] border border-white/[0.08] p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-100 font-mono">
                {file_path}
              </h3>
              <Badge variant={riskBadgeConfig.variant} size="sm" dot={riskBadgeConfig.dot}>
                {riskBadgeConfig.text}
              </Badge>
              {human_review_required && (
                <Badge variant="indigo" size="sm" icon={<UserCheck className="w-3 h-3" />}>
                  Human Review Required
                </Badge>
              )}
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Language: <strong className="text-slate-200 capitalize">{codeLang}</strong>
            </span>
          </div>

          {/* View Mode Mode: Diff vs Full Code */}
          <div className="inline-flex p-1 rounded-xl bg-[#080912] border border-white/10 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveCodeMode('diff')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeCodeMode === 'diff'
                  ? 'bg-purple-600/40 text-purple-200 shadow-sm border border-purple-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Before/After Diff</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCodeMode('full')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeCodeMode === 'full'
                  ? 'bg-purple-600/40 text-purple-200 shadow-sm border border-purple-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Modernized Code</span>
            </button>
          </div>
        </div>

        {/* Breaking Changes Warning Box (Visually Prominent) */}
        {breaking_changes && breaking_changes.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs sm:text-sm space-y-2 shadow-lg shadow-rose-950/20">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Breaking Changes Detected ({breaking_changes.length})</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-200 leading-relaxed">
              {breaking_changes.map((bc, i) => (
                <li key={i}>{typeof bc === 'object' ? bc.description || bc.message : bc}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Reason & Expected Benefit Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-purple-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Why Refactor (Reason):</span>
            </span>
            <p className="text-slate-300 leading-relaxed">{reason}</p>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Expected Benefit:</span>
            </span>
            <p className="text-slate-300 leading-relaxed">{expected_benefit}</p>
          </div>
        </div>

        {/* Migration Notes & Assumptions */}
        {(migration_notes.length > 0 || assumptions.length > 0) && (
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-300 space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-300 font-semibold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>Migration Steps & Assumptions</span>
            </span>
            {migration_notes.length > 0 && (
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-300">
                {migration_notes.map((note, i) => (
                  <li key={i}>{typeof note === 'object' ? note.step || note.description : note}</li>
                ))}
              </ul>
            )}
            {assumptions.length > 0 && (
              <div className="pt-1 text-[11px] text-slate-400">
                <strong>Assumptions:</strong> {assumptions.join('; ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Code Display: Either Diff Viewer or Full Code Viewer */}
      {activeCodeMode === 'diff' ? (
        <DiffViewer
          originalCode={original_code}
          refactoredCode={refactored_code}
          filename={`${filename} (Diff View)`}
          language={codeLang}
        />
      ) : (
        <CodeViewer
          code={refactored_code}
          language={codeLang}
          filename={`${filename} (Modernized)`}
        />
      )}
    </div>
  );
}
