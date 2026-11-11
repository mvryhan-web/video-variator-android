"""Run the unmodified vendored VoiceOS with JARVIX NEW provider configuration.

No provider request is made by --check. An enabled Alibaba launch requires
explicit verified-free model and current Stop-on-Exhaust confirmation.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys

from .alibaba import ConfigurationBlocked, resolve_route, status

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "vendor" / "voiceos"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="jarvis-new")
    parser.add_argument("--check", action="store_true", help="Read-only offline configuration diagnostic")
    parser.add_argument("--provider", choices=("local", "alibaba"), default="local")
    parser.add_argument("--mode", choices=("cli", "voice", "hybrid"), default="hybrid")
    args = parser.parse_args(argv)
    if args.check:
        print(json.dumps({"source_present": (VENDOR / "main.py").is_file(),
                          "alibaba": status()}, ensure_ascii=False, sort_keys=True))
        return 0
    if not (VENDOR / "main.py").is_file():
        parser.error("Vendored VoiceOS source not found")
    env = dict(os.environ)
    if args.provider == "alibaba":
        try:
            env = resolve_route(env).voiceos_environment(env)
        except ConfigurationBlocked as error:
            parser.error(str(error))
    else:
        env.pop("OPENAI_API_KEY", None)
        env.pop("DASHSCOPE_API_KEY", None)
        env["LLM_PROVIDER"] = "local"
    os.chdir(VENDOR)
    os.execvpe(sys.executable, [sys.executable, "main.py", "--mode", args.mode], env)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
