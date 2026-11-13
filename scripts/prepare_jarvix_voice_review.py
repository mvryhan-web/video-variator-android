"""Prepare a listening queue from the JARVIX transcription workflow."""
import argparse
import csv
import json
import re
from pathlib import Path

POLICY = re.compile(
    r"возврат|вернут(?:ся|ь)|гаранти|кредит.{0,40}пополня|refund|reimburse|guarantee|money.back|"
    r"rembours|garanti|reembolso|devoluci[oó]n|garant[ií]a",
    re.IGNORECASE,
)


def classify(row):
    text = row.get("transcript", "").strip()
    if not text or row.get("error"):
        return "retranscribe"
    if POLICY.search(text) or POLICY.search(row.get("expected_answer_unverified", "")):
        return "policy_review"
    if not row.get("scenario_id") or not row.get("question_from_master"):
        return "identify_intent"
    return "listen_match" if row.get("matches_expected") else "listen_mismatch"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, nargs="+")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    records = {}
    for path in args.input:
        for line in path.read_text(encoding="utf-8").splitlines():
            row = json.loads(line)
            name = row["filename"]
            if name in records and records[name] != row:
                raise SystemExit(f"Conflicting records for {name}")
            records[name] = row
    fields = [
        "queue", "filename", "sha256", "filename_language", "scenario_id",
        "question_from_master", "transcript", "expected_answer_unverified",
        "spoken_text_verified", "review_notes",
    ]
    with args.output.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fields, extrasaction="ignore")
        writer.writeheader()
        for name, row in sorted(records.items()):
            writer.writerow({**row, "filename": name, "queue": classify(row),
                             "spoken_text_verified": "", "review_notes": ""})


if __name__ == "__main__":
    main()
