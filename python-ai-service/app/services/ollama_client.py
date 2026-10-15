"""Client for communicating with the local Ollama model."""

import httpx

from app.core.config import settings


async def generate_response(
    prompt: str,
    system_prompt: str | None = None,
) -> str:
    """Generate a response using the configured Ollama model."""

    messages = []

    if system_prompt:
        messages.append({
            "role": "system",
            "content": system_prompt,
        })

    messages.append({
        "role": "user",
        "content": prompt,
    })

    try:
        async with httpx.AsyncClient(
            timeout=settings.ollama_timeout
        ) as client:
            response = await client.post(
                f"{settings.ollama_base_url.rstrip('/')}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "messages": messages,
                    "stream": False,
                },
            )
            response.raise_for_status()
            result = response.json()

    except httpx.TimeoutException as exc:
        raise RuntimeError(
            "Ollama request timed out. Check whether the model "
            "is running and increase OLLAMA_TIMEOUT if needed."
        ) from exc

    except httpx.HTTPError as exc:
        raise RuntimeError(
            "Could not communicate with Ollama. Ensure Ollama is "
            "running and the configured model is available."
        ) from exc

    content = result.get("message", {}).get("content", "")

    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Ollama returned an empty response.")

    return content.strip()
