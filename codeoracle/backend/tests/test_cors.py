from fastapi.testclient import TestClient

from app.core.config import _ALWAYS_TRUSTED_ORIGINS, _effective_origins, _parse_origin_list, settings
from app.main import app

client = TestClient(app)

PRODUCTION_ORIGIN = "https://codeoracle-zeta.vercel.app"


# --- _parse_origin_list: parsing correctness --------------------------------


def test_parse_origin_list_splits_comma_separated_string():
    assert _parse_origin_list("https://a.com,https://b.com") == ["https://a.com", "https://b.com"]


def test_parse_origin_list_strips_whitespace_around_commas():
    assert _parse_origin_list(" https://a.com , https://b.com ") == ["https://a.com", "https://b.com"]


def test_parse_origin_list_strips_trailing_slash():
    """A trailing slash in config is never present in the browser's real
    Origin header, so leaving it in would make CORSMiddleware's exact-match
    check silently reject an origin that looks correct in a dashboard."""
    assert _parse_origin_list("https://codeoracle-zeta.vercel.app/") == ["https://codeoracle-zeta.vercel.app"]


def test_parse_origin_list_accepts_json_array_format():
    assert _parse_origin_list('["https://a.com", "https://b.com/"]') == ["https://a.com", "https://b.com"]


def test_parse_origin_list_ignores_empty_entries():
    assert _parse_origin_list("https://a.com,,https://b.com,") == ["https://a.com", "https://b.com"]


def test_parse_origin_list_strips_invisible_characters():
    # zero-width space smuggled in around an otherwise-correct value
    assert _parse_origin_list("​https://codeoracle-zeta.vercel.app​") == [
        "https://codeoracle-zeta.vercel.app"
    ]


def test_parse_origin_list_falls_back_to_comma_split_on_invalid_json():
    assert _parse_origin_list("[not valid json") == []


def test_parse_origin_list_handles_single_origin_no_commas():
    assert _parse_origin_list("https://codeoracle-zeta.vercel.app") == ["https://codeoracle-zeta.vercel.app"]


# --- _effective_origins: always-trusted merging ------------------------------


def test_effective_origins_includes_trusted_set_even_when_env_var_is_empty():
    assert _effective_origins("") == list(_ALWAYS_TRUSTED_ORIGINS)


def test_effective_origins_includes_trusted_set_alongside_configured_ones():
    result = _effective_origins("https://extra-origin.example")
    assert "https://extra-origin.example" in result
    for trusted in _ALWAYS_TRUSTED_ORIGINS:
        assert trusted in result


def test_effective_origins_deduplicates_when_configured_matches_trusted():
    result = _effective_origins(PRODUCTION_ORIGIN)
    assert result.count(PRODUCTION_ORIGIN) == 1


def test_effective_origins_deduplicates_and_normalizes_trailing_slash_duplicate():
    result = _effective_origins(f"{PRODUCTION_ORIGIN}/")
    assert result.count(PRODUCTION_ORIGIN) == 1


def test_effective_origins_preserves_order_configured_then_trusted():
    result = _effective_origins("https://extra-origin.example")
    assert result[0] == "https://extra-origin.example"
    assert result[1:] == list(_ALWAYS_TRUSTED_ORIGINS)


# --- actual CORS middleware behavior, end to end ----------------------------


def test_configured_origin_receives_allow_origin_header():
    """Whatever origin settings.frontend_origins_list actually resolves to
    (from the real environment/.env at test time) must be echoed back by
    CORSMiddleware - this is the exact mechanism that broke in production."""
    allowed = settings.frontend_origins_list
    assert allowed, "test requires at least one configured origin"
    origin = allowed[0]

    response = client.get("/api/health", headers={"Origin": origin})

    assert response.headers.get("access-control-allow-origin") == origin


def test_production_vercel_origin_receives_exact_allow_origin_header():
    """The production frontend must always work, regardless of what
    FRONTEND_ORIGINS is (or isn't) set to in the environment - it's in the
    always-trusted set, not just whatever happens to be configured."""
    response = client.get("/api/health", headers={"Origin": PRODUCTION_ORIGIN})

    assert response.headers.get("access-control-allow-origin") == PRODUCTION_ORIGIN


def test_unlisted_origin_does_not_receive_allow_origin_header():
    response = client.get("/api/health", headers={"Origin": "https://not-an-allowed-origin.example"})

    assert "access-control-allow-origin" not in response.headers


def test_preflight_for_configured_origin_succeeds():
    allowed = settings.frontend_origins_list
    assert allowed, "test requires at least one configured origin"
    origin = allowed[0]

    response = client.options(
        "/api/health",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin


def test_preflight_for_unlisted_origin_is_rejected():
    response = client.options(
        "/api/health",
        headers={"Origin": "https://not-an-allowed-origin.example", "Access-Control-Request-Method": "GET"},
    )

    assert response.status_code == 400
