"""Analysis route definitions for Member 2 service integration.

Provides endpoints for code structural analysis and GitHub issue breakdown.
"""

from fastapi import APIRouter, status
from app.core.logging import logger
from app.schemas.common import APIResponse, AppException
from app.schemas.analysis import (
    CodeAnalysisRequest,
    CodeAnalysisResponse,
    IssueAnalysisRequest,
    IssueAnalysisResponse,
)
from app.services.code_analysis import code_analysis_service
from app.services.issue_analysis import issue_analysis_service

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.post("/issue", response_model=APIResponse[IssueAnalysisResponse])
async def analyze_github_issue(request: IssueAnalysisRequest):
    """Analyzes an open-source issue to determine its complexity, category, and resolution strategy."""
    if not request.issue_title.strip():
        raise AppException(
            message="Issue title cannot be empty.",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EMPTY_ISSUE_TITLE",
        )

    try:
        analysis = issue_analysis_service.analyze_issue(request)
        return APIResponse(
            success=True,
            data=analysis,
            meta={"category": analysis.issue_category, "difficulty": analysis.difficulty_estimate},
        )
    except AppException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing issue: {e}", exc_info=True)
        raise AppException(
            message=f"Failed to analyze issue: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="ISSUE_ANALYSIS_ERROR",
        )


@router.post("/code", response_model=APIResponse[CodeAnalysisResponse])
async def analyze_source_code(request: CodeAnalysisRequest):
    """Analyzes a source file to extract syntax symbols, line counts, and dependencies."""
    if not request.file_path.strip():
        raise AppException(
            message="File path cannot be empty.",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EMPTY_FILE_PATH",
        )

    try:
        analysis = code_analysis_service.analyze_code(request)
        return APIResponse(
            success=True,
            data=analysis,
            meta={"file": request.file_path, "symbol_count": len(analysis.symbols)},
        )
    except AppException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing code: {e}", exc_info=True)
        raise AppException(
            message=f"Failed to analyze code: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="CODE_ANALYSIS_ERROR",
        )
