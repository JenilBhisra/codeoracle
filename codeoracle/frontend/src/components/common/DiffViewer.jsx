import React, { useState } from 'react';
import { Columns, AlignJustify, Copy, Check, Download, FileCode2 } from 'lucide-react';
import Button from './Button';

/**
 * Line-by-line Diff Computation Helper
 */
function computeDiffLines(originalStr = '', refactoredStr = '') {
  const origLines = originalStr.split('\n');
  const refactLines = refactoredStr.split('\n');
  const maxLen = Math.max(origLines.length, refactLines.length);

  const diffRows = [];
  for (let i = 0; i < maxLen; i++) {
    const orig = origLines[i] ?? null;
    const refact = refactLines[i] ?? null;

    let type = 'unchanged';
    if (orig === null && refact !== null) type = 'added';
    else if (orig !== null && refact === null) type = 'removed';
    else if (orig !== refact) type = 'modified';

    diffRows.push({
      lineNum: i + 1,
      orig,
      refact,
      type,
    });
  }
  return diffRows;
}

/**
 * Side-by-Side & Unified Before/After Code Diff Viewer
 * @param {Object} props
 * @param {string} props.originalCode
 * @param {string} props.refactoredCode
 * @param {string} [props.filename]
 * @param {'python' | 'javascript'} [props.language='python']
 */
export default function DiffViewer({
  originalCode = '',
  refactoredCode = '',
  filename = 'code.py',
  language = 'python',
}) {
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'unified'
  const [copied, setCopied] = useState(false);

  const diffRows = computeDiffLines(originalCode, refactoredCode);

  const handleCopyRefactored = async () => {
    try {
      await navigator.clipboard.writeText(refactoredCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code', err);
    }
  };

  const handleDownloadRefactored = () => {
    const blob = new Blob([refactoredCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'refactored_code.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0b0c16] overflow-hidden shadow-2xl">
      {/* Toolbar */}
      <div className="px-4 py-3 bg-[#111322] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-200 min-w-0">
          <FileCode2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-bold truncate">{filename}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase">
            Diff Comparison
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="inline-flex p-0.5 rounded-lg bg-[#07080f] border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === 'split' ? 'bg-purple-600/40 text-purple-200' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === 'unified' ? 'bg-purple-600/40 text-purple-200' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlignJustify className="w-3 h-3" />
              <span>Unified</span>
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyRefactored}
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            className="text-xs px-2.5 py-1"
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadRefactored}
            icon={<Download className="w-3.5 h-3.5 text-cyan-400" />}
            className="text-xs px-2.5 py-1"
            title="Download refactored code"
          >
            Download
          </Button>
        </div>
      </div>

      {/* Split Diff View */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-2 divide-x divide-white/[0.08] max-h-[500px] overflow-y-auto text-xs font-mono bg-[#07080f]">
          {/* Left Column: Original Legacy Code */}
          <div>
            <div className="sticky top-0 bg-[#0f111e] px-4 py-1.5 border-b border-white/[0.06] text-[10px] uppercase font-bold text-rose-400 flex items-center justify-between z-10">
              <span>Original (Legacy)</span>
              <span className="text-slate-500 font-normal">Before</span>
            </div>
            <div className="p-2 space-y-0.5">
              {diffRows.map((row) => (
                <div
                  key={`orig-${row.lineNum}`}
                  className={`flex items-start gap-2 px-2 py-0.5 rounded leading-relaxed ${
                    row.type === 'removed' || row.type === 'modified'
                      ? 'bg-rose-950/30 text-rose-200 border-l-2 border-rose-500'
                      : 'text-slate-400'
                  }`}
                >
                  <span className="w-6 text-[10px] text-slate-600 select-none text-right shrink-0">
                    {row.orig !== null ? row.lineNum : ''}
                  </span>
                  <pre className="overflow-x-auto whitespace-pre font-mono flex-1">
                    {row.orig ?? ' '}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Modernized Refactored Code */}
          <div>
            <div className="sticky top-0 bg-[#0f111e] px-4 py-1.5 border-b border-white/[0.06] text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-between z-10">
              <span>Proposed (Modernized)</span>
              <span className="text-slate-500 font-normal">After</span>
            </div>
            <div className="p-2 space-y-0.5">
              {diffRows.map((row) => (
                <div
                  key={`refact-${row.lineNum}`}
                  className={`flex items-start gap-2 px-2 py-0.5 rounded leading-relaxed ${
                    row.type === 'added' || row.type === 'modified'
                      ? 'bg-emerald-950/30 text-emerald-200 border-l-2 border-emerald-500'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="w-6 text-[10px] text-slate-600 select-none text-right shrink-0">
                    {row.refact !== null ? row.lineNum : ''}
                  </span>
                  <pre className="overflow-x-auto whitespace-pre font-mono flex-1">
                    {row.refact ?? ' '}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Unified Diff View */
        <div className="max-h-[500px] overflow-y-auto p-3 text-xs font-mono bg-[#07080f] space-y-0.5">
          {diffRows.map((row) => (
            <React.Fragment key={`unified-${row.lineNum}`}>
              {row.type === 'modified' || row.type === 'removed' ? (
                <div className="flex items-start gap-2 px-2 py-0.5 rounded bg-rose-950/30 text-rose-300 border-l-2 border-rose-500">
                  <span className="w-6 text-[10px] text-rose-500 select-none text-right shrink-0">
                    -
                  </span>
                  <pre className="overflow-x-auto whitespace-pre font-mono flex-1">
                    {row.orig}
                  </pre>
                </div>
              ) : null}

              {row.type === 'modified' || row.type === 'added' ? (
                <div className="flex items-start gap-2 px-2 py-0.5 rounded bg-emerald-950/30 text-emerald-300 border-l-2 border-emerald-500">
                  <span className="w-6 text-[10px] text-emerald-500 select-none text-right shrink-0">
                    +
                  </span>
                  <pre className="overflow-x-auto whitespace-pre font-mono flex-1">
                    {row.refact}
                  </pre>
                </div>
              ) : null}

              {row.type === 'unchanged' && (
                <div className="flex items-start gap-2 px-2 py-0.5 rounded text-slate-400">
                  <span className="w-6 text-[10px] text-slate-600 select-none text-right shrink-0">
                    {row.lineNum}
                  </span>
                  <pre className="overflow-x-auto whitespace-pre font-mono flex-1">
                    {row.orig}
                  </pre>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
