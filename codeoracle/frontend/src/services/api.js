/**
 * Single place where the frontend talks to the FastAPI backend.
 * When VITE_USE_MOCK_DATA is "true" every call is served by mockApi.js instead.
 */
import * as mockApi from "./mockApi";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(
  /\/$/,
  "",
);

export const USE_MOCK_DATA = String(import.meta.env.VITE_USE_MOCK_DATA ?? "true") === "true";

/** Frontend-side upload limit (bytes). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_LINES = 10000;

/** Consistent error shape used by every UI surface. */
export class ApiError extends Error {
  constructor({ message, status = 0, code = "unknown_error", details = null }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function normalizeError(error, status = 0) {
  if (error instanceof ApiError) return error;
  if (status === 404) {
    return new ApiError({ message: "Job not found on the backend.", status, code: "not_found" });
  }
  return new ApiError({
    message:
      error?.message === "Failed to fetch"
        ? `Cannot reach the backend at ${API_BASE_URL}. Is it running?`
        : error?.message || "Unexpected error",
    status,
    code: status ? `http_${status}` : "network_error",
  });
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

async function request(path, { method = "GET", body, headers, signal, timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      body,
      headers,
      signal: controller.signal,
    });
    const payload = await parseBody(response);

    if (!response.ok) {
      const detail = payload?.detail ?? payload?.message;
      throw new ApiError({
        message:
          typeof detail === "string"
            ? detail
            : `Request failed with status ${response.status}`,
        status: response.status,
        code: `http_${response.status}`,
        details: payload,
      });
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiError({ message: "The request timed out.", code: "timeout" });
    }
    throw normalizeError(error, error?.status ?? 0);
  } finally {
    clearTimeout(timer);
  }
}

export function validateZipFile(file) {
  if (!file) return "Select a .zip archive to continue.";
  if (!/\.zip$/i.test(file.name)) return "Only .zip archives are supported.";
  if (file.size > MAX_UPLOAD_BYTES)
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`;
  return null;
}

export function validateGithubUrl(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "Enter a public GitHub repository URL.";
  const match = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\/)?$/i.test(trimmed);
  if (!match) return "Use the form https://github.com/username/repository";
  return null;
}

export async function checkHealth() {
  if (USE_MOCK_DATA) return mockApi.checkHealth();
  return request("/api/health", { timeoutMs: 8000 });
}

export async function analyzeUpload(file) {
  if (USE_MOCK_DATA) return mockApi.analyzeUpload(file);
  const form = new FormData();
  form.append("file", file);
  return request("/api/analyze/upload", { method: "POST", body: form, timeoutMs: 120000 });
}

export async function analyzeGitHub(repoUrl) {
  if (USE_MOCK_DATA) return mockApi.analyzeGitHub(repoUrl);
  return request("/api/analyze/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_url: repoUrl }),
  });
}

export async function getJobStatus(jobId) {
  if (USE_MOCK_DATA) return mockApi.getJobStatus(jobId);
  return request(`/api/jobs/${encodeURIComponent(jobId)}`, { timeoutMs: 15000 });
}

export async function getJobResults(jobId) {
  if (USE_MOCK_DATA) return mockApi.getJobResults(jobId);
  return request(`/api/jobs/${encodeURIComponent(jobId)}/results`, { timeoutMs: 60000 });
}

export async function downloadJobResults(jobId) {
  if (USE_MOCK_DATA) return mockApi.downloadJobResults(jobId);
  const response = await fetch(`${API_BASE_URL}/api/jobs/${encodeURIComponent(jobId)}/download`);
  if (!response.ok) {
    throw new ApiError({
      message: `Could not download the report (status ${response.status}).`,
      status: response.status,
      code: `http_${response.status}`,
    });
  }
  return response.blob();
}
