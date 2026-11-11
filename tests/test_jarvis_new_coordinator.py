"""One small image/video/music simulated test, one real local photo compression."""
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from jarvis_new.coordinator import Coordinator, compress_one_photo, four_small_tests
from jarvis_new.studio_gateway import GatewayBlocked, StudioGateway


class CoordinatorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)

    def test_one_each_and_no_paid_requests(self):
        from PIL import Image  # present in the offline CI test environment
        result = four_small_tests(self.path)
        self.assertEqual(result["provider_requests"], 0)
        self.assertEqual([x["kind"] for x in result["results"]],
                         ["photo_compress", "image", "video", "music"])
        self.assertEqual([x["state"] for x in result["results"]],
                         ["completed", "simulated", "simulated", "simulated"])
        for item in result["results"]:
            self.assertGreater(item["bytes"], 50)
            self.assertEqual(len(item["sha256"]), 64)
            self.assertTrue((self.path / "results" / item["file"]).is_file())
        self.assertIn("offline", (self.path / "report.json").read_text())

    def test_owner_isolation_and_no_fake_completion(self):
        a = Coordinator(self.path / "jobs.db", owner="alpha")
        b = Coordinator(self.path / "jobs.db", owner="beta")
        jid = a.submit("video", "A test clip")
        with self.assertRaises(LookupError):
            b.get(jid)
        with self.assertRaises(ValueError):
            a.transition(jid, "completed")
        self.assertEqual(a.get(jid)["status"], "queued")

    def test_photo_original_is_preserved(self):
        from PIL import Image
        original = self.path / "photo.jpg"
        im = Image.new("RGB", (256, 256), "navy")
        im.save(original, quality=100)
        old = original.read_bytes()
        a = Coordinator(self.path / "db.sqlite")
        jid = a.submit("photo_compress", "Compress 1 selected photo", str(original))
        finished = compress_one_photo(a, jid, self.path / "output")
        self.assertEqual(finished["status"], "completed")
        self.assertEqual(original.read_bytes(), old)
        self.assertLess(Path(finished["output_path"]).stat().st_size, original.stat().st_size)
        with self.assertRaises(ValueError):
            a.transition(jid, "completed")


class GatewayTests(unittest.TestCase):
    def test_production_origin_blocked(self):
        for address in ("https://deepsyq.app", "https://evil.example.com",
                        "http://10.0.0.1:3000", "https://test.deepsyq.pages.dev.evil.com"):
            with self.assertRaises(GatewayBlocked):
                StudioGateway(address)

    def test_media_disabled_by_default_without_network(self):
        gateway = StudioGateway("http://127.0.0.1:3000", transport=lambda *a: self.fail("network"))
        with self.assertRaises(GatewayBlocked):
            gateway.prepare("video", "wan", "A video", env={})

    def test_preview_mode_is_refused(self):
        def preview(*args):
            return {"previewOnly": True, "outputMode": "local-demo",
                    "models": [{"id": "wan", "kind": "video", "enabled": True}]}
        gateway = StudioGateway("https://test.deepsyq.pages.dev", transport=preview)
        env = {"JARVIX_NEW_ALLOW_STUDIO_DISPATCH": "true",
               "JARVIX_NEW_MEDIA_FREE_QUOTA_VERIFIED": "true",
               "JARVIX_NEW_MEDIA_STOP_ON_EXHAUST_VERIFIED": "true",
               "JARVIX_NEW_MEDIA_MODEL_ALLOWLIST": "wan"}
        with self.assertRaisesRegex(GatewayBlocked, "demo"):
            gateway.prepare("video", "wan", "A video", env)

    def test_unlisted_model_never_calls_api(self):
        gateway = StudioGateway("http://localhost:3000", transport=lambda *a: self.fail("network"))
        env = {"JARVIX_NEW_ALLOW_STUDIO_DISPATCH": "true",
               "JARVIX_NEW_MEDIA_FREE_QUOTA_VERIFIED": "true",
               "JARVIX_NEW_MEDIA_STOP_ON_EXHAUST_VERIFIED": "true",
               "JARVIX_NEW_MEDIA_MODEL_ALLOWLIST": "qwen-image"}
        with self.assertRaisesRegex(GatewayBlocked, "allowlist"):
            gateway.prepare("video", "wan", "A video", env)


if __name__ == "__main__":
    unittest.main()
