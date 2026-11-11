"""Persistent, permission-conscious task coordinator for JARVIX NEW.

This is an isolated foundation, NOT a replacement for the production chat.
It does real local photo compression and explicitly labelled offline media
simulations. No paid calls, no browser session impersonation, no auto-deploy.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import sqlite3
import struct
import subprocess
import tempfile
import uuid
import wave

KINDS = frozenset(("photo_compress", "image", "video", "music"))
TERMINAL = frozenset(("completed", "simulated", "blocked", "failed"))
LIMIT_MB = 50


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def checksum(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(128 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


class Coordinator:
    """SQLite-backed, per-owner task journal; no network or provider dependencies."""

    def __init__(self, database: Path, owner: str = "local-owner") -> None:
        if not owner or len(owner) > 128:
            raise ValueError("An explicit nonempty owner scope is required")
        self.database = Path(database).expanduser().resolve()
        self.database.parent.mkdir(parents=True, exist_ok=True)
        self.owner = owner
        with self._connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    owner TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    status TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    input_path TEXT,
                    output_path TEXT,
                    sha256 TEXT,
                    detail TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS jobs_owner_created ON jobs(owner, created_at);
                CREATE TABLE IF NOT EXISTS voice_turns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    owner TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    recorded_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS voice_owner_id ON voice_turns(owner, id);
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT NOT NULL,
                    owner TEXT NOT NULL,
                    event TEXT NOT NULL,
                    recorded_at TEXT NOT NULL
                );
            """)

    @contextmanager
    def _connect(self):
        # sqlite3.Connection.__exit__ commits but DOES NOT close the connection.
        # Windows locks the .db file until close(), breaking app restarts/tests.
        db = sqlite3.connect(str(self.database), timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def voice_history(self, limit: int = 8) -> list[dict]:
        """Return recent spoken exchanges for this owner (same PC only).

        Never synchronizes to Cloudflare or any hosted account. Raw microphone
        audio is not retained; only locally recognized text + model replies.
        """
        take = max(1, min(30, int(limit)))
        with self._connect() as db:
            rows = db.execute(
                "SELECT role, content FROM voice_turns WHERE owner=? "
                "ORDER BY id DESC LIMIT ?", (self.owner, take)
            ).fetchall()
        return [{"role": row["role"], "content": row["content"]}
                for row in reversed(rows)]

    def record_voice_turn(self, prompt: str, reply: str) -> None:
        """Atomically remember a verified Ollama answer with its user question."""
        if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 1200:
            raise ValueError("Invalid local voice prompt")
        if not isinstance(reply, str) or not reply.strip() or len(reply) > 8000:
            raise ValueError("Invalid local voice reply")
        moment = now()
        with self._connect() as db:
            db.executemany(
                "INSERT INTO voice_turns(owner,role,content,recorded_at) "
                "VALUES(?,?,?,?)",
                [(self.owner, "user", prompt, moment),
                 (self.owner, "assistant", reply, moment)]
            )

    def submit(self, kind: str, prompt: str, source: str | None = None) -> str:
        if kind not in KINDS:
            raise ValueError("Unsupported kind: " + str(kind))
        if not prompt.strip() or len(prompt) > 4000:
            raise ValueError("Prompt is required and must be at most 4000 characters")
        job_id = "jn_" + uuid.uuid4().hex[:20]
        time = now()
        with self._connect() as db:
            db.execute(
                """INSERT INTO jobs(id,owner,kind,status,prompt,input_path,created_at,updated_at)
                   VALUES(?,?,?,?,?,?,?,?)""",
                (job_id, self.owner, kind, "queued", prompt, source, time, time),
            )
            db.execute("INSERT INTO events(job_id,owner,event,recorded_at) VALUES(?,?,?,?)",
                       (job_id, self.owner, "queued", time))
        return job_id

    def get(self, job_id: str) -> dict:
        with self._connect() as db:
            r = db.execute("SELECT * FROM jobs WHERE id=? AND owner=?", (job_id, self.owner)).fetchone()
        if r is None:
            raise LookupError("Unknown job in this owner scope")
        return dict(r)

    def transition(self, job_id: str, status: str, detail: str = "",
                   output: Path | None = None) -> dict:
        if status not in ("processing", *TERMINAL):
            raise ValueError("Invalid state")
        current = self.get(job_id)
        if current["status"] in TERMINAL:
            raise ValueError("Terminal jobs are immutable")
        if current["status"] == "queued" and status not in ("processing", "blocked", "failed"):
            raise ValueError("Jobs must be started before completion")
        if status in ("completed", "simulated"):
            if not output or not output.is_file() or output.stat().st_size == 0:
                raise ValueError("A verified output file is required")
            digest = checksum(output)
        else:
            digest = None
        time = now()
        with self._connect() as db:
            db.execute(
                """UPDATE jobs SET status=?, detail=?, output_path=?, sha256=?, updated_at=?
                   WHERE id=? AND owner=? AND status=?""",
                (status, detail[:1000], str(output.resolve()) if output else None,
                 digest, time, job_id, self.owner, current["status"]),
            )
            if db.total_changes != 1:
                raise RuntimeError("Concurrent job update detected")
            db.execute("INSERT INTO events(job_id,owner,event,recorded_at) VALUES(?,?,?,?)",
                       (job_id, self.owner, status, time))
        return self.get(job_id)

    def recent(self, limit: int = 20) -> list[dict]:
        with self._connect() as db:
            rows = db.execute(
                "SELECT * FROM jobs WHERE owner=? ORDER BY created_at DESC LIMIT ?",
                (self.owner, max(1, min(int(limit), 100))),
            ).fetchall()
        return [dict(r) for r in rows]

    def report(self) -> dict:
        jobs = self.recent(100)
        stats = {status: sum(1 for j in jobs if j["status"] == status)
                 for status in ("queued", "processing", "completed", "simulated", "blocked", "failed")}
        return {"owner": self.owner, "jobs_in_recent_window": len(jobs),
                "counts": stats,
                "last_updates": [
                    {"id": j["id"], "kind": j["kind"], "status": j["status"],
                     "detail": j["detail"] or "", "updated_at": j["updated_at"]}
                    for j in jobs[:5]
                ]}


def compress_one_photo(coordinator: Coordinator, job_id: str, destination: Path) -> dict:
    """Actually compress one selected image; originals are never deleted."""
    job = coordinator.get(job_id)
    if job["kind"] != "photo_compress" or not job["input_path"]:
        raise ValueError("A photo-compress job and explicit source path are required")
    coordinator.transition(job_id, "processing", "Opening selected input photo")
    try:
        from PIL import Image, ImageOps
        source = Path(job["input_path"]).expanduser().resolve(strict=True)
        if not source.is_file() or source.stat().st_size > LIMIT_MB * 1024 * 1024:
            raise ValueError("Input must be an image file at most 50 MB")
        destination = Path(destination).expanduser().resolve()
        destination.mkdir(parents=True, exist_ok=True)
        suffix = ".png" if source.suffix.lower() == ".png" else ".jpg"
        output = destination / (source.stem + "-compressed" + suffix)
        if output.resolve() == source:
            raise ValueError("Cannot overwrite the source file")
        if output.exists():
            raise FileExistsError("Output already exists; source will be preserved")
        with Image.open(source) as im:
            im.verify()
        with Image.open(source) as im:
            img = ImageOps.exif_transpose(im)
            if suffix == ".png":
                img.save(output, format="PNG", optimize=True)
            else:
                if img.mode not in ("RGB", "L"):
                    img = img.convert("RGB")
                save_kwargs = {"format": "JPEG", "quality": 65, "optimize": True}
                if im.info.get("icc_profile"):
                    save_kwargs["icc_profile"] = im.info["icc_profile"]
                exif = img.getexif()
                if exif:
                    save_kwargs["exif"] = exif.tobytes()
                img.save(output, **save_kwargs)
        with Image.open(output) as verification:
            verification.verify()
        if output.stat().st_size >= source.stat().st_size:
            output.unlink(missing_ok=True)
            raise ValueError("Compression did not reduce this photo; original unchanged")
        detail = (f"Compressed {source.stat().st_size} to {output.stat().st_size} bytes "
                  f"({round(100 * (1-output.stat().st_size/source.stat().st_size))}% saved)")
        return coordinator.transition(job_id, "completed", detail, output)
    except Exception as exc:
        coordinator.transition(job_id, "failed", f"Local photo compression: {exc}")
        raise


def make_simulated_media(coordinator: Coordinator, job_id: str, target: Path) -> dict:
    """Exercise file, format and progress handling. NEVER claim AI generation."""
    job = coordinator.get(job_id)
    kind = job["kind"]
    if kind not in ("image", "video", "music"):
        raise ValueError("This simulator handles image, video and music only")
    coordinator.transition(job_id, "processing", "OFFLINE SIMULATION ONLY")
    target = Path(target).expanduser().resolve()
    target.mkdir(parents=True, exist_ok=True)
    try:
        if kind == "image":
            from PIL import Image, ImageDraw
            output = target / (job_id + "-SIMULATED.png")
            im = Image.new("RGB", (320, 240), (38, 44, 57))
            pen = ImageDraw.Draw(im)
            pen.rectangle((26, 28, 294, 212), outline="white", width=2)
            pen.text((34, 88), "SIMULATED TEST IMAGE", fill="white")
            pen.text((34, 112), "NO AI MODEL WAS CALLED", fill="white")
            im.save(output)
            with Image.open(output) as verified:
                verified.verify()
        elif kind == "video":
            exe = shutil.which("ffmpeg")
            if not exe:
                try:
                    from imageio_ffmpeg import get_ffmpeg_exe
                    exe = get_ffmpeg_exe()
                except ImportError as exc:
                    raise RuntimeError("ffmpeg is needed for a real MP4 test fixture") from exc
            output = target / (job_id + "-SIMULATED.mp4")
            subprocess.run(
                [exe, "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
                 "-f", "lavfi", "-i", "testsrc2=size=320x240:rate=12",
                 "-t", "1", "-c:v", "mpeg4", "-q:v", "5", "-an", str(output)],
                timeout=30, check=True, capture_output=True,
            )
            with output.open("rb") as stream:
                head = stream.read(12)
            if head[4:8] != b"ftyp":
                raise ValueError("Bad MP4 test fixture")
        else:
            output = target / (job_id + "-SIMULATED.wav")
            rate = 16000
            with wave.open(str(output), "wb") as music:
                music.setnchannels(1)
                music.setsampwidth(2)
                music.setframerate(rate)
                # 3 simple tones, solely for checking audio persistence/playback.
                data = bytearray()
                for i in range(rate * 2):
                    hz = (262, 330, 392)[(i // (rate * 2 // 3)) % 3]
                    sample = int(0.16 * 32767 * math.sin(2*math.pi*hz*i/rate))
                    data.extend(struct.pack("<h", sample))
                music.writeframes(data)
            with wave.open(str(output)) as verified:
                if verified.getnframes() != rate * 2:
                    raise ValueError("Bad WAV test fixture")
        return coordinator.transition(
            job_id, "simulated", "OFFLINE DEMO FILE. No AI provider was called.", output,
        )
    except Exception as exc:
        coordinator.transition(job_id, "failed", f"Simulation failed: {exc}")
        raise


def four_small_tests(workspace: Path) -> dict:
    """One PHOTO compress, one IMAGE demo, one VIDEO demo and one MUSIC demo."""
    from PIL import Image
    workspace = Path(workspace).expanduser().resolve()
    workspace.mkdir(parents=True, exist_ok=True)
    out = workspace / "results"
    out.mkdir(exist_ok=True)
    source = workspace / "one-sample-photo.jpg"
    # High-quality photo fixture can be compressed measurably.
    photo = Image.new("RGB", (240, 240))
    photo.putdata([((x*3 + y)%256, (x*7)%256, (y*3)%256)
                   for y in range(240) for x in range(240)])
    photo.save(source, quality=98)
    coordinator = Coordinator(workspace / "jarvix-new-jobs.sqlite", owner="offline-smoke")
    outputs = []
    for kind in ("photo_compress", "image", "video", "music"):
        job_id = coordinator.submit(kind, f"Offline single-{kind} smoke",
                                    str(source) if kind == "photo_compress" else None)
        if kind == "photo_compress":
            record = compress_one_photo(coordinator, job_id, out)
        else:
            record = make_simulated_media(coordinator, job_id, out)
        outputs.append({"kind": kind, "state": record["status"],
                        "file": Path(record["output_path"]).name,
                        "sha256": record["sha256"],
                        "bytes": Path(record["output_path"]).stat().st_size})
    report = {"test_mode": "offline", "provider_requests": 0, "results": outputs,
              "coordinator_report": coordinator.report()}
    (workspace / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--smoke", action="store_true")
    parser.add_argument("--workspace", default=str(Path(tempfile.gettempdir()) / "jarvis-new-smoke"))
    args = parser.parse_args(argv)
    if not args.smoke:
        parser.error("Specify --smoke for the offline test; real provider calls are not enabled here")
    data = four_small_tests(Path(args.workspace))
    print(json.dumps(data, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
