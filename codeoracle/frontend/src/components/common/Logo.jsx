import { cn } from "../../lib/cn";

/**
 * CodeOracle mark: an oracle eye built from code brackets and connected nodes.
 * Pure CSS/SVG, no external assets.
 */
export function Logo({ size = 36, className }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-brand",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="absolute inset-[1.5px] rounded-[10px] bg-surface" />
      <svg
        viewBox="0 0 32 32"
        width={size * 0.66}
        height={size * 0.66}
        fill="none"
        className="relative"
      >
        <path
          d="M11 9 6 16l5 7M21 9l5 7-5 7"
          stroke="url(#codeoracle-stroke)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="4.2" stroke="url(#codeoracle-stroke)" strokeWidth="2" />
        <circle cx="16" cy="16" r="1.5" fill="currentColor" className="text-cyan" />
        <defs>
          <linearGradient id="codeoracle-stroke" x1="4" y1="26" x2="28" y2="6">
            <stop stopColor="var(--brand-purple)" />
            <stop offset="0.5" stopColor="var(--brand-blue)" />
            <stop offset="1" stopColor="var(--brand-cyan)" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

export function LogoWordmark({ size = 36, subtitle = "AI Code Intelligence" }) {
  return (
    <span className="flex items-center gap-3">
      <Logo size={size} />
      <span className="flex flex-col leading-none">
        <span className="text-[1.05rem] font-semibold tracking-tight">
          Code<span className="text-gradient-brand">Oracle</span>
        </span>
        {subtitle ? (
          <span className="mt-1 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
