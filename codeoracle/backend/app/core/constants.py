IGNORED_DIR_NAMES = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "env",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".next",
    "dist",
    "build",
    "coverage",
    "vendor",
    "__MACOSX",
}

# Suffixes checked against the full lowercased filename (catches multi-part
# suffixes like ".min.js" that Path.suffix would otherwise report as ".js")
IGNORED_FILENAME_SUFFIXES = (
    ".min.js",
    ".min.css",
    ".map",
)

IGNORED_FILE_EXTENSIONS = {
    ".pyc",
    ".pyo",
    ".so",
    ".dll",
    ".exe",
    ".class",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".svg",
    ".bmp",
    ".webp",
    ".mp4",
    ".mov",
    ".avi",
    ".mp3",
    ".wav",
    ".zip",
    ".tar",
    ".gz",
    ".rar",
    ".7z",
    ".pdf",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
}

SUPPORTED_LANGUAGE_EXTENSIONS = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
}

GITHUB_ALLOWED_HOSTS = {"github.com", "www.github.com"}
