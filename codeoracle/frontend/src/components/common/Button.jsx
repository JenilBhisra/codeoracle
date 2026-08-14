import { cn } from "../../lib/cn";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const variants = {
  primary:
    "bg-gradient-brand text-background font-semibold shadow-[0_10px_30px_-14px_color-mix(in_oklab,var(--brand-purple)_75%,transparent)] hover:brightness-110 active:brightness-95",
  secondary: "bg-surface-2 text-foreground border border-border hover:border-border-strong hover:bg-muted",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-surface-2",
  outline: "border border-border-strong text-foreground hover:bg-surface-2",
  danger: "bg-destructive/15 text-destructive border border-destructive/40 hover:bg-destructive/25",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4",
  lg: "h-12 px-6 text-base",
  icon: "h-9 w-9",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
