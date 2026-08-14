import React from 'react';

/**
 * Reusable Tabs Navigation Component
 * @param {Object} props
 * @param {Array<{ id: string, label: string, icon?: React.ReactNode, count?: number | string, badgeVariant?: string }>} props.tabs
 * @param {string} props.activeTab
 * @param {Function} props.onChange
 * @param {'pills' | 'underline'} [props.variant='pills']
 * @param {string} [props.className='']
 */
export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  variant = 'pills',
  className = '',
}) {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-2 p-1.5 rounded-2xl bg-[#0f111e]/90 border border-white/[0.08] backdrop-blur-md overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
              isActive
                ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-md shadow-purple-600/20 border border-purple-400/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            {tab.icon && <span className={`shrink-0 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-white/[0.06] text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
