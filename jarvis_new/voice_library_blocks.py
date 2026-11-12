"""Offline sentence/phrase blocks for the owner's JARVIX voice.

Only manually verified fragments from approved MP3 recordings can be used.
The owner must audition the stitched preview before publishing it to JARVIX.
No LLM, cloning, cloud API, or automatic claim of natural speech.
"""
from __future__ import annotations

from functools import lru_cache
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import sqlite3
import subprocess

LANGS = {"ru","en","fr","es"}
MAX_PARTS = 12
MAX_PHRASE = 350


def norm(text: str) -> str:
    import unicodedata
    text=unicodedata.normalize("NFC",str(text)).lower().replace("ё","е")
    return " ".join(re.findall(r"\w+",text, re.UNICODE))


def ffmpeg_bin() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except (ImportError, RuntimeError):
        executable=shutil.which("ffmpeg")
        if not executable:
            raise RuntimeError("FFmpeg отсутствует. Нужна сборка JARVIX с FFmpeg.")
        return executable


class VoiceBlocks:
    def __init__(self,library):
        self.library=library
        self.previews=library.home/"assembled"
        self.previews.mkdir(parents=True,exist_ok=True)
        with library.db() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS voice_segments(
              id TEXT PRIMARY KEY, source_id TEXT NOT NULL, language TEXT NOT NULL,
              text TEXT NOT NULL, normalized TEXT NOT NULL,
              start_ms INTEGER NOT NULL,end_ms INTEGER NOT NULL,
              verified INTEGER NOT NULL DEFAULT 1)""")
            db.execute("""CREATE TABLE IF NOT EXISTS voice_compositions(
              id TEXT PRIMARY KEY, language TEXT NOT NULL, question TEXT NOT NULL,
              question_key TEXT NOT NULL, text TEXT NOT NULL,
              audio_path TEXT NOT NULL, segment_ids TEXT NOT NULL,
              approved INTEGER NOT NULL DEFAULT 0)""")
            db.execute("CREATE INDEX IF NOT EXISTS voice_compositions_question ON voice_compositions(language,question_key,approved)")
            db.execute("CREATE INDEX IF NOT EXISTS voice_segments_language ON voice_segments(language,verified)")

    def create_segment(self,source_id:str,text:str,start_s:float,end_s:float,*,human_confirmed:bool=False) -> str:
        if not human_confirmed:
            raise ValueError("Сначала прослушай и подтверди границы фрагмента.")
        src=self.library.get(source_id,approved_only=True)
        if not src or src.get("source")=="composed":
            raise ValueError("Сначала утверди исходный MP3 и его текст.")
        if not isinstance(text,str) or not text.strip() or len(text)>MAX_PHRASE:
            raise ValueError("Неверный текст фрагмента.")
        fragment=norm(text)
        transcript=norm(src.get("transcript",""))
        if not fragment or " "+fragment+" " not in " "+transcript+" ":
            raise ValueError("Фрагмент должен встречаться в утверждённом тексте MP3.")
        try:
            a,b=float(start_s),float(end_s)
        except (ValueError,TypeError):
            raise ValueError("Нужны секунды начала и конца.") from None
        if not all(map(math.isfinite,(a,b))) or a<0 or b<=a or b>120 or b-a>30 or b-a<0.08:
            raise ValueError("Начало и конец: от 0 до 120 секунд, длина 0.08–30 секунд.")
        start_ms,end_ms=round(a*1000),round(b*1000)
        descriptor=f"{source_id}|{fragment}|{start_ms}|{end_ms}"
        segment_id=hashlib.sha256(descriptor.encode()).hexdigest()
        with self.library.db() as db:
            db.execute("""INSERT OR IGNORE INTO voice_segments
              (id,source_id,language,text,normalized,start_ms,end_ms)
              VALUES(?,?,?,?,?,?,?)""",(segment_id,source_id,src["lang"],text.strip(),fragment,start_ms,end_ms))
        return segment_id

    def list_segments(self,language="ru"):
        if language not in LANGS:return []
        with self.library.db() as db:
            db.row_factory=sqlite3.Row
            return [dict(row) for row in db.execute("""SELECT s.* FROM voice_segments s
                JOIN clips c ON c.id=s.source_id AND c.approved=1
                WHERE s.language=? AND s.verified=1 ORDER BY s.text""",(language,))]

    def plan(self,text:str,language:str):
        if language not in LANGS or not isinstance(text,str) or not (0<len(text)<=MAX_PHRASE):
            raise ValueError("Неверный язык или текст (до 350 символов).")
        requested=norm(text).split()
        if not requested:
            raise ValueError("Пустой текст ответа.")
        candidates=[]
        for segment in self.list_segments(language):
            tokens=segment["normalized"].split()
            if tokens:
                candidates.append((tokens,segment))
        candidates.sort(key=lambda x:(-len(x[0]),x[1]["start_ms"],x[1]["id"]))
        @lru_cache(None)
        def solve(offset):
            if offset==len(requested):return ()
            best=None
            for words,segment in candidates:
                n=len(words)
                if requested[offset:offset+n]!=words:continue
                remaining=solve(offset+n)
                if remaining is None:continue
                option=(segment,)+remaining
                if len(option)>MAX_PARTS:continue
                if best is None or len(option)<len(best):
                    best=option
                    if len(best)==1:break
            return best
        answer=solve(0)
        if not answer:
            raise ValueError("Нет полного набора утверждённых фрагментов для этой фразы.")
        return list(answer)

    def compose_preview(self,question:str,text:str,language:str):
        if not isinstance(question,str) or not question.strip() or len(question)>1000:
            raise ValueError("Укажи вопрос, на который должен отвечать новый MP3.")
        pieces=self.plan(text,language)
        identity=hashlib.sha256(json.dumps([language,norm(question),norm(text),
              [s["id"] for s in pieces]],ensure_ascii=False).encode()).hexdigest()
        destination=self.previews/(identity+".mp3")
        if not destination.is_file():
            inputs=[]
            filters=[]
            for i,part in enumerate(pieces):
                src=self.library.get(part["source_id"],approved_only=True)
                if not src:raise ValueError("Исходная запись перестала быть утверждённой.")
                inputs.extend(["-i",str(Path(src["path"]))])
                a=part["start_ms"]/1000
                b=part["end_ms"]/1000
                filters.append(f"[{i}:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS,aresample=24000,aformat=sample_fmts=fltp:channel_layouts=mono[s{i}]")
            labels="".join(f"[s{i}]" for i in range(len(pieces)))
            filters.append(f"{labels}concat=n={len(pieces)}:v=0:a=1[out]")
            tmp=self.previews/(identity+".pending.mp3")
            cmd=[ffmpeg_bin(),"-nostdin","-hide_banner","-loglevel","error","-y",
                 *inputs,"-filter_complex",";".join(filters),"-map","[out]",
                 "-vn","-ar","24000","-ac","1","-c:a","libmp3lame","-b:a","128k",str(tmp)]
            try:
                subprocess.run(cmd,check=True,capture_output=True,timeout=45)
                if not tmp.is_file() or tmp.stat().st_size<1000:
                    raise RuntimeError("Не получилось собрать аудиофрагменты.")
                tmp.replace(destination)
            except (subprocess.CalledProcessError,subprocess.TimeoutExpired) as exc:
                raise RuntimeError("Ошибка FFmpeg при соединении фраз; проверь секунды и исходный MP3.") from exc
            finally:
                tmp.unlink(missing_ok=True)
        with self.library.db() as db:
            db.execute("""INSERT OR IGNORE INTO voice_compositions
              (id,language,question,question_key,text,audio_path,segment_ids,approved)
              VALUES(?,?,?,?,?,?,?,0)""",(identity,language,question.strip(),norm(question),
               text.strip(),str(destination),json.dumps([s["id"] for s in pieces])))
        return identity,destination,len(pieces)

    def get(self,identity:str,*,approved_only=False):
        if not re.fullmatch(r"[a-f0-9]{64}",str(identity)):return None
        with self.library.db() as db:
            db.row_factory=sqlite3.Row
            row=db.execute("SELECT * FROM voice_compositions WHERE id=?",(identity,)).fetchone()
        if not row or (approved_only and not row["approved"]):
            return None
        record=dict(row)
        if not Path(record["audio_path"]).is_file():
            return None
        with self.library.db() as db:
            ids=json.loads(record["segment_ids"])
            for segment_id in ids:
                valid=db.execute("""SELECT 1 FROM voice_segments s JOIN clips c
                  ON c.id=s.source_id WHERE s.id=? AND s.verified=1 AND c.approved=1""",
                  (segment_id,)).fetchone()
                if not valid:return None
        return {"id":identity,"path":record["audio_path"],"text":record["text"],
                "transcript":record["text"],"lang":record["language"],"source":"composed",
                "approved":record["approved"]}

    def approve(self,identity:str,*,listened:bool=False):
        if not listened:
            raise ValueError("Сначала прослушай собранную запись целиком.")
        if not self.get(identity):
            raise ValueError("Черновик не найден или исходные записи отозваны.")
        with self.library.db() as db:
            db.execute("UPDATE voice_compositions SET approved=1 WHERE id=?",(identity,))

    def answer(self,question:str,language:str):
        if language not in LANGS or not isinstance(question,str) or len(question)>1000:return None
        with self.library.db() as db:
            db.row_factory=sqlite3.Row
            rows=list(db.execute("""SELECT id FROM voice_compositions
              WHERE language=? AND question_key=? AND approved=1""",
              (language,norm(question))))
        for row in rows:
            record=self.get(row["id"],approved_only=True)
            if record:
                return {"id":record["id"],"text":record["text"]}
        return None

    def invalidate_source(self,source_id:str):
        with self.library.db() as db:
            fragments={r[0] for r in db.execute("SELECT id FROM voice_segments WHERE source_id=?",(source_id,))}
            if not fragments:return
            for composed_id,used in db.execute("SELECT id,segment_ids FROM voice_compositions WHERE approved=1"):
                if fragments.intersection(json.loads(used)):
                    db.execute("UPDATE voice_compositions SET approved=0 WHERE id=?",(composed_id,))
            db.execute("DELETE FROM voice_segments WHERE source_id=?",(source_id,))

    def counts(self):
        with self.library.db() as db:
            segments=db.execute("SELECT count(*) FROM voice_segments WHERE verified=1").fetchone()[0]
            approved=db.execute("SELECT count(*) FROM voice_compositions WHERE approved=1").fetchone()[0]
        return {"fragments":segments,"composed_approved":approved}
