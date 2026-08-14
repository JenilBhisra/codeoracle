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


class GeminiNotConfiguredError(CodeOracleError):
    pass


class GeminiRateLimitError(CodeOracleError):
    pass


class GeminiTimeoutError(CodeOracleError):
    pass
