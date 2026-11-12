#!/usr/bin/env python3
"""Generate JARVIX 25×4 short natural dialogue MP3 on the OWNER'S PC.

Free local VoxCPM2 only, no cloud calls. Existing MP3 never overwritten.
Run on Windows where http://127.0.0.1:8765/tts actually exists.
Generated samples require human listening before TEST activation.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time
import urllib.request
import urllib.error

HOME=Path(__file__).resolve().parents[1]
DIR=HOME/"app/src/main/assets/media/jarvix/conversation"
TARGETS=DIR/"casual-25x4-targets.json"
MANIFEST=DIR/"manifest.json"
TOKEN=Path.home()/"Jarvis/voice-token.txt"
BASE="http://127.0.0.1:8765"
LANGS=("ru","en","fr","es")

def jget(url,timeout=5):
    with urllib.request.urlopen(url,timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))

def checksum(path):
    s=hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda:stream.read(1024*512),b""):
            s.update(block)
    return s.hexdigest()

def validate_mp3(path):
    if not path.is_file() or path.stat().st_size<2800:return False
    cmd=["ffprobe","-v","error","-select_streams","a:0","-show_entries",
         "stream=codec_name,sample_rate,bit_rate:format=duration",
         "-of","json",str(path)]
    try:
        info=json.loads(subprocess.check_output(cmd,stderr=subprocess.DEVNULL,
                              timeout=15,text=True))
        stream=(info.get("streams") or [{}])[0]
        duration=float(info.get("format",{}).get("duration",0))
        return stream.get("codec_name")=="mp3" and int(stream.get("sample_rate",0))==48000\
            and 0.35<duration<30
    except (OSError,ValueError,subprocess.CalledProcessError,subprocess.TimeoutExpired):
        return False

def synth(text,lang,token,out):
    body=json.dumps({"text":text,"language":lang},ensure_ascii=False).encode()
    req=urllib.request.Request(BASE+"/tts",data=body,method="POST",
        headers={"Content-Type":"application/json","Authorization":"Bearer "+token})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req,timeout=180) as response:
                data=response.read(50_000_001)
            if len(data)<2000 or data[:4] not in (b"RIFF",b"RF64"):
                raise RuntimeError("Voice server returned invalid/oversized WAV")
            out.write_bytes(data)
            return
        except urllib.error.HTTPError as e:
            if e.code!=429 or attempt==2:raise
            time.sleep(2*(attempt+1))
    raise RuntimeError("VoxCPM2 retry budget exhausted")

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--max-scenarios",type=int,default=5,
                   help="Process 5 scenarios x 4 languages by default; 25 for all 100.")
    p.add_argument("--dry-run",action="store_true")
    a=p.parse_args()
    if not 1<=a.max_scenarios<=25:raise SystemExit("max-scenarios must be 1..25")
    data=json.loads(TARGETS.read_text(encoding="utf-8"))
    tasks=data.get("scenarios",[])
    if len(tasks)!=25 or data.get("countAudioTargets")!=100:
        raise SystemExit("Invalid 25×4 target data")
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise SystemExit("FFmpeg + FFprobe required (do not generate without quality validation)")
    if a.dry_run:
        for task in tasks[:a.max_scenarios]:
            for lang in LANGS:
                pth=DIR/task["audio"][lang]
                print("SKIP" if validate_mp3(pth) else "NEED",lang,pth.name,task["phrases"][lang])
        return
    if not TOKEN.is_file() or len(TOKEN.read_text(encoding="utf-8").strip())<10:
        raise SystemExit("Local JARVIX voice token missing; do not send it in chat")
    status=jget(BASE+"/health")
    if status.get("ready") is not True:
        raise SystemExit("Local VoxCPM2 server not ready at 127.0.0.1:8765")
    token=TOKEN.read_text(encoding="utf-8").strip()
    old=json.loads(MANIFEST.read_text(encoding="utf-8"))
    if old.get("schema")!="jarvix-new-short-voice-v1":
        raise SystemExit("Existing TEST short voice manifest unexpected; do not overwrite")
    entries={c["filename"]:c for c in old["clips"]}
    made,skipped=0,0
    for task in tasks[:a.max_scenarios]:
        for lang in LANGS:
            filename=task["audio"][lang]
            if filename in ("hello_"+lang+".mp3","prompt_"+lang+".mp3"):
                raise SystemExit("Refusing to overwrite existing Tour V3 source-derived clips")
            pth=DIR/filename
            if validate_mp3(pth):
                skipped+=1
                print("SKIP present:",filename)
                continue
            if pth.exists():
                print("ERROR existing but invalid; quarantine manually:",pth)
                continue
            wav=DIR/(filename+".pending.wav")
            tmp=DIR/(filename+".pending.mp3")
            try:
                synth(task["phrases"][lang],lang,token,wav)
                subprocess.run(["ffmpeg","-nostdin","-hide_banner","-loglevel","error",
                    "-y","-i",str(wav),"-ar","48000","-ac","1","-c:a",
                    "libmp3lame","-b:a","192k",str(tmp)],
                    check=True,timeout=45)
                if not validate_mp3(tmp):raise RuntimeError("Generated MP3 failed ffprobe")
                tmp.replace(pth)
                made+=1
                entries[filename]={
                    "id":task["id"]+"_"+lang,"filename":filename,"language":lang,
                    "text":task["phrases"][lang],"sha256":checksum(pth),
                    "previewOnly":False,"listeningReviewed":False,
                    "listeningReviewRequired":True,"engine":"VoxCPM2_local",
                    "generatedFrom":"casual-25x4-targets.json"
                }
                # Atomic manifest snapshot after each actual file; never erase
                # existing owner approved Tour-derived hello/prompt.
                output={**old,"clipCount":len(entries),
                  "reviewed":False,"clips":list(entries.values())}
                staged=MANIFEST.with_suffix(".pending.json")
                staged.write_text(json.dumps(output,ensure_ascii=False,indent=2),
                                  encoding="utf-8")
                staged.replace(MANIFEST)
                print("CREATED, PENDING HUMAN AUDIO REVIEW:",filename)
            except Exception as exc:
                print("FAILED:",filename,exc)
            finally:
                wav.unlink(missing_ok=True)
                tmp.unlink(missing_ok=True)
    print("New:",made,"already present:",skipped,
          "unreviewed files are NOT active in JARVIX until approved.")

if __name__=="__main__":
    main()
