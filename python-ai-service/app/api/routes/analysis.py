"""API routes for code analysis and issue understanding."""

from fastapi import APIRouter, HTTPException

from app.schemas.analysis import (
    CodeAnalysisRequest,
    CodeAnalysisResponse,
    IssueAnalysisRequest,
    IssueAnalysisResponse,
)
from app.services.code_analysis import analyze_python_code
from app.services.issue_analysis import analyze_issue

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.post("/code", response_model=CodeAnalysisResponse)
async def analyze_code(request: CodeAnalysisRequest):
    """Analyze the structure and syntax of a Python code snippet."""

    if request.language.lower() != "python":
        raise HTTPException(
            status_code=400,
            detail="Currently, only Python code analysis is supported.",
        )

    return analyze_python_code(request.code)


@router.post("/issue", response_model=IssueAnalysisResponse)
async def analyze_repository_issue(request: IssueAnalysisRequest):
    """Analyze an issue using local Ollama inference."""

    try:
        return await analyze_issue(
            title=request.title,
            body=request.body,
            repository_context=request.repository_context,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Issue analysis service failed: {exc}",
        ) from exc




