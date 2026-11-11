"""Explicit opt-in loopback bridge between test-only Pages and the local task log.

This is NOT a cloud service: both pages and desktop must run on the same PC.
It cannot read files, execute programs or call any paid AI provider.  The
per-session bearer token is never stored, logged or sent to a third-party host.
"""
from __future__ import annotations

import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import secrets
import threading
from urllib.parse import urlsplit

ALLOWED_ORIGIN = "https://jarvis-new.deepsyq.pages.dev"
MAX_BODY_BYTES = 8192
ALLOWED_KINDS = frozenset(("image", "video", "music"))


class _Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class _Handler(BaseHTTPRequestHandler):
    server_version = "JARVIX-New-Test"
    sys_version = ""

    def log_message(self, _format, *_args):
        # No bearer tokens, prompts or user IPs in local logs.
        return

    def _origin_ok(self):
        return hmac.compare_digest(self.headers.get("Origin", ""), self.server.allowed_origin)

    def _authenticated(self):
        return hmac.compare_digest(
            self.headers.get("Authorization", ""), "Bearer " + self.server.pairing_token
        )

    def _reply(self, code, payload=None, cors=False):
        raw = json.dumps(payload if payload is not None else {}, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        if cors and self._origin_ok():
            self.send_header("Access-Control-Allow-Origin", self.server.allowed_origin)
            self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        try:
            self.wfile.write(raw)
        except (ConnectionResetError, BrokenPipeError):
            pass

    def do_OPTIONS(self):
        if not self._origin_ok():
            return self._reply(403, {"error": "Origin not permitted"})
        if self.headers.get("Access-Control-Request-Private-Network", "").lower() not in ("", "true"):
            return self._reply(403, {"error": "Invalid private-network request"})
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.server.allowed_origin)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "120")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Vary", "Origin")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _authorized(self):
        if not self._origin_ok():
            self._reply(403, {"error": "Origin not permitted"})
            return False
        if not self._authenticated():
            self._reply(401, {"error": "Invalid pairing code"}, cors=True)
            return False
        return True

    def do_GET(self):
        if not self._authorized():
            return
        route = urlsplit(self.path).path
        if route == "/v1/report":
            return self._reply(200, self.server.coordinator.report(), cors=True)
        if route == "/v1/tasks":
            jobs = self.server.coordinator.recent(20)
            # Local filesystem paths, private source files and SHA hashes
            # must never be returned to a browser.
            safe = [
                {field: j[field] for field in ("id", "kind", "status", "prompt", "updated_at")}
                for j in jobs
            ]
            return self._reply(200, {"tasks": safe}, cors=True)
        return self._reply(404, {"error": "Unknown endpoint"}, cors=True)

    def do_POST(self):
        if not self._authorized():
            return
        if urlsplit(self.path).path != "/v1/tasks":
            return self._reply(404, {"error": "Unknown endpoint"}, cors=True)
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            return self._reply(415, {"error": "JSON required"}, cors=True)
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self._reply(400, {"error": "Invalid request size"}, cors=True)
        if not 0 < length <= MAX_BODY_BYTES:
            return self._reply(413, {"error": "Invalid request size"}, cors=True)
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            kind = body.get("kind")
            prompt = body.get("prompt")
            if kind not in ALLOWED_KINDS or not isinstance(prompt, str):
                raise ValueError("Only image, video or music task descriptions are accepted")
            task_id = self.server.coordinator.submit(kind, prompt)
        except (ValueError, UnicodeError, AttributeError, TypeError):
            return self._reply(400, {"error": "Invalid task description"}, cors=True)
        return self._reply(201, {"id": task_id, "status": "queued",
                                 "note": "Recorded only; no generation started"}, cors=True)


class LocalBridge:
    """Session-limited bridge. Never starts without a desktop user click."""

    def __init__(self, coordinator, port=8768, allowed_origin=ALLOWED_ORIGIN):
        self.coordinator = coordinator
        self.port = port
        self.allowed_origin = allowed_origin
        self.token = secrets.token_urlsafe(32)
        self._server = None
        self._thread = None

    def start(self):
        if self._server is not None:
            raise RuntimeError("Already started")
        server = _Server(("127.0.0.1", self.port), _Handler)
        server.coordinator = self.coordinator
        server.allowed_origin = self.allowed_origin
        server.pairing_token = self.token
        self._server = server
        self.port = server.server_address[1]
        self._thread = threading.Thread(target=server.serve_forever, daemon=True)
        self._thread.start()

    def stop(self):
        if self._server is not None:
            self._server.shutdown()
            self._server.server_close()
            self._thread.join(timeout=3)
            self._server = None
            self._thread = None
