import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Button Component
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'} [props.variant='primary']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.disabled=false]
 * @param {React.ReactNode} [props.icon]
 * @param {'left' | 'right'} [props.iconPosition='left']
 * @param {string} [props.className='']
 * @param {React.ReactNode} props.children
 * @param {Function} [props.onClick]
 * @param {'button' | 'submit' | 'reset'} [props.type='button']
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  className = '',
  children,
  onClick,
  type = 'button',
  ...rest
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-xl cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
    md: 'text-sm px-4 py-2.5 gap-2 rounded-xl',
    lg: 'text-base px-6 py-3.5 gap-2.5 rounded-xl font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 hover:brightness-110 active:scale-[0.98] border border-white/10',
    secondary:
      'bg-[#181c30] text-slate-200 border border-white/10 hover:border-purple-500/40 hover:bg-[#1e233d] active:scale-[0.98] shadow-sm',
    outline:
      'bg-transparent text-slate-300 border border-white/15 hover:border-purple-400 hover:text-white hover:bg-white/[0.04] active:scale-[0.98]',
    ghost:
      'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] active:scale-[0.98]',
    danger:
      'bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50 active:scale-[0.98]',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="inline-flex shrink-0">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="inline-flex shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}
