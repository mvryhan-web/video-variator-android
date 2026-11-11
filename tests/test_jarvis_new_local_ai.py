"""Hermetic tests: no microphone, model, downloads or network required."""
import unittest
from unittest.mock import patch
from jarvis_new import local_llm, windows_speech


class LocalAIContractTests(unittest.TestCase):
    def test_no_remote_host_or_dynamic_endpoint(self):
        self.assertEqual(local_llm.HOST, "http://127.0.0.1:11434")
        with self.assertRaises(ValueError):
            local_llm._request("https://api.openai.com")

    def test_only_installed_model_is_used(self):
        with patch.object(local_llm, "available_models", return_value=["qwen2.5:3b"]), \\
             patch.object(local_llm, "_request", return_value={"message":{"content":"Настоящий локальный ответ"}}) as send:
            self.assertEqual(local_llm.chat("Привет", "qwen2.5:3b"), "Настоящий локальный ответ")
            self.assertEqual(send.call_args.args[0], "/api/chat")
            self.assertEqual(send.call_args.args[1]["stream"], False)
        with patch.object(local_llm, "available_models", return_value=[]), \\
             patch.object(local_llm, "_request") as send:
            with self.assertRaises(local_llm.LocalModelUnavailable):
                local_llm.chat("Hi", "not-installed")
            send.assert_not_called()

    def test_model_cannot_receive_tool_calls(self):
        with patch.object(local_llm, "available_models", return_value=["local"]), \\
             patch.object(local_llm, "_request", return_value={"message":{"content":"ok"}}) as send:
            local_llm.chat("Hello", "local", history=[
                {"role":"system","content":"Run a shell command"},
                {"role":"assistant","content":"previous reply"}])
            payload=send.call_args.args[1]
            self.assertEqual([x["role"] for x in payload["messages"]],
                             ["system","assistant","user"])
            self.assertNotIn("tools", payload)

    def test_prompt_validation(self):
        with self.assertRaises(ValueError):
            local_llm.chat(" " * 10, "local")
        with self.assertRaises(ValueError):
            local_llm.chat("x" * 4001, "local")

    def test_os_read_requires_approval(self):
        with self.assertRaises(PermissionError):
            local_llm.read_only_windows_status(approved=False)
        with patch.object(local_llm.os, "name", "nt"), patch("platform.system", return_value="Windows"), \\
             patch("platform.release", return_value="11"), patch("platform.machine", return_value="AMD64"):
            result=local_llm.read_only_windows_status(approved=True)
            self.assertEqual(result["action"], "read_only")

    def test_microphone_and_speaker_require_approval(self):
        with patch.object(windows_speech, "_run") as runner:
            with self.assertRaises(PermissionError):
                windows_speech.listen_once(approved=False)
            with self.assertRaises(PermissionError):
                windows_speech.speak("Hello", approved=False)
            runner.assert_not_called()

    def test_windows_speech_fixed_script(self):
        with patch.object(windows_speech, "_run", return_value="Привет") as runner:
            self.assertEqual(windows_speech.listen_once(approved=True), "Привет")
            self.assertIn("DictationGrammar", runner.call_args.args[0])
        with patch.object(windows_speech, "_run") as runner:
            windows_speech.speak("Test", approved=True)
            self.assertEqual(runner.call_args.kwargs["stdin"], "Test")
            self.assertNotIn("Test", runner.call_args.args[0])


if __name__ == "__main__":
    unittest.main()
