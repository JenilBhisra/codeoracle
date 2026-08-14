import { cn } from "../../lib/cn";

const STATES = {
  connected: { label: "Connected", dot: "bg-success", ring: "border-success/40 text-success" },
  connecting: { label: "Connecting", dot: "bg-warning animate-pulse", ring: "border-warning/40 text-warning" },
  offline: { label: "Offline", dot: "bg-danger", ring: "border-danger/40 text-danger" },
};

export function ConnectionIndicator({ connection = "connecting", onReconnect }) {
  const state = STATES[connection] || STATES.connecting;
  return (
    <button
      type="button"
      onClick={onReconnect}
      title="Backend connection — click to re-check"
      aria-label={`Backend connection: ${state.label}. Click to re-check.`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-surface/70 px-2.5 py-1.5 text-[0.7rem] font-medium transition-colors hover:bg-surface-2",
        state.ring,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", state.dot)} aria-hidden="true" />
      <span className="hidden xs:inline sm:inline">{state.label}</span>
    </button>
  );
}
