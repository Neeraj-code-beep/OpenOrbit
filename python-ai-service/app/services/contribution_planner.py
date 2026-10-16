"""Contribution planning service interface for Member 2 implementation.

Provides structured contribution planning, relevant file suggestion,
and step-by-step guidance conforming to OpenOrbit's contract.
"""

from typing import List, Optional
from app.schemas.contribution import (
    ContributionPlanRequest,
    ContributionPlanResponse,
    PlanImplementationStep,
    PlanRelevantFile,
    PlanSuggestedPR,
)


class ContributionPlannerService:
    """Service responsible for generating structured open-source contribution roadmaps."""

    def generate_plan(self, request: ContributionPlanRequest) -> ContributionPlanResponse:
        """Generates a structured contribution plan for an open-source issue.

        Serves as the foundation interface for Member 2's implementation.
        """
        title = request.issue_title
        body = request.issue_body or ""
        verified_files = request.verified_files or []

        # Identify candidate files from verified files matching query keywords
        relevant_files: List[PlanRelevantFile] = []
        for f in verified_files:
            base = f.split("/")[-1].split(".")[0].lower()
            if len(base) > 2 and (base in title.lower() or base in body.lower()):
                relevant_files.append(
                    PlanRelevantFile(
                        file_path=f,
                        reason="Matched issue keywords and component names",
                        is_verified=True,
                    )
                )

        if not relevant_files and verified_files:
            # Include top 2 verified files as primary starting points
            for f in verified_files[:2]:
                relevant_files.append(
                    PlanRelevantFile(
                        file_path=f,
                        reason="Primary verified repository component",
                        is_verified=True,
                    )
                )

        if not relevant_files:
            relevant_files.append(
                PlanRelevantFile(
                    file_path="README.md",
                    reason="Starting documentation context",
                    is_verified=False,
                )
            )

        steps = [
            PlanImplementationStep(
                step_number=1,
                title="Reproduce the issue locally",
                description=f"Inspect requirements or bug reports described in '{title}'. Set up local test suite.",
                safety_notes="Do not make edits until you can reproduce the current behavior.",
            ),
            PlanImplementationStep(
                step_number=2,
                title="Implement proposed modifications",
                description=f"Update the relevant components ({', '.join(rf.file_path for rf in relevant_files[:3])}). Maintain backwards compatibility.",
                safety_notes="Keep modifications focused specifically on the scope of the issue.",
            ),
            PlanImplementationStep(
                step_number=3,
                title="Verify tests and run linters",
                description="Run the test suite to ensure all unit and integration tests pass without regression.",
                safety_notes="Ensure code formatting and linter checks pass before staging commits.",
            ),
        ]

        suggested_pr = PlanSuggestedPR(
            title=f"fix: resolve {title[:50]}",
            description=f"## Summary of Changes\n- Resolves: {title}\n\n## Testing\n- Tested locally against test suite",
        )

        return ContributionPlanResponse(
            issue_summary=f"Action plan for: {title}",
            problem_interpretation=body if body else f"Technical resolution needed for {title}.",
            relevant_files=relevant_files,
            implementation_steps=steps,
            dependencies_and_risks=["Potential interface regressions if public methods are changed."],
            acceptance_criteria=[
                f"Issue '{title}' is resolved.",
                "All automated tests pass.",
                "Code adheres to project guidelines.",
            ],
            test_plan=[
                "Run existing unit test suite.",
                "Add regression test specifically verifying fix for this issue.",
            ],
            uncertainties_and_questions=[],
            suggested_pr=suggested_pr,
        )


contribution_planner_service = ContributionPlannerService()


def create_contribution_plan(issue: dict, code_analysis: Optional[dict] = None) -> dict:
    """Creates a structured contribution plan from issue and code_analysis dictionaries."""
    code_analysis = code_analysis or {}
    title = (issue.get("title") or "").strip()
    if not title:
        raise ValueError("Issue title is required to create a plan.")

    summary = (issue.get("summary") or "").strip() or title

    relevant_files: List[str] = []
    if "relevant_files" in code_analysis and isinstance(code_analysis["relevant_files"], list):
        for rf in code_analysis["relevant_files"]:
            if isinstance(rf, dict) and "path" in rf:
                relevant_files.append(rf["path"])
            elif isinstance(rf, str):
                relevant_files.append(rf)
    elif "referenced_files" in issue and isinstance(issue["referenced_files"], list):
        relevant_files.extend(issue["referenced_files"])

    steps: List[str] = []
    if not relevant_files:
        steps.append("Search the repository to locate the relevant code and test files.")
    steps.extend([
        f"Reproduce the problem described in '{title}'.",
        "Inspect the affected functions and classes for edge cases.",
        "Implement the minimal fix or enhancement.",
        "Verify changes against existing test suites.",
        "Draft and review the pull request.",
    ])

    return {
        "issue_title": title,
        "issue_summary": summary,
        "relevant_files": relevant_files,
        "requires_human_review": True,
        "implementation_steps": steps,
        "testing_suggestions": [
            "Run unit tests covering the modified files.",
            "Add a regression test specifically for this scenario.",
            "Test with edge cases such as invalid or empty input.",
            "Run linter and formatting tools.",
        ],
        "potential_risks": [
            "Breaking existing public API contracts.",
            "Unintended side-effects on downstream consumers.",
        ],
    }
