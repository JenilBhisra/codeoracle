/**
 * Mock backend used when VITE_USE_MOCK_DATA=true.
 * It walks realistic processing stages, then returns the mock analysis payload.
 */
import { MOCK_STAGES, mockResults } from "../data/mockAnalysis";

const jobs = new Map();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const STAGE_MS = 1400;

function createJob(sourceType, sourceLabel) {
  const jobId = `mock-${Math.random().toString(36).slice(2, 10)}`;
  jobs.set(jobId, { startedAt: Date.now(), sourceType, sourceLabel });
  return {
    job_id: jobId,
    status: "queued",
    progress: 0,
    message: "Analysis queued",
    error: null,
  };
}

function stageFor(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;
  const index = Math.min(
    MOCK_STAGES.length - 1,
    Math.floor((Date.now() - job.startedAt) / STAGE_MS),
  );
  return MOCK_STAGES[index];
}

export async function checkHealth() {
  await delay(350);
  return { status: "ok", mock: true };
}

export async function analyzeUpload(file) {
  await delay(700);
  return createJob("zip", file?.name || "codebase.zip");
}

export async function analyzeGitHub(repoUrl) {
  await delay(700);
  return createJob("github", repoUrl.replace(/^https?:\/\//, ""));
}

export async function getJobStatus(jobId) {
  await delay(250);
  const stage = stageFor(jobId);
  if (!stage) {
    // Restored from sessionStorage after a reload: mock jobs are memory-only.
    const error = new Error("Job not found on the backend.");
    error.status = 404;
    error.code = "not_found";
    throw error;
  }
  return { job_id: jobId, ...stage, error: null };
}

export async function getJobResults(jobId) {
  await delay(500);
  const job = jobs.get(jobId);
  const summary = { ...mockResults.summary };
  if (job) {
    summary.source_type = job.sourceType;
    summary.source_label = job.sourceLabel;
    if (job.sourceType === "zip") summary.project_name = job.sourceLabel.replace(/\.zip$/i, "");
  }
  return { ...mockResults, job_id: jobId, summary };
}

export async function downloadJobResults(jobId) {
  await delay(300);
  const results = await getJobResults(jobId);
  return new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
}
