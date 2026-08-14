import httpx
import pytest

from app.core.exceptions import (
    GithubDownloadTimeoutError,
    GithubRepoNotFoundError,
    InvalidGithubUrlError,
)
from app.services.github_service import (
    download_github_repo_zip,
    get_default_branch,
    parse_github_repo_url,
)


class FakeResponse:
    def __init__(self, status_code, json_data=None, content=b""):
        self.status_code = status_code
        self._json_data = json_data or {}
        self._content = content

    def json(self):
        return self._json_data

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=None, response=self)

    def iter_bytes(self):
        yield self._content


class FakeStreamContext:
    def __init__(self, response):
        self._response = response

    def __enter__(self):
        return self._response

    def __exit__(self, *args):
        return False


# --- parse_github_repo_url -------------------------------------------------


@pytest.mark.parametrize(
    "url,expected",
    [
        ("https://github.com/octocat/hello-world", ("octocat", "hello-world")),
        ("https://github.com/octocat/hello-world.git", ("octocat", "hello-world")),
        ("https://github.com/octocat/hello-world/", ("octocat", "hello-world")),
        ("http://github.com/octocat/hello-world", ("octocat", "hello-world")),
    ],
)
def test_parse_github_repo_url_accepts_valid_urls(url, expected):
    assert parse_github_repo_url(url) == expected


@pytest.mark.parametrize(
    "url",
    [
        "https://gitlab.com/octocat/hello-world",
        "ftp://github.com/octocat/hello-world",
        "https://github.com/octocat",
        "https://github.com.evil.com/octocat/hello-world",
        "https://evilgithub.com/octocat/hello-world",
        "not-a-url-at-all",
    ],
)
def test_parse_github_repo_url_rejects_invalid_urls(url):
    with pytest.raises(InvalidGithubUrlError):
        parse_github_repo_url(url)


# --- get_default_branch -----------------------------------------------------


def test_get_default_branch_returns_branch_name(monkeypatch):
    monkeypatch.setattr(
        httpx, "get", lambda url, timeout=None, headers=None: FakeResponse(200, {"default_branch": "develop"})
    )

    assert get_default_branch("octocat", "hello-world", timeout_seconds=5) == "develop"


def test_get_default_branch_raises_not_found_on_404(monkeypatch):
    monkeypatch.setattr(httpx, "get", lambda url, timeout=None, headers=None: FakeResponse(404))

    with pytest.raises(GithubRepoNotFoundError):
        get_default_branch("octocat", "private-repo", timeout_seconds=5)


def test_get_default_branch_raises_on_rate_limit(monkeypatch):
    monkeypatch.setattr(httpx, "get", lambda url, timeout=None, headers=None: FakeResponse(403))

    with pytest.raises(GithubRepoNotFoundError):
        get_default_branch("octocat", "hello-world", timeout_seconds=5)


def test_get_default_branch_raises_timeout(monkeypatch):
    def raise_timeout(url, timeout=None, headers=None):
        raise httpx.TimeoutException("timed out")

    monkeypatch.setattr(httpx, "get", raise_timeout)

    with pytest.raises(GithubDownloadTimeoutError):
        get_default_branch("octocat", "hello-world", timeout_seconds=5)


# --- download_github_repo_zip ----------------------------------------------


def test_download_github_repo_zip_success(tmp_path, monkeypatch):
    monkeypatch.setattr(
        httpx, "get", lambda url, timeout=None, headers=None: FakeResponse(200, {"default_branch": "main"})
    )
    monkeypatch.setattr(
        httpx,
        "stream",
        lambda method, url, timeout=None, follow_redirects=None: FakeStreamContext(
            FakeResponse(200, content=b"PK\x03\x04fake-zip-bytes")
        ),
    )

    destination = tmp_path / "downloaded.zip"
    result = download_github_repo_zip("https://github.com/octocat/hello-world", destination)

    assert result == destination
    assert destination.read_bytes() == b"PK\x03\x04fake-zip-bytes"


def test_download_github_repo_zip_raises_not_found_on_404_archive(tmp_path, monkeypatch):
    monkeypatch.setattr(
        httpx, "get", lambda url, timeout=None, headers=None: FakeResponse(200, {"default_branch": "main"})
    )
    monkeypatch.setattr(
        httpx,
        "stream",
        lambda method, url, timeout=None, follow_redirects=None: FakeStreamContext(FakeResponse(404)),
    )

    with pytest.raises(GithubRepoNotFoundError):
        download_github_repo_zip("https://github.com/octocat/hello-world", tmp_path / "out.zip")


def test_download_github_repo_zip_raises_timeout(tmp_path, monkeypatch):
    monkeypatch.setattr(
        httpx, "get", lambda url, timeout=None, headers=None: FakeResponse(200, {"default_branch": "main"})
    )

    def raise_timeout(method, url, timeout=None, follow_redirects=None):
        raise httpx.TimeoutException("timed out")

    monkeypatch.setattr(httpx, "stream", raise_timeout)

    with pytest.raises(GithubDownloadTimeoutError):
        download_github_repo_zip("https://github.com/octocat/hello-world", tmp_path / "out.zip")
