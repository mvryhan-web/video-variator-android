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
import time
from collections import deque
from urllib.parse import urlsplit, parse_qs

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

    def _voice_origin_allowed(self):
        # Read-only voice is auto-paired ONLY on localhost and ONLY for the
        # actual test preview origin. The browser still asks the human for
        # microphone and private-network access.
        if not self._origin_ok():
            self._reply(403, {"error": "Origin not permitted"})
            return False
        if not self.server.voice_enabled:
            self._reply(403, {"error": "Desktop voice bridge not enabled"}, cors=True)
            return False
        return True

    def _voice_model(self):
        from .local_llm import available_models, LocalModelUnavailable
        try:
            models = available_models()
        except LocalModelUnavailable:
            return None
        return next((value for value in models if isinstance(value, str) and value), None)

    def _voice_chat(self):
        if not self._voice_origin_allowed():
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            return self._reply(415, {"error": "JSON required"}, cors=True)
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self._reply(400, {"error": "Invalid request size"}, cors=True)
        if length <= 0 or length > MAX_BODY_BYTES:
            return self._reply(413, {"error": "Invalid request size"}, cors=True)
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            prompt = data.get("message")
            history = data.get("history", [])
            if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 1200:
                raise ValueError("Bad voice prompt")
            if not isinstance(history, list) or len(history) > 8:
                raise ValueError("Bad history")
            if any(not isinstance(row, dict) or row.get("role") not in ("user", "assistant")
                   or not isinstance(row.get("content"), str) or len(row["content"]) > 1200
                   for row in history):
                raise ValueError("Bad history entries")
        except (ValueError, TypeError, AttributeError, UnicodeError):
            return self._reply(400, {"error": "Invalid voice message"}, cors=True)
        with self.server.voice_lock:
            now = time.monotonic()
            while self.server.voice_calls and self.server.voice_calls[0] < now - 300:
                self.server.voice_calls.popleft()
            if len(self.server.voice_calls) >= 20:
                return self._reply(429, {"error": "Voice message rate limit"}, cors=True)
            self.server.voice_calls.append(now)
        if not self.server.voice_busy.acquire(blocking=False):
            return self._reply(429, {"error": "Voice model is processing the previous message"}, cors=True)
        try:
            model = self._voice_model()
            if not model:
                return self._reply(503, {"error": "No local Ollama model installed or running"}, cors=True)
            # The local_llm module enforces loopback-only Ollama and no
            # tools, shell, network services, OS access or paid providers.
            from .local_llm import chat, LocalModelUnavailable
            try:
                # The server-side owner journal—not untrusted browser input—
                # supplies the context. Automatically remembers conversations
                # after browser reloads on the SAME local computer.
                context = self.server.coordinator.voice_history(8)
                answer = chat(prompt, model, history=context)
            except LocalModelUnavailable:
                return self._reply(503, {"error": "Local Ollama model unavailable"}, cors=True)
            self.server.coordinator.record_voice_turn(prompt, answer)
            return self._reply(200, {"reply": answer, "provider": "local-ollama",
                                     "memory": "local-only"}, cors=True)
        finally:
            self.server.voice_busy.release()

    def _pair_request(self):
        # Never expose the privileged token until the actual desktop owner
        # explicitly approves this one-time browser request.
        if not self._origin_ok():
            return self._reply(403, {"error": "Origin not permitted"})
        if not self.server.voice_enabled:
            return self._reply(403, {"error": "Desktop bridge not enabled"}, cors=True)
        if self.headers.get("Content-Length", "0") not in ("", "0"):
            return self._reply(400, {"error": "Empty request body required"}, cors=True)
        now = time.monotonic()
        with self.server.pair_lock:
            expired = [key for key, row in self.server.pair_requests.items()
                       if row["expires"] <= now]
            for key in expired:
                del self.server.pair_requests[key]
            if len(self.server.pair_requests) >= 3:
                return self._reply(429, {"error": "Too many pending requests"}, cors=True)
            request_id = secrets.token_urlsafe(24)
            self.server.pair_requests[request_id] = {"state": "pending", "expires": now + 120}
        return self._reply(202, {"request_id": request_id, "expires_in": 120}, cors=True)

    def _pair_status(self):
        if not self._origin_ok():
            return self._reply(403, {"error": "Origin not permitted"})
        params = parse_qs(urlsplit(self.path).query)
        values = params.get("id", [])
        if len(values) != 1 or not (20 <= len(values[0]) <= 80):
            return self._reply(400, {"error": "Invalid pairing request"}, cors=True)
        with self.server.pair_lock:
            row = self.server.pair_requests.get(values[0])
            if row is None or row["expires"] <= time.monotonic():
                self.server.pair_requests.pop(values[0], None)
                return self._reply(404, {"error": "Pair request expired"}, cors=True)
            state = row["state"]
            if state == "approved":
                del self.server.pair_requests[values[0]]
                return self._reply(200, {"token": self.server.pairing_token}, cors=True)
            if state == "denied":
                del self.server.pair_requests[values[0]]
                return self._reply(403, {"error": "Desktop owner declined pairing"}, cors=True)
        return self._reply(202, {"status": "pending"}, cors=True)

    def do_GET(self):
        route = urlsplit(self.path).path
        if route == "/v1/pair/status":
            return self._pair_status()
        if route == "/v1/voice/status":
            if not self._voice_origin_allowed():
                return
            model = self._voice_model()
            return self._reply(200, {"ready": bool(model), "provider": "local-ollama",
                                     "model": model}, cors=True)
        if not self._authorized():
            return
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
        if urlsplit(self.path).path == "/v1/pair/request":
            return self._pair_request()
        if urlsplit(self.path).path == "/v1/voice/chat":
            return self._voice_chat()
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

    def __init__(self, coordinator, port=8768, allowed_origin=ALLOWED_ORIGIN, *, allow_voice=False):
        self.coordinator = coordinator
        self.port = port
        self.allowed_origin = allowed_origin
        self.allow_voice = bool(allow_voice)
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
        server.voice_enabled = self.allow_voice
        server.voice_calls = deque()
        server.voice_lock = threading.Lock()
        server.voice_busy = threading.Lock()
        server.pair_lock = threading.Lock()
        server.pair_requests = {}
        self._server = server
        self.port = server.server_address[1]
        self._thread = threading.Thread(target=server.serve_forever, daemon=True)
        self._thread.start()

    def pending_pair_requests(self):
        if self._server is None:
            return []
        with self._server.pair_lock:
            now = time.monotonic()
            pending = []
            for request_id, row in list(self._server.pair_requests.items()):
                if row["expires"] <= now:
                    del self._server.pair_requests[request_id]
                elif row["state"] == "pending":
                    row["state"] = "prompting"
                    pending.append(request_id)
            return pending

    def approve_pair_request(self, request_id, approved):
        if self._server is None:
            return False
        with self._server.pair_lock:
            row = self._server.pair_requests.get(request_id)
            if row is None or row["expires"] <= time.monotonic() or row["state"] != "prompting":
                return False
            row["state"] = "approved" if approved else "denied"
        return True

    def stop(self):
        if self._server is not None:
            self._server.shutdown()
            self._server.server_close()
            self._thread.join(timeout=3)
            self._server = None
            self._thread = None
