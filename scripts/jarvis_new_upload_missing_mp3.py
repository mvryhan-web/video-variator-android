#!/usr/bin/env python3
"""Import only missing original JARVIX MP3 from the owner's ZIP into jarvis-new.

No generated audio, no renaming, no changes to already tracked MP3.
Run from an up-to-date authenticated checkout of the jarvis-new branch.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

BRANCH = "jarvis-new"
CLIPS = Path("app/src/main/assets/media/jarvix/clips")


def sha256_of_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def digest_zip_member(z: zipfile.ZipFile, member: zipfile.ZipInfo) -> tuple[str, bytes]:
    digest = hashlib.sha256()
    head = b""
    with z.open(member) as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            if not head:
                head = chunk[:3]
            digest.update(chunk)
    if not (head.startswith(b"ID3") or
            len(head) >= 2 and head[0] == 0xFF and head[1] & 0xE0 == 0xE0):
        raise ValueError(f"Not a valid-looking MP3 header: {member.filename}")
    return digest.hexdigest(), head


def git(repo: Path, *args: str) -> str:
    proc = subprocess.run(["git", *args], cwd=repo,
                          text=True, capture_output=True, encoding="utf-8", errors="replace")
    if proc.returncode:
        raise RuntimeError(f"git {' '.join(args[:3])} failed: {proc.stderr.strip()[:1500]}")
    return proc.stdout.strip()


def run() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", dest="zip_path", type=Path, required=True,
                        help="Path to the original 1900-MP3 ZIP archive")
    parser.add_argument("--repo", type=Path, default=Path.cwd(),
                        help="Existing Git checkout containing the jarvis-new branch")
    parser.add_argument("--apply", action="store_true", help="Write only missing MP3 to the checkout")
    parser.add_argument("--push", action="store_true", help="Commit and push newly added MP3 (requires --apply)")
    args = parser.parse_args()
    if args.push and not args.apply:
        parser.error("--push requires --apply")
    archive = args.zip_path.expanduser().resolve()
    repo = args.repo.expanduser().resolve()
    if not archive.is_file():
        parser.error(f"ZIP does not exist: {archive}")
    clips = repo / CLIPS
    manifest_path = clips / "manifest-500.json"
    if not manifest_path.is_file():
        parser.error(f"Manifest missing: {manifest_path}")
    if git(repo, "branch", "--show-current") != BRANCH:
        parser.error("Wrong Git branch. Must be jarvis-new; do not modify production.")
    if git(repo, "status", "--porcelain"):
        parser.error("Git checkout has uncommitted changes; clean/resolve them first without deleting any files.")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected_rows = manifest.get("clips", [])
    expected = {row["filename"]: row for row in expected_rows}
    if len(expected_rows) != 1900 or len(expected) != 1900:
        parser.error("Unexpected manifest. Expected 1900 distinct MP3 filenames.")

    with zipfile.ZipFile(archive) as z:
        members = [i for i in z.infolist() if not i.is_dir() and i.filename.lower().endswith(".mp3")]
        by_name = {}
        for member in members:
            basename = Path(member.filename.replace("\\", "/")).name
            if basename in by_name:
                raise RuntimeError(f"Duplicate file name in ZIP: {basename}")
            by_name[basename] = member
        absent = set(expected) - set(by_name)
        extras = set(by_name) - set(expected)
        if absent or extras:
            raise RuntimeError(f"ZIP/manifest mismatch: absent={len(absent)}, extra={len(extras)}; "
                               f"examples={list(sorted(absent))[:3]}/{list(sorted(extras))[:3]}")
        new_files = []
        existing = 0
        mismatches = []
        language_counts = {lang: 0 for lang in ("ru", "en", "fr", "es", "tour")}
        for name in sorted(expected):
            entry = expected[name]
            member = by_name[name]
            lang = entry.get("language")
            if lang not in language_counts:
                raise RuntimeError(f"Invalid language for {name}: {lang}")
            language_counts[lang] += 1
            if int(entry.get("size", -1)) != member.file_size:
                raise RuntimeError(f"Size mismatch for {name}: {member.file_size} vs manifest {entry.get('size')}")
            zip_digest, _ = digest_zip_member(z, member)
            dest = clips / name
            if dest.exists():
                if sha256_of_file(dest) != zip_digest:
                    mismatches.append(name)
                else:
                    existing += 1
            else:
                new_files.append((name, member))
        if mismatches:
            raise RuntimeError(f"Refusing to overwrite {len(mismatches)} existing MP3 with differing bytes: "
                               + ", ".join(mismatches[:8]))

        print("ZIP_VALIDATED", len(members), "MP3", "by_language", json.dumps(language_counts))
        print("ALREADY_PRESENT_IDENTICAL", existing)
        print("MISSING_TO_UPLOAD", len(new_files))
        if not args.apply:
            print("DRY_RUN_ONLY: pass --apply --push to upload to GitHub, after reviewing counts")
            return 0
        for name, member in new_files:
            dest = clips / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=dest.parent, suffix=".tmp", delete=False) as temporary:
                tmp = Path(temporary.name)
                with z.open(member) as source:
                    shutil.copyfileobj(source, temporary, length=1024 * 1024)
            tmp.replace(dest)
        print("COPIED_TO_CHECKOUT", len(new_files))

    if args.push and new_files:
        names = [str(CLIPS / name).replace("\\", "/") for name, _ in new_files]
        for index in range(0, len(names), 50):
            git(repo, "add", "--", *names[index:index + 50])
        staged = git(repo, "diff", "--cached", "--name-only").splitlines()
        if set(staged) != set(names):
            raise RuntimeError("Staging includes unrelated files; refusing to commit.")
        print("STAGED", len(staged))
        print(git(repo, "commit", "-m", f"assets(jarvis-new): add {len(new_files)} missing original voice MP3"))
        print(git(repo, "push", "origin", "HEAD:jarvis-new"))
        print("PUSH_SUCCEEDED", len(new_files), "MP3")
    elif args.push:
        print("ALREADY_COMPLETE: all 1900 MP3 exist; nothing to push")
    else:
        print("FILES_COPIED_BUT_NOT_PUSHED: --push was not supplied")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(run())
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError, zipfile.BadZipFile) as exc:
        print("ERROR:", str(exc), file=sys.stderr)
        sys.exit(1)
