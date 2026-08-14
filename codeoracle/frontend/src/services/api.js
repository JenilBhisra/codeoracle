/**
 * CodeOracle API Service
 * Handles all network requests to the CodeOracle backend API.
 * Uses VITE_API_BASE_URL from environment variables.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Custom API Error with status, code, and url metadata
 */
export class ApiError extends Error {
  constructor(message, status = null, code = null, url = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.url = url;
  }
}

/**
 * Generic fetch wrapper with timeout, CORS handling, and structured errors
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMessage =
        (typeof data === 'object' && (data.detail || data.message || data.error)) ||
        `Request failed with status ${response.status} (${response.statusText})`;
      throw new ApiError(errorMessage, response.status, 'HTTP_ERROR', url);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. The backend server might be waking up or processing a heavy codebase.',
        408,
        'TIMEOUT',
        url
      );
    }
    if (err instanceof ApiError) {
      throw err;
    }
    // Network, CORS, or Server Unreachable
    throw new ApiError(
      'Unable to connect to the backend server. Please verify the API server is running at ' + API_BASE_URL,
      null,
      'NETWORK_ERROR',
      url
    );
  }
}

/**
 * 1. Health Check
 * GET /api/health
 */
export async function checkApiHealth() {
  return fetchWithTimeout(`${API_BASE_URL}/api/health`, { method: 'GET' }, 8000);
}

/**
 * 2. Upload ZIP Analysis
 * POST /api/analyze/upload (multipart/form-data)
 */
export async function analyzeZipUpload(file) {
  const formData = new FormData();
  formData.append('file', file);

  return fetchWithTimeout(`${API_BASE_URL}/api/analyze/upload`, {
    method: 'POST',
    body: formData,
  }, 45000); // 45s timeout for large uploads
}

/**
 * 3. GitHub Repository Analysis
 * POST /api/analyze/github
 */
export async function analyzeGithubRepo(repoUrl) {
  return fetchWithTimeout(`${API_BASE_URL}/api/analyze/github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repo_url: repoUrl.trim() }),
  }, 45000);
}

/**
 * 4. Job Status Polling
 * GET /api/jobs/{job_id}
 */
export async function getJobStatus(jobId) {
  return fetchWithTimeout(`${API_BASE_URL}/api/jobs/${encodeURIComponent(jobId)}`, {
    method: 'GET',
  }, 10000);
}

/**
 * 5. Job Results
 * GET /api/jobs/{job_id}/results
 */
export async function getJobResults(jobId) {
  return fetchWithTimeout(`${API_BASE_URL}/api/jobs/${encodeURIComponent(jobId)}/results`, {
    method: 'GET',
  }, 25000);
}

/**
 * 6. Download Results Artifacts URL
 * GET /api/jobs/{job_id}/download
 */
export function getDownloadUrl(jobId) {
  return `${API_BASE_URL}/api/jobs/${encodeURIComponent(jobId)}/download`;
}

export { API_BASE_URL };
