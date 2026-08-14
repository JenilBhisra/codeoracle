import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  AlertCircle,
  RotateCcw,
  WifiOff,
  CheckCircle2,
  FolderGit2,
  FileArchive,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import ProgressStepper from './ProgressStepper';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { getJobStatus, getJobResults, ApiError } from '../../services/api';

/**
 * Processing View Component for active job polling and status tracking
 * @param {Object} props
 * @param {{ jobId: string, sourceName: string, sourceType: 'zip' | 'github', status: string, progress: number, message: string }} props.job
 * @param {Function} props.onComplete - callback receiving final results object
 * @param {Function} props.onCancel - callback to return to landing
 */
export default function ProcessingView({
  job,
  onComplete,
  onCancel,
}) {
  const [jobState, setJobState] = useState({
    status: job.status || 'queued',
    progress: job.progress || 5,
    message: job.message || 'Analysis queued...',
    error: null,
  });

  const [networkRetries, setNetworkRetries] = useState(0);
  const [isRetryingManually, setIsRetryingManually] = useState(false);
  const pollingTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Poll Job Status
  const pollStatus = async () => {
    if (!job?.jobId || !isMountedRef.current) return;

    try {
      const data = await getJobStatus(job.jobId);
      if (!isMountedRef.current) return;

      // Reset network retry counter on successful ping
      setNetworkRetries(0);

      const status = data.status || 'queued';
      const progress = typeof data.progress === 'number' ? data.progress : jobState.progress;
      const message = data.message || 'Processing codebase...';
      const error = data.error || null;

      setJobState({
        status,
        progress: Math.max(5, Math.min(100, progress)),
        message,
        error,
      });

      // 1. If Job Completed -> Fetch full results
      if (status === 'completed') {
        try {
          const resultsData = await getJobResults(job.jobId);
          if (isMountedRef.current) {
            onComplete(resultsData);
          }
        } catch (fetchErr) {
          if (isMountedRef.current) {
            setJobState((prev) => ({
              ...prev,
              status: 'failed',
              error: 'Analysis completed on server, but failed to download results: ' + fetchErr.message,
            }));
          }
        }
        return; // Stop polling
      }

      // 2. If Job Failed -> Stop polling
      if (status === 'failed') {
        return; // Stop polling
      }

      // 3. Continue polling after 2 seconds
      pollingTimerRef.current = setTimeout(pollStatus, 2000);
    } catch (err) {
      if (!isMountedRef.current) return;

      // Handle transient network errors gracefully
      setNetworkRetries((prev) => {
        const next = prev + 1;
        // If under 6 consecutive failures (approx 15 seconds), keep trying quietly
        if (next < 6) {
          pollingTimerRef.current = setTimeout(pollStatus, 3000);
        }
        return next;
      });
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    pollStatus();

    return () => {
      isMountedRef.current = false;
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, [job.jobId]);

  const handleManualRetry = () => {
    setIsRetryingManually(true);
    setNetworkRetries(0);
    pollStatus().finally(() => setIsRetryingManually(false));
  };

  const isFailed = jobState.status === 'failed';
  const isNetworkIssue = networkRetries >= 5;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* Network Disconnect Warning (if transient failures exceed threshold) */}
      {isNetworkIssue && !isFailed && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold">Temporary Network Interruption</p>
              <p className="text-slate-300 text-[11px]">
                Waiting to reconnect with the backend server. Analysis is still running in background.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRetry}
            loading={isRetryingManually}
          >
            Reconnect Now
          </Button>
        </div>
      )}

      {/* Main Processing Status Card */}
      <div className="rounded-3xl bg-[#121424]/85 border border-white/[0.08] backdrop-blur-2xl p-6 sm:p-10 shadow-2xl shadow-black/40 space-y-8 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-purple-500/10 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Header with Source & Job metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center text-cyan-300 shrink-0">
              {job.sourceType === 'github' ? (
                <FolderGit2 className="w-6 h-6" />
              ) : (
                <FileArchive className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-mono text-purple-300 uppercase tracking-wider block">
                {job.sourceType === 'github' ? 'GitHub Repository Analysis' : 'ZIP Archive Analysis'}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 truncate font-mono">
                {job.sourceName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="purple" size="sm">
              Job ID: {job.jobId ? `${job.jobId.slice(0, 8)}...` : 'Pending'}
            </Badge>
            <Badge
              variant={
                isFailed
                  ? 'rose'
                  : jobState.status === 'completed'
                  ? 'emerald'
                  : 'cyan'
              }
              size="sm"
              dot
            >
              {jobState.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">{jobState.message}</span>
            </div>
            <span className="font-mono font-bold text-cyan-300 text-base">
              {Math.round(jobState.progress)}%
            </span>
          </div>

          {/* Glowing Track & Bar */}
          <div className="w-full h-3.5 rounded-full bg-[#0a0b12] border border-white/10 p-0.5 relative overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 relative ${
                isFailed
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400'
              }`}
              style={{ width: `${jobState.progress}%` }}
            >
              {/* Shimmer light effect over active bar */}
              {!isFailed && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Failure Message & Recovery */}
        {isFailed && (
          <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs sm:text-sm space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-rose-300 mb-1">Analysis Failed</h4>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {jobState.error || 'The backend was unable to complete the analysis for this codebase.'}
                </p>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <Button
                variant="danger"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleManualRetry}
              >
                Retry Analysis
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Return to Home
              </Button>
            </div>
          </div>
        )}

        {/* Phase Stepper Grid */}
        <div className="pt-2">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between">
            <span>AI Pipeline Phases</span>
            <span className="text-slate-500">6 Stages</span>
          </div>
          <ProgressStepper currentPhase={jobState.status} isFailed={isFailed} />
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
          <span>Polling status every 2 seconds</span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel Analysis
          </Button>
        </div>
      </div>
    </div>
  );
}
