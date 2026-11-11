"""DEEPSYQ Studio HTTP boundary: fail closed on preview and paid jobs.

Read-only configuration is available; mutation is only permitted against a
verified isolated TEST origin and verified, explicitly zero-cost models.
Never send a login session or payment credential to an arbitrary host.
"""
from __future__ import annotations

import json
import os
from typing import Mapping
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

KINDS = {"image", "video", "music"}


class GatewayBlocked(RuntimeError):
    pass


def _origin(origin: str) -> str:
    url = urlsplit(origin.strip().rstrip("/"))
    good_local = url.scheme == "http" and url.hostname in {"127.0.0.1", "localhost"}
    good_test = url.scheme == "https" and url.hostname == "test.deepsyq.pages.dev"
    if url.username or url.password or url.query or url.fragment or url.path not in ("", "/"):
        raise GatewayBlocked("Test API origin must be a bare trusted origin")
    if not (good_local or good_test):
        raise GatewayBlocked("Production and third-party API origins are prohibited in Jarvis New")
    return origin.rstrip("/")


class StudioGateway:
    def __init__(self, origin: str, transport=None) -> None:
        self.origin = _origin(origin)
        self._transport = transport or self._request

    @staticmethod
    def _request(method: str, url: str, data: dict | None = None, token: str = "") -> dict:
        raw = json.dumps(data).encode() if data is not None else None
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + token
        request = Request(url, data=raw, headers=headers, method=method)
        with urlopen(request, timeout=15) as resp:
            body = resp.read(1_000_001)
            if len(body) > 1_000_000:
                raise GatewayBlocked("Provider returned oversized response")
            return json.loads(body.decode("utf-8"))

    def capabilities(self) -> dict:
        return self._transport("GET", self.origin + "/api/studio/config")

    def prepare(self, kind: str, model: str, prompt: str,
                env: Mapping[str, str] | None = None) -> dict:
        """Read-only validation; no generated results or credits are touched."""
        e = os.environ if env is None else env
        if kind not in KINDS or not prompt.strip() or len(prompt) > 1500:
            raise GatewayBlocked("Unsupported media kind or invalid prompt")
        if e.get("JARVIX_NEW_ALLOW_STUDIO_DISPATCH") != "true":
            raise GatewayBlocked("Studio generation is disabled in this isolated branch")
        if e.get("JARVIX_NEW_MEDIA_FREE_QUOTA_VERIFIED") != "true":
            raise GatewayBlocked("Free model quota was not verified at the provider")
        if e.get("JARVIX_NEW_MEDIA_STOP_ON_EXHAUST_VERIFIED") != "true":
            raise GatewayBlocked("Stop-on-Exhaust protection has not been verified")
        allowed = {s.strip() for s in e.get("JARVIX_NEW_MEDIA_MODEL_ALLOWLIST", "").split(",") if s.strip()}
        if not model or model not in allowed:
            raise GatewayBlocked("Requested model not on the verified free allowlist")
        config = self.capabilities()
        if config.get("previewOnly") is not False or config.get("outputMode") == "local-demo":
            raise GatewayBlocked("Studio still returns demo assets, not verified AI media")
        models = config.get("models") or []
        match = next((m for m in models if m.get("id") == model and m.get("kind") in
                      ({kind, "audio"} if kind == "music" else {kind}) and m.get("enabled")), None)
        if not match:
            raise GatewayBlocked("Requested model not enabled in the studio capabilities")
        return {"kind": kind, "model": model, "prompt": prompt, "authorized": True}

    def submit(self, approved: dict, token: str,
               env: Mapping[str, str] | None = None) -> dict:
        """An explicit, protected nonzero-risk operation; never in smoke tests."""
        e = os.environ if env is None else env
        if not token:
            raise GatewayBlocked("Authenticated DEEPSYQ account is required")
        validated = self.prepare(approved["kind"], approved["model"], approved["prompt"], e)
        quote = self._transport(
            "POST", self.origin + "/api/studio/estimate",
            {"kind": validated["kind"], "model": validated["model"], "quantity": 1},
        )
        if quote.get("ok") is not True or quote.get("previewOnly") is not False:
            raise GatewayBlocked("Studio estimate is a mock / unverified")
        if quote.get("cost") != 0:
            raise GatewayBlocked("No zero-cost provider quote: generation blocked")
        response = self._transport("POST", self.origin + "/api/studio/jobs", validated, token)
        if response.get("ok") is not True or not response.get("jobId"):
            raise GatewayBlocked("Studio did not accept a real job")
        return response
