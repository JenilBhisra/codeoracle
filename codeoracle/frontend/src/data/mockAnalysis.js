/**
 * Mock analysis payload for frontend development / demos only.
 * Shape mirrors the FastAPI backend contract exactly.
 */

export const MOCK_JOB_ID = "mock-legacy-shop-8f21";

const pyOrders = `from typing import List
from app.db import session_scope
from app.models import Order, OrderItem
from app.services.payment import charge_card, PaymentError
from app.utils.validation import validate_order_payload


def create_order(user_id: int, payload: dict) -> Order:
    """Create an order and charge the customer."""
    errors = validate_order_payload(payload)
    if errors:
        raise ValueError(", ".join(errors))

    with session_scope() as session:
        order = Order(user_id=user_id, status="pending")
        for raw_item in payload["items"]:
            order.items.append(
                OrderItem(sku=raw_item["sku"], qty=raw_item["qty"], price=raw_item["price"])
            )
        session.add(order)
        session.flush()

        try:
            charge_card(user_id, order.total())
        except PaymentError:
            order.status = "payment_failed"
            raise

        order.status = "paid"
        return order
`;

export const mockSummary = {
  project_name: "legacy-shop",
  source_type: "github",
  source_label: "github.com/acme/legacy-shop",
  languages: ["python", "javascript"],
  file_count: 18,
  line_count: 2476,
  module_count: 14,
  dependency_count: 27,
  generated_test_count: 6,
  coverage: {
    value: 68,
    label: "estimated",
  },
};

export const mockExplanation = {
  project_summary:
    "legacy-shop is a small e-commerce service built with a Python FastAPI backend and a vanilla JavaScript storefront. The backend exposes authentication, catalog, order and payment routes; the frontend calls those routes directly through a thin fetch wrapper.",
  architecture_overview:
    "A layered backend: HTTP routes delegate to service modules, which use a shared SQLAlchemy session helper. Payments are handled by a single service module that wraps the Stripe SDK. The frontend is unbundled ES modules loaded by index.html, sharing one API client and a small store object.",
  languages: ["python", "javascript"],
  entry_points: ["app/main.py", "web/src/main.js"],
  external_dependencies: ["fastapi", "sqlalchemy", "stripe", "axios"],
  confidence: "medium",
  limitations: [
    "Dynamic imports inside app/routes/admin.py could not be statically resolved.",
    "Two JavaScript modules use runtime string keys, so a few call edges are inferred rather than confirmed.",
    "No test suite existed in the repository, so behaviour was inferred from source only.",
  ],
  file_tree: [
    {
      name: "app",
      type: "folder",
      children: [
        { name: "main.py", type: "file", language: "python", moduleId: "app.main" },
        { name: "auth.py", type: "file", language: "python", moduleId: "app.auth" },
        { name: "db.py", type: "file", language: "python", moduleId: "app.db" },
        { name: "models.py", type: "file", language: "python", moduleId: "app.models" },
        {
          name: "routes",
          type: "folder",
          children: [
            { name: "orders.py", type: "file", language: "python", moduleId: "app.routes.orders" },
            { name: "admin.py", type: "file", language: "python" },
          ],
        },
        {
          name: "services",
          type: "folder",
          children: [
            { name: "orders.py", type: "file", language: "python", moduleId: "app.services.orders" },
            { name: "payment.py", type: "file", language: "python", moduleId: "app.services.payment" },
          ],
        },
        {
          name: "utils",
          type: "folder",
          children: [
            {
              name: "validation.py",
              type: "file",
              language: "python",
              moduleId: "app.utils.validation",
            },
          ],
        },
      ],
    },
    {
      name: "web",
      type: "folder",
      children: [
        {
          name: "src",
          type: "folder",
          children: [
            { name: "main.js", type: "file", language: "javascript", moduleId: "web.main" },
            { name: "api.js", type: "file", language: "javascript", moduleId: "web.api" },
            { name: "cart.js", type: "file", language: "javascript", moduleId: "web.cart" },
          ],
        },
      ],
    },
    { name: "requirements.txt", type: "file", language: "config" },
    { name: "package.json", type: "file", language: "config" },
    { name: "Dockerfile", type: "file", language: "config" },
  ],
  modules: [
    {
      id: "app.main",
      path: "app/main.py",
      language: "python",
      purpose:
        "FastAPI application entry point. Builds the app instance, registers routers and wires startup/shutdown database hooks.",
      responsibilities: [
        "Create the FastAPI application and CORS middleware",
        "Register the auth, orders and admin routers",
        "Open and close the database engine on lifecycle events",
      ],
      imports: ["fastapi", "app.auth", "app.routes.orders", "app.db"],
      risk: "low",
      function_count: 5,
      class_count: 1,
      functions: [
        {
          name: "create_app",
          signature: "create_app(settings: Settings | None = None) -> FastAPI",
          explanation:
            "Builds and returns the configured FastAPI application. If no settings object is supplied it reads configuration from environment variables, which makes the function hard to test in isolation.",
          parameters: [
            { name: "settings", type: "Settings | None", description: "Optional overrides; falls back to env vars." },
          ],
          returns: "A fully configured FastAPI instance with routers mounted.",
          side_effects: ["Reads environment variables", "Registers global middleware"],
          calls: ["app.db.init_engine", "app.auth.register_routes"],
          risk: "low",
          confidence: "high",
        },
        {
          name: "on_startup",
          signature: "async on_startup() -> None",
          explanation:
            "Startup hook that creates the database engine and verifies connectivity before the app begins serving traffic.",
          parameters: [],
          returns: "Nothing.",
          side_effects: ["Opens a database connection pool"],
          calls: ["app.db.init_engine"],
          risk: "medium",
          confidence: "high",
        },
      ],
    },
    {
      id: "app.auth",
      path: "app/auth.py",
      language: "python",
      purpose:
        "Password hashing, JWT issuing and the dependency used to resolve the current user from a bearer token.",
      responsibilities: [
        "Hash and verify user passwords",
        "Issue and decode JWT access tokens",
        "Provide the get_current_user FastAPI dependency",
      ],
      imports: ["app.db", "app.models"],
      risk: "high",
      function_count: 4,
      class_count: 0,
      functions: [
        {
          name: "hash_password",
          signature: "hash_password(raw: str) -> str",
          explanation:
            "Hashes a plaintext password. The implementation uses a single unsalted SHA-256 pass, which is not acceptable for stored credentials.",
          parameters: [{ name: "raw", type: "str", description: "Plaintext password supplied at signup." }],
          returns: "Hex digest string stored on the user row.",
          side_effects: [],
          calls: [],
          risk: "high",
          confidence: "high",
        },
        {
          name: "create_access_token",
          signature: "create_access_token(user_id: int, expires_in: int = 86400) -> str",
          explanation:
            "Encodes a JWT carrying the user id and an expiry. The signing secret defaults to a hardcoded development value when JWT_SECRET is unset.",
          parameters: [
            { name: "user_id", type: "int", description: "Subject claim of the token." },
            { name: "expires_in", type: "int", description: "Lifetime in seconds, one day by default." },
          ],
          returns: "Signed JWT string.",
          side_effects: ["Reads JWT_SECRET from the environment"],
          calls: [],
          risk: "high",
          confidence: "high",
        },
        {
          name: "get_current_user",
          signature: "async get_current_user(token: str = Depends(oauth2_scheme)) -> User",
          explanation:
            "Decodes the bearer token and loads the matching user row. Raises HTTP 401 when the token is invalid or the user no longer exists.",
          parameters: [{ name: "token", type: "str", description: "Bearer token from the Authorization header." }],
          returns: "The authenticated User model instance.",
          side_effects: ["Issues a database query per request"],
          calls: ["app.db.session_scope"],
          risk: "medium",
          confidence: "high",
        },
      ],
    },
    {
      id: "app.db",
      path: "app/db.py",
      language: "python",
      purpose: "SQLAlchemy engine creation and a context manager that commits or rolls back a session.",
      responsibilities: ["Create the engine lazily", "Expose session_scope() for transactional work"],
      imports: ["sqlalchemy"],
      risk: "medium",
      function_count: 2,
      class_count: 0,
      functions: [
        {
          name: "session_scope",
          signature: "session_scope() -> Iterator[Session]",
          explanation:
            "Context manager yielding a session, committing on success and rolling back on any exception. Nested usage re-enters the same global session, which can commit partial work unexpectedly.",
          parameters: [],
          returns: "A generator yielding an active SQLAlchemy session.",
          side_effects: ["Commits or rolls back the database transaction"],
          calls: [],
          risk: "medium",
          confidence: "medium",
        },
      ],
    },
    {
      id: "app.services.payment",
      path: "app/services/payment.py",
      language: "python",
      purpose: "Wraps the Stripe SDK and normalises payment failures into a single PaymentError type.",
      responsibilities: ["Charge a stored card", "Translate SDK errors", "Record payment attempts"],
      imports: ["stripe", "app.db", "app.models"],
      risk: "high",
      function_count: 3,
      class_count: 1,
      functions: [
        {
          name: "charge_card",
          signature: "charge_card(user_id: int, amount_cents: int, currency: str = 'usd') -> str",
          explanation:
            "Charges the user's saved card through Stripe and returns the charge id. Retries are not implemented, so a network timeout after the charge is created can double-charge on manual retry.",
          parameters: [
            { name: "user_id", type: "int", description: "Owner of the stored payment method." },
            { name: "amount_cents", type: "int", description: "Amount in the smallest currency unit." },
            { name: "currency", type: "str", description: "ISO currency code, defaults to usd." },
          ],
          returns: "Stripe charge identifier.",
          side_effects: ["Performs a real external charge", "Writes a payment row"],
          calls: ["stripe.Charge.create", "app.db.session_scope"],
          risk: "high",
          confidence: "medium",
        },
      ],
    },
    {
      id: "app.services.orders",
      path: "app/services/orders.py",
      language: "python",
      purpose: "Order creation, total calculation and status transitions.",
      responsibilities: ["Validate payloads", "Persist orders and items", "Trigger payment"],
      imports: ["app.db", "app.models", "app.services.payment", "app.utils.validation"],
      risk: "medium",
      function_count: 4,
      class_count: 0,
      functions: [
        {
          name: "create_order",
          signature: "create_order(user_id: int, payload: dict) -> Order",
          explanation:
            "Validates the payload, writes the order and its items, then charges the customer. Because the charge happens inside the database transaction, a slow payment call holds row locks open.",
          parameters: [
            { name: "user_id", type: "int", description: "Buyer id resolved from the access token." },
            { name: "payload", type: "dict", description: "Raw request body containing items." },
          ],
          returns: "The persisted Order with status paid or payment_failed.",
          side_effects: ["Database writes", "External payment charge"],
          calls: ["app.utils.validation.validate_order_payload", "app.services.payment.charge_card"],
          risk: "high",
          confidence: "high",
        },
        {
          name: "calculate_total",
          signature: "calculate_total(items: list[dict]) -> int",
          explanation:
            "Sums quantity multiplied by price across the items. Uses float arithmetic on prices, which introduces rounding errors on large carts.",
          parameters: [{ name: "items", type: "list[dict]", description: "Item dicts with qty and price." }],
          returns: "Total amount in cents.",
          side_effects: [],
          calls: [],
          risk: "medium",
          confidence: "high",
        },
      ],
    },
    {
      id: "app.utils.validation",
      path: "app/utils/validation.py",
      language: "python",
      purpose: "Hand-written payload validation helpers used before persistence.",
      responsibilities: ["Check required fields", "Normalise quantities", "Return human readable errors"],
      imports: [],
      risk: "low",
      function_count: 3,
      class_count: 0,
      functions: [
        {
          name: "validate_order_payload",
          signature: "validate_order_payload(payload: dict) -> list[str]",
          explanation:
            "Returns a list of error strings for a submitted order body. An empty list means the payload is acceptable, which is easy to misread as a falsy failure.",
          parameters: [{ name: "payload", type: "dict", description: "Request body to inspect." }],
          returns: "List of validation error messages, empty when valid.",
          side_effects: [],
          calls: [],
          risk: "low",
          confidence: "high",
        },
      ],
    },
    {
      id: "web.api",
      path: "web/src/api.js",
      language: "javascript",
      purpose: "Thin fetch wrapper that attaches the stored token and parses JSON responses.",
      responsibilities: ["Build request URLs", "Attach the auth header", "Normalise error responses"],
      imports: ["axios"],
      risk: "medium",
      function_count: 4,
      class_count: 0,
      functions: [
        {
          name: "request",
          signature: "async request(path, options = {})",
          explanation:
            "Performs the HTTP call and throws an Error carrying the backend message. Reads the token from localStorage on every call, so a logged-out tab keeps using a stale token until reload.",
          parameters: [
            { name: "path", type: "string", description: "Path appended to the API base." },
            { name: "options", type: "object", description: "Fetch options such as method and body." },
          ],
          returns: "Parsed JSON body of the response.",
          side_effects: ["Reads localStorage", "Network request"],
          calls: ["fetch"],
          risk: "medium",
          confidence: "high",
        },
      ],
    },
    {
      id: "web.cart",
      path: "web/src/cart.js",
      language: "javascript",
      purpose: "Client-side cart state kept in a module-level object and mirrored to localStorage.",
      responsibilities: ["Add and remove items", "Recalculate totals", "Persist between sessions"],
      imports: ["web.api"],
      risk: "medium",
      function_count: 5,
      class_count: 0,
      functions: [
        {
          name: "addItem",
          signature: "addItem(sku, qty = 1)",
          explanation:
            "Adds or increments an item in the shared cart object and writes it back to localStorage. Mutates module state directly, so two views can hold stale copies.",
          parameters: [
            { name: "sku", type: "string", description: "Product identifier." },
            { name: "qty", type: "number", description: "Quantity to add, default 1." },
          ],
          returns: "The updated cart object.",
          side_effects: ["Mutates shared module state", "Writes localStorage"],
          calls: ["persist"],
          risk: "medium",
          confidence: "medium",
        },
      ],
    },
    {
      id: "web.main",
      path: "web/src/main.js",
      language: "javascript",
      purpose: "Storefront bootstrap: binds DOM handlers and renders the catalog and cart views.",
      responsibilities: ["Bootstrap the page", "Bind click handlers", "Render catalog and checkout"],
      imports: ["web.api", "web.cart"],
      risk: "low",
      function_count: 6,
      class_count: 0,
      functions: [
        {
          name: "bootstrap",
          signature: "async bootstrap()",
          explanation:
            "Loads the catalog, restores the persisted cart and attaches DOM listeners once the document is ready.",
          parameters: [],
          returns: "Nothing.",
          side_effects: ["DOM mutation", "Network request"],
          calls: ["web.api.request", "web.cart.restore"],
          risk: "low",
          confidence: "high",
        },
      ],
    },
  ],
};

export const mockGraph = {
  nodes: [
    {
      id: "app.main",
      label: "app.main",
      type: "module",
      language: "python",
      path: "app/main.py",
      external: false,
      is_entry_point: true,
      function_count: 5,
      class_count: 1,
      summary: "FastAPI application entry point",
    },
    {
      id: "app.auth",
      label: "app.auth",
      type: "module",
      language: "python",
      path: "app/auth.py",
      external: false,
      is_entry_point: false,
      function_count: 4,
      class_count: 0,
      summary: "Password hashing and JWT issuing",
    },
    {
      id: "app.db",
      label: "app.db",
      type: "module",
      language: "python",
      path: "app/db.py",
      external: false,
      is_entry_point: false,
      function_count: 2,
      class_count: 0,
      summary: "SQLAlchemy engine and session scope",
    },
    {
      id: "app.routes.orders",
      label: "app.routes.orders",
      type: "module",
      language: "python",
      path: "app/routes/orders.py",
      external: false,
      is_entry_point: false,
      function_count: 3,
      class_count: 0,
      summary: "HTTP routes for order creation and lookup",
    },
    {
      id: "app.services.orders",
      label: "app.services.orders",
      type: "module",
      language: "python",
      path: "app/services/orders.py",
      external: false,
      is_entry_point: false,
      function_count: 4,
      class_count: 0,
      summary: "Order persistence and totals",
    },
    {
      id: "app.services.payment",
      label: "app.services.payment",
      type: "module",
      language: "python",
      path: "app/services/payment.py",
      external: false,
      is_entry_point: false,
      function_count: 3,
      class_count: 1,
      summary: "Stripe charge wrapper",
    },
    {
      id: "app.utils.validation",
      label: "app.utils.validation",
      type: "module",
      language: "python",
      path: "app/utils/validation.py",
      external: false,
      is_entry_point: false,
      function_count: 3,
      class_count: 0,
      summary: "Payload validation helpers",
    },
    {
      id: "web.main",
      label: "web.main",
      type: "module",
      language: "javascript",
      path: "web/src/main.js",
      external: false,
      is_entry_point: true,
      function_count: 6,
      class_count: 0,
      summary: "Storefront bootstrap",
    },
    {
      id: "web.api",
      label: "web.api",
      type: "module",
      language: "javascript",
      path: "web/src/api.js",
      external: false,
      is_entry_point: false,
      function_count: 4,
      class_count: 0,
      summary: "Fetch wrapper for the backend API",
    },
    {
      id: "web.cart",
      label: "web.cart",
      type: "module",
      language: "javascript",
      path: "web/src/cart.js",
      external: false,
      is_entry_point: false,
      function_count: 5,
      class_count: 0,
      summary: "Client-side cart state",
    },
    {
      id: "pkg.fastapi",
      label: "fastapi",
      type: "package",
      language: "python",
      path: "requirements.txt",
      external: true,
      is_entry_point: false,
      summary: "Web framework",
    },
    {
      id: "pkg.sqlalchemy",
      label: "sqlalchemy",
      type: "package",
      language: "python",
      path: "requirements.txt",
      external: true,
      is_entry_point: false,
      summary: "ORM and database toolkit",
    },
    {
      id: "pkg.stripe",
      label: "stripe",
      type: "package",
      language: "python",
      path: "requirements.txt",
      external: true,
      is_entry_point: false,
      summary: "Payment provider SDK",
    },
    {
      id: "pkg.axios",
      label: "axios",
      type: "package",
      language: "javascript",
      path: "package.json",
      external: true,
      is_entry_point: false,
      summary: "HTTP client",
    },
  ],
  edges: [
    { id: "e1", source: "app.main", target: "app.auth", type: "imports", confidence: "confirmed" },
    { id: "e2", source: "app.main", target: "app.routes.orders", type: "imports", confidence: "confirmed" },
    { id: "e3", source: "app.main", target: "app.db", type: "imports", confidence: "confirmed" },
    { id: "e4", source: "app.main", target: "pkg.fastapi", type: "external", confidence: "confirmed" },
    { id: "e5", source: "app.auth", target: "app.db", type: "imports", confidence: "confirmed" },
    { id: "e6", source: "app.db", target: "pkg.sqlalchemy", type: "external", confidence: "confirmed" },
    { id: "e7", source: "app.routes.orders", target: "app.services.orders", type: "imports", confidence: "confirmed" },
    { id: "e8", source: "app.routes.orders", target: "app.auth", type: "imports", confidence: "confirmed" },
    {
      id: "e9",
      source: "app.services.orders",
      target: "app.services.payment",
      type: "imports",
      confidence: "confirmed",
    },
    {
      id: "e10",
      source: "app.services.orders",
      target: "app.utils.validation",
      type: "imports",
      confidence: "confirmed",
    },
    { id: "e11", source: "app.services.orders", target: "app.db", type: "imports", confidence: "confirmed" },
    { id: "e12", source: "app.services.payment", target: "pkg.stripe", type: "external", confidence: "confirmed" },
    { id: "e13", source: "web.main", target: "web.api", type: "imports", confidence: "confirmed" },
    { id: "e14", source: "web.main", target: "web.cart", type: "imports", confidence: "confirmed" },
    { id: "e15", source: "web.cart", target: "web.api", type: "calls", confidence: "inferred" },
    { id: "e16", source: "web.api", target: "pkg.axios", type: "external", confidence: "confirmed" },
    { id: "e17", source: "web.api", target: "app.routes.orders", type: "calls", confidence: "uncertain" },
  ],
};

export const mockTests = {
  framework: "pytest + vitest",
  coverage: { value: 68, label: "estimated" },
  covered_functions: 11,
  breakdown: { happy_path: 6, edge_case: 4, error_case: 3, mocked_dependency: 5 },
  files: [
    {
      id: "t1",
      filename: "tests/test_services_orders.py",
      target_file: "app/services/orders.py",
      language: "python",
      framework: "pytest",
      covered_functions: ["create_order", "calculate_total"],
      types: ["happy_path", "error_case", "mocked_dependency"],
      assumptions: [
        "session_scope can be replaced with an in-memory SQLite session.",
        "charge_card is patched; no real Stripe call is made.",
      ],
      code: `import pytest
from unittest.mock import patch

from app.services.orders import create_order, calculate_total
from app.services.payment import PaymentError


def test_calculate_total_sums_items():
    items = [{"sku": "a", "qty": 2, "price": 500}, {"sku": "b", "qty": 1, "price": 250}]
    assert calculate_total(items) == 1250


def test_create_order_rejects_empty_payload(db_session):
    with pytest.raises(ValueError):
        create_order(user_id=1, payload={"items": []})


@patch("app.services.orders.charge_card", return_value="ch_test_1")
def test_create_order_marks_paid(mock_charge, db_session):
    order = create_order(1, {"items": [{"sku": "a", "qty": 1, "price": 999}]})
    assert order.status == "paid"
    mock_charge.assert_called_once()


@patch("app.services.orders.charge_card", side_effect=PaymentError("declined"))
def test_create_order_marks_failed_on_decline(mock_charge, db_session):
    with pytest.raises(PaymentError):
        create_order(1, {"items": [{"sku": "a", "qty": 1, "price": 999}]})
`,
    },
    {
      id: "t2",
      filename: "tests/test_auth.py",
      target_file: "app/auth.py",
      language: "python",
      framework: "pytest",
      covered_functions: ["hash_password", "create_access_token", "get_current_user"],
      types: ["happy_path", "edge_case", "error_case"],
      assumptions: ["JWT_SECRET is set through a fixture so tokens are reproducible."],
      code: `import pytest
from app.auth import hash_password, create_access_token, get_current_user


def test_hash_password_is_deterministic():
    assert hash_password("hunter2") == hash_password("hunter2")


def test_hash_password_differs_per_input():
    assert hash_password("a") != hash_password("b")


def test_create_access_token_encodes_subject(jwt_secret):
    token = create_access_token(user_id=42)
    assert token.count(".") == 2


@pytest.mark.asyncio
async def test_get_current_user_rejects_garbage(jwt_secret):
    with pytest.raises(Exception):
        await get_current_user(token="not-a-token")
`,
    },
    {
      id: "t3",
      filename: "tests/test_validation.py",
      target_file: "app/utils/validation.py",
      language: "python",
      framework: "pytest",
      covered_functions: ["validate_order_payload"],
      types: ["happy_path", "edge_case"],
      assumptions: [],
      code: `from app.utils.validation import validate_order_payload


def test_valid_payload_returns_no_errors():
    payload = {"items": [{"sku": "a", "qty": 1, "price": 100}]}
    assert validate_order_payload(payload) == []


def test_missing_items_key_is_reported():
    errors = validate_order_payload({})
    assert any("items" in e for e in errors)


def test_zero_quantity_is_rejected():
    payload = {"items": [{"sku": "a", "qty": 0, "price": 100}]}
    assert validate_order_payload(payload)
`,
    },
    {
      id: "t4",
      filename: "tests/test_payment.py",
      target_file: "app/services/payment.py",
      language: "python",
      framework: "pytest",
      covered_functions: ["charge_card"],
      types: ["mocked_dependency", "error_case"],
      assumptions: ["The Stripe SDK is fully mocked; no network access is required."],
      code: `from unittest.mock import patch
import pytest

from app.services.payment import charge_card, PaymentError


@patch("app.services.payment.stripe.Charge.create", return_value={"id": "ch_1"})
def test_charge_card_returns_charge_id(mock_create):
    assert charge_card(1, 1999) == "ch_1"


@patch("app.services.payment.stripe.Charge.create", side_effect=Exception("card_declined"))
def test_charge_card_wraps_sdk_errors(mock_create):
    with pytest.raises(PaymentError):
        charge_card(1, 1999)
`,
    },
    {
      id: "t5",
      filename: "web/tests/cart.test.js",
      target_file: "web/src/cart.js",
      language: "javascript",
      framework: "vitest",
      covered_functions: ["addItem", "removeItem", "total"],
      types: ["happy_path", "edge_case"],
      assumptions: ["localStorage is stubbed by the jsdom environment."],
      code: `import { describe, it, expect, beforeEach } from "vitest";
import { addItem, removeItem, total, reset } from "../src/cart.js";

describe("cart", () => {
  beforeEach(() => reset());

  it("adds a new item", () => {
    const cart = addItem("sku-1", 2);
    expect(cart["sku-1"].qty).toBe(2);
  });

  it("increments an existing item", () => {
    addItem("sku-1", 1);
    const cart = addItem("sku-1", 3);
    expect(cart["sku-1"].qty).toBe(4);
  });

  it("removing an unknown sku is a no-op", () => {
    expect(() => removeItem("nope")).not.toThrow();
  });

  it("total is zero for an empty cart", () => {
    expect(total()).toBe(0);
  });
});
`,
    },
    {
      id: "t6",
      filename: "web/tests/api.test.js",
      target_file: "web/src/api.js",
      language: "javascript",
      framework: "vitest",
      covered_functions: ["request"],
      types: ["mocked_dependency", "error_case"],
      assumptions: ["global fetch is replaced with a stub for each case."],
      code: `import { describe, it, expect, vi } from "vitest";
import { request } from "../src/api.js";

describe("request", () => {
  it("returns parsed json", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hello: "world" }),
    });
    await expect(request("/ping")).resolves.toEqual({ hello: "world" });
  });

  it("throws with the backend message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "bad request" }),
    });
    await expect(request("/ping")).rejects.toThrow("bad request");
  });
});
`,
    },
  ],
};

export const mockRefactors = [
  {
    id: "r1",
    path: "app/auth.py",
    language: "python",
    risk: "high",
    summary:
      "Replace the unsalted SHA-256 password hash with bcrypt and refuse to start when JWT_SECRET is missing instead of falling back to a development value.",
    benefit:
      "Removes two credential-handling weaknesses: offline-crackable password hashes and a predictable token signing key.",
    breaking_changes: [
      "Existing password hashes cannot be verified by the new function; users must reset passwords or hashes must be migrated on next login.",
      "The application now raises at startup when JWT_SECRET is unset.",
    ],
    migration_notes: [
      "Add a passlib[bcrypt] dependency.",
      "Store a hash_scheme column and re-hash legacy passwords on the next successful login.",
      "Set JWT_SECRET in every environment before deploying.",
    ],
    assumptions: ["User rows can be extended with a hash_scheme column."],
    impact_areas: ["Function behaviour", "Exceptions", "Environment variables", "Data formats"],
    requires_human_review: true,
    original_code: `import hashlib, os, jwt, time

def hash_password(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()

def verify_password(raw: str, stored: str) -> bool:
    return hash_password(raw) == stored

def create_access_token(user_id: int, expires_in: int = 86400) -> str:
    secret = os.getenv("JWT_SECRET", "dev-secret")
    payload = {"sub": user_id, "exp": int(time.time()) + expires_in}
    return jwt.encode(payload, secret, algorithm="HS256")
`,
    refactored_code: `import os
import time

import jwt
from passlib.context import CryptContext

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET must be set; refusing to sign tokens with a default key.")
    return secret


def hash_password(raw: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return _pwd.hash(raw)


def verify_password(raw: str, stored: str) -> bool:
    """Verify a password against a bcrypt hash, tolerating legacy sha256 rows."""
    if _pwd.identify(stored):
        return _pwd.verify(raw, stored)
    import hashlib

    return hashlib.sha256(raw.encode()).hexdigest() == stored


def create_access_token(user_id: int, expires_in: int = 86400) -> str:
    payload = {"sub": user_id, "exp": int(time.time()) + expires_in}
    return jwt.encode(payload, _secret(), algorithm="HS256")
`,
  },
  {
    id: "r2",
    path: "app/services/orders.py",
    language: "python",
    risk: "medium",
    summary:
      "Move the payment charge outside the database transaction and switch total calculation to integer cents so rounding cannot drift.",
    benefit:
      "Shorter transactions, no row locks held across a network call, and exact money arithmetic.",
    breaking_changes: [
      "calculate_total now returns an int in cents rather than a float.",
      "Callers relying on the order being committed before charge_card runs will observe a new ordering.",
    ],
    migration_notes: [
      "Update templates that formatted the float total.",
      "Add an idempotency key when calling the payment service.",
    ],
    assumptions: ["Prices are already stored in cents."],
    impact_areas: ["Return values", "Data formats", "Function behaviour"],
    requires_human_review: true,
    original_code: pyOrders,
    refactored_code: `from app.db import session_scope
from app.models import Order, OrderItem
from app.services.payment import charge_card, PaymentError
from app.utils.validation import validate_order_payload


def calculate_total(items: list[dict]) -> int:
    """Total in cents, using integer arithmetic only."""
    return sum(int(item["qty"]) * int(item["price"]) for item in items)


def create_order(user_id: int, payload: dict) -> Order:
    errors = validate_order_payload(payload)
    if errors:
        raise ValueError(", ".join(errors))

    with session_scope() as session:
        order = Order(user_id=user_id, status="pending")
        for raw_item in payload["items"]:
            order.items.append(
                OrderItem(sku=raw_item["sku"], qty=raw_item["qty"], price=raw_item["price"])
            )
        session.add(order)
        session.flush()
        order_id, amount = order.id, calculate_total(payload["items"])

    # Payment runs outside the transaction so no locks are held across the network call.
    try:
        charge_card(user_id, amount, idempotency_key=f"order-{order_id}")
        new_status = "paid"
    except PaymentError:
        new_status = "payment_failed"
        raise
    finally:
        with session_scope() as session:
            session.query(Order).filter_by(id=order_id).update({"status": new_status})

    return order
`,
  },
  {
    id: "r3",
    path: "web/src/cart.js",
    language: "javascript",
    risk: "low",
    summary:
      "Replace the mutable module-level cart object with a small immutable store exposing subscribe/get/dispatch, keeping the same public function names.",
    benefit: "Views can no longer read a stale cart, and state changes are traceable through one code path.",
    breaking_changes: [],
    migration_notes: ["Views should subscribe to the store instead of reading the exported object directly."],
    assumptions: ["No other module mutates the exported cart object directly."],
    impact_areas: ["Function behaviour"],
    requires_human_review: false,
    original_code: `let cart = JSON.parse(localStorage.getItem("cart") || "{}");

export function addItem(sku, qty = 1) {
  if (!cart[sku]) cart[sku] = { sku, qty: 0 };
  cart[sku].qty += qty;
  localStorage.setItem("cart", JSON.stringify(cart));
  return cart;
}

export function removeItem(sku) {
  delete cart[sku];
  localStorage.setItem("cart", JSON.stringify(cart));
}

export function total() {
  return Object.values(cart).reduce((sum, i) => sum + i.qty * i.price, 0);
}
`,
    refactored_code: `const KEY = "cart";
let state = Object.freeze(JSON.parse(localStorage.getItem(KEY) || "{}"));
const listeners = new Set();

function commit(next) {
  state = Object.freeze(next);
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((listener) => listener(state));
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCart() {
  return state;
}

export function addItem(sku, qty = 1) {
  const existing = state[sku] ?? { sku, qty: 0, price: 0 };
  return commit({ ...state, [sku]: { ...existing, qty: existing.qty + qty } });
}

export function removeItem(sku) {
  const { [sku]: _removed, ...rest } = state;
  return commit(rest);
}

export function total() {
  return Object.values(state).reduce((sum, item) => sum + item.qty * item.price, 0);
}

export function reset() {
  return commit({});
}
`,
  },
];

export const mockWarnings = [
  {
    level: "high",
    message: "app/auth.py stores passwords using an unsalted SHA-256 digest.",
    path: "app/auth.py",
  },
  {
    level: "medium",
    message: "Payment charges run inside an open database transaction in app/services/orders.py.",
    path: "app/services/orders.py",
  },
  {
    level: "low",
    message: "app/routes/admin.py uses dynamic imports that could not be resolved statically.",
    path: "app/routes/admin.py",
  },
];

export const mockResults = {
  job_id: MOCK_JOB_ID,
  status: "completed",
  summary: mockSummary,
  explanation: mockExplanation,
  dependency_graph: mockGraph,
  generated_tests: mockTests,
  refactored_files: mockRefactors,
  warnings: mockWarnings,
};

export const MOCK_STAGES = [
  { status: "queued", progress: 4, message: "Analysis queued" },
  { status: "extracting", progress: 16, message: "Extracting files from source" },
  { status: "parsing", progress: 34, message: "Parsing Python and JavaScript sources" },
  { status: "parsing", progress: 48, message: "Mapping module dependencies" },
  { status: "explaining", progress: 63, message: "Generating module and function explanations" },
  { status: "generating_tests", progress: 79, message: "Generating unit tests" },
  { status: "refactoring", progress: 92, message: "Proposing safer refactors" },
  { status: "completed", progress: 100, message: "Analysis complete" },
];
