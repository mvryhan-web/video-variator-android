"""Record the owner-approved JARVIX Tour V3 with the SAME offline voice.
Uses only the owner's existing C:/Users/velot/Jarvis VoxCPM2 installation
and reference.wav. No new model, voice, hosted service or credentials.
Nothing is uploaded, merged or marked reviewed by this script.
Usage:
  python scripts/generate_jarvix_tour_v3_local.py --language ru --limit 1
  python scripts/generate_jarvix_tour_v3_local.py --language ru
  python scripts/generate_jarvix_tour_v3_local.py --all
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JARVIS = Path.home() / "Jarvis"
MODEL = JARVIS / "models" / "VoxCPM2"
REFERENCE = JARVIS / "reference.wav"
OUTPUT = ROOT / "app" / "src" / "main" / "assets" / "media" / "jarvix" / "tour-v3"
SOURCE = ROOT / "app" / "src" / "main" / "assets" / "jarvix-tour-v3-script.js"

def phrases() -> list[dict]:
    js = ("import {tourV3AllPhrases} from " + json.dumps(SOURCE.as_uri()) +
          "; console.log(JSON.stringify(tourV3AllPhrases()));")
    call = subprocess.run(
        ["node", "--input-type=module", "-e", js],
        text=True, capture_output=True, check=False, cwd=ROOT, encoding="utf-8",
    )
    if call.returncode:
        raise RuntimeError("Cannot load the approved V3 script (Node.js required): " + call.stderr[:1200])
    result = json.loads(call.stdout)
    if len(result) < 45 or not all(x.get("language") in ("ru","en","fr","es") and x.get("text") for x in result):
        raise RuntimeError("Incomplete or invalid Tour V3 lines; refusing to render")
    return result

def validate_wav(path: Path) -> bool:
    if not path.exists() or path.stat().st_size <= 44:
        return False
    with path.open("rb") as fp:
        head = fp.read(12)
    return head[:4] == b"RIFF" and head[8:] == b"WAVE"

def main() -> None:
    parser = argparse.ArgumentParser(description="Generate V3 speech locally with the owner's original VoxCPM2 voice only")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--language", choices=["ru","en","fr","es"])
    group.add_argument("--all", action="store_true")
    parser.add_argument("--limit", type=int, help="First N phrases for a small listening test")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be positive")
    if not MODEL.is_dir() or not REFERENCE.is_file():
        raise SystemExit("Owner model / voice reference missing: " + str(MODEL) + " / " + str(REFERENCE))
    source_hash = hashlib.sha256(REFERENCE.read_bytes()).hexdigest()
    items = phrases()
    selected = [x for x in items if args.all or x["language"] == args.language]
    if args.limit:
        selected = selected[:args.limit]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    # Keep the currently installed owner environment and the original reference.
    import soundfile as sf
    import numpy as np
    import torch
    from voxcpm import VoxCPM
    if not torch.cuda.is_available():
        raise SystemExit("CUDA is unavailable. Refusing another provider or different voice.")
    print("Original reference SHA-256: " + source_hash, flush=True)
    print("Using ORIGINAL local voice: " + str(REFERENCE), flush=True)
    print("VoxCPM2 model: " + str(MODEL), flush=True)
    print("Generating " + str(len(selected)) + " phrase(s)", flush=True)
    model = VoxCPM(str(MODEL), enable_denoiser=False, optimize=False, device="cuda")
    for i, item in enumerate(selected, 1):
        lang, text = item["language"], item["text"]
        if len(text) > 300:
            raise RuntimeError("Text exceeds server-safe 300 chars: " + lang)
        tag = hashlib.sha256((lang + "\\0" + text).encode("utf-8")).hexdigest()[:12]
        filename = f"t3_{lang}_{tag}.wav"
        path = OUTPUT / filename
        if validate_wav(path):
            print(f"{i}/{len(selected)} EXISTS {filename}", flush=True)
            continue
        print(f"{i}/{len(selected)} RECORDING [{lang}] {text}", flush=True)
        waveform = model.generate(
            text=text, reference_wav_path=str(REFERENCE),
            inference_timesteps=10, max_len=512,
            normalize=False, denoise=False, retry_badcase=False,
        )
        if isinstance(waveform, tuple):
            raise RuntimeError("Unknown VoxCPM2 return format. Stopped to protect original voice.")
        if isinstance(waveform, torch.Tensor):
            waveform = waveform.detach().float().cpu().numpy()
        waveform = np.asarray(waveform, dtype=np.float32).squeeze()
        if waveform.ndim != 1 or waveform.size < 256:
            raise RuntimeError("Invalid output waveform: " + filename)
        sf.write(path, waveform, model.tts_model.sample_rate, subtype="PCM_16")
        if not validate_wav(path):
            raise RuntimeError("Invalid saved WAV: " + filename)
        print(f"  SAVED {path}", flush=True)
    # Manifest is updated from ALL EXISTING valid clips, preserving no-approval status.
    clips = []
    for item in items:
        lang, spoken = item["language"], item["text"]
        tag = hashlib.sha256((lang + "\\0" + spoken).encode("utf-8")).hexdigest()[:12]
        filename = f"t3_{lang}_{tag}.wav"
        path = OUTPUT / filename
        if validate_wav(path):
            clips.append({
                "filename": filename, "language": lang, "text": spoken,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "reviewed": False,
            })
    manifest = {
        "schemaVersion": "jarvix-tour-v3-audio/v1",
        "engine": "VoxCPM2",
        "voiceProfile": "reference-sha256:" + source_hash,
        "reviewed": False,
        "clips": clips,
    }
    (OUTPUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"COMPLETE: {len(clips)} WAV(s) present. All UNREVIEWED; no upload or publication.", flush=True)

if __name__ == "__main__":
    main()
