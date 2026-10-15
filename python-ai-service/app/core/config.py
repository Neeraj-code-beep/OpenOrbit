"""Configuration settings for the OpenOrbit Python AI Service.

Loads application settings and environment variables with safe defaults.
"""

from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings schema backed by environment variables."""

    # Server Settings
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    APP_NAME: str = "OpenOrbit Python AI Service"
    API_PREFIX: str = "/api"

    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Ollama / Local Model Settings
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    DEFAULT_LOCAL_MODEL: str = "llama3:latest"

    # Context Processing Limits
    MAX_CONTEXT_FILE_SIZE_KB: int = 256
    MAX_TOTAL_CONTEXT_TOKENS: int = 32000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Returns cached application settings instance."""
    return Settings()
