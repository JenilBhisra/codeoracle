import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

/**
 * Reusable Loading Spinner Component
 * @param {Object} props
 * @param {'sm' | 'md' | 'lg' | 'xl'} [props.size='md']
 * @param {string} [props.message]
 * @param {string} [props.submessage]
 * @param {number} [props.progress]
 * @param {boolean} [props.fullPage=false]
 * @param {string} [props.className='']
 */
export default function LoadingSpinner({
  size = 'md',
  message,
  submessage,
  progress,
  fullPage = false,
  className = '',
}) {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-10 h-10 border-[3px]',
    lg: 'w-16 h-16 border-4',
    xl: 'w-24 h-24 border-4',
  };

  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center text-center p-6 ${className}`}>
      {/* Futuristic Multi-Ring Spinner */}
      <div className="relative flex items-center justify-center mb-4">
        {/* Outer pulsating ring */}
        <div
          className={`${sizeMap[size] || sizeMap.md} rounded-full border-purple-500/20 animate-ping absolute opacity-30`}
        />
        {/* Rotating gradient track */}
        <div
          className={`${sizeMap[size] || sizeMap.md} rounded-full border-t-purple-500 border-r-cyan-400 border-b-transparent border-l-transparent animate-spin`}
        />
        {/* Inner glowing core */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-cyan-400/80 animate-pulse" />
        </div>
      </div>

      {/* Optional Progress Percentage */}
      {progress !== undefined && (
        <div className="text-xl font-bold font-mono text-cyan-300 mb-1">
          {Math.round(progress)}%
        </div>
      )}

      {/* Main Message */}
      {message && (
        <h4 className="text-sm sm:text-base font-semibold text-slate-200 tracking-tight mb-1">
          {message}
        </h4>
      )}

      {/* Submessage */}
      {submessage && (
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          {submessage}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center w-full">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
}
