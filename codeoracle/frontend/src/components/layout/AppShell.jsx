import React from 'react';
import Header from './Header';
import Footer from './Footer';

/**
 * AppShell Layout Component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {{ status: string, message: string }} props.backendHealth
 * @param {Function} [props.onRefreshHealth]
 * @param {Function} [props.onOpenDiagnostics]
 * @param {Function} [props.onReset]
 * @param {boolean} [props.showReset=false]
 */
export default function AppShell({
  children,
  backendHealth,
  onRefreshHealth,
  onOpenDiagnostics,
  onReset,
  showReset = false,
}) {
  return (
    <div className="min-h-screen bg-[#0a0b12] text-slate-100 flex flex-col justify-between selection:bg-purple-500/30 selection:text-cyan-200 relative overflow-x-hidden font-sans">
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed -top-40 -right-40 w-[30rem] h-[30rem] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 -left-40 w-[28rem] h-[28rem] bg-cyan-600/12 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed -bottom-40 right-1/4 w-[32rem] h-[32rem] bg-indigo-600/12 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* App Header */}
      <Header
        backendHealth={backendHealth}
        onRefreshHealth={onRefreshHealth}
        onOpenDiagnostics={onOpenDiagnostics}
        onReset={onReset}
        showReset={showReset}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 z-10 flex flex-col">
        {children}
      </main>

      {/* App Footer */}
      <Footer />
    </div>
  );
}
