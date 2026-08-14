import React, { useState } from 'react';
import { AlertCircle, WifiOff, RefreshCw, ChevronDown, ChevronUp, X, Home } from 'lucide-react';
import Button from './Button';

/**
 * Reusable Error Banner Component
 * @param {Object} props
 * @param {string} [props.title='Something went wrong']
 * @param {string} props.message
 * @param {string | Object} [props.details]
 * @param {Function} [props.onRetry]
 * @param {Function} [props.onDismiss]
 * @param {Function} [props.onReset]
 * @param {'error' | 'warning' | 'network'} [props.type='error']
 * @param {string} [props.className='']
 */
export default function ErrorBanner({
  title = 'Something went wrong',
  message,
  details,
  onRetry,
  onDismiss,
  onReset,
  type = 'error',
  className = '',
}) {
  const [showDetails, setShowDetails] = useState(false);

  const typeConfig = {
    error: {
      bg: 'bg-rose-950/40 border-rose-500/30',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      titleColor: 'text-rose-200',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    warning: {
      bg: 'bg-amber-950/40 border-amber-500/30',
      icon: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />,
      titleColor: 'text-amber-200',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    network: {
      bg: 'bg-indigo-950/40 border-indigo-500/30',
      icon: <WifiOff className="w-5 h-5 text-indigo-400 shrink-0" />,
      titleColor: 'text-indigo-200',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
  };

  const currentType = typeConfig[type] || typeConfig.error;

  return (
    <div
      role="alert"
      className={`rounded-2xl border p-5 backdrop-blur-xl shadow-xl shadow-black/30 transition-all ${currentType.bg} ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 flex-1">
          <div className="mt-0.5">{currentType.icon}</div>
          <div className="space-y-1 flex-1">
            <h4 className={`text-sm font-semibold tracking-tight ${currentType.titleColor}`}>
              {title}
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {message}
            </p>

            {/* Optional Collapsible Technical Details */}
            {details && (
              <div className="pt-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 focus:outline-none transition-colors cursor-pointer"
                >
                  <span>{showDetails ? 'Hide technical details' : 'View technical details'}</span>
                  {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showDetails && (
                  <pre className="mt-2 p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-rose-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dismiss action */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Action Buttons Footer */}
      {(onRetry || onReset) && (
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center gap-3">
          {onRetry && (
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={onRetry}
            >
              Retry Action
            </Button>
          )}
          {onReset && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Home className="w-3.5 h-3.5" />}
              onClick={onReset}
            >
              Return to Home
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
