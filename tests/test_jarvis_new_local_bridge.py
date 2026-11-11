"""Loopback bridge must be opt-in, authenticated, same-origin and no-cost."""
import json
from pathlib import Path
import tempfile
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from jarvis_new.coordinator import Coordinator
from jarvis_new.local_bridge import LocalBridge, ALLOWED_ORIGIN


class LocalBridgeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.coordinator = Coordinator(Path(self.tmp.name) / "tasks.sqlite", owner="test-owner")
        self.bridge = LocalBridge(self.coordinator, port=0)
        self.bridge.start()
        self.base = "http://127.0.0.1:" + str(self.bridge.port)

    def tearDown(self):
        self.bridge.stop()
        self.tmp.cleanup()

    def request(self, path, method="GET", data=None, origin=ALLOWED_ORIGIN, token=True, content_type=True):
        headers = {"Origin": origin}
        if token:
            headers["Authorization"] = "Bearer " + self.bridge.token
        if content_type:
            headers["Content-Type"] = "application/json"
        request = Request(self.base + path, data=data, headers=headers, method=method)
        try:
            with urlopen(request, timeout=5) as response:
                raw = response.read()
                return response.status, dict(response.headers), json.loads(raw) if raw else {}
        except HTTPError as error:
            return error.code, dict(error.headers), json.loads(error.read())

    def test_report_and_queue(self):
        code, headers, report = self.request("/v1/report")
        self.assertEqual(code, 200)
        self.assertEqual(report["counts"]["queued"], 0)
        self.assertEqual(headers.get("Access-Control-Allow-Origin"), ALLOWED_ORIGIN)
        payload = json.dumps({"kind": "image", "prompt": "one test image"}).encode("utf-8")
        code, _, result = self.request("/v1/tasks", method="POST", data=payload)
        self.assertEqual(code, 201)
        self.assertEqual(result["status"], "queued")
        self.assertIn("no generation", result["note"])
        code, _, jobs = self.request("/v1/tasks")
        self.assertEqual(code, 200)
        self.assertEqual(len(jobs["tasks"]), 1)
        self.assertNotIn("input_path", jobs["tasks"][0])
        self.assertNotIn("sha256", jobs["tasks"][0])

    def test_rejects_unknown_origin_and_bad_token(self):
        self.assertEqual(self.request("/v1/report", origin="https://evil.example")[0], 403)
        self.assertEqual(self.request("/v1/report", token=False)[0], 401)
        code, _, _ = self.request("/v1/tasks", method="POST", data=b'{"kind":"photo_compress","prompt":"x"}')
        self.assertEqual(code, 400)

    def test_private_network_preflight(self):
        code, headers, _ = self.request("/v1/report", method="OPTIONS", token=False)
        self.assertEqual(code, 204)
        self.assertEqual(headers.get("Access-Control-Allow-Private-Network"), "true")
        code, _, _ = self.request("/v1/report", method="OPTIONS",
                                  origin="https://evil.example", token=False)
        self.assertEqual(code, 403)


if __name__ == "__main__":
    unittest.main()
