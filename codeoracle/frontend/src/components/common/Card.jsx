import React from 'react';

/**
 * Reusable Card Component
 * @param {Object} props
 * @param {'default' | 'glow' | 'interactive' | 'flat'} [props.variant='default']
 * @param {string} [props.className='']
 * @param {React.ReactNode} props.children
 * @param {Function} [props.onClick]
 */
export function Card({
  variant = 'default',
  className = '',
  children,
  onClick,
  ...rest
}) {
  const variantStyles = {
    default:
      'bg-[#121424]/75 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20',
    glow:
      'bg-[#121424]/85 backdrop-blur-2xl border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.12)]',
    interactive:
      'bg-[#121424]/75 backdrop-blur-xl border border-white/[0.08] hover:border-purple-500/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer',
    flat:
      'bg-[#0f111f] border border-white/[0.05]',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-6 transition-all duration-200 ${variantStyles[variant] || variantStyles.default} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...rest }) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-4 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...rest }) {
  return (
    <h3 className={`text-base sm:text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2 ${className}`} {...rest}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...rest }) {
  return (
    <p className={`text-xs sm:text-sm text-slate-400 leading-relaxed ${className}`} {...rest}>
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...rest }) {
  return (
    <div className={`space-y-3 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...rest }) {
  return (
    <div className={`mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between ${className}`} {...rest}>
      {children}
    </div>
  );
}

export default Card;
