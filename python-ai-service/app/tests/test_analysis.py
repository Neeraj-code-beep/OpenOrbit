"""Tests for the code and issue analysis services."""

from app.services.code_analysis import analyze_python_code


def test_valid_python_code():
    result = analyze_python_code("def add(a, b):\n    return a + b")

    assert result["valid"] is True
    assert any(
        function["name"] == "add"
        for function in result["functions"]
    )


def test_invalid_python_code():
    result = analyze_python_code("def add(")

    assert result["valid"] is False
    assert result["error"] is not None


def test_detects_imports():
    result = analyze_python_code("import os")

    assert result["valid"] is True
    assert "os" in result["imports"]


