"""Offline-first JARVIX NEW text conversation using an explicitly local Ollama server.

No hosted fallback, auto-download, tool calling, shell access, or model installation.
User must install/start Ollama and select an already available model themselves.
"""
from __future__ import annotations

import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HOST = "http://127.0.0.1:11434"
MAX_INPUT = 4000
MAX_OUTPUT = 8000


class LocalModelUnavailable(RuntimeError):
    pass


def _request(route: str, payload: dict | None = None, *, timeout: float = 20) -> dict:
    """Only fixed loopback endpoints, never configurable remote model URLs."""
    if route not in ("/api/tags", "/api/chat"):
        raise ValueError("Unsupported local model endpoint")
    body = json.dumps(payload, ensure_ascii=False).encode() if payload is not None else None
    request = Request(HOST + route, data=body,
                      headers={"Content-Type": "application/json"},
                      method="POST" if body is not None else "GET")
    try:
        with urlopen(request, timeout=timeout) as response:
            if response.status != 200:
                raise LocalModelUnavailable("Local model server returned an error")
            raw = response.read(256 * 1024 + 1)
            if len(raw) > 256 * 1024:
                raise LocalModelUnavailable("Local model response too large")
            return json.loads(raw)
    except (OSError, HTTPError, URLError, ValueError, json.JSONDecodeError) as error:
        raise LocalModelUnavailable("Local Ollama is unavailable or returned invalid data") from error


def available_models() -> list[str]:
    response = _request("/api/tags", timeout=3)
    if not isinstance(response, dict) or not isinstance(response.get("models"), list):
        raise LocalModelUnavailable("Local model list unavailable")
    return [entry["name"] for entry in response["models"]
            if isinstance(entry, dict) and isinstance(entry.get("name"), str)]


def chat(prompt: str, model: str, *, history: list[dict] | None = None) -> str:
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > MAX_INPUT:
        raise ValueError("Prompt must be 1–4000 characters")
    if not isinstance(model, str) or not model or len(model) > 120:
        raise ValueError("Select a locally installed model")
    if model not in available_models():
        raise LocalModelUnavailable("Selected model is not installed locally; no download started")
    messages = [{"role": "system", "content":
                 "You are JARVIX NEW, a local text assistant. "
                 "You cannot control the computer, access files or claim to execute actions. "
                 "Never claim to generate images, video or music."}]
    for item in (history or [])[-8:]:
        if not isinstance(item, dict) or item.get("role") not in ("user", "assistant"):
            continue
        value = item.get("content")
        if isinstance(value, str) and len(value) <= MAX_INPUT:
            messages.append({"role": item["role"], "content": value})
    messages.append({"role": "user", "content": prompt})
    data = _request("/api/chat", {"model": model, "messages": messages,
                                  "stream": False, "options": {"num_predict": 512}},
                    timeout=90)
    message = data.get("message") if isinstance(data, dict) else None
    answer = message.get("content") if isinstance(message, dict) else None
    if not isinstance(answer, str) or not answer.strip():
        raise LocalModelUnavailable("Local model returned no text")
    return answer[:MAX_OUTPUT]


def read_only_windows_status(*, approved: bool) -> dict:
    """One explicit-consent, read-only OS action; no shell and no OS mutation."""
    if not approved:
        raise PermissionError("User approval required for reading OS information")
    if os.name != "nt":
        raise RuntimeError("Windows-only status action")
    import platform
    return {"system": platform.system(), "release": platform.release(),
            "machine": platform.machine(), "action": "read_only",
            "note": "No files opened or modified"}
