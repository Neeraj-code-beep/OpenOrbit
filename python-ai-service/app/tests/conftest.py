"""Pytest test fixtures for OpenOrbit Python AI Service."""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Returns a TestClient instance for API integration tests."""
    with TestClient(app) as test_client:
        yield test_client
