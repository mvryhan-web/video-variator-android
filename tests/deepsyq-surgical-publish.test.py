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
            (root / "link.js").symlink_to(root / "real.js")
            with patch.object(s, "ROOT", root):
                with self.assertRaises(s.Blocked):
                    s.allowed_paths("link.js")

    def test_unchanged_candidate_is_noop(self):
        live = {"/a.js": "a" * 32}
        out, changes = s.surgical_manifest(live, {"a.js": "a" * 32})
        self.assertEqual(out, live)
        self.assertFalse(changes)

if __name__ == "__main__":
    unittest.main()
