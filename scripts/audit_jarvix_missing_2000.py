#!/usr/bin/env python3
"""Read-only JARVIX NEW voice corpus audit; generate an exact 2000-line queue.

Authoritative text: jarvix-unified-500-master.json. Never equate a manifest
entry to a physical playable MP3. Never upload, regenerate or overwrite audio.
"""
import argparse
import csv
import json
import os
from pathlib import Path
import re
import sys

BASE = Path(__file__).resolve().parents[1]
MASTER = BASE / "app/src/main/assets/media/jarvix/jarvix-unified-500-master.json"
AUDIO = BASE / "app/src/main/assets/media/jarvix/clips"
LANGS = ("ru", "en", "fr", "es")
FILE = re.compile(r"^jarvix_(ru|en|fr|es)_s([0-9]{3})\.mp3$")
SENSITIVE = re.compile(
    r"гаранти|кредит.{0,35}верн|возврат.{0,30}мгновен|"
    r"guarantee|instant.{0,25}refund|refund.{0,25}instant|"
    r"garantiz|rembours.{0,25}immédiat|reembols.{0,25}instant",
    re.IGNORECASE,
)
LIVE_FACTS = re.compile(
    r"подписк|тариф|72 час|72 h|trial|basic|business|pro plan|"
    r"credits?|кредит|pric|prix|precio|tarifa|abonnem|suscrip",
    re.IGNORECASE,
)


def audio_header_ok(path):
    if not path.is_file() or path.stat().st_size < 1024:
        return False
    with path.open("rb") as stream:
        head = stream.read(3)
    return head == b"ID3" or (len(head) >= 2 and head[0] == 0xFF and head[1] & 0xE0 == 0xE0)


def collect(scan_roots, expected):
    found = {}
    for root in scan_roots:
        if not root.is_dir():
            print("NOT_SCANNED: folder not found:", root, file=sys.stderr)
            continue
        print("SCANNING:", root, file=sys.stderr)
        for path in root.rglob("*.mp3"):
            if path.name not in expected:
                continue
            try:
                valid = audio_header_ok(path)
            except OSError:
                valid = False
            if valid:
                found.setdefault(path.name, []).append(str(path.resolve()))
    return found


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--scan-root", action="append", type=Path, default=[],
                   help="Additional existing local folder to scan without changing files.")
    p.add_argument("--r2-keys-json", type=Path, default=None,
                   help="Optional ACTUAL R2 object-list export; not a predictive manifest.")
    p.add_argument("--output", type=Path, default=BASE/"artifacts/voice-audit")
    args=p.parse_args()
    master=json.loads(MASTER.read_text(encoding="utf-8"))
    scenarios=master.get("scenarios", [])
    if len(scenarios)!=500:
        raise SystemExit("INVALID MASTER: expected exactly 500 scenarios")
    rows=[]
    for i,scene in enumerate(scenarios,start=1):
        for lang in LANGS:
            filename=scene.get("audio",{}).get(lang)
            expected=f"jarvix_{lang}_s{i:03}.mp3"
            q=scene.get("qa",{}).get(lang,{})
            if filename!=expected or not str(q.get("question","")).strip() or not str(q.get("answer","")).strip():
                raise SystemExit(f"INVALID MASTER: scenario {i} language {lang}, stop before generation")
            answer=q["answer"].strip()
            rows.append({
                "index":i,"scenario_id":scene.get("id",""),"language":lang,
                "filename":filename,"question":q["question"].strip(),
                "answer":answer,"section":scene.get("section",""),
                "requires_claim_review":int(bool(SENSITIVE.search(answer))),
                "requires_live_fact_review":int(bool(LIVE_FACTS.search(answer))),
            })
    if len(rows)!=2000 or len({x["filename"] for x in rows})!=2000:
        raise SystemExit("Expected 2000 UNIQUE filenames")

    roots=[AUDIO,*args.scan_root]
    # The owner's previous Antigravity workspace is a POSSIBLE scan root.
    # It is intentionally not assumed to exist on GitHub runner.
    seen=set()
    roots=[root for root in roots if not (str(root) in seen or seen.add(str(root)))]
    physical=collect(roots,{r["filename"] for r in rows})

    remote=set()
    remote_scanned=False
    if args.r2_keys_json:
        remote_data=json.loads(args.r2_keys_json.read_text(encoding="utf-8"))
        if isinstance(remote_data,dict):
            keys=remote_data.get("keys")
        else:
            keys=remote_data
        if not isinstance(keys,list):
            raise SystemExit("R2 keys JSON must contain real object keys in an array")
        remote_scanned=True
        remote={str(x).rsplit("/",1)[-1] for x in keys if isinstance(x,str)}

    for row in rows:
        local=physical.get(row["filename"],[])
        row["local_paths"]=" | ".join(local)
        row["present_in_r2_listing"]=int(row["filename"] in remote) if remote_scanned else ""
        row["candidate_present"]=int(bool(local) or row["filename"] in remote)
        row["status"]="FOUND_CANDIDATE_NEEDS_TRANSCRIPT_CHECK" if row["candidate_present"] else "MISSING_FROM_SCANNED_LOCATIONS"
    out=args.output
    out.mkdir(parents=True,exist_ok=True)
    all_fields=list(rows[0])
    with (out/"jarvix_expected_2000.csv").open("w",encoding="utf-8-sig",newline="") as f:
        writer=csv.DictWriter(f,fieldnames=all_fields);writer.writeheader();writer.writerows(rows)
    missing=[x for x in rows if not x["candidate_present"]]
    with (out/"jarvix_missing_from_scanned.csv").open("w",encoding="utf-8-sig",newline="") as f:
        writer=csv.DictWriter(f,fieldnames=all_fields);writer.writeheader();writer.writerows(missing)
    queued={
      "source":"app/src/main/assets/media/jarvix/jarvix-unified-500-master.json",
      "master_total":len(rows),"real_candidates":len(rows)-len(missing),
      "missing_from_scanned_locations":len(missing),
      "r2_objects_actually_scanned":remote_scanned,
      "audio_was_verified_against_transcript":False,
      "source_text_approved":False,
      "per_language":{lang:{"target":500,
          "candidate_present":sum(x["language"]==lang and bool(x["candidate_present"]) for x in rows),
          "missing_from_scanned_locations":sum(x["language"]==lang and not x["candidate_present"] for x in rows)}
         for lang in LANGS},
      "queue":missing,
    }
    (out/"jarvix_missing_queue.json").write_text(
        json.dumps(queued,ensure_ascii=False,indent=2),encoding="utf-8")
    summary={k:v for k,v in queued.items() if k!="queue"}
    summary["flagged_claims"]=sum(x["requires_claim_review"] for x in rows)
    summary["flagged_live_facts"]=sum(x["requires_live_fact_review"] for x in rows)
    (out/"README.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(summary,ensure_ascii=False,indent=2))
    if not remote_scanned:
        print("WARNING: R2 objects were NOT inspected; do not infer they are missing",file=sys.stderr)
    return 0


if __name__=="__main__":
    raise SystemExit(main())
