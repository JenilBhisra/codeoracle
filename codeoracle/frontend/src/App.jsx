import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  Code2,
  FolderGit2,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  RotateCcw,
  Eye,
  Sliders,
} from 'lucide-react';
import AppShell from './components/layout/AppShell';
import UploadForm from './components/input/UploadForm';
import ProcessingView from './components/processing/ProcessingView';
import ResultsDashboard from './components/results/ResultsDashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/common/Card';
import Badge from './components/common/Badge';
import Button from './components/common/Button';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBanner from './components/common/ErrorBanner';
import { checkApiHealth, analyzeZipUpload, analyzeGithubRepo, ApiError } from './services/api';
import { parseApiError } from './utils/errorHandler';
import { APP_STATES, RESULTS_TABS, MAX_SOURCE_LINES } from './utils/constants';

// Sample mock result for instant UI testing during development
const SAMPLE_MOCK_RESULTS = {
  job_id: 'job-demo-hackorbit-2026',
  status: 'completed',
  summary: {
    project_name: 'legacy-flask-auth-service',
    languages: ['python', 'javascript'],
    file_count: 14,
    line_count: 1480,
    module_count: 6,
    dependency_count: 18,
    test_count: 2,
    coverage_percentage: 88,
    coverage_type: 'measured', // 'measured' | 'estimated' | 'not_executed'
  },
  explanation: {
    overview:
      'This codebase is a legacy Python web service combining Flask routing, SQLAlchemy ORM data layers, and custom token-based authentication with JavaScript frontend client utilities. It exhibits monolithic routing patterns with tightly coupled database sessions and synchronous blocking calls.',
    architecture_pattern: 'Monolithic Web Service (Flask + SQLAlchemy)',
    entry_points: [
      { name: 'app/main.py', type: 'WSGI Entry Point' },
      { name: '/api/v1/auth/login', type: 'HTTP POST Route' },
      { name: '/api/v1/auth/verify', type: 'HTTP GET Route' },
      { name: 'scripts/seed_db.py', type: 'CLI Migration Script' },
    ],
    modules: [
      {
        name: 'app.auth.service',
        path: 'app/auth/service.py',
        language: 'python',
        explanation:
          'Core authentication logic responsible for password verification, cryptographic token issuance, and session revocation. Contains legacy MD5 hash routines that require immediate modernization.',
        dependencies: ['sqlalchemy', 'hashlib', 'datetime', 'app.database.models', 'jwt'],
        classes: [
          {
            name: 'AuthService',
            inherits: 'BaseService',
            explanation: 'Coordinates user credential validation and token lifecycle management.',
            methods: ['authenticate_user()', 'generate_jwt_token()', 'revoke_session()'],
          },
        ],
        functions: [
          {
            name: 'verify_password',
            signature: 'verify_password(plain_pwd: str, hashed_pwd: str) -> bool',
            explanation: 'Compares user-submitted plaintext password against stored database hash using hashlib.',
            inputs: ['plain_pwd (str)', 'hashed_pwd (str)'],
            outputs: 'bool (True if matched)',
            side_effects: ['Reads database user records', 'Emits auth audit log metric'],
          },
          {
            name: 'generate_session_token',
            signature: 'generate_session_token(user_id: int, expiry_hours: int = 24) -> str',
            explanation: 'Creates a signed JWT payload with user role claims and expiration timestamp.',
            inputs: ['user_id (int)', 'expiry_hours (int, default 24)'],
            outputs: 'str (Encoded JWT Token string)',
            side_effects: ['Writes new session row to database sessions table'],
          },
        ],
        side_effects: ['Mutates sessions table in PostgreSQL', 'Logs security audit events to disk'],
      },
      {
        name: 'app.database.models',
        path: 'app/database/models.py',
        language: 'python',
        explanation:
          'Declares SQLAlchemy declarative ORM models representing Users, UserRoles, AuditLogs, and RevokedTokens.',
        dependencies: ['sqlalchemy.orm', 'sqlalchemy', 'app.database.connection'],
        classes: [
          {
            name: 'User',
            inherits: 'BaseModel',
            explanation: 'ORM entity representing system users and relationship mappings to roles.',
            methods: ['to_dict()', 'is_active()'],
          },
          {
            name: 'AuditLog',
            inherits: 'BaseModel',
            explanation: 'Immutable audit trail capturing authentication events and IP addresses.',
            methods: ['record_event()'],
          },
        ],
        functions: [],
        side_effects: ['Creates and maintains ORM schema tables'],
      },
      {
        name: 'app.routes.auth_routes',
        path: 'app/routes/auth_routes.py',
        language: 'python',
        explanation: 'Flask Blueprint routing HTTP requests to auth services and validating payload schemas.',
        dependencies: ['flask', 'app.auth.service', 'app.validators.schema'],
        classes: [],
        functions: [
          {
            name: 'login_handler',
            signature: 'login_handler() -> Response',
            explanation: 'Processes incoming POST JSON payloads to /api/v1/auth/login.',
            inputs: ['HTTP JSON Body ({ email, password })'],
            outputs: 'Flask Response (JSON with token & HTTP 200/401)',
            side_effects: ['Sets HTTP-only session cookie', 'Increments rate limiter bucket'],
          },
        ],
        side_effects: ['Modifies HTTP Response headers and cookies'],
      },
    ],
    risks: [
      'Insecure MD5 password hashing in app/auth/service.py fails modern security standards (CWE-327).',
      'Database connection pool in app/database/connection.py lacks connection recycling, creating leak risks under load.',
      'JWT secret is read with an insecure hardcoded fallback string if environment variable is unset.',
    ],
    limitations: [
      'Static AST parsing does not evaluate dynamic Python `eval()` or runtime metaprogramming constructs.',
      'Third-party external dependencies are identified by import signatures, not live network checks.',
    ],
  },
  dependency_graph: {
    nodes: [
      { id: 'app.main', label: 'app.main', type: 'module', language: 'python', path: 'app/main.py', external: false },
      { id: 'app.auth.service', label: 'app.auth.service', type: 'module', language: 'python', path: 'app/auth/service.py', external: false },
      { id: 'app.database.models', label: 'app.database.models', type: 'module', language: 'python', path: 'app/database/models.py', external: false },
      { id: 'app.routes.auth_routes', label: 'app.routes.auth_routes', type: 'module', language: 'python', path: 'app/routes/auth_routes.py', external: false },
      { id: 'sqlalchemy', label: 'sqlalchemy', type: 'package', language: 'python', external: true },
      { id: 'flask', label: 'flask', type: 'package', language: 'python', external: true },
      { id: 'client.auth_client', label: 'client.auth_client', type: 'module', language: 'javascript', path: 'frontend/src/authClient.js', external: false },
    ],
    edges: [
      { id: 'e1', source: 'app.main', target: 'app.routes.auth_routes', type: 'imports' },
      { id: 'e2', source: 'app.routes.auth_routes', target: 'app.auth.service', type: 'imports' },
      { id: 'e3', source: 'app.auth.service', target: 'app.database.models', type: 'imports' },
      { id: 'e4', source: 'app.database.models', target: 'sqlalchemy', type: 'imports' },
      { id: 'e5', source: 'app.routes.auth_routes', target: 'flask', type: 'imports' },
    ],
  },
  generated_tests: [
    {
      filename: 'test_auth_service.py',
      framework: 'pytest',
      target_file: 'app/auth/service.py',
      coverage_label: 'Measured',
      coverage_percentage: 88,
      covered_functions: ['verify_password', 'generate_session_token', 'revoke_session'],
      assumptions: [
        'Mocked SQLAlchemy database session to avoid live I/O dependencies.',
        'Preset JWT Secret key fixture: "test-jwt-secret-key-123".',
      ],
      code: `import pytest
from unittest.mock import MagicMock, patch
from app.auth.service import AuthService, verify_password, generate_session_token

@pytest.fixture
def mock_db_session():
    """Provides an isolated mock SQLAlchemy database session."""
    session = MagicMock()
    session.query.return_value.filter_by.return_value.first.return_value = MagicMock(
        id=1, email="test@codeoracle.ai", password_hash="hashed_pw_argon2"
    )
    return session

def test_verify_password_success():
    """Tests password verification matching expected hash."""
    with patch("app.auth.service.argon2_hasher.verify", return_value=True):
        result = verify_password("secret_pass123", "hashed_pw_argon2")
        assert result is True

def test_verify_password_failure():
    """Tests password mismatch returns False safely."""
    with patch("app.auth.service.argon2_hasher.verify", return_value=False):
        result = verify_password("wrong_password", "hashed_pw_argon2")
        assert result is False

def test_generate_session_token():
    """Verifies JWT token issuance with 24h expiration claim."""
    token = generate_session_token(user_id=42, expiry_hours=24)
    assert isinstance(token, str)
    assert len(token.split(".")) == 3  # Valid 3-part JWT header.payload.signature
`,
    },
    {
      filename: 'test_auth_client.test.js',
      framework: 'jest',
      target_file: 'frontend/src/authClient.js',
      coverage_label: 'Estimated',
      coverage_percentage: 75,
      covered_functions: ['login', 'logout', 'getValidToken'],
      assumptions: [
        'Mocked browser localStorage API with in-memory Map.',
        'Mocked Axios instance responses.',
      ],
      code: `import { AuthClient } from './authClient';

describe('AuthClient Frontend Utility', () => {
  let client;

  beforeEach(() => {
    localStorage.clear();
    client = new AuthClient('http://localhost:8000');
  });

  test('stores token in localStorage upon successful authentication', async () => {
    const fakeToken = 'header.payload.signature';
    localStorage.setItem('auth_token', fakeToken);

    const activeToken = client.getValidToken();
    expect(activeToken).toBe(fakeToken);
  });

  test('clears localStorage token upon logout invocation', () => {
    localStorage.setItem('auth_token', 'sample-token');
    client.logout();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
`,
    },
  ],
  refactored_files: [
    {
      file_path: 'app/auth/service.py',
      risk_level: 'high',
      human_review_required: true,
      reason: 'Migrate deprecated MD5 hashing (CWE-327) to Argon2id password hashing and modernize JWT issuance with typing.',
      expected_benefit: 'Resilience against rainbow-table attacks, OWASP ASVS compliance, and full Python type hinting.',
      breaking_changes: [
        'Legacy MD5 hashes in the database must be migrated using the provided migration script.',
        'Function signature updated from verify_password(plain, md5_hash) to verify_password(plain, argon2_hash).',
      ],
      migration_notes: [
        'Install argon2-cffi: pip install argon2-cffi',
        'Run migration script: python scripts/migrate_md5_to_argon2.py',
        'Ensure JWT_SECRET_KEY environment variable is configured in production.',
      ],
      assumptions: [
        'User model supports up to 255 characters for Argon2id hash storage string.',
      ],
      refactored_code: `"""
Modernized Authentication Service
Generated by CodeOracle AI Modernizer
"""
from typing import Optional
from datetime import datetime, timedelta, timezone
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import jwt
import os

ph = PasswordHasher()
JWT_SECRET = os.environ.get("JWT_SECRET_KEY")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET_KEY environment variable is mandatory.")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against an Argon2id hash.
    Replaces insecure legacy MD5 hash routines.
    """
    try:
        return ph.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False

def hash_password(plain_password: str) -> str:
    """Generates a secure Argon2id hash for the given password."""
    return ph.hash(plain_password)

def generate_session_token(user_id: int, expiry_hours: int = 24) -> str:
    """
    Issues a cryptographically signed JWT token with UTC expiration.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(hours=expiry_hours),
        "iss": "codeoracle.auth"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")
`,
    },
  ],
  warnings: [
    'Deprecated md5 password hashing detected in app/auth/service.py (High Security Risk).',
    'Synchronous SQLite database calls found inside high-traffic request handlers.',
  ],
};

function App() {
  // Global Application State Machine
  const [appState, setAppState] = useState(APP_STATES.LANDING);
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', message: 'Checking API...' });
  const [activeJob, setActiveJob] = useState(null); // { jobId, sourceName, sourceType, status, progress, message }
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorState, setErrorState] = useState(null);

  // Health check polling every 10s
  const verifyBackend = async () => {
    try {
      const data = await checkApiHealth();
      if (data && data.status === 'healthy') {
        setBackendHealth({ status: 'connected', message: 'Backend Connected (Healthy)' });
      } else {
        setBackendHealth({ status: 'degraded', message: 'Backend Response Unexpected' });
      }
    } catch (err) {
      setBackendHealth({
        status: 'disconnected',
        message: 'Backend Disconnected (Run backend or check VITE_API_BASE_URL)',
      });
    }
  };

  useEffect(() => {
    verifyBackend();
    const interval = setInterval(verifyBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle ZIP Submission
  const handleZipSubmit = async (file) => {
    setIsSubmitting(true);
    setErrorState(null);

    try {
      const response = await analyzeZipUpload(file);
      if (response && response.job_id) {
        setActiveJob({
          jobId: response.job_id,
          sourceName: file.name,
          sourceType: 'zip',
          status: response.status || 'queued',
          progress: response.progress || 0,
          message: response.message || 'Analysis queued successfully',
        });
        setAppState(APP_STATES.PROCESSING);
      } else {
        throw new Error('Backend did not return a valid job ID.');
      }
    } catch (err) {
      const formatted = parseApiError(err, 'zip');
      setErrorState(formatted);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle GitHub URL Submission
  const handleGithubSubmit = async (repoUrl) => {
    setIsSubmitting(true);
    setErrorState(null);

    try {
      const response = await analyzeGithubRepo(repoUrl);
      if (response && response.job_id) {
        const repoName = repoUrl.split('github.com/')[1] || repoUrl;
        setActiveJob({
          jobId: response.job_id,
          sourceName: repoName,
          sourceType: 'github',
          status: response.status || 'queued',
          progress: response.progress || 0,
          message: response.message || 'Analysis queued successfully',
        });
        setAppState(APP_STATES.PROCESSING);
      } else {
        throw new Error('Backend did not return a valid job ID.');
      }
    } catch (err) {
      const formatted = parseApiError(err, 'github');
      setErrorState(formatted);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Completed results callback from ProcessingView
  const handleProcessingComplete = (results) => {
    setAnalysisResults(results);
    setAppState(APP_STATES.RESULTS);
  };

  // Reset to Landing State
  const handleReset = () => {
    setAppState(APP_STATES.LANDING);
    setActiveJob(null);
    setAnalysisResults(null);
    setErrorState(null);
  };

  // Quick Demo Trigger to preview Results state immediately
  const handleLoadDemoResults = () => {
    setActiveJob({
      jobId: SAMPLE_MOCK_RESULTS.job_id,
      sourceName: SAMPLE_MOCK_RESULTS.summary.project_name,
      sourceType: 'github',
      status: 'completed',
    });
    setAnalysisResults(SAMPLE_MOCK_RESULTS);
    setAppState(APP_STATES.RESULTS);
  };

  return (
    <AppShell
      backendHealth={backendHealth}
      onRefreshHealth={verifyBackend}
      onReset={handleReset}
      showReset={appState !== APP_STATES.LANDING}
    >
      {/* Global Error Banner Display */}
      {errorState && (
        <div className="max-w-3xl mx-auto w-full mb-8">
          <ErrorBanner
            title={errorState.title}
            message={errorState.message}
            details={errorState.details}
            type={errorState.type || 'error'}
            onDismiss={() => setErrorState(null)}
            onReset={handleReset}
          />
        </div>
      )}

      {/* STATE 1: LANDING & UPLOAD INTERFACE */}
      {appState === APP_STATES.LANDING && (
        <div className="space-y-12">
          {/* Hero Section */}
          <section className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-cyan-500/10 border border-purple-500/25 text-purple-300 text-xs font-medium mb-6 shadow-sm backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>PS-06 • HACKORBIT 2026 Developer Tools & Education</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-[1.15]">
              AI-Powered Legacy Codebase{' '}
              <span className="bg-gradient-to-r from-purple-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                Explainer & Modernizer
              </span>
            </h1>

            <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed font-light mb-8">
              Transform legacy Python & JavaScript repositories into clear architectural explanations, interactive dependency graphs, automated test suites, and modernized refactoring suggestions.
            </p>
          </section>

          {/* Dual-Mode Upload Form */}
          <section>
            <UploadForm
              onSubmitZip={handleZipSubmit}
              onSubmitGithub={handleGithubSubmit}
              isLoading={isSubmitting}
            />

            {/* Quick Demo Preview Action */}
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={handleLoadDemoResults}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors font-mono cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Preview sample results dashboard (Instant Demo)</span>
              </button>
            </div>
          </section>

          {/* Capabilities Grid */}
          <section className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
              <Card variant="interactive" className="p-5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3 text-purple-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <CardTitle className="text-sm mb-1 text-slate-200">Architecture Explanations</CardTitle>
                <CardDescription className="text-xs">
                  Deep AST & LLM breakdown of entry points, module roles, and side effects.
                </CardDescription>
              </Card>

              <Card variant="interactive" className="p-5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3 text-cyan-400">
                  <Layers className="w-5 h-5" />
                </div>
                <CardTitle className="text-sm mb-1 text-slate-200">Dependency Graphs</CardTitle>
                <CardDescription className="text-xs">
                  Interactive node-edge React Flow maps showing module and file relationships.
                </CardDescription>
              </Card>

              <Card variant="interactive" className="p-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <CardTitle className="text-sm mb-1 text-slate-200">Automated Unit Tests</CardTitle>
                <CardDescription className="text-xs">
                  Synthesized PyTest & Jest suites with coverage target badges.
                </CardDescription>
              </Card>

              <Card variant="interactive" className="p-5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3 text-indigo-400">
                  <Code2 className="w-5 h-5" />
                </div>
                <CardTitle className="text-sm mb-1 text-slate-200">Refactored Code</CardTitle>
                <CardDescription className="text-xs">
                  Modernized syntax with breaking-change warnings and migration notes.
                </CardDescription>
              </Card>
            </div>
          </section>
        </div>
      )}

      {/* STATE 2: PROCESSING STATE */}
      {appState === APP_STATES.PROCESSING && activeJob && (
        <ProcessingView
          job={activeJob}
          onComplete={handleProcessingComplete}
          onCancel={handleReset}
        />
      )}

      {/* STATE 3: RESULTS DASHBOARD (Phases 5, 6, 7, 8, 9) */}
      {appState === APP_STATES.RESULTS && (
        <ResultsDashboard
          results={analysisResults || {}}
          jobId={activeJob?.jobId}
          onReset={handleReset}
        />
      )}
    </AppShell>
  );
}

export default App;
