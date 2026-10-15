"""Pydantic schemas for contribution planning and roadmap output."""

from pydantic import BaseModel, Field


class ContributionPlanRequest(BaseModel):
    """Input required to generate a contribution plan."""

    issue_title: str = Field(..., min_length=1)
    issue_body: str = ""
    repository_path: str | None = None
    repository_context: str = ""


class ContributionPlanResponse(BaseModel):
    """Structured contribution plan returned by the service."""

    issue_title: str
    issue_summary: str
    relevant_files: list[str] = Field(default_factory=list)
    implementation_steps: list[str] = Field(default_factory=list)
    testing_suggestions: list[str] = Field(default_factory=list)
    potential_risks: list[str] = Field(default_factory=list)
    requires_human_review: bool = True


class RoadmapStep(BaseModel):
    """An individual step in a contribution roadmap."""

    title: str
    description: str
    files: list[str] = Field(default_factory=list)


class ContributionRoadmap(BaseModel):
    """Roadmap for completing a contribution."""

    issue_title: str
    steps: list[RoadmapStep] = Field(default_factory=list)
    estimated_complexity: str = "unknown"
    requires_human_review: bool = True
