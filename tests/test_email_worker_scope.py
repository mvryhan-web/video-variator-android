import subprocess
import unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from email_worker_scope import verify_email_worker_only

ROOT=Path(__file__).resolve().parents[1]
WORKER=ROOT / "app/src/main/assets/_worker.js"
BEFORE_EMAIL_PATCH="0e947e06d9c7d6e97788272667b9b8d01280ff6c^:app/src/main/assets/_worker.js"

class EmailWorkerScopeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original=subprocess.check_output(["git","show",BEFORE_EMAIL_PATCH],cwd=ROOT)
        cls.candidate=WORKER.read_bytes()

    def test_email_only_diff_is_allowed(self):
        verify_email_worker_only(self.original,self.candidate)

    def test_google_oauth_change_is_rejected(self):
        tampered=self.candidate.replace(b"GOOGLE_AUTH_FAILED",b"GOOGLE_AUTH_BROKEN",1)
        self.assertNotEqual(tampered,self.candidate)
        with self.assertRaises(ValueError):
            verify_email_worker_only(self.original,tampered)

    def test_unrelated_worker_change_is_rejected(self):
        with self.assertRaises(ValueError):
            verify_email_worker_only(self.original,self.candidate+b"\n// unrelated change\n")

    def test_partial_email_patch_is_rejected(self):
        removed=self.candidate.replace(b"import {emailStorageReady,emailStorageDiagnostic,performEmailAuth} from '../../../../server/edge-email-auth.js';\n",b"",1)
        with self.assertRaises(ValueError):
            verify_email_worker_only(self.original,removed)

if __name__=="__main__":
    unittest.main()
