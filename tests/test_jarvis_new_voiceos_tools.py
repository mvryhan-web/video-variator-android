"""Test real upstream VoiceOS tool registry with our isolated task adapter."""
import asyncio
from pathlib import Path
import sys
import tempfile
import unittest

from jarvis_new.coordinator import Coordinator
from jarvis_new.voiceos_tools import register_jarvix_tools

UPSTREAM = Path(__file__).resolve().parents[1] / "vendor" / "voiceos"


class VoiceOSRegistryTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.tmp = Path(self.dir.name)
        sys.path.insert(0, str(UPSTREAM))
        self.addCleanup(lambda: sys.path.remove(str(UPSTREAM)))

    def test_real_upstream_registry_receives_jarvix_tools(self):
        from tools.tool_registry import ToolRegistry, ToolConfig
        store = Coordinator(self.tmp / "journal.db", owner="owner-a")
        registry = ToolRegistry(ToolConfig(auto_discover=False))
        names = register_jarvix_tools(registry, store)
        self.assertEqual(set(names), {
            "jarvix_new_accept_task", "jarvix_new_task_report", "jarvix_new_task_status"
        })

        accepted = asyncio.run(registry.execute_tool(
            "jarvix_new_accept_task", {"kind": "video", "prompt": "One 5s clip"}
        ))
        self.assertEqual(accepted["status"], "queued")
        self.assertFalse(accepted["dispatched"])

        report = asyncio.run(registry.execute_tool("jarvix_new_task_report", {}))
        self.assertEqual(report["counts"]["queued"], 1)
        self.assertEqual(report["counts"]["completed"], 0)

        detail = asyncio.run(registry.execute_tool(
            "jarvix_new_task_status", {"job_id": accepted["id"]}
        ))
        self.assertEqual(detail["status"], "queued")

    def test_model_cannot_select_arbitrary_photo_path(self):
        from tools.tool_registry import ToolRegistry, ToolConfig
        registry = ToolRegistry(ToolConfig(auto_discover=False))
        register_jarvix_tools(registry, Coordinator(self.tmp / "journal.db"))
        denied = asyncio.run(registry.execute_tool("jarvix_new_accept_task",
                                                   {"kind": "photo_compress", "prompt": "/secret/file"}))
        self.assertFalse(denied["ok"])


if __name__ == "__main__":
    unittest.main()
