import React from 'react';

/**
 * Reusable Badge Component
 * @param {Object} props
 * @param {'purple' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'neutral'} [props.variant='neutral']
 * @param {'sm' | 'md'} [props.size='sm']
 * @param {boolean} [props.dot=false]
 * @param {React.ReactNode} [props.icon]
 * @param {string} [props.className='']
 * @param {React.ReactNode} props.children
 */
export default function Badge({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  icon = null,
  className = '',
  children,
  ...rest
}) {
  const variantStyles = {
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    neutral: 'bg-white/[0.04] text-slate-300 border-white/10',
  };

  const dotColors = {
    purple: 'bg-purple-400',
    cyan: 'bg-cyan-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    indigo: 'bg-indigo-400',
    neutral: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-xs px-3 py-1 gap-2 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono tracking-tight ${sizeStyles[size] || sizeStyles.sm} ${variantStyles[variant] || variantStyles.neutral} ${className}`}
      {...rest}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant] || dotColors.neutral}`} />}
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
