"""Run upstream VoiceOS with JARVIX NEW tools injected at its registry boundary.

No fork of the 1,399-file upstream codebase. All tools preserve the owner's
task scope and use the existing VoiceOS ToolExecutor/PermissionEngine.
"""
from __future__ import annotations

import argparse
import asyncio
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = ROOT / "vendor" / "voiceos"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="jarvix-new-voiceos")
    parser.add_argument("--mode", choices=["cli", "hybrid", "voice"], default="hybrid")
    parser.add_argument("--llm-provider", choices=["local", "api"], default="local")
    args = parser.parse_args(argv)

    if not (UPSTREAM / "main.py").is_file():
        parser.error("Missing vendored VoiceOS main.py")
    os.chdir(UPSTREAM)
    sys.path.insert(0, str(UPSTREAM))

    # The VoiceOS bootstrap imports register_tools as a module-scope function.
    # Patch that narrow extension point before loading the main runtime.
    from core.runtime import bootstrap
    from jarvis_new.voiceos_tools import register_jarvix_tools
    original_register = bootstrap.register_tools

    def register_with_jarvix(*a, **kw):
        registry = original_register(*a, **kw)
        profile = kw.get("tool_profile")
        if profile is None and len(a) > 1:
            profile = a[1]
        if profile != "worker":
            register_jarvix_tools(registry)
        return registry

    bootstrap.register_tools = register_with_jarvix
    sys.argv = ["voiceos-main", "--mode", args.mode, "--llm-provider", args.llm_provider]

    from main import main as upstream_main
    asyncio.run(upstream_main())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
