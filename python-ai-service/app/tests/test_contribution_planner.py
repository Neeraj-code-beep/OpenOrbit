
"""Tests for the contribution planning service."""

import pytest

from app.services.contribution_planner import create_contribution_plan


def test_creates_plan_with_relevant_files():
    issue = {
        "title": "Fix login validation",
        "summary": "Invalid credentials return an unexpected error.",
        "referenced_files": ["app/auth.py"],
    }
    code_analysis = {
        "relevant_files": [
            {"path": "app/auth.py"},
            {"path": "tests/test_auth.py"},
        ]
    }

    result = create_contribution_plan(issue, code_analysis)

    assert result["issue_title"] == "Fix login validation"
    assert result["issue_summary"] == (
        "Invalid credentials return an unexpected error."
    )
    assert result["relevant_files"] == [
        "app/auth.py",
        "tests/test_auth.py",
    ]
    assert result["requires_human_review"] is True


def test_uses_title_when_summary_is_missing():
    issue = {"title": "Fix login validation"}

    result = create_contribution_plan(issue, {})

    assert result["issue_summary"] == "Fix login validation"


def test_requires_issue_title():
    with pytest.raises(
        ValueError,
        match="Issue title is required to create a plan.",
    ):
        create_contribution_plan({"title": "  "}, {})


def test_adds_repository_search_step_when_no_files_exist():
    result = create_contribution_plan(
        {"title": "Fix login validation"},
        {},
    )

    assert result["relevant_files"] == []
    assert any(
        "Search the repository" in step
        for step in result["implementation_steps"]
    )


def test_includes_implementation_and_testing_guidance():
    result = create_contribution_plan(
        {"title": "Fix login validation"},
        {},
    )

    assert len(result["implementation_steps"]) >= 5
    assert len(result["testing_suggestions"]) == 4
    assert len(result["potential_risks"]) == 2
