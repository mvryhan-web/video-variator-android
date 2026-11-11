"""Small deterministic owner voice intents without any inference calls."""
import asyncio
from pathlib import Path
import sys
import tempfile
import unittest

from jarvis_new.action_first import identify, handle
from jarvis_new.coordinator import Coordinator
from jarvis_new.voiceos_tools import register_jarvix_tools

UPSTREAM = Path(__file__).resolve().parents[1] / "vendor" / "voiceos"


class ActionFirstTests(unittest.TestCase):
    def test_reports_and_media_intents(self):
        self.assertEqual(identify("Джарвис, что ты сегодня сделал?")[0],
                         "jarvix_new_task_report")
        self.assertEqual(identify("Jarvis, create one video of 20 seconds")[1]["kind"],
                         "video")
        self.assertEqual(identify("Создай одно изображение")[1]["kind"], "image")
        self.assertEqual(identify("Сделай музыку для ролика")[0], "ask_split")
        self.assertEqual(identify("Сожми фотографию")[0], "ask_photo")
        self.assertIsNone(identify("Не создавай видео"))
        self.assertIsNone(identify("Расскажи про фотоаппараты"))

    def test_end_to_end_voiceos_registry_action_first(self):
        with tempfile.TemporaryDirectory() as td:
            sys.path.insert(0, str(UPSTREAM))
            try:
                from tools.tool_registry import ToolRegistry, ToolConfig
                registry = ToolRegistry(ToolConfig(auto_discover=False))
                register_jarvix_tools(registry, Coordinator(Path(td) / "tasks.sqlite"))
                a = asyncio.run(handle("Создай одно видео", registry))
                b = asyncio.run(handle("Скажи, что ты сделал сегодня, отчитайся", registry))
                self.assertIn("ещё не запущена", a)
                self.assertIn("ожидают 1", b)
                self.assertIn("выполнено 0", b)
            finally:
                sys.path.remove(str(UPSTREAM))


if __name__ == "__main__":
    unittest.main()
