"""Unit tests for issue analysis using mocked Ollama responses."""

import json
from unittest.mock import AsyncMock, patch

import pytest

from app.services.issue_analysis import analyze_issue


@pytest.mark.asyncio
async def test_analyzes_issue_with_valid_ollama_response():
    """Return structured analysis when Ollama responds with valid JSON."""
    ai_response = {
        "problem": "Login fails for invalid credentials.",
        "likely_causes": ["Incorrect credential validation"],
        "suggested_steps": ["Inspect the login validation logic"],
        "testing_suggestions": ["Test invalid credentials"],
        "needs_clarification": False,
    }

    with patch(
        "app.services.issue_analysis.generate_response",
        new_callable=AsyncMock,
        return_value=json.dumps(ai_response),
    ) as mock_generate:
        result = await analyze_issue(
            title="Login error with invalid credentials",
            body="Login fails when invalid credentials are entered.",
            repository_context="Authentication is handled by the login service.",
        )

    assert result["title"] == "Login error with invalid credentials"
    assert "bug" in result["categories"]
    assert result["repository_context_available"] is True
    assert result["ai_analysis"]["problem"] == ai_response["problem"]
    assert result["ai_analysis"]["likely_causes"] == ai_response["likely_causes"]
    assert result["needs_clarification"] is False
    mock_generate.assert_awaited_once()


@pytest.mark.asyncio
async def test_rejects_empty_issue_title():
    """An empty issue title should raise ValueError."""
    with pytest.raises(ValueError, match="Issue title cannot be empty"):
        await analyze_issue(title="   ", body="Some issue description")


@pytest.mark.asyncio
async def test_uses_fallback_when_ollama_fails():
    """Return fallback suggestions if Ollama is unavailable."""
    with patch(
        "app.services.issue_analysis.generate_response",
        new_callable=AsyncMock,
        side_effect=RuntimeError("Ollama unavailable"),
    ):
        result = await analyze_issue(
            title="Fix login error",
            body="Login fails for some users.",
        )

    assert result["ai_analysis"]["problem"] == "Login fails for some users."
    assert result["ai_analysis"]["likely_causes"] == []
    assert result["ai_analysis"]["suggested_steps"]
    assert result["ai_analysis"]["testing_suggestions"]


@pytest.mark.asyncio
async def test_uses_fallback_for_invalid_json():
    """Malformed model output should not crash issue analysis."""
    with patch(
        "app.services.issue_analysis.generate_response",
        new_callable=AsyncMock,
        return_value="This is not valid JSON",
    ):
        result = await analyze_issue(
            title="Fix API error",
            body="The API returns an error.",
        )

    assert result["ai_analysis"]["problem"] == "The API returns an error."
    assert result["ai_analysis"]["testing_suggestions"]


@pytest.mark.asyncio
async def test_extracts_file_and_issue_references():
    """Extract references explicitly mentioned in the issue."""
    with patch(
        "app.services.issue_analysis.generate_response",
        new_callable=AsyncMock,
        return_value=json.dumps({
            "problem": "A reported bug",
            "likely_causes": [],
            "suggested_steps": [],
            "testing_suggestions": [],
            "needs_clarification": False,
        }),
    ):
        result = await analyze_issue(
            title="Fix bug in app/services/login.py",
            body="Related to issue #123.",
        )

    assert "app/services/login.py" in result["referenced_files"]
    assert "#123" in result["references"]
