class CodeOracleError(Exception):
    """Base class for all handled, user-facing CodeOracle errors."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class InvalidZipError(CodeOracleError):
    pass


class PasswordProtectedZipError(CodeOracleError):
    pass


class ZipSlipError(CodeOracleError):
    pass


class SymlinkNotAllowedError(CodeOracleError):
    pass


class UploadTooLargeError(CodeOracleError):
    pass


class ExtractedTooLargeError(CodeOracleError):
    pass


class TooManyFilesError(CodeOracleError):
    pass


class NoSourceFilesError(CodeOracleError):
    pass


class TooManyLinesError(CodeOracleError):
    pass


class InvalidGithubUrlError(CodeOracleError):
    pass


class GithubRepoNotFoundError(CodeOracleError):
    pass


class GithubDownloadTimeoutError(CodeOracleError):
    pass


class GroqNotConfiguredError(CodeOracleError):
    pass


class GroqRateLimitError(CodeOracleError):
    pass


class GroqTimeoutError(CodeOracleError):
    pass


class GroqGenerationError(CodeOracleError):
    """Groq itself failed to produce a response matching the requested JSON
    schema (its own server-side generation/validation step failed) - distinct
    from a rate limit or network/server outage, but still worth retrying:
    LLM output is stochastic, and falling back to a different model (e.g.
    one using best-effort JSON mode instead of strict mode) can succeed
    where the original one didn't."""

    pass
