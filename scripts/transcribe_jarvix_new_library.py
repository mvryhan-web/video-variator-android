"""Transcribe original voice clips and produce a review queue without modifying the runtime library."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import re
import unicodedata

ROOT = Path("app/src/main/assets/media/jarvix/clips")
IMPORT_MAP = Path("docs/jarvis-new/import-map.csv")
LANGUAGE = re.compile(r"^jarvix_(en|ru|fr|es)_", re.I)


def normalize(text):
    return " ".join(re.findall(r"\w+", unicodedata.normalize("NFKC", text).casefold()))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--shard", type=int, required=True)
    parser.add_argument("--shards", type=int, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not 0 <= args.shard < args.shards:
        parser.error("shard must be within range")
    with IMPORT_MAP.open(encoding="utf-8-sig", newline="") as source:
        expected = {row["target_filename"]: row for row in csv.DictReader(source)}
    paths = sorted(ROOT.glob("*.mp3"))
    if len(paths) != 1900:
        raise SystemExit(f"Expected 1900 original MP3 files, found {len(paths)}")

    from faster_whisper import WhisperModel

    model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=2)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as output:
        for path in paths[args.shard::args.shards]:
            row = expected.get(path.name, {})
            match = LANGUAGE.match(path.name)
            language = match.group(1).lower() if match else None
            candidate = row.get("expected_answer_from_master_NOT_VERIFIED", "")
            result = {
                "filename": path.name,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "filename_language": language,
                "scenario_id": row.get("scenario_id", ""),
                "question_from_master": row.get("question_from_master", ""),
                "expected_answer_unverified": candidate,
                "review_status": "needs_listening",
            }
            try:
                segments, info = model.transcribe(
                    str(path), language=language, beam_size=3,
                    vad_filter=True, condition_on_previous_text=False,
                )
                transcript = " ".join(segment.text.strip() for segment in segments).strip()
                result.update(
                    transcript=transcript, transcription_language=info.language,
                    matches_expected=bool(normalize(candidate)) and normalize(candidate) == normalize(transcript),
                )
            except Exception as error:
                result.update(transcript="", error=type(error).__name__, review_status="transcription_error")
            output.write(json.dumps(result, ensure_ascii=False) + "\n")
            output.flush()


if __name__ == "__main__":
    main()
