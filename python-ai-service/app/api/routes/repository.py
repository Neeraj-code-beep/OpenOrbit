"""Repository context and structure endpoints.

Provides endpoints to parse file trees, extract architecture summaries,
and retrieve token-bounded relevant code contexts.
"""

from fastapi import APIRouter, HTTPException, status
from app.core.logging import logger
from app.schemas.common import APIResponse, AppException
from app.schemas.repository import (
    ExtractCodeContextRequest,
    ExtractCodeContextResponse,
    FileTreeRequest,
    FileTreeResponse,
    RepositoryContextRequest,
    RepositoryContextResponse,
)
from app.services.repository_context import repository_context_service

router = APIRouter(prefix="/repository", tags=["Repository"])


@router.post("/tree", response_model=APIResponse[FileTreeResponse])
async def parse_repository_tree(request: FileTreeRequest):
    """Parses a flat list of repository file paths into a clean, hierarchical tree.

    Filters out noisy build artifacts, dependency directories, and binaries.
    Identifies key repository files (README, CONTRIBUTING, manifest, etc.).
    """
    if not request.files:
        raise AppException(
            message="File paths list cannot be empty.",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EMPTY_FILE_LIST",
        )

    try:
        result = repository_context_service.build_file_tree(
            file_paths=request.files,
            ignore_patterns=request.ignore_patterns,
            max_depth=request.max_depth or 10,
        )
        return APIResponse(
            success=True,
            data=result,
            meta={
                "total_input_files": len(request.files),
                "filtered_files": result.filtered_files,
            },
        )
    except AppException:
        raise
    except Exception as e:
        logger.error(f"Error parsing repository tree: {e}", exc_info=True)
        raise AppException(
            message=f"Failed to parse repository tree: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="TREE_PARSING_ERROR",
        )


@router.post("/context", response_model=APIResponse[RepositoryContextResponse])
async def extract_repository_context(request: RepositoryContextRequest):
    """Analyzes repository structure, languages, entry points, and returns a grounded overview.

    Creates an injection-safe markdown overview ready for AI contribution planning.
    """
    if not request.file_paths:
        raise AppException(
            message="Repository file paths list cannot be empty.",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EMPTY_FILE_PATHS",
        )

    try:
        context_result = repository_context_service.analyze_repository_context(
            metadata=request.metadata,
            file_paths=request.file_paths,
            key_files_content=request.key_files_content,
            focus_area=request.focus_area,
        )
        return APIResponse(
            success=True,
            data=context_result,
            meta={
                "repo": f"{request.metadata.owner}/{request.metadata.name}",
                "estimated_tokens": context_result.estimated_tokens,
            },
        )
    except AppException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing repository context: {e}", exc_info=True)
        raise AppException(
            message=f"Failed to analyze repository context: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="CONTEXT_ANALYSIS_ERROR",
        )


@router.post("/extract-context", response_model=APIResponse[ExtractCodeContextResponse])
async def extract_relevant_code(request: ExtractCodeContextRequest):
    """Ranks and extracts the most relevant code snippets matching a query or issue.

    Strictly bounds the returned code snippets within the designated token budget.
    """
    if not request.query.strip():
        raise AppException(
            message="Search query cannot be empty.",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EMPTY_QUERY",
        )

    if not request.files:
        raise AppException(
            message="Files list cannot be empty.",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EMPTY_FILES",
        )

    try:
        extracted = repository_context_service.extract_code_context(
            query=request.query,
            files=request.files,
            max_tokens=request.max_tokens,
        )
        return APIResponse(
            success=True,
            data=extracted,
            meta={
                "budget_tokens": request.max_tokens,
                "used_tokens": extracted.total_tokens,
                "matched_count": extracted.files_included,
            },
        )
    except AppException:
        raise
    except Exception as e:
        logger.error(f"Error extracting code context: {e}", exc_info=True)
        raise AppException(
            message=f"Failed to extract code context: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="CODE_EXTRACTION_ERROR",
        )
