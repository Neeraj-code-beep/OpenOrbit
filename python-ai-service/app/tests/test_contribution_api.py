"""API integration tests for contribution planning."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_contribution_plan_endpoint_success():
    response = client.post(
        "/contribution/plan",
        json={
            "issue": {
                "title": "Fix login validation",
                "summary": "Invalid credentials cause an error.",
                "referenced_files": ["app/auth/login.py"],
            },
            "code_analysis": {
                "relevant_files": [
                    {"path": "app/auth/login.py"}
                ]
            },
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert data["issue_title"] == "Fix login validation"
    assert "app/auth/login.py" in data["relevant_files"]
    assert data["implementation_steps"]
    assert data["testing_suggestions"]
    assert data["potential_risks"]
    assert data["requires_human_review"] is True


def test_contribution_plan_rejects_missing_issue():
    response = client.post(
        "/contribution/plan",
        json={"code_analysis": {}},
    )

    assert response.status_code == 422


def test_contribution_plan_rejects_empty_title():
    response = client.post(
        "/contribution/plan",
        json={"issue": {"title": "  "}, "code_analysis": {}},
    )

    assert response.status_code == 422
    assert "Issue title is required" in response.json()["detail"]

