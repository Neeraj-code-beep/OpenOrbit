import json
import re
from typing import Any, Dict, List, Optional

from app.schemas.analysis import IssueAnalysisRequest, IssueAnalysisResponse
from app.services.ollama_client import generate_response


class IssueAnalysisService:
    """Service responsible for semantic breakdown and classification of GitHub issues."""

    def analyze_issue(self, request: IssueAnalysisRequest) -> IssueAnalysisResponse:
        """Analyzes an issue description and tags to extract category, difficulty, and approach.

        Serves as the foundation interface for Member 2's implementation.
        """
        title = request.issue_title.lower()
        body = (request.issue_body or "").lower()
        combined = f"{title} {body}"
        labels = [l.lower() for l in request.issue_labels]

        # Determine category
        if any(w in labels or w in title for w in ["bug", "fix", "error", "crash", "failed"]):
            category = "bug"
        elif any(w in labels or w in title for w in ["doc", "docs", "documentation", "readme"]):
            category = "documentation"
        elif any(w in labels or w in title for w in ["refactor", "cleanup"]):
            category = "refactor"
        elif any(w in labels or w in title for w in ["enhancement", "feat", "feature", "add"]):
            category = "feature"
        else:
            category = "enhancement"

        # Determine difficulty
        if any(w in labels for w in ["good first issue", "good-first-issue", "beginner", "easy"]):
            difficulty = "good-first-issue"
        elif any(w in labels for w in ["help wanted", "intermediate"]):
            difficulty = "intermediate"
        else:
            difficulty = "beginner" if category == "documentation" else "intermediate"

        # Extract suspected components from file list if available
        suspected_components: List[str] = []
        if request.file_list:
            for f in request.file_list:
                f_name = f.split("/")[-1].split(".")[0].lower()
                if len(f_name) > 3 and f_name in combined:
                    suspected_components.append(f)

        return IssueAnalysisResponse(
            issue_category=category,
            difficulty_estimate=difficulty,
            problem_statement=request.issue_title,
            suspected_components=suspected_components[:5],
            key_technical_terms=[w for w in ["test", "api", "route", "auth", "validation", "schema"] if w in combined],
            recommended_approach=f"Investigate behavior described in '{request.issue_title}'. Locate affected logic, write reproduction tests, and apply scoped fix.",
            reproduction_steps="Check existing test suites and reproduce with minimal input test case.",
        )


issue_analysis_service = IssueAnalysisService()


async def analyze_issue(
    title: str,
    body: str = "",
    repository_context: str = "",
) -> Dict[str, Any]:
    """Analyzes an issue description and optional repository context using Ollama, with fallback."""
    if not title or not title.strip():
        raise ValueError("Issue title cannot be empty")

    cleaned_title = title.strip()
    cleaned_body = (body or "").strip()
    combined = f"{cleaned_title} {cleaned_body}".lower()

    # Determine categories
    categories = []
    if any(w in combined for w in ["bug", "error", "fail", "crash", "fix"]):
        categories.append("bug")
    if any(w in combined for w in ["feat", "feature", "enhancement"]):
        categories.append("feature")
    if any(w in combined for w in ["doc", "docs", "documentation"]):
        categories.append("documentation")
    if not categories:
        categories.append("enhancement")

    # Extract referenced files and issue/PR references
    referenced_files = re.findall(
        r"[\w\./\-]+\.(?:py|js|ts|jsx|tsx|json|md|html|css)",
        f"{cleaned_title} {cleaned_body}",
    )
    references = re.findall(r"#\d+", f"{cleaned_title} {cleaned_body}")

    # Fallback heuristic analysis
    fallback_analysis = {
        "problem": cleaned_body or cleaned_title,
        "likely_causes": [],
        "suggested_steps": [
            f"Inspect behavior described in '{cleaned_title}'.",
            "Set up reproduction test case.",
            "Apply targeted changes in affected module.",
        ],
        "testing_suggestions": [
            "Run existing unit test suites.",
            "Add regression test verifying the fix.",
        ],
        "needs_clarification": False,
    }

    ai_analysis = fallback_analysis.copy()

    prompt = (
        f"Analyze the following GitHub issue:\n"
        f"Title: {cleaned_title}\n"
        f"Body: {cleaned_body}\n"
        f"Context: {repository_context}\n"
        f"Return a JSON object with keys: problem, likely_causes, suggested_steps, testing_suggestions, needs_clarification."
    )
    system_prompt = "You are an expert software engineer assistant. Always respond with valid JSON."

    try:
        raw_response = await generate_response(prompt=prompt, system_prompt=system_prompt)
        parsed = json.loads(raw_response)
        if isinstance(parsed, dict) and "problem" in parsed:
            ai_analysis = {
                "problem": parsed.get("problem", fallback_analysis["problem"]),
                "likely_causes": parsed.get("likely_causes", []),
                "suggested_steps": parsed.get("suggested_steps", fallback_analysis["suggested_steps"]),
                "testing_suggestions": parsed.get("testing_suggestions", fallback_analysis["testing_suggestions"]),
                "needs_clarification": parsed.get("needs_clarification", False),
            }
    except Exception:
        ai_analysis = fallback_analysis

    return {
        "title": cleaned_title,
        "categories": categories,
        "repository_context_available": bool(repository_context and repository_context.strip()),
        "ai_analysis": ai_analysis,
        "needs_clarification": ai_analysis.get("needs_clarification", False),
        "referenced_files": sorted(list(set(referenced_files))),
        "references": sorted(list(set(references))),
    }

