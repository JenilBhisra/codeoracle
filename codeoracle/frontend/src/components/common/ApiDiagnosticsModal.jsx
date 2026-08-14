import React, { useState } from 'react';
import {
  X,
  Activity,
  Server,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Send,
} from 'lucide-react';
import Button from './Button';
import Badge from './Badge';
import { API_BASE_URL, checkApiHealth } from '../../services/api';

/**
 * Interactive API Diagnostics & Endpoint Switcher Modal
 * Allows developers and judges to test backend connectivity, latency, and switch API URLs on-the-fly.
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object} props.backendHealth
 * @param {Function} props.onRefreshHealth
 */
export default function ApiDiagnosticsModal({
  isOpen,
  onClose,
  backendHealth,
  onRefreshHealth,
}) {
  const [customUrl, setCustomUrl] = useState(API_BASE_URL);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const startTime = performance.now();

    try {
      const response = await fetch(`${customUrl.replace(/\/$/, '')}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const latencyMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        const data = await response.json();
        setTestResult({
          success: true,
          status: response.status,
          latency: latencyMs,
          data,
          message: 'Backend API is reachable and healthy.',
        });
      } else {
        setTestResult({
          success: false,
          status: response.status,
          latency: latencyMs,
          message: `Server returned HTTP ${response.status} ${response.statusText}`,
        });
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - startTime);
      setTestResult({
        success: false,
        status: null,
        latency: latencyMs,
        message: err.message || 'Unable to connect. Check if server is running and CORS is enabled.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0e101d] border border-purple-500/30 p-6 sm:p-8 shadow-2xl shadow-black/80 z-10 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-300">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                Backend API Diagnostics
              </h3>
              <p className="text-xs text-slate-400">
                Verify live connectivity between frontend and backend PC
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Endpoint Configuration */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase text-slate-400 font-semibold block">
            Target Backend Base URL:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#07080f] border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500/50"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleTestConnection}
              loading={isTesting}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Test Ping
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            Default environment URL: <span className="text-slate-300">{API_BASE_URL}</span>
          </p>
        </div>

        {/* Test Result Feedback */}
        {testResult && (
          <div
            className={`p-4 rounded-2xl border space-y-2 text-xs font-mono animate-in fade-in duration-200 ${
              testResult.success
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>{testResult.success ? 'Connection Successful' : 'Connection Failed'}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Latency: {testResult.latency} ms
              </span>
            </div>

            <p className="text-slate-300 text-xs">{testResult.message}</p>

            {testResult.data && (
              <pre className="p-2 rounded-lg bg-black/50 border border-white/10 text-[11px] text-emerald-200 overflow-x-auto">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Contract Endpoints Reference */}
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <span className="text-xs font-mono uppercase text-slate-400 font-semibold block">
            Expected Backend Endpoints Contract:
          </span>
          <div className="space-y-1 text-[11px] font-mono text-slate-400">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
              <span>GET /api/health</span>
              <span className="text-emerald-400">Health check</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
              <span>POST /api/analyze/upload</span>
              <span className="text-cyan-400">ZIP upload</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
              <span>POST /api/analyze/github</span>
              <span className="text-cyan-400">GitHub clone</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
              <span>GET /api/jobs/&#123;job_id&#125;</span>
              <span className="text-purple-400">Status polling</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
              <span>GET /api/jobs/&#123;job_id&#125;/results</span>
              <span className="text-emerald-400">Final results</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02]">
              <span>GET /api/jobs/&#123;job_id&#125;/download</span>
              <span className="text-amber-400">Bundle download</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Click anywhere outside to close</span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
