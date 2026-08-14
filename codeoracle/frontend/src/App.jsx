import { Toaster } from "sonner";
import { Header } from "./components/common/Header";
import { MockModeBadge } from "./components/common/MockModeBadge";
import { HeroSection } from "./components/upload/HeroSection";
import { AnalysisInputCard } from "./components/upload/AnalysisInputCard";
import { HowItWorks } from "./components/upload/HowItWorks";
import { ProcessingView } from "./components/processing/ProcessingView";
import { ResultsView } from "./components/results/ResultsView";
import { useAnalysisJob } from "./hooks/useAnalysisJob";
import { useBackendHealth } from "./hooks/useBackendHealth";

export default function App() {
  const { connection, recheck } = useBackendHealth();
  const analysis = useAnalysisJob();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface-2 focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <Header connection={connection} onReconnect={recheck} onHome={analysis.reset} />

      <main id="main" className="mx-auto max-w-[1600px] px-4 pb-20 sm:px-6">
        {analysis.mode === "input" ? (
          <>
            <HeroSection />
            <div className="mx-auto mt-6 max-w-5xl">
              <AnalysisInputCard
                submitting={analysis.submitting}
                submitError={analysis.submitError}
                onSubmit={analysis.start}
                onDismissError={analysis.dismissSubmitError}
              />
            </div>
            <HowItWorks />
          </>
        ) : null}

        {analysis.mode === "processing" ? (
          <ProcessingView
            job={analysis.job}
            source={analysis.source}
            elapsedSeconds={analysis.elapsedSeconds}
            transientError={analysis.transientError}
            onCancel={analysis.reset}
            onRetry={analysis.reset}
          />
        ) : null}

        {analysis.mode === "results" ? (
          <ResultsView
            results={analysis.results}
            loading={analysis.resultsLoading}
            error={analysis.resultsError}
            jobId={analysis.jobId}
            source={analysis.source}
            onReset={analysis.reset}
            onRetry={analysis.retryResults}
          />
        ) : null}
      </main>

      <MockModeBadge />
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
}
