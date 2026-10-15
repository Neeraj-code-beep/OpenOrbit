"""Data schemas for repository context and structure processing.

Defines Pydantic models for repository metadata, file trees, and code context extraction.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class FileNode(BaseModel):
    """Hierarchical node representing a file or directory in a repository tree."""
    path: str = Field(..., description="Full relative path of the file or directory")
    name: str = Field(..., description="Base name of the file or folder")
    type: str = Field(..., description="'file' or 'directory'")
    size: Optional[int] = Field(default=None, description="Size in bytes, if available")
    extension: Optional[str] = Field(default=None, description="File extension without leading dot")
    children: Optional[List["FileNode"]] = Field(default=None, description="Child nodes for directories")


FileNode.model_rebuild()


class RepositoryMetadata(BaseModel):
    """Metadata describing a GitHub repository."""
    owner: str = Field(..., min_length=1, description="Repository owner or organization")
    name: str = Field(..., min_length=1, description="Repository name")
    default_branch: str = Field(default="main", description="Default branch name")
    description: Optional[str] = Field(default=None, description="Repository description")
    language: Optional[str] = Field(default=None, description="Primary repository language")
    topics: List[str] = Field(default_factory=list, description="Repository topic tags")
    stars: int = Field(default=0, ge=0, description="Star count")
    open_issues: int = Field(default=0, ge=0, description="Number of open issues")


class FileTreeRequest(BaseModel):
    """Request payload to parse and filter repository file paths into a hierarchy."""
    files: List[str] = Field(..., min_length=1, description="List of repository relative file paths")
    ignore_patterns: Optional[List[str]] = Field(
        default=None,
        description="Glob/prefix patterns to ignore (defaults to standard ignores)",
    )
    max_depth: Optional[int] = Field(default=10, ge=1, le=25, description="Maximum tree depth")


class FileTreeResponse(BaseModel):
    """Hierarchical file tree and discovered key files."""
    total_files: int = Field(..., description="Total count of files parsed")
    filtered_files: int = Field(..., description="Count of files after filtering ignored files")
    total_directories: int = Field(..., description="Total directory nodes created")
    tree: List[FileNode] = Field(..., description="Hierarchical file tree roots")
    key_files: Dict[str, str] = Field(
        ...,
        description="Map of key file roles (readme, contributing, manifest, etc.) to paths",
    )


class RepositoryContextRequest(BaseModel):
    """Request payload to generate a structured repository context summary."""
    metadata: RepositoryMetadata = Field(..., description="Repository metadata")
    file_paths: List[str] = Field(..., min_length=1, description="List of all repository file paths")
    key_files_content: Optional[Dict[str, str]] = Field(
        default_factory=dict,
        description="Mapping of file path to text content for key files (e.g. README.md)",
    )
    focus_area: Optional[str] = Field(
        default=None,
        description="Optional focus area or component to emphasize",
    )


class RepositoryContextResponse(BaseModel):
    """Structured repository context summary ready for planning and LLM grounding."""
    project_type: str = Field(..., description="Inferred project type / framework stack")
    languages_detected: List[str] = Field(..., description="Programming languages detected")
    key_directories: List[str] = Field(..., description="Key structural directories found")
    entry_points: List[str] = Field(..., description="Detected entry points (e.g. index.js, app.py)")
    config_files: List[str] = Field(..., description="Key configuration files detected")
    test_frameworks: List[str] = Field(..., description="Detected testing frameworks/tools")
    documentation_files: List[str] = Field(..., description="Discovered documentation and guidelines files")
    summary_markdown: str = Field(..., description="Grounded markdown overview of repository context")
    estimated_tokens: int = Field(..., description="Approximate token count of the summary")


class FileSnippet(BaseModel):
    """Extracted code snippet with relevance metadata."""
    path: str = Field(..., description="File path")
    content: str = Field(..., description="Snippet or file content")
    language: Optional[str] = Field(default=None, description="Language identifier")
    token_estimate: int = Field(default=0, description="Estimated token count for this snippet")
    relevance_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Relevance score (0.0 to 1.0)")


class ExtractCodeContextRequest(BaseModel):
    """Request payload to rank and extract relevant code context for a query/issue."""
    query: str = Field(..., min_length=1, description="Search query or issue description")
    files: List[Dict[str, str]] = Field(
        ...,
        min_length=1,
        description="List of file objects with 'path' and 'content' keys",
    )
    max_tokens: int = Field(
        default=8000,
        ge=500,
        le=32000,
        description="Maximum token budget for returned snippets",
    )


class ExtractCodeContextResponse(BaseModel):
    """Ranked code context within a strict token budget."""
    query: str = Field(..., description="Original search query")
    selected_snippets: List[FileSnippet] = Field(..., description="Selected relevant snippets")
    total_tokens: int = Field(..., description="Total tokens of all selected snippets")
    files_considered: int = Field(..., description="Number of files analyzed")
    files_included: int = Field(..., description="Number of files included in context")
