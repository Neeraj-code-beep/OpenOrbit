"""Unit tests for the local Ollama client."""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.ollama_client import generate_response


@pytest.mark.asyncio
async def test_generate_response_success():
    """Return model content and send the expected chat request."""
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "message": {"content": "  Analysis complete  "}
    }
    mock_response.raise_for_status.return_value = None

    with patch("app.services.ollama_client.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )

        result = await generate_response(
            prompt="Analyze this code",
            system_prompt="You are a careful assistant",
        )

    assert result == "Analysis complete"

    request = mock_client.return_value.__aenter__.return_value.post
    request.assert_awaited_once()

    kwargs = request.await_args.kwargs
    assert kwargs["json"]["stream"] is False
    assert kwargs["json"]["messages"][0] == {
        "role": "system",
        "content": "You are a careful assistant",
    }


@pytest.mark.asyncio
async def test_generate_response_without_system_prompt():
    """Send only the user message when no system prompt is provided."""
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "message": {"content": "Hello"}
    }
    mock_response.raise_for_status.return_value = None

    with patch("app.services.ollama_client.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )

        result = await generate_response(prompt="Say hello")

    assert result == "Hello"

    request_data = (
        mock_client.return_value.__aenter__.return_value.post
        .await_args.kwargs["json"]
    )
    assert request_data["messages"] == [
        {"role": "user", "content": "Say hello"}
    ]


@pytest.mark.asyncio
async def test_generate_response_timeout():
    """Raise a helpful error when the Ollama request times out."""
    with patch("app.services.ollama_client.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            side_effect=httpx.TimeoutException("Request timed out")
        )

        with pytest.raises(RuntimeError, match="request timed out"):
            await generate_response(prompt="Analyze this code")


@pytest.mark.asyncio
async def test_generate_response_connection_failure():
    """Raise a helpful error when Ollama cannot be reached."""
    with patch("app.services.ollama_client.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        with pytest.raises(RuntimeError, match="communicate with Ollama"):
            await generate_response(prompt="Analyze this code")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"message": {"content": ""}},
        {"message": {"content": "   "}},
        {"message": {"content": None}},
    ],
)
async def test_generate_response_rejects_empty_content(payload):
    """Reject missing, blank, or non-string model output."""
    mock_response = MagicMock()
    mock_response.json.return_value = payload
    mock_response.raise_for_status.return_value = None

    with patch("app.services.ollama_client.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )

        with pytest.raises(RuntimeError, match="empty response"):
            await generate_response(prompt="Analyze this code")


@pytest.mark.asyncio
async def test_generate_response_http_error():
    """Handle HTTP errors returned by the Ollama server."""
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Server error",
        request=httpx.Request("POST", "http://localhost:11434/api/chat"),
        response=httpx.Response(
            500,
            request=httpx.Request("POST", "http://localhost:11434/api/chat"),
        ),
    )

    with patch("app.services.ollama_client.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )

        with pytest.raises(RuntimeError, match="communicate with Ollama"):
            await generate_response(prompt="Analyze this code")
