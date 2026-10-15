"""Issue analysis service interface for Member 2 implementation.

Provides issue classification, technical focus extraction, and approach suggestions.
"""

from typing import List
from app.schemas.analysis import IssueAnalysisRequest, IssueAnalysisResponse


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
