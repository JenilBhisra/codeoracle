import React from 'react';
import {
  Clock,
  FileArchive,
  Code2,
  Cpu,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Loader2,
  Circle,
} from 'lucide-react';
import { PROCESSING_PHASES } from '../../utils/constants';

const STEP_ICONS = {
  queued: Clock,
  extracting: FileArchive,
  parsing: Code2,
  explaining: Cpu,
  generating_tests: ShieldCheck,
  refactoring: Sparkles,
};

/**
 * Progress Stepper Component showing the active AI analysis pipeline
 * @param {Object} props
 * @param {string} props.currentPhase - 'queued' | 'extracting' | 'parsing' | 'explaining' | 'generating_tests' | 'refactoring' | 'completed' | 'failed'
 * @param {boolean} [props.isFailed=false]
 */
export default function ProgressStepper({
  currentPhase = 'queued',
  isFailed = false,
}) {
  // Steps in chronological order (excluding final 'completed' which marks all as done)
  const steps = PROCESSING_PHASES.filter((p) => p.id !== 'completed');

  const getStepIndex = (phaseId) => {
    if (phaseId === 'completed') return steps.length;
    const idx = steps.findIndex((s) => s.id === phaseId);
    return idx >= 0 ? idx : 0;
  };

  const currentIndex = getStepIndex(currentPhase);

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {steps.map((step, idx) => {
          const StepIcon = STEP_ICONS[step.id] || Circle;
          const isDone = currentPhase === 'completed' || idx < currentIndex;
          const isActive = !isFailed && idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3 ${
                isDone
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                  : isActive
                  ? 'bg-[#181c30]/90 border-cyan-400/50 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/20'
                  : 'bg-white/[0.02] border-white/[0.06] text-slate-500 opacity-60'
              }`}
            >
              {/* Step Status Icon */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  isDone
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : isActive
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-white/[0.04] text-slate-500'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 text-cyan-300 animate-spin" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </div>

              {/* Step Label & Subtext */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span
                    className={`text-xs font-semibold truncate ${
                      isActive ? 'text-cyan-200' : isDone ? 'text-slate-200' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    0{idx + 1}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight truncate">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
