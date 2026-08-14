import re
from pathlib import Path
from urllib.parse import urlparse

import httpx

from app.core.constants import GITHUB_ALLOWED_HOSTS
from app.core.exceptions import (
    GithubDownloadTimeoutError,
    GithubRepoNotFoundError,
    InvalidGithubUrlError,
)
from app.services.ingest_service import IngestResult
from app.services.upload_service import process_zip_source

REPO_PATH_PATTERN = re.compile(r"^/(?P<owner>[\w.-]+)/(?P<repo>[\w.-]+?)(?:\.git)?/?$")


def parse_github_repo_url(repo_url: str) -> tuple[str, str]:
    parsed = urlparse(repo_url.strip())

    if parsed.scheme not in ("http", "https"):
        raise InvalidGithubUrlError("Repository URL must use http or https.")

    host = (parsed.hostname or "").lower()
    if host not in GITHUB_ALLOWED_HOSTS:
        raise InvalidGithubUrlError("Only public GitHub repository URLs are supported.")

    match = REPO_PATH_PATTERN.match(parsed.path)
    if not match:
        raise InvalidGithubUrlError(
            "URL must point to a GitHub repository, e.g. https://github.com/owner/repo."
        )

    return match.group("owner"), match.group("repo")


def get_default_branch(owner: str, repo: str, *, timeout_seconds: float) -> str:
    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    try:
        response = httpx.get(
            api_url,
            timeout=timeout_seconds,
            headers={"Accept": "application/vnd.github+json"},
        )
    except httpx.TimeoutException as exc:
        raise GithubDownloadTimeoutError("Timed out while contacting GitHub.") from exc
    except httpx.HTTPError as exc:
        raise GithubRepoNotFoundError("Could not reach GitHub to look up the repository.") from exc

    if response.status_code == 404:
        raise GithubRepoNotFoundError("Repository not found or is private.")
    if response.status_code == 403:
        raise GithubRepoNotFoundError(
            "GitHub API request was blocked or rate-limited. Please try again later."
        )
    response.raise_for_status()

    return response.json().get("default_branch", "main")


def download_github_repo_zip(
    repo_url: str,
    destination_zip: Path,
    *,
    timeout_seconds: float = 15.0,
) -> Path:
    owner, repo = parse_github_repo_url(repo_url)
    default_branch = get_default_branch(owner, repo, timeout_seconds=timeout_seconds)
    archive_url = f"https://codeload.github.com/{owner}/{repo}/zip/refs/heads/{default_branch}"

    try:
        with httpx.stream(
            "GET", archive_url, timeout=timeout_seconds, follow_redirects=True
        ) as response:
            if response.status_code == 404:
                raise GithubRepoNotFoundError("Repository archive could not be downloaded.")
            response.raise_for_status()
            with open(destination_zip, "wb") as out_file:
                for chunk in response.iter_bytes():
                    out_file.write(chunk)
    except httpx.TimeoutException as exc:
        raise GithubDownloadTimeoutError(
            "Timed out while downloading the repository archive."
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise GithubRepoNotFoundError("Repository archive could not be downloaded.") from exc

    return destination_zip


def process_github_source(repo_url: str, download_zip_path: Path, extract_to: Path) -> IngestResult:
    download_github_repo_zip(repo_url, download_zip_path)
    return process_zip_source(download_zip_path, extract_to)
