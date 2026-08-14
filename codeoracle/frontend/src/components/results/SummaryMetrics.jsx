import React from 'react';
import {
  FolderCode,
  FileCode2,
  Cpu,
  Layers,
  ShieldCheck,
  Percent,
  Code2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import Badge from '../common/Badge';

/**
 * Summary Metrics Grid for the Results Dashboard
 * Displays real values provided by the backend response
 * @param {Object} props
 * @param {Object} props.summary
 * @param {string} [props.summary.project_name]
 * @param {string[]} [props.summary.languages]
 * @param {number} [props.summary.file_count]
 * @param {number} [props.summary.line_count]
 * @param {number} [props.summary.module_count]
 * @param {number} [props.summary.dependency_count]
 * @param {number} [props.summary.test_count]
 * @param {number} [props.summary.coverage_percentage]
 * @param {'measured' | 'estimated' | 'not_executed'} [props.summary.coverage_type]
 */
export default function SummaryMetrics({ summary = {} }) {
  const {
    project_name = 'Codebase',
    languages = ['python'],
    file_count = 0,
    line_count = 0,
    module_count = 0,
    dependency_count = 0,
    test_count = 0,
    coverage_percentage = null,
    coverage_type = 'not_executed', // 'measured' | 'estimated' | 'not_executed'
  } = summary;

  const getCoverageBadge = () => {
    switch (coverage_type) {
      case 'measured':
        return (
          <Badge variant="emerald" dot size="sm">
            {coverage_percentage !== null ? `${coverage_percentage}% Measured` : 'Measured'}
          </Badge>
        );
      case 'estimated':
        return (
          <Badge variant="amber" dot size="sm">
            {coverage_percentage !== null ? `~${coverage_percentage}% Estimated` : 'Estimated'}
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            Not Executed
          </Badge>
        );
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {/* 1. Detected Languages */}
      <div className="p-4 rounded-2xl bg-[#121424]/80 border border-white/[0.08] backdrop-blur-xl shadow-lg shadow-black/20 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1 text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Languages</span>
          <Code2 className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {languages && languages.length > 0 ? (
            languages.map((lang) => (
              <Badge
                key={lang}
                variant={lang.toLowerCase().includes('py') ? 'cyan' : 'purple'}
                size="sm"
                className="capitalize font-sans font-semibold text-[11px]"
              >
                {lang}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-slate-400">N/A</span>
          )}
        </div>
      </div>

      {/* 2. Source Files */}
      <div className="p-4 rounded-2xl bg-[#121424]/80 border border-white/[0.08] backdrop-blur-xl shadow-lg shadow-black/20 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1 text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Files</span>
          <FileCode2 className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-slate-100">
          {Number(file_count).toLocaleString()}
        </div>
      </div>

      {/* 3. Total Lines */}
      <div className="p-4 rounded-2xl bg-[#121424]/80 border border-white/[0.08] backdrop-blur-xl shadow-lg shadow-black/20 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1 text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Total Lines</span>
          <FolderCode className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-slate-100">
          {Number(line_count).toLocaleString()}
        </div>
      </div>

      {/* 4. Modules */}
      <div className="p-4 rounded-2xl bg-[#121424]/80 border border-white/[0.08] backdrop-blur-xl shadow-lg shadow-black/20 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1 text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Modules</span>
          <Cpu className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-slate-100">
          {Number(module_count).toLocaleString()}
        </div>
      </div>

      {/* 5. Dependencies */}
      <div className="p-4 rounded-2xl bg-[#121424]/80 border border-white/[0.08] backdrop-blur-xl shadow-lg shadow-black/20 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1 text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Dependencies</span>
          <Layers className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-slate-100">
          {Number(dependency_count).toLocaleString()}
        </div>
      </div>

      {/* 6. Tests & Coverage */}
      <div className="p-4 rounded-2xl bg-[#121424]/80 border border-white/[0.08] backdrop-blur-xl shadow-lg shadow-black/20 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1 text-slate-400 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider">Tests & Status</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="space-y-1.5">
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {Number(test_count).toLocaleString()}
          </div>
          <div>{getCoverageBadge()}</div>
        </div>
      </div>
    </div>
  );
}
