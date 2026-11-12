"""JARVIX Voice Library: standalone Windows desktop, 552 original owner MP3.

Offline by default. Selected audio is sent only to the owner's explicitly
approved JARVIX NEW TEST page via a read-only 127.0.0.1 service.
No paid API calls, automatic transcription claims, or new voice synthesis.
"""
from __future__ import annotations

import hashlib
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk
import unicodedata
from urllib.parse import parse_qs, urlsplit

from jarvis_new.voice_library_blocks import VoiceBlocks

HOST = "127.0.0.1"
PORT = 8770
TEST_ORIGIN = "https://jarvis-new.deepsyq.pages.dev"
LANGUAGES = ("ru", "en", "fr", "es")
MAX_BYTES = 150 * 1024 * 1024


def bundle_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS) / "media" / "jarvix"
    return Path(__file__).resolve().parents[1] / "app/src/main/assets/media/jarvix"


def data_dir() -> Path:
    base = os.environ.get("LOCALAPPDATA")
    return (Path(base) if base else Path.home() / ".local" / "share") / "JARVIX-Voice-Library"


def normalise(value: str) -> str:
    text = unicodedata.normalize("NFC", str(value)).lower().replace("ё", "е")
    return " ".join(re.findall(r"\w+", text, re.UNICODE))


def language_of(filename: str) -> str:
    name = filename.lower()
    m = re.match(r"^(?:jarvix|t3)_(ru|en|fr|es)_", name)
    if m:
        return m.group(1)
    for lang in LANGUAGES[1:]:
        if name.endswith("_" + lang + ".mp3"):
            return lang
    return "ru"


def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as src:
        for chunk in iter(lambda: src.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def is_mp3(path: Path) -> bool:
    if not path.is_file() or not (0 < path.stat().st_size <= MAX_BYTES):
        return False
    with path.open("rb") as audio:
        first = audio.read(3)
    return first == b"ID3" or (len(first) >= 2 and first[0] == 0xff and first[1] & 0xe0 == 0xe0)


class Library:
    def __init__(self, home: Path):
        self.home = Path(home)
        self.home.mkdir(parents=True, exist_ok=True)
        self.store = self.home / "recordings"
        self.store.mkdir(exist_ok=True)
        self.db_file = self.home / "clips.sqlite"
        with self.db() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS clips(
                id TEXT PRIMARY KEY, name TEXT NOT NULL, lang TEXT NOT NULL,
                path TEXT NOT NULL, draft TEXT NOT NULL DEFAULT '',
                transcript TEXT NOT NULL DEFAULT '', question TEXT NOT NULL DEFAULT '',
                approved INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT 'manual')""")
            db.execute("CREATE INDEX IF NOT EXISTS clips_lang ON clips(lang, approved)")
        self._index_bundled()
        self.blocks=VoiceBlocks(self)

    @contextmanager
    def db(self):
        # sqlite3.Connection.__exit__ commits but does NOT close the file.
        # Windows otherwise locks clips.sqlite and tests/upgrades fail.
        connection=sqlite3.connect(self.db_file, timeout=10)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def _index_bundled(self):
        root = bundle_dir()
        if not root.is_dir():
            return
        texts = {}
        manifest = root / "tour-v3" / "manifest.json"
        if manifest.is_file():
            content = json.loads(manifest.read_text(encoding="utf-8"))
            for entry in content.get("clips", []):
                name, text = entry.get("filename"), entry.get("text")
                if name and isinstance(text, str):
                    texts[name] = text
        with self.db() as db:
            for file in sorted(root.rglob("*.mp3")):
                if not is_mp3(file):
                    continue
                digest = sha_file(file)
                # "INSERT OR IGNORE" is deliberate: never undo owner's manual review.
                db.execute("""INSERT OR IGNORE INTO clips
                  (id,name,lang,path,draft,source) VALUES(?,?,?,?,?,?)""",
                  (digest,file.name,language_of(file.name),str(file),texts.get(file.name,""),"bundled"))
                # Preserve old records, but repair moved bundled files after an upgrade.
                db.execute("""UPDATE clips SET path=? WHERE id=? AND source='bundled'""",
                           (str(file),digest))

    def add(self, path: Path, lang: str) -> bool:
        if lang not in LANGUAGES:
            raise ValueError("Unsupported language")
        if path.suffix.lower() != ".mp3" or not is_mp3(path):
            raise ValueError("Only valid MP3 files up to 150 MB can be added")
        digest = sha_file(path)
        target = self.store / (digest + ".mp3")
        if not target.exists():
            shutil.copyfile(path,target)
        with self.db() as db:
            result = db.execute("""INSERT OR IGNORE INTO clips
                (id,name,lang,path,source) VALUES(?,?,?,?,?)""",
                (digest,path.name,lang,str(target),"manual"))
        return result.rowcount > 0

    def list(self, lang: str):
        if lang not in LANGUAGES:
            return []
        with self.db() as db:
            db.row_factory = sqlite3.Row
            return [dict(x) for x in db.execute("""SELECT id,name,lang,draft,transcript,
                question,approved,source FROM clips WHERE lang=? ORDER BY approved DESC,name ASC""",
                (lang,))]

    def get(self, digest: str, *, approved_only=False):
        if not re.fullmatch(r"[a-f0-9]{64}", str(digest)):
            return None
        with self.db() as db:
            db.row_factory=sqlite3.Row
            row=db.execute("SELECT * FROM clips WHERE id=?",(digest,)).fetchone()
        if not row:
            return self.blocks.get(digest,approved_only=approved_only)
        if approved_only and not row["approved"]:
            return None
        p = Path(row["path"])
        if not p.is_file():
            return None
        return dict(row)

    def review(self, digest: str, text: str, question: str):
        if not text.strip() or not question.strip():
            raise ValueError("Для утверждения нужны текст записи и вопрос")
        if len(text) > 3000 or len(question) > 1000:
            raise ValueError("Text is too long")
        if not self.get(digest):
            raise ValueError("Recording is missing")
        with self.db() as db:
            db.execute("""UPDATE clips SET transcript=?,question=?,approved=1 WHERE id=?""",
                       (text.strip(),question.strip(),digest))

    def revoke(self,digest):
        with self.db() as db:
            db.execute("UPDATE clips SET approved=0 WHERE id=?",(digest,))
        self.blocks.invalidate_source(digest)

    def answer(self, question: str, language: str):
        if language not in LANGUAGES or not isinstance(question,str) or len(question)>1000:
            return None
        key=normalise(question)
        if not key:
            return None
        with self.db() as db:
            db.row_factory=sqlite3.Row
            rows=db.execute("""SELECT * FROM clips WHERE approved=1 AND lang=?
                               AND question<>'' AND transcript<>''""",(language,)).fetchall()
        # Intentional exact Q&A matching. Never use fuzzy topic text to play
        # a random recording as an allegedly correct answer.
        for row in rows:
            if normalise(row["question"])==key:
                p=Path(row["path"])
                if p.is_file():
                    return {"id":row["id"],"text":row["transcript"]}
        return self.blocks.answer(question,language)

    def counts(self):
        with self.db() as db:
            total, approved = db.execute("SELECT COUNT(*),COALESCE(SUM(approved),0) FROM clips").fetchone()
        return {"total":total,"approved":approved,**self.blocks.counts()}


def voice_api(library: Library):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):
            pass

        def allow_origin(self):
            origin=self.headers.get("Origin")
            return origin is None or origin==TEST_ORIGIN

        def common(self,typ,size):
            self.send_header("Content-Type",typ)
            self.send_header("Content-Length",str(size))
            self.send_header("Cache-Control","no-store")
            self.send_header("X-Content-Type-Options","nosniff")
            self.send_header("Access-Control-Allow-Origin",TEST_ORIGIN)
            self.send_header("Access-Control-Allow-Private-Network","true")
            self.send_header("Vary","Origin")

        def json(self,status,data):
            payload=json.dumps(data,ensure_ascii=False).encode("utf-8")
            self.send_response(status);self.common("application/json; charset=utf-8",len(payload))
            self.end_headers();self.wfile.write(payload)

        def do_OPTIONS(self):
            if not self.allow_origin():
                return self.json(403,{"error":"Origin denied"})
            self.send_response(204);self.common("application/json",0)
            self.send_header("Access-Control-Allow-Methods","GET,POST,OPTIONS")
            self.send_header("Access-Control-Allow-Headers","Content-Type")
            self.end_headers()

        def do_GET(self):
            if not self.allow_origin():
                return self.json(403,{"error":"Origin denied"})
            route=urlsplit(self.path)
            if route.path=="/v1/status":
                return self.json(200,{"ok":True,"mode":"approved-mp3-and-reviewed-blocks",**library.counts()})
            if route.path=="/v1/audio":
                digest=parse_qs(route.query).get("id",[""])[0]
                item=library.get(digest,approved_only=True)
                if not item:
                    return self.json(404,{"error":"Audio unavailable"})
                data=Path(item["path"]).read_bytes()
                self.send_response(200);self.common("audio/mpeg",len(data))
                self.end_headers();self.wfile.write(data)
                return
            self.json(404,{"error":"Not found"})

        def do_POST(self):
            if not self.allow_origin():
                return self.json(403,{"error":"Origin denied"})
            if urlsplit(self.path).path!="/v1/find":
                return self.json(404,{"error":"Not found"})
            try:
                size=int(self.headers.get("Content-Length","0"))
                if size<1 or size>4096:
                    raise ValueError("Bad size")
                raw=json.loads(self.rfile.read(size))
                question=raw["question"]
                language=raw.get("language","ru")
                if not isinstance(question,str) or len(question)>1000 or language not in LANGUAGES:
                    raise ValueError("Bad request")
            except (ValueError,TypeError,KeyError,json.JSONDecodeError):
                return self.json(400,{"error":"Bad input"})
            item=library.answer(question,language)
            if not item:
                return self.json(200,{"found":False})
            return self.json(200,{"found":True,**item,
              "audio_url":f"http://127.0.0.1:{PORT}/v1/audio?id="+item["id"]})
    return ThreadingHTTPServer((HOST,PORT),Handler)


class App:
    def __init__(self,root):
        self.root=root
        self.db=Library(data_dir())
        self.server=None
        self.selected=None
        self.records=[]
        root.title("JARVIX Voice Library — 552 MP3 · сборка фраз")
        root.geometry("960x700")
        root.minsize(770,540)
        self.lang=tk.StringVar(value="ru")
        self.status=tk.StringVar(value="Записи без утверждённого текста не используются как ответы.")
        frame=ttk.Frame(root,padding=14)
        frame.pack(fill="both",expand=True)
        head=ttk.Frame(frame);head.pack(fill="x")
        ttk.Label(head,text="JARVIX Voice Library",font=("Segoe UI",18,"bold")).pack(side="left")
        ttk.Label(head,text="     Язык:").pack(side="left")
        cmb=ttk.Combobox(head,textvariable=self.lang,values=LANGUAGES,state="readonly",width=6)
        cmb.pack(side="left");cmb.bind("<<ComboboxSelected>>",lambda e:self.refresh())
        ttk.Button(head,text="Добавить MP3",command=self.add_files).pack(side="right")
        ttk.Button(head,text="Конструктор фраз",command=self.open_blocks).pack(side="right",padx=(0,8))
        body=ttk.Panedwindow(frame,orient="horizontal");body.pack(fill="both",expand=True,pady=14)
        left=ttk.Frame(body);right=ttk.Frame(body)
        body.add(left,weight=2);body.add(right,weight=3)
        self.files=tk.Listbox(left,exportselection=False,font=("Consolas",10))
        self.files.pack(fill="both",expand=True)
        self.files.bind("<<ListboxSelect>>",self.select)
        ttk.Label(right,text="Что реально произносится (проверь прослушиванием):").pack(anchor="w")
        self.text=scrolledtext.ScrolledText(right,height=9,wrap="word")
        self.text.pack(fill="both",expand=True,pady=6)
        ttk.Label(right,text="На какой вопрос отвечает эта запись?").pack(anchor="w")
        self.question=ttk.Entry(right);self.question.pack(fill="x",pady=6)
        controls=ttk.Frame(right);controls.pack(fill="x",pady=4)
        ttk.Button(controls,text="▶ Слушать",command=self.play).pack(side="left",padx=(0,5))
        ttk.Button(controls,text="✓ Утвердить",command=self.approve).pack(side="left",padx=(0,5))
        ttk.Button(controls,text="Отменить",command=self.revoke).pack(side="left")
        testing=ttk.LabelFrame(frame,text="Проверить бесплатный голосовой ответ",padding=9)
        testing.pack(fill="x")
        self.lookup=ttk.Entry(testing);self.lookup.pack(side="left",fill="x",expand=True,padx=(0,7))
        self.lookup.insert(0,"Привет, JARVIX")
        ttk.Button(testing,text="Найти",command=self.find).pack(side="right")
        ttk.Label(frame,textvariable=self.status,wraplength=890,foreground="#315e7c").pack(fill="x",pady=(12,0))
        self.refresh()
        try:
            self.server=voice_api(self.db)
            threading.Thread(target=self.server.serve_forever,daemon=True).start()
            self.status.set("552 оригинальных MP3 в комплекте. Локальная связь на 127.0.0.1:8770 включена.")
        except OSError:
            self.status.set("Библиотека открыта. Порт 8770 занят другим приложением.")
        root.protocol("WM_DELETE_WINDOW",self.close)

    def refresh(self):
        self.records=self.db.list(self.lang.get())
        self.files.delete(0,"end")
        for row in self.records:
            self.files.insert("end",("✓ " if row["approved"] else "· ")+row["name"])

    def select(self,_event=None):
        selection=self.files.curselection()
        if not selection:
            return
        row=self.records[selection[0]]
        self.selected=row["id"]
        self.text.delete("1.0","end")
        self.text.insert("1.0",row["transcript"] or row["draft"])
        self.question.delete(0,"end")
        self.question.insert(0,row["question"])

    def play(self):
        return self.play_item(self.selected)

    def play_item(self,identity):
        if not identity:
            return
        item=self.db.get(identity)
        if not item:
            return self.status.set("MP3 не найден")
        p=Path(item["path"])
        try:
            if os.name=="nt":
                os.startfile(str(p))
            elif sys.platform=="darwin":
                import subprocess
                subprocess.Popen(["open",str(p)])
            else:
                import subprocess
                subprocess.Popen(["xdg-open",str(p)])
        except OSError as err:
            self.status.set("Не удалось запустить проигрыватель: "+str(err))

    def approve(self):
        if not self.selected:
            return self.status.set("Выбери MP3")
        if not messagebox.askyesno("Проверка записанного голоса",
            "Ты прослушал MP3 и убедился, что текст полностью соответствует записи?"):
            return
        try:
            self.db.review(self.selected,self.text.get("1.0","end"),self.question.get())
            self.status.set("Текст и вопрос утверждены. JARVIX может использовать этот MP3.")
            self.refresh()
        except ValueError as err:
            self.status.set(str(err))

    def revoke(self):
        if self.selected:
            self.db.revoke(self.selected)
            self.status.set("Автоматическое использование этой записи отключено.")
            self.refresh()

    def add_files(self):
        paths=filedialog.askopenfilenames(filetypes=[("Аудио MP3","*.mp3")])
        count=0
        for filename in paths:
            try:
                if self.db.add(Path(filename),self.lang.get()):
                    count+=1
            except (OSError,ValueError) as err:
                self.status.set(str(err))
        self.refresh()
        if count:
            self.status.set(f"Добавлено новых записей: {count} (пока не утверждены).")

    def find(self):
        item=self.db.answer(self.lookup.get(),self.lang.get())
        if not item:
            return self.status.set("Утверждённого ответа на этот вопрос ещё нет.")
        self.selected=item["id"]
        self.status.set("Найден утверждённый ответ: "+item["text"])
        self.play_item(item["id"])

    def open_blocks(self):
        win=tk.Toplevel(self.root)
        win.title("JARVIX — конструктор голосовых фраз (без платных AI)")
        win.geometry("730x590")
        win.transient(self.root)
        main=ttk.Frame(win,padding=16);main.pack(fill="both",expand=True)
        ttk.Label(main,text="1. Добавить кубик из прослушанной MP3",font=("Segoe UI",12,"bold")).pack(anchor="w")
        ttk.Label(main,text="Сначала выдели утверждённую запись в основном окне. Секунды указываются вручную.").pack(anchor="w",pady=5)
        row=ttk.Frame(main);row.pack(fill="x",pady=5)
        ttk.Label(row,text="Произнесённый фрагмент:").pack(side="left")
        fragment=ttk.Entry(row);fragment.pack(side="left",fill="x",expand=True,padx=8)
        time_row=ttk.Frame(main);time_row.pack(fill="x",pady=5)
        ttk.Label(time_row,text="Начало, сек:").pack(side="left")
        start=ttk.Entry(time_row,width=9);start.insert(0,"0.0");start.pack(side="left",padx=8)
        ttk.Label(time_row,text="Конец, сек:").pack(side="left")
        end=ttk.Entry(time_row,width=9);end.insert(0,"1.0");end.pack(side="left",padx=8)
        ttk.Label(main,text="Сохранённые кубики выбранного языка:").pack(anchor="w",pady=3)
        fragments=tk.Listbox(main,height=5)
        fragments.pack(fill="x",pady=(0,9))
        def refresh_fragments():
            fragments.delete(0,"end")
            for seg in self.db.blocks.list_segments(self.lang.get()):
                fragments.insert("end",f'{seg["text"]} · {seg["start_ms"]/1000:.2f}–{seg["end_ms"]/1000:.2f} c')
        def save_fragment():
            if not self.selected:
                return messagebox.showwarning("JARVIX","Выбери исходную MP3 в основном окне.",parent=win)
            if not messagebox.askyesno("Проверка границ",
                    "Ты прослушала исходный MP3 и проверила, что указанный фрагмент точно произносится в эти секунды?",
                    parent=win):return
            try:
                self.db.blocks.create_segment(self.selected,fragment.get(),
                   float(start.get()),float(end.get()),human_confirmed=True)
                refresh_fragments()
                self.status.set("Голосовой фрагмент сохранён. Можно собирать фразы.")
            except (ValueError,RuntimeError) as error:
                messagebox.showerror("Фрагмент не добавлен",str(error),parent=win)
        ttk.Button(main,text="Сохранить утверждённый кубик",command=save_fragment).pack(anchor="w",pady=(0,14))
        ttk.Separator(main,orient="horizontal").pack(fill="x",pady=5)
        ttk.Label(main,text="2. Собрать новую фразу из одобренных кубиков",font=("Segoe UI",12,"bold")).pack(anchor="w",pady=(7,5))
        ttk.Label(main,text="Ответ произносится только если каждое слово покрыто записанными фрагментами.").pack(anchor="w")
        ttk.Label(main,text="Вопрос пользователя:").pack(anchor="w",pady=(9,2))
        question=ttk.Entry(main);question.pack(fill="x")
        ttk.Label(main,text="Текст нового ответа:").pack(anchor="w",pady=(9,2))
        sentence=ttk.Entry(main);sentence.pack(fill="x")
        note=tk.StringVar(value="Новый ответ не доступен JARVIX до прослушивания и отдельного утверждения.")
        ttk.Label(main,textvariable=note,wraplength=670).pack(fill="x",pady=8)
        state={"preview":None}
        def compose():
            try:
                identity,path,num=self.db.blocks.compose_preview(question.get(),
                    sentence.get(),self.lang.get())
                state["preview"]=identity
                note.set(f"Черновик из {num} фрагментов создан. Прослушай его перед публикацией.")
                self.play_item(identity)
            except (ValueError,RuntimeError) as error:
                state["preview"]=None
                note.set(str(error))
        def listen_preview():
            if state["preview"]:
                self.play_item(state["preview"])
            else:
                note.set("Сначала собери черновик.")
        def approve_preview():
            identity=state["preview"]
            if not identity:
                return note.set("Сначала собери и прослушай черновик.")
            if not messagebox.askyesno("Утверждение JARVIX",
              "Ты прослушала новый ответ, все слова и переходы звучат правильно, и вопрос подходит к ответу?",
              parent=win):return
            try:
                self.db.blocks.approve(identity,listened=True)
                note.set("Готово. Этот собранный MP3 разрешён для точного вопроса.")
                self.status.set("Утверждён собранный ответ: "+question.get())
            except ValueError as error:
                note.set(str(error))
        buttons=ttk.Frame(main);buttons.pack(fill="x",pady=6)
        ttk.Button(buttons,text="Собрать черновик",command=compose).pack(side="left",padx=(0,7))
        ttk.Button(buttons,text="▶ Прослушать",command=listen_preview).pack(side="left",padx=(0,7))
        ttk.Button(buttons,text="✓ Утвердить ответ",command=approve_preview).pack(side="left")
        refresh_fragments()

    def close(self):
        if self.server:
            self.server.shutdown();self.server.server_close()
        self.root.destroy()


def main():
    root=tk.Tk()
    App(root)
    root.mainloop()


if __name__=="__main__":
    main()
