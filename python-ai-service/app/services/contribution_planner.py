"""Generate structured, evidence-aware contribution plans."""

from typing import Any


def create_contribution_plan(
    issue: dict[str, Any],
    code_analysis: dict[str, Any],
) -> dict[str, Any]:
    """Create an actionable plan using existing issue and code analysis."""

    title = str(issue.get("title", "")).strip()
    summary = str(issue.get("summary", "")).strip()

    if not title:
        raise ValueError("Issue title is required to create a plan.")

    relevant_files = code_analysis.get("relevant_files", [])
    referenced_files = issue.get("referenced_files", [])

    # Combine only files explicitly supplied by the analysis layers.
    files = sorted(
        {
            str(path)
            for path in (
                list(referenced_files)
                + [
                    item["path"]
                    for item in relevant_files
                    if isinstance(item, dict) and item.get("path")
                ]
            )
        }
    )

    steps = [
        "Review the issue description and confirm the expected behavior.",
        "Inspect the relevant source files and understand the affected code path.",
        "Identify the root cause using code evidence and existing tests.",
        "Implement the smallest change that addresses the confirmed cause.",
        "Review the changes for regressions and unintended side effects.",
    ]

    if not files:
        steps.insert(
            1,
            "Search the repository to identify files related to the issue.",
        )

    testing_suggestions = [
        "Add or update a test that reproduces the reported problem.",
        "Test the expected behavior and relevant edge cases.",
        "Run the affected module's tests.",
        "Run the broader test suite when available.",
    ]

    risks = [
        "The root cause has not been confirmed until the relevant code is inspected.",
        "Changing shared interfaces may affect other parts of the application.",
    ]

    return {
        "issue_title": title,
        "issue_summary": summary or title,
        "relevant_files": files,
        "implementation_steps": steps,
        "testing_suggestions": testing_suggestions,
        "potential_risks": risks,
        "requires_human_review": True,
    }

