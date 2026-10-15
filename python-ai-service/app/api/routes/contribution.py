
"""Contribution planning routes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.contribution_planner import create_contribution_plan

router = APIRouter(prefix="/contribution", tags=["Contribution"])


class ContributionPlanRequest(BaseModel):
    issue: dict = Field(
        ...,
        description="Issue analysis result containing title and summary.",
    )
    code_analysis: dict = Field(
        default_factory=dict,
        description="Code analysis result containing relevant files.",
    )


@router.post("/plan")
async def generate_contribution_plan(
    request: ContributionPlanRequest,
):
    """Generate an actionable plan for contributing to an issue."""
    try:
        return create_contribution_plan(
            issue=request.issue,
            code_analysis=request.code_analysis,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

