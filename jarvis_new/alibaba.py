"""Fail-closed Singapore Alibaba Model Studio adapter for vendored VoiceOS.

This module only constructs validated configuration. Importing it NEVER
calls a provider or charges money. Secrets remain environment-only.
"""
from __future__ import annotations

from dataclasses import dataclass, field
import os
import re
from typing import Mapping

SINGAPORE_BASE = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"


class ConfigurationBlocked(ValueError):
    """The requested provider is not proven safe to use."""


@dataclass(frozen=True)
class ModelStudioRoute:
    model: str
    base_url: str
    api_key: str = field(repr=False)

    def voiceos_environment(self, base: Mapping[str, str] | None = None) -> dict[str, str]:
        """Bridge the existing VoiceOS OpenAI-compatible transport to DashScope."""
        env = dict(os.environ if base is None else base)
        env.update(
            LLM_PROVIDER="api",
            LLM_MODEL=self.model,
            VOICEOS_LLM_MODEL=self.model,
            VOICEOS_LLM_API_BASE=self.base_url,
            OPENAI_API_BASE=self.base_url,
            OPENAI_API_KEY=self.api_key,
        )
        return env

    def safe_details(self) -> dict[str, str]:
        """Public diagnostic output never contains credentials."""
        return {"provider": "Alibaba Model Studio", "region": "ap-southeast-1",
                "model": self.model, "base_url": self.base_url}


def status(env: Mapping[str, str] | None = None) -> dict[str, bool | str]:
    source = os.environ if env is None else env
    return {
        "region": "ap-southeast-1",
        "key_configured": bool(source.get("DASHSCOPE_API_KEY", "").strip()),
        "models_allowlisted": bool(source.get("JARVIX_NEW_FREE_MODEL_ALLOWLIST", "").strip()),
        "free_quota_verified": source.get("JARVIX_NEW_FREE_QUOTA_VERIFIED") == "true",
        "network_enabled": source.get("JARVIX_NEW_ALLOW_NETWORK") == "true",
    }


def resolve_route(env: Mapping[str, str] | None = None) -> ModelStudioRoute:
    """Require explicit model, quota proof, and consent before making API possible.

    The free quota is shared across platform users and expires. The separate
    Model Studio Stop-on-Exhaust safeguard must have been verified externally.
    The function does not claim that a model is free merely because it exists
    in the catalog.
    """
    source = os.environ if env is None else env
    if source.get("JARVIX_NEW_USE_ALIBABA") != "true":
        raise ConfigurationBlocked("Alibaba integration is not enabled")
    if source.get("JARVIX_NEW_ALLOW_NETWORK") != "true":
        raise ConfigurationBlocked("All provider calls are disabled in this test environment")
    if source.get("JARVIX_NEW_FREE_QUOTA_VERIFIED") != "true":
        raise ConfigurationBlocked("Stop-on-Exhaust and current free quota are not verified")

    allowed = {model.strip() for model in source.get("JARVIX_NEW_FREE_MODEL_ALLOWLIST", "").split(",")
               if model.strip()}
    model = source.get("JARVIX_NEW_TEXT_MODEL", "").strip()
    if not model or model not in allowed:
        raise ConfigurationBlocked("The selected text model is not on the verified-free allowlist")

    key = source.get("DASHSCOPE_API_KEY", "").strip()
    if not key:
        raise ConfigurationBlocked("The existing DASHSCOPE_API_KEY is unavailable in this environment")

    workspace = source.get("JARVIX_NEW_ALIBABA_WORKSPACE_ID", "").strip()
    if workspace:
        if not re.fullmatch(r"[A-Za-z0-9-]{3,64}", workspace):
            raise ConfigurationBlocked("Invalid workspace identifier")
        base_url = f"https://{workspace}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"
    else:
        base_url = SINGAPORE_BASE
    return ModelStudioRoute(model=model, base_url=base_url, api_key=key)
