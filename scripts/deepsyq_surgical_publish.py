#!/usr/bin/env python3
"""DEEPSYQ surgical Pages publisher: reuse the LIVE asset manifest, never a stale DEV site.

Cloudflare Pages deploys a release as a unit; this pipeline reconstructs exactly
the currently deployed assets, overlays only explicitly requested paths, and
re-deploys with the unchanged Worker. It is intentionally fail-closed.
"""
import argparse
import base64
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
from email_worker_scope import verify_email_worker_only

ROOT = Path(__file__).resolve().parents[1] / "app/src/main/assets"
API = "https://api.cloudflare.com/client/v4"
PROJECT = "deepsyq"
BRANCH = "deepsyq-platform"
DOMAIN = "https://deepsyq.app"
SPECIAL = ("_worker.js", "_worker.bundle", "_headers", "_redirects", "_routes.json")
FINANCIAL = ("pricing.html", "pricing-page.js", "pricing-page.css",
             "pricing-wallet.js", "pricing-wallet.css")
MAX_FILE_BYTES = 25 * 1024 * 1024
# For each explicitly approved release scope below, reuse canonical LIVE hashes
# for all untouched assets when Cloudflare cannot reproduce a live /404.html byte-for-byte.
# This never permits changing more assets than the exact requested allowlist.
HASH_REUSE_RELEASE_SETS = (
    frozenset({"jarvix-guided-tour.js", "jarvix-tour-choreography.js"}),
    frozenset({"ai-apps.html", "canvas.html", "free-tools.html", "sitemap.xml"}),
    frozenset({"compare-ai.html", "simple-background-remover.html", "teleprompter.html"}),
    frozenset({"photo-collage.html"}),
    frozenset({"generate-studio.html"}),
    frozenset({"smart-reminders.html", "mobile-utility.html"}),
    frozenset({"design-gallery.html", "telegram-free-mini.html"}),
    frozenset({"audio-studio.html", "avatar-studio.html"}),
    frozenset({"jarvix.html"}),
    frozenset({"deepsyq-i18n.js"}),
    frozenset({"jarvix-chat.js"}),
    frozenset({"auth-email.js", "auth-email.css"}),
    frozenset({"auth-email.css"}),
    frozenset({"auth-email.js", "auth-email.css", "jarvix-chat.js"}),
)

def allowed_hash_reuse(paths):
    return frozenset(paths) in HASH_REUSE_RELEASE_SETS

def pages_asset_mime(path):
    return {".js": "application/javascript", ".html": "text/html", ".css": "text/css",
            ".xml": "application/xml", ".mp3": "audio/mpeg", ".json": "application/json"}.get(Path(path).suffix, "application/octet-stream")

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

def surgical_manifest(live, edits, new_voice_assets=()):
    updated = dict(live)
    changed = {}
    for path, new_hash in edits.items():
        key = "/" + path.lstrip("/")
        insist(key in live or path in new_voice_assets, "Cannot invent new route in an ordinary surgical patch: " + key)
        insist(re.fullmatch(r"[0-9a-f]{32}", new_hash), "Invalid candidate hash")
        if live.get(key) != new_hash:
            changed[key] = (live.get(key), new_hash)
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
        attempts = 5 if method == "GET" else 1
        for attempt in range(attempts):
            try:
                response = self.session.request(method, url, timeout=30, **kwargs)
            except Exception as error:
                raise Blocked("Cloudflare request failed: " + type(error).__name__) from error
            if response.status_code not in (502, 503, 504) or attempt == attempts - 1:
                break
            time.sleep(2 ** (attempt + 1))
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
        from urllib.parse import urlparse
        pinned = deployment.get("url") or canonical.get("url") or ""
        host = urlparse(pinned).hostname or ""
        self.pinned_url = pinned.rstrip("/") if (
            pinned.startswith("https://") and host.endswith(".deepsyq.pages.dev")) else None
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

    def live_asset(self, path, stamp="1"):
        # Use a unique deployment-specific query during post-publish checks so
        # cached responses from the previous deployment cannot appear current.
        insist(re.fullmatch(r"[A-Za-z0-9_-]{1,128}", str(stamp)) is not None,
               "Invalid asset verification stamp")
        return self.call("GET", DOMAIN + quote(path, safe="/") +
                         "?deepsyq_surgical_baseline=" + str(stamp),
                         headers={"Cache-Control": "no-cache", "Accept-Encoding": "identity"}).content

    def endpoint_status(self, path):
        response = self.call("GET", DOMAIN + path +
                             "?deepsyq_surgical_health=1",
                             headers={"Cache-Control": "no-cache"})
        return response.status_code

    def restore_baseline(self, baseline_id, baseline_files, deployed_id):
        """Roll back only our own deployment; never overwrite another publisher."""
        prefix = "/accounts/" + self.account + "/pages/projects/" + PROJECT
        current = self.json(prefix).get("canonical_deployment", {}).get("id")
        insist(current == deployed_id,
               "Concurrent deployment detected; automatic rollback intentionally skipped")
        self.call("POST", API + prefix + "/deployments/" + baseline_id + "/rollback")
        for _ in range(18):
            now = self.json(prefix).get("canonical_deployment", {}).get("id")
            files = self.json(prefix + "/deployments/" + now).get("files") if now else None
            if files == baseline_files:
                print("BASELINE_ROLLBACK_VERIFIED", now)
                return
            time.sleep(2)
        raise Blocked("AUTOMATIC_ROLLBACK_NOT_CONFIRMED")

    def tour_manifest_deploy(self, candidate, assets, sha, worker, origin, chat_worker=None, voice_release=False, email_worker=False):
        """Tour-only Pages upload: unchanged routes reuse canonical LIVE hashes.

        Fetch the *currently deployed* Worker payload rather than recompiling
        or modifying it. Never publish if its exact original bytes cannot be
        retrieved in a Cloudflare-supported worker upload format.
        """
        insist(chat_worker is not None or voice_release or allowed_hash_reuse(assets),
               "Only the exact owner-approved surgical release sets can reuse LIVE hashes")
        keyed = {digest(raw, rel): (rel, raw) for rel, raw in assets.items()}
        for key, (rel, _) in keyed.items():
            insist(candidate.get("/" + rel) == key, "Tour hash is not in candidate manifest")
        hashes = sorted(keyed)
        api_prefix = API + "/accounts/" + self.account + "/pages/projects/" + PROJECT
        if hashes:
            token = self.json("/accounts/" + self.account +
                              "/pages/projects/" + PROJECT + "/upload-token").get("jwt")
            insist(isinstance(token, str) and token, "Pages asset upload token unavailable")
            jwt_headers = {"Authorization": "Bearer " + token}
            for offset in range(0, len(hashes), 20):
                batch = hashes[offset:offset + 20]
                check = self.call("POST", API + "/pages/assets/check-missing",
                                  headers=jwt_headers, json={"hashes": batch}).json()
                insist(check.get("success") is True and
                       isinstance(check.get("result"), list) and
                       set(check["result"]).issubset(set(batch)), "Cannot verify tour asset upload status")
                if check["result"]:
                    upload = self.call("POST", API + "/pages/assets/upload",
                                       headers=jwt_headers,
                                       json=[{"key": key, "base64": True,
                                              "metadata": {"contentType": pages_asset_mime(keyed[key][0])},
                                              "value": base64.b64encode(keyed[key][1]).decode("ascii")}
                                             for key in check["result"]]).json()
                    insist(upload.get("success") is True, "Cloudflare tour asset upload failed")
                registered = self.call("POST", API + "/pages/assets/upsert-hashes",
                                       headers=jwt_headers, json={"hashes": batch}).json()
                insist(registered.get("success") is True,
                       "Cloudflare tour asset hash registration failed")
                confirmed = False
                for attempt in range(8):
                    after = self.call("POST", API + "/pages/assets/check-missing",
                                      headers=jwt_headers, json={"hashes": batch}).json()
                    insist(after.get("success") is True and
                           isinstance(after.get("result"), list),
                           "Cloudflare tour asset verification malformed")
                    if after["result"] == []:
                        confirmed = True
                        break
                    time.sleep(1)
                insist(confirmed, "Tour asset not confirmed in Pages asset store")

        endpoint = API + "/accounts/" + self.account + "/workers/scripts/" + quote(worker, safe="")
        try:
            if chat_worker is not None:
                raise Blocked("Verified chat Worker update")
            worker_response = self.call("GET", endpoint)
            mime = worker_response.headers.get("Content-Type", "").lower()
            content = worker_response.content
            insist(100 <= len(content) <= MAX_FILE_BYTES, "Worker bytes are not verifiable")
            if mime.startswith("multipart/form-data"):
                worker_field = "_worker.bundle"
            elif "javascript" in mime:
                worker_field = "_worker.js"
            else:
                raise Blocked("Original Worker format unsupported; no production deployment")
        except Blocked as error:
            # Pages-managed Workers may not expose their code through the
            # standard Workers download endpoint. Bundle ONLY the exact
            # canonical production commit, never current DEV imports.
            insist(chat_worker is not None or "HTTP 404 on Cloudflare/live GET " + endpoint in str(error),
                   "Worker download failed for an unexpected reason; no deployment")
            with tempfile.TemporaryDirectory(prefix="deepsyq-worker-original-") as work:
                baseline = Path(work) / "baseline"
                checked_git("worktree", "add", "--detach", str(baseline), origin)
                source = baseline / "app/src/main/assets/_worker.js"
                insist(source.is_file(), "Canonical Worker source missing")
                if chat_worker is not None:
                    source.write_bytes(chat_worker)
                if email_worker:
                    module = ROOT.parents[3] / "server/edge-email-auth.js"
                    insist(module.is_file(), "Isolated Email auth module missing")
                    module_dst = baseline / "server/edge-email-auth.js"
                    shutil.copyfile(module, module_dst)
                output = Path(work) / "canonical-worker.js"
                bundle_cmd = ["npx", "--yes", "esbuild@0.25.12", str(source),
                              "--bundle", "--format=esm", "--platform=browser",
                              "--target=es2022", "--outfile=" + str(output)]
                if email_worker:
                    # Cloudflare's 2026-11 Worker compatibility date supports node:crypto.
                    # Keep the builtins external instead of bundling arbitrary polyfills.
                    bundle_cmd.extend(["--external:node:crypto",
                                       "--external:node:buffer",
                                       "--external:node:util"])
                bundle = subprocess.run(bundle_cmd, text=True, capture_output=True)
                insist(bundle.returncode == 0 and output.is_file(),
                       "Canonical Worker bundling failed; no production deployment")
                content = output.read_bytes()
            insist(100 <= len(content) <= MAX_FILE_BYTES,
                   "Canonical Worker bundle exceeds safe bounds")
            worker_field, mime = "_worker.js", "application/javascript"
        files = {worker_field: (worker_field, content, mime)}
        # Mirror the canonical LIVE source routing metadata, never HEAD.
        for special in ("_headers", "_redirects", "_routes.json"):
            obj = subprocess.run(["git", "show",
                                  origin + ":app/src/main/assets/" + special],
                                 capture_output=True)
            if obj.returncode == 0:
                insist(len(obj.stdout) <= MAX_FILE_BYTES, "Special config too large")
                files[special] = (special, obj.stdout, "application/octet-stream")
        form = {"branch": BRANCH, "commit_hash": sha, "commit_dirty": "true",
                "commit_message": "JARVIX chat latency Worker update" if chat_worker is not None else "Surgical asset update, unchanged Worker",
                "manifest": json.dumps(candidate, separators=(",", ":"))}
        response = self.call("POST", api_prefix + "/deployments",
                             data=form, files=files).json()
        insist(response.get("success") is True and
               isinstance((response.get("result") or {}).get("id"), str),
               "Direct Pages manifest deployment was rejected")
        return response["result"]["id"]

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
        if digest(raw, rel) != live[key] and cloudflare.pinned_url:
            # Deployment-specific Pages URL can bypass custom-domain transforms.
            # Accept only the exact immutable hash from the canonical manifest.
            try:
                pinned = cloudflare.session.get(
                    cloudflare.pinned_url + quote("/" + rel, safe="/") +
                    "?deepsyq_surgical_baseline=1", timeout=30,
                    headers={"Cache-Control": "no-cache", "Accept-Encoding": "identity"})
                if pinned.ok and digest(pinned.content, rel) == live[key]:
                    raw = pinned.content
            except Exception:
                pass
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
    parser.add_argument("--chat-worker", action="store_true")
    parser.add_argument("--email-worker", action="store_true")
    parser.add_argument("--new-voice", action="store_true")
    args = parser.parse_args()
    insist(not args.new_voice or not args.chat_worker and not args.files, "Voice release scope is fixed")
    insist(not args.chat_worker or not args.files, "Chat Worker release cannot include assets")
    insist(not args.email_worker or not args.chat_worker and not args.new_voice and not args.files,
           "Email auth Worker release cannot include other Worker or asset changes")
    paths = [] if args.chat_worker or args.email_worker or args.new_voice else allowed_paths(args.files)
    voice_sources = {}
    if args.new_voice:
        tracked = checked_git("ls-files", "app/src/main/assets/media/jarvix/clips", "app/src/main/assets/media/jarvix/conversation").splitlines()
        paths = ["jarvis-core.js", "jarvix-chat.js", "jarvix-new-voice.js",
                 "jarvix-new-recorded-dialog.js", "jarvix-new-smalltalk.js",
                 "jarvix-new-physical-audio-index.json",
                 "media/jarvix/clips/reviewed-scenarios.json"]
        for path in tracked:
            rel = path.removeprefix("app/src/main/assets/")
            if rel.startswith("media/jarvix/conversation/") or rel.endswith(".mp3"):
                voice_sources[rel] = None
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
    chat_worker = None
    if args.chat_worker:
        insist(live_id == "542e763c-feb8-4d6f-9312-53f18f904c02" or saved_worker == task_worker,
               "Production baseline moved; verify the live Worker before release")
        if saved_worker == task_worker:
            insist(origin == sha, "Worker already matches an unexpected release")
            print("CHAT_WORKER_ALREADY_PUBLISHED", live_id)
            return 0
        path = "app/src/main/assets/_worker.js"
        old = subprocess.check_output(["git", "show", origin + ":" + path])
        chat_worker = (ROOT / "_worker.js").read_bytes()
        start = b"      let replyText = '';"
        new_start = b"      const greeting = "
        end = b"      let action = null;"
        insist(old.split(start, 1)[0] == chat_worker.split(new_start, 1)[0] and
               old.split(end, 1)[1] == chat_worker.split(end, 1)[1],
               "Worker diff extends beyond chat provider handling")
    elif args.email_worker:
        # The candidate must reverse exactly to the canonical LIVE Worker;
        # Google login route remains byte-for-byte identical.
        source_path = "app/src/main/assets/_worker.js"
        original_worker = subprocess.check_output(["git", "show", origin + ":" + source_path])
        candidate_worker = (ROOT / "_worker.js").read_bytes()
        try:
            verify_email_worker_only(original_worker, candidate_worker)
        except ValueError as error:
            raise Blocked("EMAIL_WORKER_SCOPE_BLOCKED: " + str(error)) from error
        chat_worker = candidate_worker
    else:
        insist(saved_worker == task_worker,
               "DEV Worker differs from the deployed Worker; use approved backend release")
    settings = cloudflare.worker_settings(worker)
    if args.email_worker:
        insist(str(settings.get("compatibility_date") or "") >= "2026-08-04",
               "Email Worker requires supported node:crypto scrypt runtime")
        required = {"DATABASE_URL":"secret_text", "JARVIX_QUOTA_HASH_SECRET":"secret_text"}
        bindings = {entry.get("name"): entry.get("type") for entry in settings.get("bindings", [])
                    if isinstance(entry, dict)}
        for name,kind in required.items():
            insist(bindings.get(name) == kind, "Email auth production secret missing: " + name)
    # Preserve existing auth/payment/storage bindings without inspecting secrets.
    cfg = project.get("deployment_configs", {}).get("production", {})
    bindings = cfg.get("env_vars") or {}
    for name in ("DATABASE_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "GOOGLE_CLIENT_ID"):
        insist(name in bindings, "Production binding missing: " + name)
    cloudflare.endpoint_status("/api/config")
    with tempfile.TemporaryDirectory(prefix="deepsyq-surgical-") as temp:
        work = Path(temp)
        # The normal reconstruction path preserves exact public bytes. If
        # Cloudflare rewrites a non-targeted HTML asset such as /404.html,
        # the tour-only escape hatch preserves the original LIVE manifest
        # by hash rather than guessing content or changing unrelated routes.
        try:
            if args.chat_worker or args.email_worker or args.new_voice:
                raise Blocked("Use unchanged production asset manifest")
            stage, candidate, changed, from_live, expected_bytes = build_candidate(
                live, paths, origin, work)
            direct_manifest = False
        except Blocked as error:
            insist(args.chat_worker or args.email_worker or args.new_voice or (allowed_hash_reuse(paths) and
                   str(error).startswith("Could not reproduce unchanged LIVE asset bytes:")),
                   str(error))
            expected_bytes = {rel: (ROOT / rel).read_bytes() for rel in paths}
            if args.new_voice:
                expected_bytes.update({rel: (ROOT / rel).read_bytes() for rel in voice_sources if "/" + rel not in live})
            candidate, changed = surgical_manifest(live, {
                rel: digest(raw, rel) for rel, raw in expected_bytes.items()}, 
                expected_bytes if args.new_voice else ())
            from_live = 0
            stage = None
            direct_manifest = True
        if not changed and not args.chat_worker and not args.email_worker:
            # A previous Pages deployment can have committed both new hashes
            # while its first public read was served from an older edge cache.
            # Verify the actual bytes for every requested asset before declaring
            # the already-live release complete. No deployment is performed.
            verified = []
            for rel in paths:
                raw = (ROOT / rel).read_bytes()
                insist(live.get("/" + rel) == digest(raw, rel),
                       "LIVE_MANIFEST_DOES_NOT_MATCH_REQUEST: " + rel)
                ok = False
                for attempt in range(12):
                    token = live_id.replace("-", "") + "-check-" + str(attempt)
                    if cloudflare.live_asset("/" + rel, token) == raw:
                        ok = True
                        break
                    time.sleep(2)
                insist(ok, "LIVE_PUBLIC_FILE_STILL_STALE: " + rel)
                verified.append("/" + rel)
            cloudflare.endpoint_status("/api/config")
            print(json.dumps({"status": "PUBLISHED_VERIFIED", "deployment": live_id,
                              "files": verified, "already_live": True,
                              "unchanged_asset_count": len(live)-len(verified),
                              "worker_preserved": True, "published": True}))
            return 0
        print(json.dumps({"status": "SURGICAL_PREFLIGHT_PASS", "baseline": live_id,
                          "allowed": sorted(changed), "other_assets_preserved": len(live)-len(changed),
                          "live_assets_recovered": from_live, "worker_sha": saved_worker[:12],
                          "manifest_reuse": bool(direct_manifest), "published": False}))
        if args.mode == "plan":
            return 0

        current_id, _, _, current_worker, _ = cloudflare.read_live()
        insist(current_id == live_id and current_worker == worker,
               "Concurrent production update detected; no deploy")
        if direct_manifest:
            deployed_id = cloudflare.tour_manifest_deploy(candidate, expected_bytes, sha, worker, origin, chat_worker, args.new_voice, args.email_worker)
        else:
            run_wrangle(stage, sha)
            deployed_id = None
        # New production is rolled back automatically if any safety check fails.
        newest = None
        try:
            for _ in range(12):
                now, actual, deployed_commit, script, _ = cloudflare.read_live()
                if now != live_id:
                    newest = now
                    insist(not deployed_id or newest == deployed_id, "Concurrent deployment detected")
                    insist(not (args.chat_worker or args.email_worker) or deployed_commit == sha, "Unexpected Worker release commit")
                    insist(actual == candidate, "NEW_DEPLOYMENT_ASSET_DIFFERS")
                    insist(script == worker, "NEW_DEPLOYMENT_WORKER_CHANGED")
                    new_settings = cloudflare.worker_settings(script)
                    def semantically_ordered(x):
                        result = dict(x)
                        bs = result.get("bindings")
                        if isinstance(bs, list):
                            normalized = []
                            for item in bs:
                                if not isinstance(item, dict):
                                    normalized.append(item)
                                    continue
                                entry = dict(item)
                                # Cloudflare generates these immutable deployment metadata
                                # text bindings anew each time; all other bindings must match.
                                if (entry.get("type") == "plain_text" and
                                    entry.get("name") in ("CF_PAGES_COMMIT_SHA", "CF_PAGES_URL")):
                                    entry["text"] = "<deployment-generated>"
                                normalized.append(entry)
                            result["bindings"] = sorted(normalized, key=lambda v: json.dumps(v, sort_keys=True))
                        return result
                    if semantically_ordered(new_settings) != semantically_ordered(settings):
                        diff_keys = sorted(key for key in set(settings) | set(new_settings)
                                           if settings.get(key) != new_settings.get(key))
                        def names_types(x):
                            bs = x.get("bindings") if isinstance(x,dict) else None
                            if not isinstance(bs,list): return []
                            return sorted(str(b.get("name","")) + ":" + str(b.get("type","")) for b in bs if isinstance(b,dict))
                        def field_changes(before, after):
                            bs = before.get("bindings") if isinstance(before,dict) else None
                            cs = after.get("bindings") if isinstance(after,dict) else None
                            if not isinstance(bs,list) or not isinstance(cs,list):return ["unknown"]
                            out=[]
                            bb={str(v.get("name")):v for v in bs if isinstance(v,dict)}
                            cc={str(v.get("name")):v for v in cs if isinstance(v,dict)}
                            for name in sorted(set(bb)|set(cc)):
                                left,right=bb.get(name,{}),cc.get(name,{})
                                fields=sorted(k for k in set(left)|set(right) if left.get(k)!=right.get(k))
                                if fields:out.append({"name":name,"changed_fields":fields})
                            return out
                        print("WORKER_CHANGED_FIELD_NAMES", json.dumps(diff_keys))
                        print("WORKER_BINDINGS_SHAPE_MATCH", names_types(settings) == names_types(new_settings))
                        print("WORKER_BINDING_CHANGED_FIELD_NAMES_ONLY", json.dumps(field_changes(settings,new_settings)))
                        raise Blocked("NEW_DEPLOYMENT_BINDINGS_CHANGED")
                    break
                time.sleep(3)
            insist(newest, "DEPLOYMENT_NOT_CONFIRMED_ON_MAIN")
        except (Blocked, Exception):
            current, _, _, _, _ = cloudflare.read_live()
            if newest and current == newest and (not deployed_id or newest == deployed_id):
                cloudflare.restore_baseline(live_id, live, newest)
            elif deployed_id and current == deployed_id:
                cloudflare.restore_baseline(live_id, live, deployed_id)
            raise
        try:
            cloudflare.endpoint_status("/api/config")
            if args.email_worker:
                # Production must actually reach the existing account table.
                # Fail closed and roll back the new Worker if credentials or schema
                # are unavailable, rather than exposing a nonworking Email login.
                ready = False
                for attempt in range(8):
                    response = cloudflare.session.get(
                        DOMAIN + "/api/auth/email/status?email_release=" +
                        newest.replace("-", "") + "-" + str(attempt),
                        headers={"Cache-Control":"no-store"}, timeout=20)
                    if response.ok:
                        payload = response.json()
                        if payload.get("configured") is True:
                            ready = True
                            break
                    time.sleep(2)
                insist(ready, "EMAIL_STORAGE_NOT_READY_POST_DEPLOY")
                print("EMAIL_STORAGE_READY_POST_DEPLOY", newest)
            public_checks = expected_bytes
            if args.new_voice:
                audio = [rel for rel in expected_bytes if rel.endswith(".mp3")]
                public_checks = {rel: raw for rel, raw in expected_bytes.items() if not rel.endswith(".mp3")}
                if audio:
                    public_checks[audio[0]] = expected_bytes[audio[0]]
            for rel, raw in public_checks.items():
                if "/" + rel not in changed:
                    continue
                matched = False
                for attempt in range(10):
                    content = cloudflare.live_asset("/" + rel,
                        newest.replace("-", "") + "-" + str(attempt))
                    if rel.endswith((".js", ".css", ".json", ".svg", ".mp3")):
                        matched = content == raw
                    else:
                        matched = len(content) > 0
                    if matched:
                        break
                    time.sleep(2)
                insist(matched, "PUBLISHED_FILE_BYTES_DIFFER: " + rel)
        except Exception:
            current, _, _, _, _ = cloudflare.read_live()
            if current == newest:
                cloudflare.restore_baseline(live_id, live, newest)
            raise
        print(json.dumps({"status": "PUBLISHED_VERIFIED", "deployment": newest,
                          "previous": live_id, "files": sorted(changed),
                          "all_other_assets_unchanged": True,
                          "worker_and_bindings_preserved": not (args.chat_worker or args.email_worker), "bindings_preserved": True, "published": True}))
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Blocked as error:
        print("BLOCKED_MAIN — NOT PUBLISHED (or verify rollback if deploy attempted): " +
              str(error), file=sys.stderr)
        raise SystemExit(2)
