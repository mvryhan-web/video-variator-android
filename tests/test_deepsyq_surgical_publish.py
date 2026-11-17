import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / "scripts/deepsyq_surgical_publish.py"
spec = importlib.util.spec_from_file_location("surgical", MODULE)
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)

class SurgicalPublishTests(unittest.TestCase):
    def test_no_extraneous_manifest_keys(self):
        old = {"/a.js": "a" * 32, "/b.css": "b" * 32, "/index.html": "c" * 32}
        actual, changed = s.surgical_manifest(old, {"a.js": "d" * 32})
        self.assertEqual(changed, {"/a.js": ("a" * 32, "d" * 32)})
        self.assertEqual(actual["/b.css"], old["/b.css"])
        self.assertEqual(actual["/index.html"], old["/index.html"])
        self.assertEqual(old["/a.js"], "a" * 32)

    def test_missing_live_path_fails_closed(self):
        with self.assertRaises(s.Blocked):
            s.surgical_manifest({"/one.js": "a" * 32}, {"other.js": "b" * 32})

    def test_duplicate_and_invalid_manifest_fails_closed(self):
        with self.assertRaises(s.Blocked):
            s.normalize_manifest({"/x.js": "not-a-hash"} | {f"/{i}.js": "a" * 32 for i in range(100)})
        with self.assertRaises(s.Blocked):
            s.normalize_manifest({"../a.js": "a" * 32} | {f"/{i}.js": "b" * 32 for i in range(100)})

    def test_editing_same_file_repeatedly_allowed(self):
        first, _ = s.surgical_manifest({"/a.js": "a" * 32}, {"a.js": "b" * 32})
        second, changes = s.surgical_manifest(first, {"a.js": "c" * 32})
        self.assertEqual(second["/a.js"], "c" * 32)
        self.assertEqual(changes["/a.js"], ("b" * 32, "c" * 32))

    def test_protected_and_unrequested_paths(self):
        with tempfile.TemporaryDirectory() as root:
            root = Path(root)
            for f in ("index.html", "pricing.html", "_worker.js", "foo.js"):
                (root / f).write_bytes(b"payload")
            with patch.object(s, "ROOT", root):
                self.assertEqual(s.allowed_paths("index.html,foo.js"), ["index.html", "foo.js"])
                for name in ("pricing.html", "_worker.js", "../index.html", "/index.html",
                             "missing.html", "foo.js,foo.js", "foo.js,", "*.js"):
                    with self.subTest(name=name):
                        with self.assertRaises(s.Blocked):
                            s.allowed_paths(name)

    def test_symlink_not_allowed(self):
        with tempfile.TemporaryDirectory() as root:
            root = Path(root)
            (root / "real.js").write_bytes(b"ok")
            try:
                (root / "link.js").symlink_to(root / "real.js")
            except OSError:
                self.skipTest("Symlinks require unprivileged developer mode on Windows")
            with patch.object(s, "ROOT", root):
                with self.assertRaises(s.Blocked):
                    s.allowed_paths("link.js")

    def test_unchanged_candidate_is_noop(self):
        live = {"/a.js": "a" * 32}
        out, changes = s.surgical_manifest(live, {"a.js": "a" * 32})
        self.assertEqual(out, live)
        self.assertFalse(changes)

    def test_read_live_history_commit_fallback(self):
        cf = s.Cloudflare.__new__(s.Cloudflare)
        cf.account = "test-account"
        sample_commit = "2bfcaa3717cf280087db6925023f32ab11572b1a"
        def fake_json(route):
            if route == "/accounts/test-account/pages/projects/deepsyq":
                return {
                    "name": "deepsyq",
                    "production_branch": "deepsyq-platform",
                    "canonical_deployment": {"id": "dep-live", "url": "https://dep-live.deepsyq.pages.dev"},
                    "production_script_name": "pages-worker--123-production",
                }
            if route == "/accounts/test-account/pages/projects/deepsyq/deployments/dep-live":
                return {
                    "id": "dep-live",
                    "uses_functions": True,
                    "files": {f"/{i}.js": "a" * 32 for i in range(100)},
                    "deployment_trigger": {"metadata": {"commit_hash": ""}},
                }
            if route == "/accounts/test-account/pages/projects/deepsyq/deployments?per_page=15":
                return [
                    {"environment": "preview", "deployment_trigger": {"metadata": {"commit_hash": "1" * 40}}},
                    {"environment": "production", "deployment_trigger": {"metadata": {"commit_hash": sample_commit}}},
                ]
            raise AssertionError("Unexpected route: " + route)
        cf.json = fake_json
        with patch.object(s, "checked_git", return_value=""):
            ident, live, commit, worker_name, project = cf.read_live()
            self.assertEqual(ident, "dep-live")
            self.assertEqual(commit, sample_commit)
            self.assertEqual(worker_name, "pages-worker--123-production")

    def test_public_seo_release_only_exact_two_assets_may_reuse_live_hashes(self):
        pair = ["video-sur-mesure.html", "sitemap.xml"]
        self.assertTrue(s.allowed_hash_reuse(pair))
        self.assertTrue(s.allowed_hash_reuse(list(reversed(pair))))
        self.assertFalse(s.allowed_hash_reuse(["video-sur-mesure.html"]))
        self.assertFalse(s.allowed_hash_reuse(["sitemap.xml"]))
        self.assertFalse(s.allowed_hash_reuse(pair + ["index.html"]))

    def test_generation_no_confirm_release_scope_allowed(self):
        self.assertTrue(s.allowed_hash_reuse(["jarvix-chat.js", "jarvix-chat.html", "generate-studio.js"]))

    def test_fal_worker_scope_requires_fal_key_and_queue_markers(self):
        worker_text = (s.ROOT / "_worker.js").read_bytes()
        self.assertIn(b"queue.fal.run/", worker_text)
        self.assertIn(b"env.FAL_KEY", worker_text)
        self.assertIn(b"env.BYTEPLUS_API_KEY", worker_text)

    def test_model_picker_cleanup_scope_allowed(self):
        self.assertTrue(s.allowed_hash_reuse(["generate-models.js", "generate-studio.js", "deepsyq.js"]))

if __name__ == "__main__":
    unittest.main()
