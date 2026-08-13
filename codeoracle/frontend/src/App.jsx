import React, { useState, useEffect } from 'react';
import { Sparkles, Terminal, Activity, ShieldCheck, Cpu, Code2, Layers } from 'lucide-react';
import { checkApiHealth, API_BASE_URL } from './services/api';

function App() {
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', message: 'Checking API...' });

  useEffect(() => {
    let isMounted = true;

    const verifyBackend = async () => {
      try {
        const data = await checkApiHealth();
        if (isMounted) {
          if (data && data.status === 'healthy') {
            setBackendHealth({ status: 'connected', message: 'Backend Connected (Healthy)' });
          } else {
            setBackendHealth({ status: 'degraded', message: 'Backend Response Unexpected' });
          }
        }
      } catch (err) {
        if (isMounted) {
          setBackendHealth({
            status: 'disconnected',
            message: 'Backend Disconnected (Run backend or check VITE_API_BASE_URL)',
          });
        }
      }
    };

    verifyBackend();
    const interval = setInterval(verifyBackend, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0b12] text-slate-100 flex flex-col justify-between selection:bg-purple-500/30 selection:text-cyan-200 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -left-32 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation / Header */}
      <header className="border-b border-white/5 bg-[#121424]/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 p-[1px] shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-[#0e101d] rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent">
                CodeOracle
              </span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono">
                PS-06
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealth.status === 'connected'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : backendHealth.status === 'checking'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-400'
                }`}
              />
              <span className="text-slate-300">{backendHealth.message}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="max-w-5xl mx-auto px-6 py-16 flex-1 flex flex-col items-center justify-center text-center z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-6 backdrop-blur-sm">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>Frontend Phase 1 Configured • Ready for Phase 2 Shell</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 max-w-3xl leading-tight">
          AI-Powered Legacy Codebase{' '}
          <span className="bg-gradient-to-r from-purple-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
            Explainer & Modernizer
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mb-12 font-light leading-relaxed">
          Upload any legacy Python or JavaScript project (up to 10,000 lines) or provide a public GitHub URL to extract architecture insights, interactive dependency graphs, automated test suites, and modernized refactoring suggestions.
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full text-left">
          <div className="p-5 rounded-2xl bg-[#121424]/80 border border-white/5 hover:border-purple-500/30 transition-all duration-300 backdrop-blur-md group shadow-lg shadow-black/20">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3 text-purple-400 group-hover:scale-110 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-sm text-slate-200 mb-1">Architecture Explanations</h2>
            <p className="text-xs text-slate-400 leading-relaxed">Deep AST & LLM breakdown of entry points, modules, and side effects.</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#121424]/80 border border-white/5 hover:border-cyan-500/30 transition-all duration-300 backdrop-blur-md group shadow-lg shadow-black/20">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3 text-cyan-400 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-sm text-slate-200 mb-1">Dependency Graphs</h2>
            <p className="text-xs text-slate-400 leading-relaxed">Interactive node-edge React Flow maps showing module relationships.</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#121424]/80 border border-white/5 hover:border-emerald-500/30 transition-all duration-300 backdrop-blur-md group shadow-lg shadow-black/20">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3 text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-sm text-slate-200 mb-1">Automated Unit Tests</h2>
            <p className="text-xs text-slate-400 leading-relaxed">Synthesized PyTest & Jest suites with coverage target indicators.</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#121424]/80 border border-white/5 hover:border-indigo-500/30 transition-all duration-300 backdrop-blur-md group shadow-lg shadow-black/20">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3 text-indigo-400 group-hover:scale-110 transition-transform">
              <Code2 className="w-5 h-5" />
            </div>
            <h2 className="font-semibold text-sm text-slate-200 mb-1">Refactored Code</h2>
            <p className="text-xs text-slate-400 leading-relaxed">Modernized syntax with breaking-change warnings & migration notes.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#0a0b12] py-6 text-center text-xs font-mono text-slate-400 z-10">
        <p>CodeOracle • HACKORBIT 2026 • Connected to: {API_BASE_URL}</p>
      </footer>
    </div>
  );
}

export default App;
