#!/usr/bin/env python3
"""Import owner's 1900 MP3 from authenticated GitHub draft Release asset to jarvis-new.
Only missing MP3 are written. Existing tracked MP3 are compared by SHA-256.
No audio is renamed, synthesized, deleted, or approved for voice search.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import time
import zipfile

LANGS = ("ru", "en", "fr", "es", "tour")
REL = pathlib.Path("app/src/main/assets/media/jarvix/clips")
BRANCH = "jarvis-new"

def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()

def git(*argv, check=True):
    proc = subprocess.run(["git", *argv], capture_output=True, text=True)
    if check and proc.returncode:
        raise RuntimeError(f"git {' '.join(argv[:4])}: {proc.stderr[-2400:]}")
    return proc

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--zip", required=True, type=pathlib.Path)
    p.add_argument("--batch-size", type=int, default=200)
    args = p.parse_args()
    if not args.zip.is_file() or args.zip.stat().st_size != 310923328:
        raise RuntimeError("Draft Release ZIP missing or incorrect size (expected 310923328 bytes)")
    if not 1 <= args.batch_size <= 400:
        raise RuntimeError("Invalid batch size")
    if not (pathlib.Path(".git").exists() and (REL / "manifest-500.json").is_file()):
        raise RuntimeError("Run in repository checkout")
    git("fetch", "origin", BRANCH)
    git("checkout", "-B", BRANCH, "origin/" + BRANCH)
    if git("status", "--porcelain").stdout.strip():
        raise RuntimeError("Refusing to run on dirty checkout")

    manifest = json.loads((REL / "manifest-500.json").read_text(encoding="utf-8"))
    records = manifest.get("clips") or []
    expected = {x.get("filename"): x for x in records}
    if len(records) != 1900 or len(expected) != 1900:
        raise RuntimeError("Manifest must contain 1900 unique filenames")

    with zipfile.ZipFile(args.zip) as archive:
        member_map = {}
        for entry in archive.infolist():
            if entry.is_dir() or not entry.filename.lower().endswith(".mp3"):
                continue
            name = pathlib.PurePosixPath(entry.filename.replace("\\", "/")).name
            if name in member_map:
                raise RuntimeError("Duplicate filename in archive: " + name)
            member_map[name] = entry
        if set(member_map) != set(expected):
            raise RuntimeError(f"Archive filenames differ from manifest: missing={len(set(expected)-set(member_map))} extra={len(set(member_map)-set(expected))}")
        print("ARCHIVE_MATCHES_MANIFEST: 1900", flush=True)
        missing = []
        existing = []
        counts = dict.fromkeys(LANGS, 0)
        for name, row in sorted(expected.items()):
            lang = row.get("language")
            if lang not in counts:
                raise RuntimeError("Unknown language in manifest: " + str(lang))
            counts[lang] += 1
            info = member_map[name]
            if info.file_size != int(row.get("size", -1)):
                raise RuntimeError("Different size for " + name)
            payload = archive.read(info)
            if not (payload.startswith(b"ID3") or len(payload) > 1 and payload[0] == 255 and payload[1] & 224 == 224):
                raise RuntimeError("Invalid MP3 header: " + name)
            dest = REL / name
            if dest.exists():
                if sha_bytes(dest.read_bytes()) != sha_bytes(payload):
                    raise RuntimeError("Existing MP3 differs; refusing to overwrite: " + name)
                existing.append(name)
            else:
                missing.append(name)
        print(f"BEFORE_UPLOAD: existing={len(existing)} missing={len(missing)}, languages={counts}", flush=True)
        for start in range(0, len(missing), args.batch_size):
            batch = missing[start:start + args.batch_size]
            for name in batch:
                dest = REL / name
                if dest.exists():
                    raise RuntimeError("Unexpected file created in parallel: " + name)
                dest.write_bytes(archive.read(member_map[name]))
            paths = [(REL / name).as_posix() for name in batch]
            for i in range(0, len(paths), 100):
                git("add", "--", *paths[i:i+100])
            staged = git("diff", "--cached", "--name-only").stdout.strip().splitlines()
            if sorted(staged) != sorted(paths):
                raise RuntimeError("Staging contains unexpected changes; stop")
            git("config", "user.name", "github-actions[bot]")
            git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
            git("commit", "-m", f"assets(jarvis-new): import {len(batch)} original voice MP3 {start+1}-{start+len(batch)} of {len(missing)}")
            pushed = False
            for attempt in range(4):
                git("fetch", "origin", BRANCH)
                git("rebase", "origin/" + BRANCH)
                proc = git("push", "origin", "HEAD:" + BRANCH, check=False)
                if proc.returncode == 0:
                    pushed = True
                    break
                print(f"PUSH_RETRY {attempt+1}: {proc.stderr[-700:]}", flush=True)
                time.sleep(3)
            if not pushed:
                raise RuntimeError("Could not push batch after retries")
            print(f"PUSHED_BATCH: {start+len(batch)}/{len(missing)}, files_added={len(batch)}, commit={git('rev-parse','HEAD').stdout.strip()}", flush=True)
        git("fetch", "origin", BRANCH)
        remote = git("ls-tree", "-r", "--name-only", "origin/" + BRANCH, "--", REL.as_posix()).stdout
        remote_names = {pathlib.PurePosixPath(p).name for p in remote.splitlines() if p.endswith(".mp3")}
        absent = set(expected) - remote_names
        print(f"FINAL_REMOTE: expected=1900 present={len(set(expected)&remote_names)} missing={len(absent)}", flush=True)
        if absent:
            raise RuntimeError(f"After push {len(absent)} MP3 still missing. First: {sorted(absent)[:5]}")
        print("SUCCESS_ALL_1900_MP3_IN_JARVIS_NEW", flush=True)

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("IMPORT_FAILED:", str(error), file=sys.stderr, flush=True)
        raise
