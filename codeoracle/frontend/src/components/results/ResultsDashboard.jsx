import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  ShieldCheck,
  Code2,
  Download,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  FolderArchive,
  ExternalLink,
  Info,
} from 'lucide-react';
import SummaryMetrics from './SummaryMetrics';
import ExplanationView from '../explanation/ExplanationView';
import DependencyGraphView from '../graph/DependencyGraphView';
import GeneratedTestsView from '../tests/GeneratedTestsView';
import RefactoredCodeView from '../refactor/RefactoredCodeView';
import Tabs from '../common/Tabs';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { RESULTS_TABS } from '../../utils/constants';
import { getDownloadUrl } from '../../services/api';

/**
 * Main Results Dashboard Component (Phases 5, 6, 7, 8)
 * @param {Object} props
 * @param {Object} props.results - Backend result payload from /api/jobs/{job_id}/results
 * @param {string} props.jobId
 * @param {Function} props.onReset - Return to landing for a new analysis
 */
export default function ResultsDashboard({
  results = {},
  jobId,
  onReset,
}) {
  const [activeTab, setActiveTab] = useState(RESULTS_TABS.EXPLANATION);

  const summary = results.summary || {};
  const projectName = summary.project_name || results.project_name || 'Analyzed Project';
  const warnings = results.warnings || [];
  const explanation = results.explanation || {};
  const dependencyGraph = results.dependency_graph || { nodes: [], edges: [] };
  const generatedTests = results.generated_tests || [];
  const refactoredFiles = results.refactored_files || [];

  // Construct download URL
  const downloadUrl = jobId ? getDownloadUrl(jobId) : '#';

  const tabList = [
    {
      id: RESULTS_TABS.EXPLANATION,
      label: 'Explanation',
      icon: <Cpu className="w-4 h-4" />,
      count: explanation.modules ? explanation.modules.length : undefined,
    },
    {
      id: RESULTS_TABS.GRAPH,
      label: 'Dependency Graph',
      icon: <Layers className="w-4 h-4" />,
      count: dependencyGraph.nodes ? dependencyGraph.nodes.length : undefined,
    },
    {
      id: RESULTS_TABS.TESTS,
      label: 'Generated Tests',
      icon: <ShieldCheck className="w-4 h-4" />,
      count: generatedTests.length,
    },
    {
      id: RESULTS_TABS.REFACTOR,
      label: 'Refactored Code',
      icon: <Code2 className="w-4 h-4" />,
      count: refactoredFiles.length,
    },
  ];

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      {/* 1. Dashboard Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#121424]/80 border border-white/[0.08] backdrop-blur-2xl shadow-xl shadow-black/30">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600/30 to-cyan-500/30 border border-purple-400/30 flex items-center justify-center text-cyan-300 shrink-0 shadow-lg shadow-purple-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                Analysis Complete
              </span>
              {jobId && (
                <span className="text-[10px] font-mono text-slate-500 truncate hidden md:inline">
                  ID: {jobId}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 truncate tracking-tight font-mono">
              {projectName}
            </h1>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-3">
          {jobId && (
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-200 hover:text-white transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Download Bundle</span>
            </a>
          )}

          <Button
            variant="secondary"
            size="md"
            icon={<RotateCcw className="w-4 h-4" />}
            onClick={onReset}
          >
            New Analysis
          </Button>
        </div>
      </div>

      {/* 2. Summary Metrics Cards */}
      <SummaryMetrics summary={summary} />

      {/* 3. Breaking-Change / Migration Warnings Alert (if present) */}
      {warnings && warnings.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs sm:text-sm backdrop-blur-xl space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Legacy Migration Warnings & Risks ({warnings.length})</span>
          </div>
          <ul className="space-y-1 pl-6 list-disc text-slate-300 text-xs leading-relaxed">
            {warnings.map((warn, i) => (
              <li key={i}>{typeof warn === 'object' ? warn.message || JSON.stringify(warn) : warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. Tab Navigation Bar */}
      <div className="pt-2">
        <Tabs
          tabs={tabList}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="w-full sm:w-auto"
        />
      </div>

      {/* 5. Tab Content Views */}
      <div className="rounded-3xl bg-[#121424]/75 border border-white/[0.08] backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-black/40 min-h-[450px]">
        {/* Tab 1: Explanation (Phase 6) */}
        {activeTab === RESULTS_TABS.EXPLANATION && (
          <ExplanationView explanation={explanation} />
        )}

        {/* Tab 2: Dependency Graph (Phase 7) */}
        {activeTab === RESULTS_TABS.GRAPH && (
          <DependencyGraphView graphData={dependencyGraph} />
        )}

        {/* Tab 3: Generated Tests (Phase 8) */}
        {activeTab === RESULTS_TABS.TESTS && (
          <GeneratedTestsView tests={generatedTests} />
        )}

        {/* Tab 4: Refactored Code (Phase 8) */}
        {activeTab === RESULTS_TABS.REFACTOR && (
          <RefactoredCodeView refactoredFiles={refactoredFiles} />
        )}
      </div>
    </div>
  );
}
