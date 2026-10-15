"""Contribution planning routes for Member 2 service integration.

Provides endpoints to generate step-by-step contribution plans.
"""

from fastapi import APIRouter, status
from app.core.logging import logger
from app.schemas.common import APIResponse, AppException
from app.schemas.contribution import ContributionPlanRequest, ContributionPlanResponse
from app.services.contribution_planner import contribution_planner_service

router = APIRouter(prefix="/contribution", tags=["Contribution"])


@router.post("/plan", response_model=APIResponse[ContributionPlanResponse])
async def generate_contribution_plan(request: ContributionPlanRequest):
    """Generates an actionable step-by-step contribution plan for an open-source issue."""
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
