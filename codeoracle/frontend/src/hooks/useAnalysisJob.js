import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyzeGitHub,
  analyzeUpload,
  getJobResults,
  getJobStatus,
} from "../services/api";
import { TERMINAL_STATUSES } from "./processingSteps";

const SESSION_KEY = "codeoracle.job";
const POLL_MS = 2000;
const MAX_TRANSIENT_FAILURES = 5;

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(payload) {
  try {
    if (payload) sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable — polling still works for this session */
  }
}

/**
 * Owns the whole analysis lifecycle: submit -> poll -> fetch results.
 * mode is one of: input | processing | results
 */
export function useAnalysisJob() {
  const [mode, setMode] = useState("input");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [job, setJob] = useState(null);
  const [source, setSource] = useState(null);
  const [results, setResults] = useState(null);
  const [resultsError, setResultsError] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [transientError, setTransientError] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const startedAtRef = useRef(null);
  const failureCountRef = useRef(0);
  const activeJobRef = useRef(null);

  const loadResults = useCallback(async (jobId) => {
    setResultsLoading(true);
    setResultsError(null);
    try {
      const payload = await getJobResults(jobId);
      setResults(payload);
      setMode("results");
    } catch (error) {
      setResultsError(error?.message || "Results could not be loaded.");
      setMode("results");
    } finally {
      setResultsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    activeJobRef.current = null;
    startedAtRef.current = null;
    writeSession(null);
    setMode("input");
    setJob(null);
    setSource(null);
    setResults(null);
    setResultsError(null);
    setTransientError(null);
    setSubmitError(null);
    setElapsedSeconds(0);
  }, []);

  /** Restore an in-flight job after a browser refresh. */
  useEffect(() => {
    const stored = readSession();
    if (!stored?.jobId) return;
    activeJobRef.current = stored.jobId;
    startedAtRef.current = stored.startedAt || Date.now();
    setSource(stored.source || null);
    setJob({ job_id: stored.jobId, status: "queued", progress: 0, message: "Restoring job…" });
    setMode("processing");
  }, []);

  /** Poll loop. */
  useEffect(() => {
    if (mode !== "processing") return undefined;
    const jobId = activeJobRef.current;
    if (!jobId) return undefined;

    let cancelled = false;

    async function tick() {
      try {
        const status = await getJobStatus(jobId);
        if (cancelled) return;
        failureCountRef.current = 0;
        setTransientError(null);
        setJob(status);

        if (status.status === "completed") {
          writeSession(null);
          await loadResults(jobId);
        } else if (status.status === "failed") {
          writeSession(null);
        }
      } catch (error) {
        if (cancelled) return;
        if (error?.code === "not_found" || error?.status === 404) {
          writeSession(null);
          setJob({ status: "failed", error: "This job no longer exists on the backend." });
          return;
        }
        failureCountRef.current += 1;
        if (failureCountRef.current >= MAX_TRANSIENT_FAILURES) {
          writeSession(null);
          setJob((current) => ({
            ...(current || {}),
            status: "failed",
            error: error?.message || "Lost contact with the backend.",
          }));
          return;
        }
        setTransientError(error?.message || "Temporary network problem.");
      }
    }

    tick();
    const timer = setInterval(() => {
      if (!TERMINAL_STATUSES.includes(job?.status)) tick();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loadResults]);

  /** Elapsed timer. */
  useEffect(() => {
    if (mode !== "processing") return undefined;
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [mode]);

  const start = useCallback(async (input) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response =
        input.kind === "zip" ? await analyzeUpload(input.file) : await analyzeGitHub(input.repoUrl);
      if (!response?.job_id) throw new Error("The backend did not return a job id.");

      const nextSource = {
        kind: input.kind,
        label: input.kind === "zip" ? input.file.name : input.repoUrl.replace(/^https?:\/\//, ""),
      };
      activeJobRef.current = response.job_id;
      startedAtRef.current = Date.now();
      failureCountRef.current = 0;
      writeSession({ jobId: response.job_id, startedAt: startedAtRef.current, source: nextSource });
      setSource(nextSource);
      setJob(response);
      setElapsedSeconds(0);
      setMode("processing");
    } catch (error) {
      setSubmitError(error?.message || "Could not start the analysis.");
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    mode,
    job,
    jobId: activeJobRef.current,
    source,
    results,
    resultsError,
    resultsLoading,
    submitting,
    submitError,
    transientError,
    elapsedSeconds,
    start,
    reset,
    dismissSubmitError: () => setSubmitError(null),
    retryResults: () => activeJobRef.current && loadResults(activeJobRef.current),
  };
}
