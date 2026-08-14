import asyncio
from unittest.mock import Mock

from app.core.exceptions import CodeOracleError
from app.main import handle_codeoracle_error, handle_unexpected_error


def test_handle_codeoracle_error_returns_sanitized_400():
    exc = CodeOracleError("Something specific went wrong.")

    response = asyncio.run(handle_codeoracle_error(Mock(), exc))

    assert response.status_code == 400
    assert response.body == b'{"detail":"Something specific went wrong."}'


def test_handle_unexpected_error_returns_generic_500_without_leaking_details():
    request = Mock(method="GET", url=Mock(path="/api/jobs/x"))
    exc = ValueError("raw internal secret detail")

    response = asyncio.run(handle_unexpected_error(request, exc))

    assert response.status_code == 500
    assert b"raw internal secret detail" not in response.body
    assert response.body == b'{"detail":"An unexpected error occurred."}'
