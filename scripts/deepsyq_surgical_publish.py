#!/usr/bin/env python3
"""DEEPSYQ surgical Pages publisher: reuse the LIVE asset manifest, never a stale DEV site.

Cloudflare Pages deploys a release as a unit; this pipeline reconstructs exactly
the currently deployed assets, overlays only explicitly requested paths, and
re-deploys with the unchanged Worker. It is intentionally fail-closed.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1] / "app/src/main/assets"
API = "https://api.cloudflare.com/client/v4"
PROJECT = "deepsyq"
BRANCH = "deepsyq-platform"
DOMAIN = "https://deepsyq.app"
SPECIAL = ("_worker.js", "_worker.bundle", "_headers", "_redirects", "_routes.json")
FINANCIAL = ("pricing.html", "pricing-page.js", "pricing-page.css",
             "pricing-wallet.js", "pricing-wallet.css")
MAX_FILE_BYTES = 25 * 1024 * 1024

class Blocked(Exception):
    pass

def insist(condition, reason):
    if not condition:
        raise Blocked(reason)

def allowed_paths(value):
    result = []
    for token in value.split(","):
        name = token.strip()
        insist(name, "An empty allowed file path is not permitted")
        if name.startswith("app/src/main/assets/"):
            name = name[len("app/src/main/assets/"):]
        insist(not name.startswith(("/", "\\")), "Absolute paths are forbidden")
        insist("\\" not in name and "\x00" not in name, "Escaped paths are forbidden")
        parts = name.split("/")
        insist(all(p and p not in (".", "..") for p in parts), "Path traversal blocked")
        insist(all(not p.startswith(".") for p in parts), "Dotfiles cannot be published")
        insist(len(name) < 220, "Path too long")
        insist(parts[-1].lower() not in SPECIAL + FINANCIAL,
               "Worker/config/Pricing requires separate explicit owner workflow: " + name)
        insist((ROOT / name).is_file() and not (ROOT / name).is_symlink(),
               "Missing or symlinked asset: " + name)
        insist((ROOT / name).resolve().is_relative_to(ROOT.resolve()), "Asset escaped root")
        insist((ROOT / name).stat().st_size <= MAX_FILE_BYTES, "Asset too large: " + name)
        insist(name not in result, "Duplicate allowed asset: " + name)
        result.append(name)
    insist(1 <= len(result) <= 20, "Specify 1-20 exact paths, no wildcards")
    return result

def digest(raw, path):
    try:
        from blake3 import blake3
    except ImportError as error:
        raise Blocked("blake3 package unavailable") from error
    return blake3(raw + Path(path).suffix.lstrip(".").encode()).hexdigest()[:32]

def normalize_manifest(files):
    insist(isinstance(files, dict) and len(files) >= 100,
           "Missing or incomplete LIVE Pages asset manifest")
    result = {}
    for name, value in files.items():
        insist(isinstance(name, str) and name, "Invalid asset path")
        key = name if name.startswith("/") else "/" + name
        insist("\\" not in key and ".." not in key.split("/"), "Unsafe manifest path")
        insist(re.fullmatch(r"[0-9a-fA-F]{32}", value or "") is not None,
               "Unsupported LIVE hash format at " + key)
        insist(key not in result, "Duplicate normalized manifest key " + key)
        result[key] = value.lower()
    insist(len(result) <= 20000, "Pages manifest is over the limit")
    return result

def surgical_manifest(live, edits):
    updated = dict(live)
    changed = {}
    for path, new_hash in edits.items():
        key = "/" + path.lstrip("/")
        insist(key in live, "Cannot invent new route in an ordinary surgical patch: " + key)
        insist(re.fullmatch(r"[0-9a-f]{32}", new_hash), "Invalid candidate hash")
        if live[key] != new_hash:
            changed[key] = (live[key], new_hash)
            updated[key] = new_hash
    insist(all(updated[k] == h for k, h in live.items() if k not in changed),
           "Unauthorized manifest mutation")
    return updated, changed

def checked_git(*args):
    cmd = subprocess.run(["git", *args], text=True, capture_output=True)
    insist(cmd.returncode == 0, "Git source inspection failed: " + " ".join(args[:3]))
    return cmd.stdout.strip()

def verified_historical_asset(rel, expected_hash):
    """Recover only bytes independently proven identical to the LIVE asset hash.

    A Pages Worker or custom-domain HTML transformation can prevent retrieving
    original bytes over HTTP. Search existing Git blobs for an exact content-
    address match instead. Never substitute a merely similar historical file.
    """
    path = "app/src/main/assets/" + rel
    history = subprocess.run(["git", "log", "--all", "--format=%H", "--", path],
                             text=True, capture_output=True)
    insist(history.returncode == 0, "Could not verify historical asset: " + rel)
    for commit in dict.fromkeys(history.stdout.splitlines()[:300]):
        blob = subprocess.run(["git", "show", commit + ":" + path], capture_output=True)
        if (blob.returncode == 0 and len(blob.stdout) <= MAX_FILE_BYTES
                and digest(blob.stdout, rel) == expected_hash):
            return blob.stdout
    return None

def sha256(buf):
    return hashlib.sha256(buf).hexdigest()

class Cloudflare:
    def __init__(self):
        import requests
        self.session = requests.Session()
        self.account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
        self.token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
        insist(re.fullmatch(r"[a-f0-9]{32}", self.account) is not None,
               "CLOUDFLARE_ACCOUNT_ID absent")
        insist(bool(self.token), "CLOUDFLARE_API_TOKEN absent")
        self.session.headers["Authorization"] = "Bearer " + self.token

    def call(self, method, url, **kwargs):
        try:
            response = self.session.request(method, url, timeout=30, **kwargs)
        except Exception as error:
            raise Blocked("Cloudflare request failed: " + type(error).__name__) from error
        insist(response.ok, "HTTP " + str(response.status_code) + " on Cloudflare/live " +
               method + " " + url.split("?")[0])
        return response

    def json(self, route):
        response = self.call("GET", API + route)
        data = response.json()
        insist(data.get("success") is True and data.get("result") is not None,
               "Cloudflare API error on " + route)
        return data["result"]

    def read_live(self):
        prefix = "/accounts/" + self.account + "/pages/projects/" + PROJECT
        project = self.json(prefix)
        insist(project.get("name") == PROJECT and project.get("production_branch") == BRANCH,
               "Wrong Cloudflare project or production branch")
        canonical = project.get("canonical_deployment") or {}
        ident = canonical.get("id")
        insist(ident, "Current production deployment ID unavailable")
        deployment = self.json(prefix + "/deployments/" + ident)
        insist(deployment.get("id") == ident and deployment.get("uses_functions") is True,
               "LIVE deployment missing original Worker/Functions")
        live = normalize_manifest(deployment.get("files"))
        trigger = deployment.get("deployment_trigger") or canonical.get("deployment_trigger") or {}
        commit = (trigger.get("metadata") or {}).get("commit_hash")
        insist(re.fullmatch(r"[0-9a-f]{40}", commit or "") is not None,
               "LIVE production source commit unverified")
        worker_name = project.get("production_script_name")
        insist(isinstance(worker_name, str) and worker_name.startswith("pages-worker--") and
               worker_name.endswith("-production"), "Unknown production Worker")
        return ident, live, commit, worker_name, project

    def worker_settings(self, name):
        route = "/accounts/" + self.account + "/workers/scripts/" + quote(name, safe="") + "/settings"
        settings = self.json(route)
        insist(isinstance(settings, dict), "Cannot verify original Worker settings")
        return settings

    def live_asset(self, path):
        # Do not persist any credential or user content; publicly accessible assets only.
        return self.call("GET", DOMAIN + quote(path, safe="/") +
                         "?deepsyq_surgical_baseline=1",
                         headers={"Cache-Control": "no-cache"}).content

    def endpoint_status(self, path):
        response = self.call("GET", DOMAIN + path +
                             "?deepsyq_surgical_health=1",
                             headers={"Cache-Control": "no-cache"})
        return response.status_code

def special_snapshot(candidate_dir, original_dir):
    # Worker and special Pages routing configuration are copied only from
    # the canonical live deployment's Git commit, never from current DEV.
    for name in SPECIAL:
        src = original_dir / name
        dst = candidate_dir / name
        insist((src.exists() and dst.exists()) or (not src.exists() and not dst.exists()),
               "Special release config unexpectedly added or removed: " + name)
        if src.exists():
            insist(src.read_bytes() == dst.read_bytes(),
                   "Special release config changed: " + name)

def build_candidate(live, paths, production_commit, work):
    checked_git("cat-file", "-e", production_commit + "^{commit}")
    baseline = work / "baseline"
    checked_git("worktree", "add", "--detach", str(baseline), production_commit)
    original = baseline / "app/src/main/assets"
    insist(original.is_dir() and (original / "_worker.js").is_file(),
           "Cannot reconstruct original Worker source from live commit")
    stage = work / "stage" / "app/src/main/assets"
    stage.parent.mkdir(parents=True)
    shutil.copytree(original, stage)
    special_snapshot(stage, original)

    # Preserve the deployed files, not whichever changes happen to be in DEV.
    # Compare local Git baseline against the actual LIVE content-addressed manifest.
    expected_paths = {key.lstrip("/"): key for key in live}
    for local in list(stage.rglob("*")):
        if not local.is_file():
            continue
        rel = local.relative_to(stage).as_posix()
        if rel not in expected_paths and rel not in SPECIAL:
            local.unlink()  # historical Git-only file: never introduce to MAIN
    updated_from_live = 0
    for rel, key in expected_paths.items():
        insist(rel not in SPECIAL, "Unexpected special file in public asset manifest: " + rel)
        dst = stage / rel
        if dst.is_file() and digest(dst.read_bytes(), rel) == live[key]:
            continue
        # Only trust Cloudflare-served bytes when their hash matches the LIVE manifest.
        raw = cloudflare.live_asset("/" + rel)
        if digest(raw, rel) != live[key]:
            raw = verified_historical_asset(rel, live[key])
        insist(raw is not None and digest(raw, rel) == live[key],
               "Could not reproduce unchanged LIVE asset bytes: " + rel)
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_bytes(raw)
        updated_from_live += 1

    # Apply exactly the owner-requested files from the checked-out task revision.
    edited_bytes = {}
    for rel in paths:
        src = ROOT / rel
        dest = stage / rel
        insist(dest.is_file(), "Target is not part of the current LIVE site: " + rel)
        raw = src.read_bytes()
        dest.write_bytes(raw)
        edited_bytes[rel] = raw

    # Validate EVERY file. Unlisted assets must hash EXACTLY as the current
    # public deployment, even if the DEV branch contains unrelated code.
    found = set()
    edits = {}
    for f in stage.rglob("*"):
        if not f.is_file():
            continue
        rel = f.relative_to(stage).as_posix()
        if rel in SPECIAL:
            continue
        insist(rel in expected_paths, "Unexpected file would be published: " + rel)
        found.add(rel)
        hash_value = digest(f.read_bytes(), rel)
        if rel in paths:
            edits[rel] = hash_value
        else:
            insist(hash_value == live[expected_paths[rel]],
                   "Unrequested LIVE asset would change: " + rel)
    insist(found == set(expected_paths), "Pages candidate lost LIVE public assets")
    special_snapshot(stage, original)
    expected, changes = surgical_manifest(live, edits)
    return stage, expected, changes, updated_from_live, edited_bytes

def run_wrangle(stage, sha):
    cmd = ["npx", "--yes", "wrangler@4", "pages", "deploy", str(stage),
           "--project-name=" + PROJECT, "--branch=" + BRANCH,
           "--commit-hash=" + sha, "--commit-dirty=true",
           "--commit-message=Owner surgical-only approved asset patch; Worker preserved"]
    process = subprocess.run(cmd, text=True)
    insist(process.returncode == 0, "Wrangler deployment failed; inspect Cloudflare status")
    
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("plan", "publish"), required=True)
    parser.add_argument("--files", required=True, help="Comma-separated EXACT asset paths")
    parser.add_argument("--commit", default=os.environ.get("GITHUB_SHA", ""))
    args = parser.parse_args()
    paths = allowed_paths(args.files)
    sha = args.commit
    insist(args.mode != "publish" or re.fullmatch(r"[0-9a-f]{40}", sha),
           "Publish requires exact GitHub task commit")
    global cloudflare
    cloudflare = Cloudflare()
    live_id, live, origin, worker, project = cloudflare.read_live()
    checked_git("cat-file", "-e", origin + "^{commit}")
    # Never publish a changed or replaced Worker via a front-end-only patch.
    saved_worker = checked_git("rev-parse", origin + ":app/src/main/assets/_worker.js")
    task_worker = checked_git("rev-parse", "HEAD:app/src/main/assets/_worker.js")
    insist(saved_worker == task_worker,
           "DEV Worker differs from the deployed Worker; use approved backend release")
    settings = cloudflare.worker_settings(worker)
    # Preserve existing auth/payment/storage bindings without inspecting secrets.
    cfg = project.get("deployment_configs", {}).get("production", {})
    bindings = cfg.get("env_vars") or {}
    for name in ("DATABASE_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "GOOGLE_CLIENT_ID"):
        insist(name in bindings, "Production binding missing: " + name)
    cloudflare.endpoint_status("/api/config")
    with tempfile.TemporaryDirectory(prefix="deepsyq-surgical-") as temp:
        work = Path(temp)
        stage, candidate, changed, from_live, expected_bytes = build_candidate(
            live, paths, origin, work)
        if not changed:
            print(json.dumps({"status": "NO_CHANGE", "baseline": live_id,
                              "files": paths, "published": False}))
            return 0
        print(json.dumps({"status": "SURGICAL_PREFLIGHT_PASS", "baseline": live_id,
                          "allowed": sorted(changed), "other_assets_preserved": len(live)-len(changed),
                          "live_assets_recovered": from_live, "worker_sha": saved_worker[:12],
                          "published": False}))
        if args.mode == "plan":
            return 0

        current_id, _, _, current_worker, _ = cloudflare.read_live()
        insist(current_id == live_id and current_worker == worker,
               "Concurrent production update detected; no deploy")
        run_wrangle(stage, sha)
        # Do not claim success until new production, worker and all asset hashes agree.
        newest = None
        for _ in range(12):
            now, actual, _, script, _ = cloudflare.read_live()
            if now != live_id:
                newest = now
                insist(actual == candidate,
                       "NEW_DEPLOYMENT_ASSET_DIFFERS; urgent rollback/investigation")
                insist(script == worker, "NEW_DEPLOYMENT_WORKER_CHANGED")
                insist(cloudflare.worker_settings(script) == settings,
                       "NEW_DEPLOYMENT_BINDINGS_CHANGED")
                break
            time.sleep(3)
        insist(newest, "DEPLOYMENT_NOT_CONFIRMED_ON_MAIN")
        cloudflare.endpoint_status("/api/config")
        for rel, raw in expected_bytes.items():
            if "/" + rel not in changed:
                continue
            # Non-HTML resources have exact public byte representation; dynamic
            # HTML may be served via the existing Worker and can be normalized.
            content = cloudflare.live_asset("/" + rel)
            if rel.endswith((".js", ".css", ".json", ".svg")):
                insist(content == raw, "PUBLISHED_FILE_BYTES_DIFFER: " + rel)
            else:
                insist(len(content) > 0, "Published page not accessible: " + rel)
        print(json.dumps({"status": "PUBLISHED_VERIFIED", "deployment": newest,
                          "previous": live_id, "files": sorted(changed),
                          "all_other_assets_unchanged": True,
                          "worker_and_bindings_preserved": True, "published": True}))
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Blocked as error:
        print("BLOCKED_MAIN — NOT PUBLISHED (or verify rollback if deploy attempted): " +
              str(error), file=sys.stderr)
        raise SystemExit(2)
