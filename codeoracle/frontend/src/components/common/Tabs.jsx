import { useRef } from "react";
import { cn } from "../../lib/cn";

/** Accessible, keyboard-navigable tab bar (roving tabindex). */
export function TabBar({ tabs, value, onChange, className }) {
  const refs = useRef({});

  function handleKeyDown(event) {
    const index = tabs.findIndex((tab) => tab.id === value);
    let next = null;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    const nextTab = tabs[next];
    onChange(nextTab.id);
    refs.current[nextTab.id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Analysis results"
      onKeyDown={handleKeyDown}
      className={cn(
        "flex gap-2 overflow-x-auto scrollbar-thin-custom rounded-xl border border-border bg-surface/70 p-1.5",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[tab.id] = node;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-surface-2 text-foreground glow-ring"
                : "text-muted-foreground hover:bg-surface-2/70 hover:text-foreground",
            )}
          >
            {Icon ? (
              <Icon size={16} className={active ? tab.activeColor : undefined} aria-hidden="true" />
            ) : null}
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.count !== undefined && tab.count !== null ? (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-mono text-[0.68rem]",
                  active ? "bg-background/60 text-foreground" : "bg-surface-2 text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, active, children }) {
  if (!active) return null;
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={0} className="outline-none">
      {children}
    </div>
  );
}
