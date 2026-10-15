"""FastAPI application entry point for the Python AI Service."""

from fastapi import FastAPI

from app.api.routes import analysis, contribution

app = FastAPI(
    title="OpenOrbit Python AI Service",
    description=(
        "AI-powered code analysis, issue understanding, "
        "and contribution planning using local Ollama."
    ),
    version="0.1.0",
)

# Register API routers
app.include_router(analysis.router)
app.include_router(contribution.router)


@app.get("/")
async def root():
    """Return basic service information."""
    return {
        "service": "OpenOrbit Python AI Service",
        "status": "running",
        "docs": "/docs",
    }


