#!/usr/bin/env python3
"""TEST-only: derive SHORT, word-aligned original JARVIX voice from existing V3.

No voice cloning, external TTS, model calls or overwrites.
Timecodes were estimated from source-clip silences, so a human MUST listen.
"""
from pathlib import Path
import hashlib
import json
import subprocess

BASE=Path(__file__).resolve().parents[1]/"app/src/main/assets/media/jarvix"
SOURCES=BASE/"tour-v3"
DEST=BASE/"conversation"
MANIFEST=SOURCES/"manifest.json"
DATA={
  "ru":{
    "hello":("t3_ru_5c4572bce29c.mp3",0.0,1.40,"Привет! Я JARVIX."),
    "prompt":("t3_ru_4077808843cd.mp3",5.75,8.36,"Просто скажите, что хотите создать.")
  },
  "en":{
    "hello":("t3_en_023784bec3bf.mp3",0.0,1.80,"Hi! I'm JARVIX."),
    "prompt":("t3_en_f8db53415b2e.mp3",6.14,8.02,"Just tell me what you want to make.")
  },
  "fr":{
    "hello":("t3_fr_8b174811bfee.mp3",0.0,1.16,"Salut ! Je suis JARVIX."),
    "prompt":("t3_fr_d9b4e9a208d8.mp3",4.38,5.46,"Dites-moi ce que vous voulez créer.")
  },
  "es":{
    "hello":("t3_es_8d5f3b1ff6c2.mp3",0.0,1.65,"¡Hola! Soy JARVIX."),
    "prompt":("t3_es_9808ef233d8f.mp3",5.04,6.38,"Dime qué quieres crear.")
  }
}
def call(args):
    return subprocess.check_output(args,stderr=subprocess.STDOUT,text=True,timeout=40).strip()
def main():
    DEST.mkdir(parents=True,exist_ok=True)
    tour=json.loads(MANIFEST.read_text(encoding="utf-8"))
    published={c["filename"]:c for c in tour["clips"]}
    out=[]
    for lang,phrases in DATA.items():
        for purpose,(name,start,end,text) in phrases.items():
            source=SOURCES/name
            if not source.is_file() or source.stat().st_size<1000:
                raise SystemExit("Missing original V3 MP3: "+str(source))
            expected=published.get(name,{})
            if expected.get("language")!=lang:
                raise SystemExit("Source language mismatch: "+name)
            actual=hashlib.sha256(source.read_bytes()).hexdigest()
            if expected.get("sha256")!=actual:
                raise SystemExit("Original audio checksum mismatch: "+name)
            duration=float(call(["ffprobe","-v","error","-show_entries","format=duration",
                                  "-of","default=noprint_wrappers=1:nokey=1",str(source)]))
            # Some checked-in source encodings differ slightly in their
            # container duration. Never seek beyond the actual MP3 bytes.
            if end>duration: end=duration-0.035
            if start<0 or end<=start or end-start<0.75:
                raise SystemExit(f"Invalid phrase trim: {name}; {start:.3f}-{end:.3f}, duration={duration:.3f}")
            filename=f"{purpose}_{lang}.mp3"
            target=DEST/filename
            if not target.exists():
                length=end-start
                fading=max(0.0,length-0.065)
                audio=f"atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS,"+\
                      f"afade=t=in:st=0:d=0.025,afade=t=out:st={fading:.3f}:d=0.065"
                tmp=target.with_suffix(".pending.mp3")
                try:
                    subprocess.run(["ffmpeg","-nostdin","-hide_banner","-loglevel","error",
                        "-y","-i",str(source),"-af",audio,"-ar","48000","-ac","1",
                        "-c:a","libmp3lame","-b:a","192k",str(tmp)],
                        check=True,timeout=40)
                    if tmp.stat().st_size<2500:raise RuntimeError("Audio segment too small")
                    tmp.replace(target)
                finally:
                    tmp.unlink(missing_ok=True)
            sec=float(call(["ffprobe","-v","error","-show_entries","format=duration",
                                "-of","default=noprint_wrappers=1:nokey=1",str(target)]))
            if not 0.8<=sec<=3.5:
                raise SystemExit("Unreasonable segment length: "+filename)
            out.append({"id":f"{purpose}_{lang}","filename":filename,"language":lang,
              "text":text,"source":name,"sourceStartSeconds":start,"sourceEndSeconds":end,
              "sha256":hashlib.sha256(target.read_bytes()).hexdigest(),
              "durationSeconds":round(sec,3),"previewOnly":True,"listeningReviewRequired":True})
    (DEST/"manifest.json").write_text(json.dumps({
        "schema":"jarvix-new-short-voice-v1","format":"mp3","engine":"VoxCPM2_original_tour_v3_crops",
        "clipCount":len(out),"reviewed":False,"clips":out
       },ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Prepared",len(out),"existing-voice excerpts for TEST; manual listening remains required.")

if __name__=="__main__":main()
