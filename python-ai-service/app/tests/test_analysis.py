"""Contract test suite for Member 2 analysis and contribution planning endpoints."""

from fastapi import status


def test_issue_analysis_contract(client):
    """Verifies that issue analysis endpoint accepts valid payload and conforms to schema."""
    payload = {
        "issue_title": "Fix bug in repository context parser",
        "issue_body": "The parser fails when handling nested hidden directories like .github.",
        "issue_labels": ["bug", "good first issue"],
    }

    response = client.post("/api/analysis/issue", json=payload)
    assert response.status_code == status.HTTP_200_OK

    body = response.json()
    assert body["success"] is True
    data = body["data"]

    assert data["issue_category"] == "bug"
    assert data["difficulty_estimate"] == "good-first-issue"
    assert "Fix bug in repository context parser" in data["problem_statement"]
    assert "recommended_approach" in data


def test_code_analysis_contract(client):
    """Verifies that code analysis endpoint parses Python source code and extracts symbols."""
    payload = {
        "file_path": "app/services/example.py",
        "code_content": """
import os
import sys

class ExampleService:
    '''Documentation for ExampleService.'''
    def run_process(self, param: int) -> bool:
        return True
""",
        "language": "Python",
    }

    response = client.post("/api/analysis/code", json=payload)
    assert response.status_code == status.HTTP_200_OK

    body = response.json()
    assert body["success"] is True
    data = body["data"]

    assert data["file_path"] == "app/services/example.py"
    assert data["line_count"] > 0
    assert "os" in data["dependencies"]
    assert "sys" in data["dependencies"]

    # Verify extracted symbols
    symbols = data["symbols"]
    symbol_names = [s["name"] for s in symbols]
    assert "ExampleService" in symbol_names
    assert "run_process" in symbol_names


def test_contribution_plan_contract(client):
    """Verifies that contribution plan generation satisfies OpenOrbit plan validation contract."""
    payload = {
        "issueTitle": "Add endpoint to validate repository file tree",
        "issueBody": "Need an endpoint that verifies files before generating contribution plan.",
        "repoOwner": "Neeraj-code-beep",
        "repoName": "OpenOrbit",
        "verifiedFiles": ["python-ai-service/app/api/routes/repository.py", "README.md"],
    }

    response = client.post("/api/contribution/plan", json=payload)
    assert response.status_code == status.HTTP_200_OK

    body = response.json()
    assert body["success"] is True
    data = body["data"]

    assert "issueSummary" in data
    assert "problemInterpretation" in data
    assert "relevantFiles" in data
    assert len(data["relevantFiles"]) >= 1
    assert "implementationSteps" in data
    assert len(data["implementationSteps"]) >= 1
    assert "suggestedPR" in data
    assert "title" in data["suggestedPR"]
    assert "description" in data["suggestedPR"]
