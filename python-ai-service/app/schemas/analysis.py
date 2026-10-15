"""Pydantic schemas for code and issue analysis."""

from pydantic import BaseModel, Field


class CodeAnalysisRequest(BaseModel):
    """Input for analyzing a code snippet."""

    code: str = Field(
        ...,
        min_length=1,
        description="Source code to analyze",
    )
    language: str = Field(
        default="python",
        description="Programming language",
    )


class FunctionInfo(BaseModel):
    """Details about a discovered function."""

    name: str
    line: int
    async_: bool = Field(default=False, alias="async")


class ClassInfo(BaseModel):
    """Details about a discovered class."""

    name: str
    line: int


class CodeAnalysisResponse(BaseModel):
    """Structured code analysis result."""

    language: str
    valid: bool
    error: str | None = None
    imports: list[str] = Field(default_factory=list)
    functions: list[FunctionInfo] = Field(default_factory=list)
    classes: list[ClassInfo] = Field(default_factory=list)


class IssueAnalysisRequest(BaseModel):
    """Input for understanding a repository issue."""

    title: str = Field(..., min_length=1)
    body: str = ""
    repository_context: str = ""


class AIAnalysisResult(BaseModel):
    """AI-generated issue analysis."""

    problem: str = ""
    likely_causes: list[str] = Field(default_factory=list)
    suggested_steps: list[str] = Field(default_factory=list)
    testing_suggestions: list[str] = Field(default_factory=list)


class IssueAnalysisResponse(BaseModel):
    """Structured issue analysis result."""

    title: str
    summary: str
    categories: list[str] = Field(default_factory=list)
    referenced_files: list[str] = Field(default_factory=list)
    references: list[str] = Field(default_factory=list)
    repository_context_available: bool = False
    repository_context: str = ""
    needs_clarification: bool = False
    ai_analysis: AIAnalysisResult = Field(
        default_factory=AIAnalysisResult
    )
