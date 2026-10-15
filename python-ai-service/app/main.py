"""FastAPI application entry point for OpenOrbit Python AI Service.

Configures application lifespan, routes, CORS middleware, and consistent error handling.
"""

import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import (
    analysis_router,
    contribution_router,
    health_router,
    repository_router,
)
from app.core.config import get_settings
from app.core.logging import logger
from app.schemas.common import AppException, ErrorInfo, ErrorResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown routines."""
    settings = get_settings()
    logger.info(f"Starting {settings.APP_NAME} in [{settings.ENVIRONMENT}] mode")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}")


def create_app() -> FastAPI:
    """Application factory initializing FastAPI with middleware, routes, and error handlers."""
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version="0.1.0",
        description=(
            "Specialized Python AI layer for OpenOrbit, providing repository "
            "context processing, code & issue analysis, and contribution planning assistance."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request duration and access logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration = round((time.time() - start_time) * 1000, 2)
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code} ({duration}ms)"
        )
        return response

    # Centralized exception handling
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.warning(f"AppException: [{exc.code}] {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                success=False,
                error=ErrorInfo(
                    code=exc.code,
                    message=exc.message,
                    details=exc.details,
                ),
            ).model_dump(),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
        clean_errors = []
        for err in exc.errors():
            clean_errors.append(
                {
                    "field": ".".join(str(loc) for loc in err.get("loc", [])),
                    "message": err.get("msg"),
                    "type": err.get("type"),
                }
            )
        return JSONResponse(
            status_code=422,
            content=ErrorResponse(
                success=False,
                error=ErrorInfo(
                    code="VALIDATION_ERROR",
                    message="Request payload validation failed.",
                    details=clean_errors,
                ),
            ).model_dump(),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        logger.warning(f"HTTPException {exc.status_code}: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                success=False,
                error=ErrorInfo(
                    code="HTTP_ERROR",
                    message=str(exc.detail),
                    details=None,
                ),
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled server error on {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                success=False,
                error=ErrorInfo(
                    code="INTERNAL_SERVER_ERROR",
                    message="An unexpected internal server error occurred.",
                    details=None,
                ),
            ).model_dump(),
        )

    # Route registrations under /api
    api_prefix = settings.API_PREFIX
    app.include_router(health_router, prefix=api_prefix)
    app.include_router(repository_router, prefix=api_prefix)
    app.include_router(analysis_router, prefix=api_prefix)
    app.include_router(contribution_router, prefix=api_prefix)

    # Direct top-level health alias for orchestration probes
    app.include_router(health_router)

    @app.get("/", tags=["Root"])
    async def root_index():
        return {
            "service": settings.APP_NAME,
            "status": "online",
            "docs": "/docs",
            "health": f"{api_prefix}/health",
        }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    app_settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=app_settings.HOST,
        port=app_settings.PORT,
        reload=app_settings.ENVIRONMENT == "development",
    )
