import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.analyze import router as analyze_router
from app.api.jobs import router as jobs_router
from app.core.config import settings
from app.core.exceptions import CodeOracleError

logger = logging.getLogger(__name__)

app = FastAPI(
    title="CodeOracle API",
    description="Backend API for CodeOracle legacy codebase modernization platform",
    version="0.1.0",
)

_allowed_origins = settings.frontend_origins_list
# warning (not info) so this is guaranteed visible in Render's logs without
# needing global log-level configuration - the whole point is to show
# exactly what got parsed at startup when the dashboard value and the
# running app's behavior disagree.
logger.warning("CORS: allowing origins %r (raw FRONTEND_ORIGINS=%r)", _allowed_origins, settings.frontend_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)
app.include_router(jobs_router)


@app.exception_handler(CodeOracleError)
async def handle_codeoracle_error(request: Request, exc: CodeOracleError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": exc.message})


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error while processing %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred."})


@app.get("/")
def read_root():
    return {
        "name": "CodeOracle API",
        "status": "running",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
    }
