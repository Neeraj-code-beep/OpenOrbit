"""Test suite for health check routes."""

from fastapi import status


def test_health_check_api(client):
    """Verifies that the /api/health endpoint returns 200 with valid health payload."""
    response = client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK

    body = response.json()
    assert body["success"] is True
    assert "data" in body
    assert body["data"]["status"] == "healthy"
    assert "uptime_seconds" in body["data"]
    assert "timestamp" in body["data"]
    assert body["meta"]["version"] == "0.1.0"


def test_health_check_alias(client):
    """Verifies that top-level /health route alias is functional."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK

    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "healthy"


def test_health_readiness(client):
    """Verifies that the readiness probe returns configuration status."""
    response = client.get("/api/health/ready")
    assert response.status_code == status.HTTP_200_OK

    body = response.json()
    assert body["success"] is True
    assert body["data"]["ready"] is True
    assert "ollama_base_url" in body["data"]


def test_root_index(client):
    """Verifies root endpoint returns basic service links."""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK

    body = response.json()
    assert body["status"] == "online"
    assert body["docs"] == "/docs"
