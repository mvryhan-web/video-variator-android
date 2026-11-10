#!/usr/bin/env python3
"""DEEPSYQ surgical Cloudflare Pages publisher. Never deploy a stale full-site snapshot.

Examples:
  python scripts/deepsyq_surgical_publish.py --mode plan --files "video-uniquifier.js"
  python scripts/deepsyq_surgical_publish.py --mode publish --files "video-uniquifier.js"

Uses current live Pages manifest as the base and replaces ONLY explicit file hashes.
Worker and special Cloudflare config must be read from/proven identical to LIVE.
Fail closed on missing permissions, unexpected manifests or concurrent deployments.
"""
import argparse
import base64
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import re
import sys
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
        insist("\\" not in name and "\x00" not in name,
               "Windows escapes and null bytes are forbidden")
        parts = name.split("/")
        insist(all(p and p not in (".", "..") for p in parts), "Path traversal blocked")
        insist(all(not p.startswith(".") for p in parts), "Dotfiles cannot be published")
        insist(len(name) < 220, "Path is too long")
        base = parts[-1].lower()
        insist(base not in SPECIAL and base not in FINANCIAL,
               "Protected Worker/Pages configuration or Pricing file: " + name)
        insist(not re.search(r"(?:^|/)(?:node_modules|\.github)/", name),
               "Non-site paths forbidden")
        insist((ROOT / name).is_file() and not (ROOT / name).is_symlink(),
               "Missing or symlinked requested asset: " + name)
        insist((ROOT / name).resolve().is_relative_to(ROOT.resolve()),
               "File escaped asset root")
        insist((ROOT / name).stat().st_size <= MAX_FILE_BYTES, "Asset too large: " + name)
        insist(name not in result, "Duplicate allowed asset: " + name)
        result.append(name)
    insist(1 <= len(result) <= 20, "Specify 1–20 exact paths; no wildcards")
    return result

def digest(raw, path):
    # Cloudflare Pages/Wrangler direct-upload key: BLAKE3(file bytes + extension).
    # Using the exact algorithm is mandatory; no guess/fallback to md5.
    try:
        from blake3 import blake3
    except ImportError as error:
        raise Blocked("Install the pinned blake3 package before release") from error
    suffix = Path(path).suffix.lstrip(".")
    return blake3(raw + suffix.encode("utf-8")).hexdigest()[:32]

def normalize_manifest(files):
    insist(isinstance(files, dict) and len(files) >= 100,
           "Unable to inspect complete current LIVE asset manifest")
    out = {}
    for name, value in files.items():
        insist(isinstance(name, str) and name, "Invalid manifest path")
        key = name if name.startswith("/") else "/" + name
        insist(".." not in key.split("/") and "\\" not in key, "Unsafe manifest path")
        insist(isinstance(value, str) and re.fullmatch(r"[0-9a-fA-F]{32}", value),
               "Unknown Cloudflare asset hash format: " + key)
        insist(key not in out, "Duplicate normalized live path: " + key)
        out[key] = value.lower()
    insist(len(out) <= 20000, "Cloudflare Pages manifest entry limit exceeded")
    return out

def surgical_manifest(live, edits):
    # No deletions and absolutely no changes to assets not explicitly authorized.
    updated = dict(live)
    changed = {}
    for path, new_hash in edits.items():
        key = "/" + path.lstrip("/")
        insist(key in live, "Path not present on LIVE; new route requires separate review: " + key)
        insist(re.fullmatch(r"[0-9a-f]{32}", new_hash), "Invalid new asset hash")
        if live[key] != new_hash:
            changed[key] = (live[key], new_hash)
            updated[key] = new_hash
    insist(len(updated) == len(live), "Asset count changed")
    insist(all(updated[k] == h for k, h in live.items() if k not in changed),
           "Unrequested asset changed")
    return updated, changed

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
            res = self.session.request(method, url, timeout=25, **kwargs)
        except Exception as error:
            raise Blocked("Cloudflare request failed: " + type(error).__name__) from error
        insist(res.ok, "Cloudflare HTTP " + str(res.status_code) + " on " +
               method + " " + url.split("?")[0] + " (never publish on failed reads)")
        return res

    def get_json(self, route):
        res = self.call("GET", API + route)
        data = res.json()
        insist(data.get("success") is True and data.get("result") is not None,
               "Cloudflare API rejected " + route)
        return data["result"]

    def read_live(self):
        prefix = "/accounts/" + self.account + "/pages/projects/" + PROJECT
        project = self.get_json(prefix)
        insist(project.get("name") == PROJECT and project.get("production_branch") == BRANCH,
               "Pages project or production branch mismatch")
        cid = (project.get("canonical_deployment") or {}).get("id")
        insist(isinstance(cid, str) and cid, "No canonical production deployment")
        deployment = self.get_json(prefix + "/deployments/" + cid)
        insist(deployment.get("id") == cid and deployment.get("uses_functions") is True,
               "LIVE Worker/Functions missing or deployment ID mismatch")
        manifest = normalize_manifest(deployment.get("files"))
        script = project.get("production_script_name")
        insist(isinstance(script, str) and script.startswith("pages-worker--") and
               script.endswith("-production"),
               "Unknown current production Worker name")
        return cid, manifest, script

    def live_worker(self, script):
        # A multipart bundled Worker cannot be safely passed as a raw script.
        path = "/accounts/" + self.account + "/workers/scripts/" + quote(script, safe="")
        response = self.call("GET", API + path + "/content/v2")
        mime = response.headers.get("Content-Type", "").split(";")[0].lower().strip()
        insist(mime in ("application/javascript", "text/javascript", "application/x-javascript"),
               "Live Worker source is not a single JavaScript file; need verified Worker bundle")
        raw = response.content
        insist(len(raw) > 1000 and len(raw) < MAX_FILE_BYTES, "Invalid live Worker bytes")
        insist(not raw.lstrip().startswith((b"<html", b"<!doctype", b"{\"errors\"")),
               "Unexpected Worker response")
        settings = self.get_json(path + "/settings")
        insist(isinstance(settings, dict), "Worker settings cannot be read")
        return raw, settings

    def upload_asset(self, content, path, new_hash):
        prefix = "/accounts/" + self.account + "/pages/projects/" + PROJECT
        upload = self.get_json(prefix + "/upload-token")
        jwt = upload.get("jwt") if isinstance(upload, dict) else upload
        insist(isinstance(jwt, str) and jwt, "Pages upload JWT missing")
        auth = {"Authorization": "Bearer " + jwt}
        missing = self.call("POST", API + "/pages/assets/check-missing",
                            headers=auth, json={"hashes": [new_hash]}).json()
        insist(missing.get("success") is True and isinstance(missing.get("result"), list),
               "Cannot verify Pages asset store")
        if new_hash in missing["result"]:
            mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
            item = {"key": new_hash, "value": base64.b64encode(content).decode("ascii"),
                    "base64": True, "metadata": {"contentType": mime}}
            data = self.call("POST", API + "/pages/assets/upload",
                             headers=auth, json=[item]).json()
            insist(data.get("success") is True, "Cloudflare rejected uploaded asset")
        data = self.call("POST", API + "/pages/assets/upsert-hashes",
                         headers=auth, json={"hashes": [new_hash]}).json()
        insist(data.get("success") is True, "Failed to register uploaded asset hash")
        return len(missing["result"]) == 1

    def deploy(self, manifest, worker, configs, sha):
        fields = {"manifest": json.dumps(manifest, ensure_ascii=False, separators=(",", ":")),
                  "branch": BRANCH, "commit_hash": sha, "commit_dirty": "true",
                  "commit_message": "Owner-approved surgical release: exact file allowlist"}
        uploads = {"_worker.js": ("_worker.js", worker, "application/javascript")}
        for name, content in configs.items():
            uploads[name] = (name, content, "text/plain")
        prefix = "/accounts/" + self.account + "/pages/projects/" + PROJECT
        response = self.call("POST", API + prefix + "/deployments",
                             data=fields, files=uploads)
        result = response.json()
        insist(result.get("success") is True and (result.get("result") or {}).get("id"),
               "Cloudflare did not confirm deployment creation")
        return result["result"]["id"]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("plan", "publish"), required=True)
    parser.add_argument("--files", required=True, help="EXACT comma-separated paths relative to assets")
    parser.add_argument("--commit", default=os.environ.get("GITHUB_SHA", ""))
    args = parser.parse_args()
    paths = allowed_paths(args.files)
    insist(args.mode != "publish" or bool(re.fullmatch("[0-9a-f]{40}", args.commit)),
           "Publish requires exact source commit SHA")
    cloudflare = Cloudflare()
    baseline_id, live, worker_name = cloudflare.read_live()
    edits, content = {}, {}
    for path in paths:
        raw = (ROOT / path).read_bytes()
        content[path] = raw
        edits[path] = digest(raw, path)
    updated, changed = surgical_manifest(live, edits)
    if not changed:
        print(json.dumps({"status": "NO_CHANGE", "baseline": baseline_id,
                          "allowed": paths, "published": False}, ensure_ascii=False))
        return 0

    # Calibrate hashing algorithm against an unchanged *served* static asset.
    # A wrong asset key could otherwise produce a successful but broken deployment.
    verified = False
    for path, oldhash in live.items():
        if path in changed or not path.endswith((".css", ".js", ".svg")):
            continue
        if len(path) > 180 or "% " in path:
            continue
        res = cloudflare.call("GET", DOMAIN + quote(path, safe="/") +
                             "?surgical_hash_probe=1", headers={"Cache-Control": "no-cache"})
        if digest(res.content, path) == oldhash:
            verified = True
            break
    insist(verified, "Cannot calibrate Wrangler BLAKE3 asset hash against LIVE; release blocked")

    # Must retrieve and preserve original Worker exact bytes and settings.
    worker, settings = cloudflare.live_worker(worker_name)

    # Existing special Pages config is never guessed or replaced from stale Git.
    configs = {}
    for name in ("_headers", "_redirects", "_routes.json"):
        p = "/" + name
        if p in live:
            local = ROOT / name
            insist(local.is_file(), "Missing special config in repository: " + name)
            raw = local.read_bytes()
            insist(digest(raw, name) == live[p],
                   "Local special config does not match LIVE: " + name)
            configs[name] = raw
        else:
            # An unverified special config could be dropped by a direct deployment.
            insist(not (ROOT / name).exists(),
                   "Cannot prove the current LIVE " + name +
                   " is absent. Obtain authoritative Pages deployment config first.")

    if args.mode == "plan":
        print(json.dumps({"status": "READY_TO_PUBLISH", "baseline": baseline_id,
                          "worker_source_readable": True, "worker_settings_readable": True,
                          "changed": sorted(changed), "unchanged": len(live) - len(changed),
                          "published": False}, ensure_ascii=False))
        return 0

    # No upload or deployment until *all* preflight checks have passed.
    now, _, current_worker = cloudflare.read_live()
    insist(now == baseline_id and current_worker == worker_name,
           "Concurrent production update detected before upload")
    for path in sorted(changed):
        cloudflare.upload_asset(content[path.lstrip("/")], path, edits[path.lstrip("/")])
    now, _, current_worker = cloudflare.read_live()
    insist(now == baseline_id and current_worker == worker_name,
           "Concurrent production update detected before deployment")
    deployment_id = cloudflare.deploy(updated, worker, configs, args.commit)
    # Never claim completed until Pages reports Worker and exact manifest.
    prefix = "/accounts/" + cloudflare.account + "/pages/projects/" + PROJECT
    result = cloudflare.get_json(prefix + "/deployments/" + deployment_id)
    insist(result.get("uses_functions") is True, "DEPLOYED_BUT_WORKER_MISSING: urgent rollback needed")
    result_manifest = normalize_manifest(result.get("files"))
    insist(result_manifest == updated, "DEPLOYED_BUT_ASSETS_DIFFER: urgent rollback needed")
    _, _, new_worker_name = cloudflare.read_live()
    new_settings = cloudflare.get_json("/accounts/" + cloudflare.account +
                                      "/workers/scripts/" + quote(new_worker_name, safe="") +
                                      "/settings")
    insist(new_settings == settings, "DEPLOYED_BUT_WORKER_BINDINGS_DIFFER: urgent investigation")
    for path in changed:
        res = cloudflare.call("GET", DOMAIN + quote(path, safe="/") +
                             "?surgical_verify=" + deployment_id,
                             headers={"Cache-Control": "no-cache"})
        insist(res.content == content[path.lstrip("/")],
               "DEPLOYED_BUT_LIVE_ASSET_DIFFERS: investigate/rollback")
    print(json.dumps({"status": "PUBLISHED_VERIFIED", "baseline": baseline_id,
                      "deployment_id": deployment_id, "files": sorted(changed),
                      "other_files_unchanged": True, "worker_preserved": True,
                      "published": True}, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Blocked as error:
        print("BLOCKED_MAIN — NOT PUBLISHED: " + str(error), file=sys.stderr)
        raise SystemExit(2)
