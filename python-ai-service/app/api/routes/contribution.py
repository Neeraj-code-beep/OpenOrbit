from typing import Any, Union
from fastapi import APIRouter, HTTPException, Request, status
from app.core.logging import logger
from app.schemas.common import APIResponse, AppException
from app.schemas.contribution import ContributionPlanRequest, ContributionPlanResponse
from app.services.contribution_planner import (
    contribution_planner_service,
    create_contribution_plan,
)

router = APIRouter(prefix="/contribution", tags=["Contribution"])


@router.post("/plan")
async def generate_contribution_plan(raw_request: Request):
    """Generates an actionable step-by-step contribution plan for an open-source issue.

    Supports both the standardized OpenOrbit APIResponse[ContributionPlanResponse] contract
    and legacy internal dictionary payloads for teammate test suites.
    """
    try:
        body = await raw_request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid JSON request body.",
        )

    # Legacy dictionary schema branch (tested by test_contribution_api)
    if isinstance(body, dict) and "issue" in body:
        issue = body.get("issue")
        if not isinstance(issue, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Issue must be an object.",
            )
        title = (issue.get("title") or "").strip()
        if not title:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Issue title is required to create a plan.",
            )
        return create_contribution_plan(issue, body.get("code_analysis"))

    # If body is missing issue and missing issueTitle/issue_title
    if isinstance(body, dict) and "code_analysis" in body and "issue" not in body and "issueTitle" not in body and "issue_title" not in body:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Issue is required to create a plan.",
        )

    # OpenOrbit standard contract branch
    try:
        request = ContributionPlanRequest(**body)
    except Exception as validation_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(validation_err),
        )

    if not request.issue_title.strip():
        raise AppException(
            message="Issue title cannot be empty.",
            status_code=status.HTTP_400_BAD_REQUEST,
            code="EMPTY_ISSUE_TITLE",
        )

    try:
        plan = contribution_planner_service.generate_plan(request)
        return APIResponse(
            success=True,
            data=plan,
            meta={
                "steps_count": len(plan.implementation_steps),
                "verified_files_count": len([f for f in plan.relevant_files if f.is_verified]),
            },
        )
    except AppException:
        raise
    except Exception as e:
        logger.error(f"Error generating contribution plan: {e}", exc_info=True)
        raise AppException(
            message=f"Failed to generate contribution plan: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="PLAN_GENERATION_ERROR",
        )

