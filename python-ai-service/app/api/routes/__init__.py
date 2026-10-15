"""API route package exporting all route routers."""

from app.api.routes.health import router as health_router
from app.api.routes.repository import router as repository_router
from app.api.routes.analysis import router as analysis_router
from app.api.routes.contribution import router as contribution_router

__all__ = [
    "health_router",
    "repository_router",
    "analysis_router",
    "contribution_router",
]
