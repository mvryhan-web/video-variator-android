#!/usr/bin/env python3
"""Deploy JARVIX NEW preview to Cloudflare Pages branch jarvis-new ONLY.
Never touches production deepsyq.app or deepsyq-platform branch.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app" / "src" / "main" / "assets"
BUILD_DIR = ROOT / "dist_jarvis_new_preview"
CREDS_FILE = ROOT / "scripts" / ".cf_creds.json"

if not CREDS_FILE.exists():
    print(f"Error: Credentials file not found at {CREDS_FILE}")
    sys.exit(1)

with open(CREDS_FILE, encoding="utf-8") as f:
    creds = json.load(f)

env = os.environ.copy()
if "CLOUDFLARE_ACCOUNT_ID" in creds:
    env["CLOUDFLARE_ACCOUNT_ID"] = creds["CLOUDFLARE_ACCOUNT_ID"]
if "CLOUDFLARE_API_TOKEN" in creds:
    env["CLOUDFLARE_API_TOKEN"] = creds["CLOUDFLARE_API_TOKEN"]
if "CLOUDFLARE_API_KEY" in creds:
    env["CLOUDFLARE_API_KEY"] = creds["CLOUDFLARE_API_KEY"]
if "CLOUDFLARE_EMAIL" in creds:
    env["CLOUDFLARE_EMAIL"] = creds["CLOUDFLARE_EMAIL"]

print("1. Preparing isolated test preview tree...")
if BUILD_DIR.exists():
    shutil.rmtree(BUILD_DIR)
BUILD_DIR.mkdir(parents=True)

for item in ASSETS.iterdir():
    if item.name == "_worker.js":
        continue
    dest = BUILD_DIR / item.name
    if item.is_dir():
        shutil.copytree(item, dest)
    else:
        shutil.copy2(item, dest)

prep_script = ROOT / "scripts" / "prepare_jarvix_new_test_preview.py"
subprocess.run([sys.executable, str(prep_script), str(BUILD_DIR)], check=True)

worker_source = ROOT / "scripts" / "jarvix_new_preview_worker.js"
shutil.copy2(worker_source, BUILD_DIR / "_worker.js")

(BUILD_DIR / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
print("Preview tree prepared successfully.")

print("2. Deploying to Cloudflare Pages (branch: jarvis-new)...")
cmd = [
    "npx.cmd" if sys.platform == "win32" else "npx",
    "--yes",
    "wrangler@4.48.0",
    "pages",
    "deploy",
    str(BUILD_DIR),
    "--project-name=deepsyq",
    "--branch=jarvis-new",
    "--commit-message=Deploy JARVIX NEW sphere integration with voice and AI chat"
]

res = subprocess.run(cmd, env=env, cwd=str(ROOT))
if res.returncode != 0:
    print("Deployment failed!")
    sys.exit(res.returncode)

print("\nSUCCESS: Deployed JARVIX NEW to https://jarvis-new.deepsyq.pages.dev/")
