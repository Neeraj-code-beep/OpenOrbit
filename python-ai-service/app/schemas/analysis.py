"""Data schemas for code analysis and issue analysis.

Defines Pydantic models for Member 2 analysis services and shared API contract.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IssueAnalysisRequest(BaseModel):
    """Request payload to analyze a GitHub issue."""
    issue_title: str = Field(..., min_length=1, description="GitHub issue title")
    issue_body: Optional[str] = Field(default="", description="GitHub issue description / body markdown")
    issue_labels: List[str] = Field(default_factory=list, description="Labels attached to the issue")
    repo_context: Optional[str] = Field(default=None, description="Optional repository summary context")
    file_list: Optional[List[str]] = Field(default=None, description="Known repository file paths")


class IssueAnalysisResponse(BaseModel):
    """Structured analysis of an open-source issue."""
    issue_category: str = Field(
        ...,
        description="Category: bug, feature, documentation, enhancement, refactor, or chore",
    )
    difficulty_estimate: str = Field(
        ...,
        description="Estimated level: beginner / good-first-issue, intermediate, or advanced",
    )
    problem_statement: str = Field(..., description="Clear summary of the core technical problem")
    suspected_components: List[str] = Field(
        default_factory=list,
        description="Likely affected modules, files, or subsystems",
    )
    key_technical_terms: List[str] = Field(
        default_factory=list,
        description="Relevant keywords, technologies, or API methods",
    )
    recommended_approach: str = Field(..., description="High-level suggested strategy to resolve the issue")
    reproduction_steps: Optional[str] = Field(
        default=None,
        description="Guidance on how to reproduce or verify the problem locally",
    )


class CodeSymbol(BaseModel):
    """Syntactic symbol found in source code."""
    name: str = Field(..., description="Identifier name")
    type: str = Field(..., description="'function', 'class', 'method', 'import', or 'variable'")
    line_start: Optional[int] = Field(default=None, description="Starting line number")
    line_end: Optional[int] = Field(default=None, description="Ending line number")
    docstring: Optional[str] = Field(default=None, description="Extracted docstring or comment")


class CodeAnalysisRequest(BaseModel):
    """Request payload to analyze source code file structure."""
    file_path: str = Field(..., min_length=1, description="File path relative to repository root")
    code_content: str = Field(..., min_length=1, description="Source code text content")
    language: Optional[str] = Field(default=None, description="Language identifier (python, javascript, etc.)")
    focus_query: Optional[str] = Field(default=None, description="Specific function or concept to search for")


class CodeAnalysisResponse(BaseModel):
    """Detailed structural analysis of a source file."""
    file_path: str = Field(..., description="Path analyzed")
    language: str = Field(..., description="Language identified")
    line_count: int = Field(..., description="Total line count")
    symbols: List[CodeSymbol] = Field(default_factory=list, description="Extracted classes and functions")
    dependencies: List[str] = Field(default_factory=list, description="Imported libraries or packages")
    complexity_notes: str = Field(..., description="Summary of complexity, readability, and key responsibilities")
    relevant_sections: List[str] = Field(default_factory=list, description="Relevant lines or snippet highlights")
