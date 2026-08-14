import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  Code2,
  FolderGit2,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  RotateCcw,
  Eye,
  FileCode2,
  Sliders,
  Activity,
  Keyboard,
} from 'lucide-react';
import AppShell from './components/layout/AppShell';
import UploadForm from './components/input/UploadForm';
import ProcessingView from './components/processing/ProcessingView';
import ResultsDashboard from './components/results/ResultsDashboard';
import ApiDiagnosticsModal from './components/common/ApiDiagnosticsModal';
import KeyboardShortcutsModal from './components/common/KeyboardShortcutsModal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/common/Card';
import Badge from './components/common/Badge';
import Button from './components/common/Button';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBanner from './components/common/ErrorBanner';
import { checkApiHealth, analyzeZipUpload, analyzeGithubRepo } from './services/api';
import { parseApiError } from './utils/errorHandler';
import { DEMO_PRESETS } from './utils/presets';
import { APP_STATES, RESULTS_TABS, MAX_SOURCE_LINES } from './utils/constants';

function App() {
  // Global Application State Machine
  const [appState, setAppState] = useState(APP_STATES.LANDING);
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', message: 'Checking API...' });
  const [activeJob, setActiveJob] = useState(null); // { jobId, sourceName, sourceType, status, progress, message }
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Health check polling every 10s
  const verifyBackend = async () => {
    try {
      const data = await checkApiHealth();
      if (data && data.status === 'healthy') {
        setBackendHealth({ status: 'connected', message: 'Backend Connected (Healthy)' });
      } else {
        setBackendHealth({ status: 'degraded', message: 'Backend Response Unexpected' });
      }
    } catch (err) {
      setBackendHealth({
        status: 'disconnected',
        message: 'Backend Disconnected (Run backend or check VITE_API_BASE_URL)',
      });
    }
  };

  useEffect(() => {
    verifyBackend();
    const interval = setInterval(verifyBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  // Global Keyboard Shortcuts (Shift + ? -> shortcuts, d -> diagnostics, Escape -> close)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Don't intercept when user is typing in inputs
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setIsDiagnosticsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsShortcutsOpen(false);
        setIsDiagnosticsOpen(false);
      } else if ((e.key === 'n' || e.key === 'N') && appState === APP_STATES.RESULTS) {
        handleReset();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [appState]);

  // Handle ZIP Submission
  const handleZipSubmit = async (file) => {
    setIsSubmitting(true);
    setErrorState(null);

    try {
      const response = await analyzeZipUpload(file);
      if (response && response.job_id) {
        setActiveJob({
          jobId: response.job_id,
          sourceName: file.name,
          sourceType: 'zip',
          status: response.status || 'queued',
          progress: response.progress || 0,
          message: response.message || 'Analysis queued successfully',
        });
        setAppState(APP_STATES.PROCESSING);
      } else {
        throw new Error('Backend did not return a valid job ID.');
      }
    } catch (err) {
      const formatted = parseApiError(err, 'zip');
      setErrorState(formatted);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle GitHub URL Submission
  const handleGithubSubmit = async (repoUrl) => {
    setIsSubmitting(true);
    setErrorState(null);

    try {
      const response = await analyzeGithubRepo(repoUrl);
      if (response && response.job_id) {
        const repoName = repoUrl.split('github.com/')[1] || repoUrl;
        setActiveJob({
          jobId: response.job_id,
          sourceName: repoName,
          sourceType: 'github',
          status: response.status || 'queued',
          progress: response.progress || 0,
          message: response.message || 'Analysis queued successfully',
        });
        setAppState(APP_STATES.PROCESSING);
      } else {
        throw new Error('Backend did not return a valid job ID.');
      }
    } catch (err) {
      const formatted = parseApiError(err, 'github');
      setErrorState(formatted);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Completed results callback from ProcessingView
  const handleProcessingComplete = (results) => {
    setAnalysisResults(results);
    setAppState(APP_STATES.RESULTS);
  };

  // Reset to Landing State
  const handleReset = () => {
    setAppState(APP_STATES.LANDING);
    setActiveJob(null);
    setAnalysisResults(null);
    setErrorState(null);
  };

  // Load a chosen Demo Preset
  const handleSelectPreset = (preset) => {
    setActiveJob({
      jobId: preset.data.job_id,
      sourceName: preset.data.summary.project_name,
      sourceType: 'github',
      status: 'completed',
    });
    setAnalysisResults(preset.data);
    setAppState(APP_STATES.RESULTS);
  };

  return (
    <AppShell
      backendHealth={backendHealth}
      onRefreshHealth={verifyBackend}
      onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
      onOpenShortcuts={() => setIsShortcutsOpen(true)}
      onReset={handleReset}
      showReset={appState !== APP_STATES.LANDING}
    >
      {/* API Diagnostics Modal */}
      <ApiDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        backendHealth={backendHealth}
        onRefreshHealth={verifyBackend}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Global Error Banner Display */}
      {errorState && (
        <div className="max-w-3xl mx-auto w-full mb-8">
          <ErrorBanner
            title={errorState.title}
            message={errorState.message}
            details={errorState.details}
            type={errorState.type || 'error'}
            onDismiss={() => setErrorState(null)}
            onReset={handleReset}
          />
        </div>
      )}

      {/* STATE 1: LANDING & UPLOAD INTERFACE */}
      {appState === APP_STATES.LANDING && (
        <div className="space-y-12">
          {/* Hero Section */}
          <section className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-cyan-500/10 border border-purple-500/25 text-purple-300 text-xs font-medium mb-6 shadow-sm backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>PS-06 • HACKORBIT 2026 Developer Tools & Education</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-[1.15]">
              AI-Powered Legacy Codebase{' '}
              <span className="bg-gradient-to-r from-purple-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                Explainer & Modernizer
              </span>
            </h1>

            <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed font-light mb-8">
              Transform legacy Python & JavaScript repositories into clear architectural explanations, interactive dependency graphs, automated test suites, and modernized refactoring suggestions.
            </p>
          </section>

          {/* Dual-Mode Upload Form */}
          <section className="space-y-5">
            <UploadForm
              onSubmitZip={handleZipSubmit}
              onSubmitGithub={handleGithubSubmit}
              isLoading={isSubmitting}
            />

            {/* Interactive Demo Presets Picker */}
            <div className="max-w-3xl mx-auto rounded-2xl bg-[#0e101d]/90 border border-white/[0.08] p-4 text-center space-y-3 backdrop-blur-xl shadow-lg">
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-300 font-semibold">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Instant Demo Scenarios (One-Click Testing for Judges):</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-purple-600/20 border border-white/10 hover:border-purple-500/40 text-slate-200 text-xs font-mono transition-all flex items-center gap-2 cursor-pointer group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform" />
                    <span>{preset.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Capabilities Grid */}
          <section className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
              <Card variant="interactive" className="p-5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3 text-purple-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <CardTitle className="text-sm mb-1 text-slate-200">Architecture Explanations</CardTitle>
                <CardDescription className="text-xs">
                  Deep AST & LLM breakdown of entry points, module roles, and side effects.
                </CardDescription>
              </Card>

              <Card variant="interactive" className="p-5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3 text-cyan-400">
                  <Layers className="w-5 h-5" />
                </div>
                <CardTitle className="text-sm mb-1 text-slate-200">Dependency Graphs</CardTitle>
                <CardDescription className="text-xs">
                  Interactive node-edge React Flow maps showing module and file relationships.
                </CardDescription>
              </Card>

              <Card variant="interactive" className="p-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <CardTitle className="text-sm mb-1 text-slate-200">Automated Unit Tests</CardTitle>
                <CardDescription className="text-xs">
                  Synthesized PyTest & Jest suites with coverage target badges.
                </CardDescription>
              </Card>

              <Card variant="interactive" className="p-5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3 text-indigo-400">
                  <Code2 className="w-5 h-5" />
                </div>
                <CardTitle className="text-sm mb-1 text-slate-200">Refactored Code</CardTitle>
                <CardDescription className="text-xs">
                  Modernized syntax with breaking-change warnings and migration notes.
                </CardDescription>
              </Card>
            </div>
          </section>
        </div>
      )}

      {/* STATE 2: PROCESSING STATE */}
      {appState === APP_STATES.PROCESSING && activeJob && (
        <ProcessingView
          job={activeJob}
          onComplete={handleProcessingComplete}
          onCancel={handleReset}
        />
      )}

      {/* STATE 3: RESULTS DASHBOARD (Phases 5, 6, 7, 8, 9, 10 + Extensions) */}
      {appState === APP_STATES.RESULTS && (
        <ResultsDashboard
          results={analysisResults || {}}
          jobId={activeJob?.jobId}
          onReset={handleReset}
        />
      )}
    </AppShell>
  );
}

export default App;
