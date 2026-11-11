"""Opt-in Windows System.Speech speech input/output for JARVIX NEW.

Uses Windows' installed recognizer and synthesizer. No network requests or
paid services; microphone recording only starts after the user clicks Listen.
No model downloads or hidden continuous listening.
"""
from __future__ import annotations

import os
import subprocess


class SpeechUnavailable(RuntimeError):
    pass


_RECOGNIZE = r"""
Add-Type -AssemblyName System.Speech
$recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
try {
  $recognizer.SetInputToDefaultAudioDevice()
  $recognizer.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
  $result = $recognizer.Recognize([TimeSpan]::FromSeconds(12))
  if ($null -eq $result) { exit 3 }
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  [Console]::Write($result.Text)
} finally { $recognizer.Dispose() }
"""
_SPEAK = r"""
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $text = [Console]::In.ReadToEnd()
  $synth.Speak($text)
} finally { $synth.Dispose() }
"""


def _run(script: str, *, stdin: str | None = None, timeout: int = 25) -> str:
    if os.name != "nt":
        raise SpeechUnavailable("Windows System.Speech is only available on Windows")
    try:
        result = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script],
            input=stdin, text=True, encoding="utf-8",
            capture_output=True, timeout=timeout, check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise SpeechUnavailable("Windows speech service unavailable or timed out") from error
    if result.returncode:
        raise SpeechUnavailable("Windows speech engine or language pack is unavailable")
    return result.stdout.strip()


def listen_once(*, approved: bool) -> str:
    if not approved:
        raise PermissionError("Explicit microphone approval required")
    return _run(_RECOGNIZE, timeout=20)


def speak(text: str, *, approved: bool) -> None:
    if not approved:
        raise PermissionError("Explicit speaker approval required")
    if not isinstance(text, str) or not text.strip() or len(text) > 8000:
        raise ValueError("Speech text must be 1–8000 characters")
    _run(_SPEAK, stdin=text, timeout=75)
