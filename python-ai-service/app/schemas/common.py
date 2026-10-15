"""Common API request/response schemas and application exceptions.

Provides standardized response envelopes matching OpenOrbit Express server conventions.
"""

from typing import Any, Dict, Generic, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorInfo(BaseModel):
    """Structured error payload details."""
    code: str = Field(..., description="Unique machine-readable error code")
    message: str = Field(..., description="Human-readable explanation of the error")
    details: Optional[Any] = Field(default=None, description="Additional context or validation errors")


class ErrorResponse(BaseModel):
    """Standardized error envelope returned for all API errors."""
    success: bool = Field(default=False, description="Always False for error responses")
    error: ErrorInfo


class APIResponse(BaseModel, Generic[T]):
    """Standardized success response envelope for all endpoints."""
    success: bool = Field(default=True, description="Always True for success responses")
    data: T = Field(..., description="The response data payload")
    meta: Optional[Dict[str, Any]] = Field(default=None, description="Metadata such as timing or model details")


class AppException(Exception):
    """Custom application exception with HTTP status code and machine error code."""

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        code: str = "BAD_REQUEST",
        details: Optional[Any] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details
