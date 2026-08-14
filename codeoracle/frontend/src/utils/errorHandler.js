/**
 * CodeOracle User-Friendly Error Formatter
 * Translates HTTP status codes and backend exception payloads into clear, actionable messages.
 */

export function parseApiError(error, context = 'general') {
  if (!error) {
    return {
      title: 'Unexpected Error',
      message: 'An unknown error occurred. Please try again.',
      details: null,
      type: 'error',
    };
  }

  const status = error.status;
  const rawMessage = error.message || String(error);
  const code = error.code;

  // 1. Network / Connection Failures & Cold Starts
  if (code === 'NETWORK_ERROR' || rawMessage.includes('Failed to fetch') || rawMessage.includes('NetworkError')) {
    return {
      title: 'Backend Server Unavailable',
      message:
        'Unable to reach the backend API server. If hosted on a free cloud provider (such as Render), the server may be undergoing a cold start, which typically takes 30 to 50 seconds to spin up.',
      details: `Target Endpoint: ${error.url || 'API Server'}. Status: Disconnected`,
      type: 'network',
    };
  }

  // 2. Request Timeout / Cold Start Delay
  if (code === 'TIMEOUT' || status === 408 || status === 504) {
    return {
      title: 'Analysis Request Timed Out (Cold Start)',
      message:
        'The server took longer than expected to respond. The backend may still be processing heavy AI reasoning or waking up from sleep. You can check the job status or retry in a few seconds.',
      details: `Status Code: ${status || 408} (Request Timeout)`,
      type: 'warning',
    };
  }

  // 3. Rate Limiting (Gemini API or backend limiter)
  if (status === 429 || rawMessage.toLowerCase().includes('rate limit') || rawMessage.toLowerCase().includes('quota')) {
    return {
      title: 'AI Rate Limit Exceeded',
      message:
        'The AI service rate limit has been temporarily reached. Please wait 30 seconds before submitting another request.',
      details: `Status: 429 Too Many Requests`,
      type: 'warning',
    };
  }

  // 4. Invalid or Private Repository / Resource Not Found
  if (status === 404) {
    if (context === 'github' || rawMessage.toLowerCase().includes('repo')) {
      return {
        title: 'Repository Not Found or Private',
        message:
          'The specified GitHub repository could not be located. Please verify that the repository is public and the URL is spelled correctly (e.g. https://github.com/owner/repo).',
        details: rawMessage,
        type: 'error',
      };
    }
    if (context === 'job') {
      return {
        title: 'Analysis Job Not Found',
        message: 'The requested job ID was not found on the server or has expired.',
        details: rawMessage,
        type: 'error',
      };
    }
    return {
      title: 'Resource Not Found',
      message: 'The requested resource could not be found on the server.',
      details: rawMessage,
      type: 'error',
    };
  }

  // 5. Authentication / Permission Required
  if (status === 401 || status === 403) {
    return {
      title: 'Access Restricted',
      message:
        'This repository appears to be private or requires authentication. CodeOracle currently supports public repositories and ZIP uploads.',
      details: `Status Code: ${status}`,
      type: 'error',
    };
  }

  // 6. Validation / Input Errors (Bad Request)
  if (status === 400 || status === 422) {
    // Specific legacy limit checks
    if (rawMessage.includes('10000') || rawMessage.toLowerCase().includes('line limit') || rawMessage.toLowerCase().includes('too large')) {
      return {
        title: 'Codebase Exceeds 10,000 Line Limit',
        message:
          'The uploaded codebase exceeds the hackathon problem statement limit of 10,000 lines. Please select a smaller module or subproject.',
        details: rawMessage,
        type: 'warning',
      };
    }
    if (rawMessage.toLowerCase().includes('empty') || rawMessage.toLowerCase().includes('no source files')) {
      return {
        title: 'No Supported Source Files Found',
        message:
          'No Python (.py) or JavaScript (.js, .jsx) files were detected in the archive. Please verify the archive contains valid source code.',
        details: rawMessage,
        type: 'warning',
      };
    }
    return {
      title: 'Invalid Request Payload',
      message: rawMessage || 'The server rejected the submitted payload format.',
      details: `Status Code: ${status}`,
      type: 'error',
    };
  }

  // 7. Internal Server & Gemini API Failures
  if (status >= 500) {
    return {
      title: 'Server Analysis Engine Error',
      message:
        'The backend AI pipeline encountered an internal error while analyzing the codebase. Please retry with a smaller repository or check server logs.',
      details: rawMessage,
      type: 'error',
    };
  }

  // Default fallback
  return {
    title: 'Analysis Error',
    message: rawMessage || 'An unexpected error occurred during processing.',
    details: status ? `Status Code: ${status}` : null,
    type: 'error',
  };
}
