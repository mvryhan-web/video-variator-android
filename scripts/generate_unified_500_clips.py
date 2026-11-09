"""
Batch generator for 500 JARVIX scenarios (2000 MP3 files, 4 languages)
using the local VoxCPM2 server at http://127.0.0.1:8765/tts.
Uses the Tour-v3 voice model with authentic owner cadence.
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
import wave

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

WORKSPACE = Path(r"C:\Users\velot\.gemini\antigravity\scratch\f1-smart-decision")
JARVIS_HOME = Path.home() / "Jarvis"
OUTPUT_DIR = WORKSPACE / "app" / "src" / "main" / "assets" / "media" / "jarvix" / "clips"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MASTER_JSON = WORKSPACE / "app" / "src" / "main" / "assets" / "media" / "jarvix" / "jarvix-unified-500-master.json"

URL = "http://127.0.0.1:8765"
TOKEN_FILE = JARVIS_HOME / "voice-token.txt"

def get_token():
    if TOKEN_FILE.exists():
        return TOKEN_FILE.read_text(encoding="utf-8").strip()
    return ""

def check_server():
    try:
        with urllib.request.urlopen(URL + "/health", timeout=5) as resp:
            data = json.load(resp)
            return data.get("ready") is True
    except Exception:
        return False

def synthesize_wav(text, language, wav_path, token):
    body = json.dumps({"text": text, "language": language}, ensure_ascii=False).encode("utf-8")
    
    # Retry on 429 (Voice server busy) until the previous generation completes
    for attempt in range(60):
        req = urllib.request.Request(
            URL + "/tts",
            data=body,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=180) as reply:
                wav_path.write_bytes(reply.read())
                return True
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(1.5)
                continue
            print(f"    [HTTP Error {e.code}]: {e.reason}")
            raise
        except Exception as ex:
            if attempt < 3:
                time.sleep(2)
                continue
            raise
    raise TimeoutError("Voice server busy timeout exceeded")

def convert_to_mp3(wav_path, mp3_path):
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(wav_path), "-ar", "48000",
        "-c:a", "libmp3lame", "-b:a", "192k", str(mp3_path)
    ], check=True)

def main():
    if not MASTER_JSON.exists():
        print(f"ERROR: Master file not found at {MASTER_JSON}")
        return

    data = json.loads(MASTER_JSON.read_text(encoding="utf-8"))
    scenarios = data.get("scenarios", [])
    total_scenarios = len(scenarios)
    total_clips = total_scenarios * 4

    print("=======================================================")
    print(f"  JARVIX VOICE GENERATION: {total_scenarios} SCENARIOS ({total_clips} CLIPS)")
    print(f"  Save destination: {OUTPUT_DIR}")
    print("=======================================================")

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("ERROR: FFmpeg is required for MP3 conversion.")
        return

    # Pre-scan existing valid files across destination
    existing_files = {f.name: f.stat().st_size for f in OUTPUT_DIR.glob("*.mp3") if f.stat().st_size > 1000}
    remaining_total = total_clips - len(existing_files)
    print(f"  ALREADY READY & SAVED: {len(existing_files)} / {total_clips} (SKIPPED)")
    print(f"  REMAINING TO SYNTHESIZE: {remaining_total} CLIPS")
    print("=======================================================")

    print("Checking local VoxCPM2 voice server (port 8765)...")
    if not check_server():
        print("Waiting for local voice server to become ready on port 8765...")
        while not check_server():
            time.sleep(2)
    print("Voice server is READY!")

    token = get_token()
    generated = 0
    skipped = 0
    current_num = 0
    remaining_done = 0

    manifest_entries = []

    for sc in scenarios:
        for lang in ["ru", "en", "es", "fr"]:
            current_num += 1
            filename = sc["audio"][lang]
            mp3_file = OUTPUT_DIR / filename
            wav_file = OUTPUT_DIR / filename.replace(".mp3", ".wav")
            text = sc["qa"][lang]["answer"]

            # Skip if already generated and valid
            if filename in existing_files:
                skipped += 1
                manifest_entries.append({
                    "id": sc["safeId"] + "_" + lang,
                    "filename": filename,
                    "language": lang,
                    "text": text,
                    "size": existing_files[filename]
                })
                continue

            remaining_done += 1
            print(f"[{remaining_done}/{remaining_total}] (Total: {current_num}/{total_clips}) [{lang.upper()}] {sc['id']} -> {filename}...", end="", flush=True)
            t0 = time.time()
            try:
                synthesize_wav(text, lang, wav_file, token)
                convert_to_mp3(wav_file, mp3_file)
                wav_file.unlink(missing_ok=True)
                generated += 1
                dur = time.time() - t0
                print(f" OK ({dur:.1f}s)")
                manifest_entries.append({
                    "id": sc["safeId"] + "_" + lang,
                    "filename": filename,
                    "language": lang,
                    "text": text,
                    "size": mp3_file.stat().st_size
                })
                time.sleep(0.2)
            except Exception as e:
                print(f" FAILED: {e}")

    # Write manifest
    manifest_file = OUTPUT_DIR / "manifest-500.json"
    manifest_file.write_text(json.dumps({
        "version": "2.0.0",
        "total": len(manifest_entries),
        "clips": manifest_entries
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n=======================================================")
    print(f"COMPLETED! Generated: {generated}, Skipped: {skipped}, Total ready: {len(manifest_entries)}")
    print(f"Manifest: {manifest_file}")
    print(f"=======================================================")

if __name__ == "__main__":
    main()
