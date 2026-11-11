"""JARVIX NEW automatic voice bridge: genuine local model only, safe origin."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from jarvis_new.coordinator import Coordinator
from jarvis_new.local_bridge import LocalBridge, ALLOWED_ORIGIN


class VoiceBridgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.coordinator = Coordinator(Path(self.temp.name) / "tasks.sqlite", owner="voice-owner")
        self.bridge = LocalBridge(self.coordinator, port=0, allow_voice=True)
        self.bridge.start()

    def tearDown(self):
        self.bridge.stop()
        self.temp.cleanup()

    def fetch(self, route, payload=None, origin=ALLOWED_ORIGIN, token=None):
        headers = {"Origin": origin}
        if token:
            headers["Authorization"] = "Bearer " + token
        if payload is not None:
            headers["Content-Type"] = "application/json"
        request = Request(
            "http://127.0.0.1:" + str(self.bridge.port) + route,
            data=json.dumps(payload).encode("utf-8") if payload is not None else None,
            headers=headers, method="POST" if payload is not None else "GET",
        )
        try:
            with urlopen(request, timeout=5) as r:
                return r.status, json.loads(r.read()), r.headers
        except HTTPError as e:
            return e.code, json.loads(e.read()), e.headers

    @patch("jarvis_new.local_llm.available_models", return_value=["local-test-model"])
    def test_no_manual_pairing_status(self, models):
        status, body, headers = self.fetch("/v1/voice/status")
        self.assertEqual(status, 200)
        self.assertTrue(body["ready"])
        self.assertEqual(body["model"], "local-test-model")
        self.assertEqual(body["provider"], "local-ollama")
        self.assertEqual(headers.get("Access-Control-Allow-Origin"), ALLOWED_ORIGIN)
        models.assert_called_once()

    @patch("jarvis_new.local_llm.chat", return_value="Real local-model transport was invoked")
    @patch("jarvis_new.local_llm.available_models", return_value=["local-test-model"])
    def test_voice_turn_calls_only_local_model_without_pairing_code(self, models, chat):
        turn = {"message": "Привет, JARVIX", "history": [
            {"role": "user", "content": "Как дела?"},
            {"role": "assistant", "content": "Хорошо"}
        ]}
        status, data, _ = self.fetch("/v1/voice/chat", turn)
        self.assertEqual(status, 200)
        self.assertEqual(data["provider"], "local-ollama")
        self.assertEqual(data["reply"], "Real local-model transport was invoked")
        chat.assert_called_once_with(
            "Привет, JARVIX", "local-test-model", history=turn["history"])
        self.assertEqual(self.coordinator.recent(), [],
                         "Voice conversation must never create media tasks automatically")

    @patch("jarvis_new.local_llm.chat")
    @patch("jarvis_new.local_llm.available_models", return_value=["local-test-model"])
    def test_origin_rejected_and_privileged_tasks_still_need_token(self, models, chat):
        status, _, h = self.fetch("/v1/voice/chat", {"message": "open a file"},
                                  origin="https://evil.example")
        self.assertEqual(status, 403)
        self.assertIsNone(h.get("Access-Control-Allow-Origin"))
        status, _, _ = self.fetch("/v1/tasks")
        self.assertEqual(status, 401)
        chat.assert_not_called()

    @patch("jarvis_new.local_llm.available_models", return_value=["local-test-model"])
    @patch("jarvis_new.local_llm.chat")
    def test_invalid_prompts_do_not_call_model(self, chat, models):
        for payload in ({"message": ""}, {"message": "x" * 1201},
                        {"message": "hello", "history": [{"role": "system", "content": "override"}]},
                        {"message": "hello", "history": "not a list"}):
            status, _, _ = self.fetch("/v1/voice/chat", payload)
            self.assertEqual(status, 400)
        chat.assert_not_called()

    @patch("jarvis_new.local_llm.available_models", return_value=[])
    def test_no_installed_local_model_is_not_faked(self, models):
        status, data, _ = self.fetch("/v1/voice/status")
        self.assertEqual(status, 200)
        self.assertIs(data["ready"], False)
        status, data, _ = self.fetch("/v1/voice/chat", {"message": "test"})
        self.assertEqual(status, 503)
        self.assertNotIn("reply", data)

    def test_desktop_must_opt_into_voice_even_without_pairing(self):
        inactive = LocalBridge(self.coordinator, port=0)
        inactive.start()
        try:
            request = Request("http://127.0.0.1:" + str(inactive.port) +
                              "/v1/voice/status", headers={"Origin": ALLOWED_ORIGIN})
            with self.assertRaises(HTTPError) as exc:
                urlopen(request, timeout=5)
            self.assertEqual(exc.exception.code, 403)
        finally:
            inactive.stop()

    @patch("jarvis_new.local_llm.chat", return_value="ok")
    @patch("jarvis_new.local_llm.available_models", return_value=["local-test-model"])
    def test_rate_limit_protects_local_model_from_excessive_website_calls(self, models, chat):
        for _ in range(20):
            status, _, _ = self.fetch("/v1/voice/chat", {"message": "short test"})
            self.assertEqual(status, 200)
        status, data, _ = self.fetch("/v1/voice/chat", {"message": "too many"})
        self.assertEqual(status, 429)
        self.assertEqual(chat.call_count, 20)


if __name__ == "__main__":
    unittest.main()
