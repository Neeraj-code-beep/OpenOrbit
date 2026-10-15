"""Data schemas for contribution planning.

Defines Pydantic models for structured step-by-step contribution roadmaps,
matching OpenOrbit's plan validation contract.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PlanRelevantFile(BaseModel):
    """File identified as relevant to resolving the issue."""
    file_path: str = Field(..., alias="filePath", description="Repository-relative file path")
    reason: str = Field(..., description="Explanation of why this file is involved")
    is_verified: bool = Field(
        default=False,
        alias="isVerified",
        description="Whether this file was verified in the real repository tree",
    )

    model_config = {"populate_by_name": True}


class PlanImplementationStep(BaseModel):
    """Single sequential step to implement the solution."""
    step_number: int = Field(..., alias="stepNumber", description="Sequential step index starting at 1")
    title: str = Field(..., description="Short action-oriented step title")
    description: str = Field(..., description="Detailed instructions on what to change or check")
    safety_notes: str = Field(
        default="Verify tests pass before proceeding.",
        alias="safetyNotes",
        description="Safety precautions and edge cases to watch out for",
    )

    model_config = {"populate_by_name": True}


class PlanSuggestedPR(BaseModel):
    """Ready-to-use pull request title and markdown description."""
    title: str = Field(..., description="Conventional commit pull request title (e.g. fix: ...)")
    description: str = Field(..., description="Structured markdown PR description template")


class ContributionPlanRequest(BaseModel):
    """Request payload to generate a full contribution plan."""
    issue_title: str = Field(..., min_length=1, alias="issueTitle", description="GitHub issue title")
    issue_body: Optional[str] = Field(default="", alias="issueBody", description="GitHub issue body")
    repo_owner: Optional[str] = Field(default="", alias="repoOwner", description="Repository owner")
    repo_name: Optional[str] = Field(default="", alias="repoName", description="Repository name")
    verified_files: List[str] = Field(
        default_factory=list,
        alias="verifiedFiles",
        description="List of real repository files verified via GitHub API",
    )
    repo_readme: Optional[str] = Field(default="", alias="repoReadme", description="README content for context")

    model_config = {"populate_by_name": True}


class ContributionPlanResponse(BaseModel):
    """Complete structured contribution plan payload."""
    issue_summary: str = Field(..., alias="issueSummary", description="High-level summary of the issue")
    problem_interpretation: str = Field(
        ...,
        alias="problemInterpretation",
        description="Detailed technical interpretation of the bug/feature",
    )
    relevant_files: List[PlanRelevantFile] = Field(
        ...,
        alias="relevantFiles",
        description="List of candidate files to inspect or modify",
    )
    implementation_steps: List[PlanImplementationStep] = Field(
        ...,
        alias="implementationSteps",
        description="Ordered implementation steps with safety notes",
    )
    dependencies_and_risks: List[str] = Field(
        default_factory=list,
        alias="dependenciesAndRisks",
        description="Potential breaking changes, side effects, or external dependencies",
    )
    acceptance_criteria: List[str] = Field(
        ...,
        alias="acceptanceCriteria",
        description="Checklist to verify the solution satisfies the requirement",
    )
    test_plan: List[str] = Field(
        ...,
        alias="testPlan",
        description="Recommended unit and integration tests to write or run",
    )
    uncertainties_and_questions: List[str] = Field(
        default_factory=list,
        alias="uncertaintiesAndQuestions",
        description="Ambiguities or clarifying questions for maintainers",
    )
    suggested_pr: PlanSuggestedPR = Field(
        ...,
        alias="suggestedPR",
        description="Proposed PR title and markdown template",
    )

    model_config = {"populate_by_name": True}
