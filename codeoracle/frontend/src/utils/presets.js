/**
 * CodeOracle Demo Presets for Hackathon Demonstration
 * Provides multi-language legacy projects (Python & JavaScript) for instant testing.
 */

export const DEMO_PRESETS = [
  {
    id: 'python-flask-auth',
    title: 'Python Flask Auth Service (MD5 to Argon2id)',
    language: 'Python',
    fileCount: 14,
    lineCount: 1480,
    data: {
      job_id: 'job-preset-python-flask',
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
        coverage_type: 'measured',
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
            explanation: 'Declares SQLAlchemy declarative ORM models representing Users and AuditLogs.',
            dependencies: ['sqlalchemy.orm', 'sqlalchemy'],
            classes: [
              {
                name: 'User',
                inherits: 'BaseModel',
                explanation: 'ORM entity representing system users.',
                methods: ['to_dict()', 'is_active()'],
              },
            ],
            functions: [],
            side_effects: ['Maintains ORM tables'],
          },
        ],
        risks: [
          'Insecure MD5 password hashing in app/auth/service.py fails modern security standards (CWE-327).',
          'Database connection pool lacks connection recycling, creating leak risks under high load.',
        ],
        limitations: [
          'Static AST parsing does not evaluate dynamic Python eval() statements.',
        ],
      },
      dependency_graph: {
        nodes: [
          { id: 'app.main', label: 'app.main', type: 'module', language: 'python', path: 'app/main.py', external: false },
          { id: 'app.auth.service', label: 'app.auth.service', type: 'module', language: 'python', path: 'app/auth/service.py', external: false },
          { id: 'app.database.models', label: 'app.database.models', type: 'module', language: 'python', path: 'app/database/models.py', external: false },
          { id: 'sqlalchemy', label: 'sqlalchemy', type: 'package', language: 'python', external: true },
          { id: 'flask', label: 'flask', type: 'package', language: 'python', external: true },
        ],
        edges: [
          { id: 'e1', source: 'app.main', target: 'app.auth.service', type: 'imports' },
          { id: 'e2', source: 'app.auth.service', target: 'app.database.models', type: 'imports' },
          { id: 'e3', source: 'app.database.models', target: 'sqlalchemy', type: 'imports' },
        ],
      },
      generated_tests: [
        {
          filename: 'test_auth_service.py',
          framework: 'pytest',
          target_file: 'app/auth/service.py',
          coverage_label: 'Measured',
          coverage_percentage: 88,
          covered_functions: ['verify_password', 'generate_session_token'],
          assumptions: ['Mocked SQLAlchemy database session.'],
          code: `import pytest
from unittest.mock import patch
from app.auth.service import verify_password, generate_session_token

def test_verify_password_success():
    with patch("app.auth.service.argon2_hasher.verify", return_value=True):
        assert verify_password("secret123", "argon2_hash") is True

def test_generate_session_token():
    token = generate_session_token(user_id=42, expiry_hours=24)
    assert isinstance(token, str)
`,
        },
      ],
      refactored_files: [
        {
          file_path: 'app/auth/service.py',
          risk_level: 'high',
          human_review_required: true,
          reason: 'Migrate deprecated MD5 hashing (CWE-327) to Argon2id password hashing.',
          expected_benefit: 'Zero rainbow-table vulnerability, OWASP ASVS compliance.',
          breaking_changes: ['Legacy MD5 password hashes must be migrated using the provided script.'],
          migration_notes: ['Run: pip install argon2-cffi', 'Configure JWT_SECRET_KEY env variable.'],
          original_code: `import hashlib\nimport jwt\n\ndef verify_password(plain, md5_hash):\n    m = hashlib.md5()\n    m.update(plain.encode('utf-8'))\n    return m.hexdigest() == md5_hash\n`,
          refactored_code: `from argon2 import PasswordHasher\n\nph = PasswordHasher()\n\ndef verify_password(plain_password: str, hashed_password: str) -> bool:\n    try:\n        return ph.verify(hashed_password, plain_password)\n    except Exception:\n        return False\n`,
        },
      ],
      warnings: ['Deprecated md5 password hashing detected in app/auth/service.py.'],
    },
  },
  {
    id: 'javascript-express-ecommerce',
    title: 'JavaScript Express E-Commerce (Callbacks to Async/Await)',
    language: 'JavaScript',
    fileCount: 18,
    lineCount: 2150,
    data: {
      job_id: 'job-preset-js-express',
      status: 'completed',
      summary: {
        project_name: 'legacy-express-ecommerce-api',
        languages: ['javascript'],
        file_count: 18,
        line_count: 2150,
        module_count: 8,
        dependency_count: 14,
        test_count: 4,
        coverage_percentage: 92,
        coverage_type: 'measured',
      },
      explanation: {
        overview:
          'A Node.js / Express legacy backend utilizing nested error-first callbacks (Callback Hell) for inventory calculations and payment dispatching.',
        architecture_pattern: 'Express REST Service (CommonJS & Callbacks)',
        entry_points: [
          { name: 'server.js', type: 'Express App Listen' },
          { name: '/api/v1/checkout', type: 'HTTP POST Checkout Handler' },
        ],
        modules: [
          {
            name: 'services/checkoutService',
            path: 'services/checkoutService.js',
            language: 'javascript',
            explanation: 'Handles multi-step order verification, inventory reservation, and payment processing.',
            dependencies: ['express', 'mysql2', 'stripe'],
            classes: [],
            functions: [
              {
                name: 'processCheckout',
                signature: 'processCheckout(orderData, callback)',
                explanation: 'Processes checkout with 4 layers of nested database callbacks.',
                inputs: ['orderData (Object)', 'callback (Function)'],
                outputs: 'void (Invokes callback with err, result)',
                side_effects: ['Mutates database orders table', 'Charges Stripe payment gateway'],
              },
            ],
            side_effects: ['Writes to MySQL orders table', 'Calls Stripe charge API'],
          },
        ],
        risks: [
          'Uncaught exceptions in nested callbacks cause Node.js process crashes without HTTP response.',
        ],
        limitations: ['Static AST cannot trace dynamic `eval()` execution.'],
      },
      dependency_graph: {
        nodes: [
          { id: 'server.js', label: 'server.js', type: 'module', language: 'javascript', path: 'server.js', external: false },
          { id: 'checkoutService', label: 'checkoutService', type: 'module', language: 'javascript', path: 'services/checkoutService.js', external: false },
          { id: 'mysql2', label: 'mysql2', type: 'package', language: 'javascript', external: true },
          { id: 'express', label: 'express', type: 'package', language: 'javascript', external: true },
        ],
        edges: [
          { id: 'e1', source: 'server.js', target: 'checkoutService', type: 'imports' },
          { id: 'e2', source: 'checkoutService', target: 'mysql2', type: 'imports' },
          { id: 'e3', source: 'server.js', target: 'express', type: 'imports' },
        ],
      },
      generated_tests: [
        {
          filename: 'checkoutService.test.js',
          framework: 'jest',
          target_file: 'services/checkoutService.js',
          coverage_label: 'Measured',
          coverage_percentage: 92,
          covered_functions: ['processCheckout', 'validateCart'],
          assumptions: ['Mocked Stripe client and MySQL pool.'],
          code: `const { processCheckout } = require('../services/checkoutService');

describe('Checkout Service', () => {
  test('returns completed status on valid order', async () => {
    const order = { id: 101, total: 49.99 };
    const result = await processCheckout(order);
    expect(result.status).toBe('PAID');
  });
});
`,
        },
      ],
      refactored_files: [
        {
          file_path: 'services/checkoutService.js',
          risk_level: 'medium',
          human_review_required: true,
          reason: 'Modernize legacy callback hell to modern ES2022 async/await with robust try/catch blocks.',
          expected_benefit: 'Eliminates unhandled rejections, simplifies readability, and enables clean async error middleware.',
          breaking_changes: ['processCheckout now returns a Promise instead of taking a callback function.'],
          migration_notes: ['Update callers to `await processCheckout(order)` or `.then()`'],
          original_code: `function processCheckout(order, cb) {\n  db.query('SELECT * FROM inventory', function(err, items) {\n    if (err) return cb(err);\n    stripe.charges.create({ amount: order.total }, function(err, charge) {\n      if (err) return cb(err);\n      cb(null, { status: 'PAID' });\n    });\n  });\n}\n`,
          refactored_code: `async function processCheckout(order) {\n  const [items] = await db.promise().query('SELECT * FROM inventory');\n  const charge = await stripe.charges.create({ amount: order.total });\n  return { status: 'PAID', chargeId: charge.id };\n}\n`,
        },
      ],
      warnings: ['Deeply nested callback hell detected in checkoutService.js.'],
    },
  },
];
