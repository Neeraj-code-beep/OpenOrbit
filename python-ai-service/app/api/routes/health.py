"""Health check endpoint definitions.

Provides liveness and readiness probes conforming to OpenOrbit monitoring contracts.
"""

from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import get_settings
from app.schemas.common import APIResponse

router = APIRouter(prefix="/health", tags=["Health"])

START_TIME = datetime.now(timezone.utc)


@router.get("", response_model=APIResponse[dict])
async def check_health():
    """Liveness probe returning service operational status and runtime metadata."""
    settings = get_settings()
    uptime_seconds = (datetime.now(timezone.utc) - START_TIME).total_seconds()

    return APIResponse(
        success=True,
        data={
            "status": "healthy",
            "service": settings.APP_NAME,
            "environment": settings.ENVIRONMENT,
            "uptime_seconds": round(uptime_seconds, 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        meta={
            "version": "0.1.0",
        },
    )


@router.get("/ready", response_model=APIResponse[dict])
async def check_readiness():
    """Readiness probe verifying service dependencies and configuration."""
    settings = get_settings()

    return APIResponse(
        success=True,
        data={
            "ready": True,
            "ollama_base_url": settings.OLLAMA_BASE_URL,
            "default_model": settings.DEFAULT_LOCAL_MODEL,
        },
    )
