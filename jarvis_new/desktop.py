"""JARVIX NEW desktop companion for Windows and macOS.

Native tkinter window over the *same* SQLite coordinator as VoiceOS tool calls.
No second AI brain or second chat history. No API calls and no paid actions.
VoiceOS host starts only when the user clicks its button.
"""
from __future__ import annotations

import os
from pathlib import Path
from queue import Empty, Queue
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from .coordinator import Coordinator, compress_one_photo, make_simulated_media
from .voiceos_tools import owner_coordinator
from .local_bridge import LocalBridge

BACKGROUND = "#141922"
PANEL = "#202734"
PANEL_LIGHT = "#2b3442"
TEXT = "#f3f5f7"
MUTED = "#bbc3ce"
ACCENT = "#e3a548"


def launch() -> None:
    window = tk.Tk()
    window.title("JARVIX NEW — Desktop Companion")
    window.geometry("920x640")
    window.minsize(670, 520)
    window.configure(background=BACKGROUND)
    App(window)
    window.mainloop()


class App:
    def __init__(self, root: tk.Tk, coordinator: Coordinator | None = None):
        self.root = root
        self.tasks = coordinator or owner_coordinator()
        self.messages: Queue[tuple[str, str]] = Queue()
        self.voice_process: subprocess.Popen | None = None
        self.local_bridge: LocalBridge | None = None

        self.style = ttk.Style()
        self.style.theme_use("clam")
        self.style.configure("Jarvix.Treeview", background=PANEL, fieldbackground=PANEL,
                             foreground=TEXT, rowheight=34, borderwidth=0)
        self.style.configure("Jarvix.Treeview.Heading", background=PANEL_LIGHT,
                             foreground=TEXT, borderwidth=0)
        self.style.map("Jarvix.Treeview", background=[("selected", "#3e4858")],
                       foreground=[("selected", TEXT)])
        self.style.configure("Jarvix.TCombobox", background=PANEL, foreground=TEXT)

        top = tk.Frame(root, bg=BACKGROUND)
        top.pack(fill="x", padx=24, pady=(20, 6))
        tk.Label(top, text="JARVIX NEW", font=("Arial", 22, "bold"),
                 fg=TEXT, bg=BACKGROUND).pack(side="left")
        tk.Label(top, text="Настольный координатор · тестовая сборка",
                 fg=MUTED, bg=BACKGROUND, font=("Arial", 11)).pack(side="right")

        tk.Label(root, text="Один журнал задач · Без платных API · Рабочий DEEPSYQ не затронут",
                 bg=BACKGROUND, fg=MUTED, anchor="w").pack(fill="x", padx=24, pady=(0, 16))

        actions = tk.Frame(root, bg=BACKGROUND)
        actions.pack(fill="x", padx=24, pady=(0, 12))
        self._button(actions, "Обновить отчёт", self.refresh).pack(side="left", padx=(0, 8))
        self._button(actions, "Сжать 1 фото", self.select_photo).pack(side="left", padx=(0, 8))
        self._button(actions, "Голосовой VoiceOS", self.start_voice).pack(side="left", padx=(0, 8))
        self._button(actions, "Демофайл", self.demo_selected).pack(side="left")

        connection = tk.Frame(root, bg=BACKGROUND)
        connection.pack(fill="x", padx=24, pady=(0, 10))
        self.bridge_button = self._button(connection, "Подключить тестовый сайт", self.toggle_bridge)
        self.bridge_button.pack(side="left")
        tk.Label(connection, text="Только этот компьютер · Без облачной синхронизации",
                 bg=BACKGROUND, fg=MUTED).pack(side="left", padx=(12, 0))

        panel = tk.Frame(root, bg=PANEL, padx=16, pady=16)
        panel.pack(fill="both", expand=True, padx=24, pady=(0, 16))
        tk.Label(panel, text="Новое задание", font=("Arial", 12, "bold"),
                 fg=TEXT, bg=PANEL).pack(anchor="w")

        compose = tk.Frame(panel, bg=PANEL)
        compose.pack(fill="x", pady=(12, 14))
        self.kind = tk.StringVar(value="image")
        self.kind_box = ttk.Combobox(compose, values=("image", "video", "music"),
                                     state="readonly", textvariable=self.kind, width=12)
        self.kind_box.pack(side="left", padx=(0, 10), ipady=5)
        self.prompt = tk.Entry(compose, bg=PANEL_LIGHT, fg=TEXT, insertbackground=TEXT,
                               relief="flat", font=("Arial", 11))
        self.prompt.pack(side="left", fill="x", expand=True, ipady=9)
        self.prompt.bind("<Return>", lambda _event: self.create_task())
        self._button(compose, "Принять", self.create_task).pack(side="left", padx=(10, 0))

        tk.Label(panel, text="Принятые задания (создание медиа пока отключено)",
                 fg=MUTED, bg=PANEL, anchor="w").pack(fill="x", pady=(4, 8))
        table_box = tk.Frame(panel, bg=PANEL)
        table_box.pack(fill="both", expand=True)
        self.table = ttk.Treeview(
            table_box, style="Jarvix.Treeview", show="headings",
            columns=("kind", "status", "title", "updated"),
            selectmode="browse",
        )
        labels = {"kind": "Тип", "status": "Статус", "title": "Задача", "updated": "Обновлено"}
        widths = {"kind": 95, "status": 115, "title": 360, "updated": 160}
        for col in labels:
            self.table.heading(col, text=labels[col])
            self.table.column(col, width=widths[col], anchor="w",
                              stretch=(col == "title"))
        self.table.pack(side="left", fill="both", expand=True)
        scroll = ttk.Scrollbar(table_box, orient="vertical", command=self.table.yview)
        scroll.pack(side="right", fill="y")
        self.table.configure(yscrollcommand=scroll.set)

        self.report_var = tk.StringVar(value="")
        tk.Label(root, textvariable=self.report_var, bg=BACKGROUND, fg=MUTED,
                 anchor="w").pack(fill="x", padx=24, pady=(0, 5))
        self.status_var = tk.StringVar(value="Готов к локальным заданиям")
        tk.Label(root, textvariable=self.status_var, bg=BACKGROUND, fg=ACCENT,
                 anchor="w", wraplength=830).pack(fill="x", padx=24, pady=(0, 20))

        self.root.protocol("WM_DELETE_WINDOW", self.close)
        self.root.after(250, self.drain_events)
        self.refresh()

    @staticmethod
    def _button(parent, label, command):
        return tk.Button(parent, text=label, command=command,
                         font=("Arial", 10, "bold"), bg=PANEL_LIGHT, fg=TEXT,
                         activebackground=ACCENT, activeforeground=BACKGROUND,
                         relief="flat", padx=12, pady=9, cursor="hand2")

    def refresh(self):
        for row in self.table.get_children():
            self.table.delete(row)
        for job in self.tasks.recent(100):
            self.table.insert("", "end", iid=job["id"],
                              values=(job["kind"], job["status"],
                                      job["prompt"][:100], job["updated_at"][:19]))
        counts = self.tasks.report()["counts"]
        self.report_var.set(
            f"Ожидают: {counts['queued']}   В работе: {counts['processing']}   "
            f"Готово: {counts['completed']}   Демо: {counts['simulated']}   "
            f"Ошибка: {counts['failed']}"
        )

    def create_task(self):
        prompt = self.prompt.get().strip()
        if not prompt:
            messagebox.showwarning("JARVIX NEW", "Опиши задание.")
            return
        try:
            job_id = self.tasks.submit(self.kind.get(), prompt)
        except Exception as error:
            messagebox.showerror("Не удалось создать задание", str(error))
            return
        self.prompt.delete(0, "end")
        self.status_var.set(f"Задание {job_id} записано. Пока в очереди, модель не запущена.")
        self.refresh()

    def _work(self, action, good_message):
        def runner():
            try:
                record = action()
                self.messages.put(("ok", f"{good_message}: {record['status']}"))
            except Exception as error:
                self.messages.put(("error", str(error)))
        threading.Thread(target=runner, daemon=True).start()

    def select_photo(self):
        source = filedialog.askopenfilename(
            parent=self.root, title="Выбери одну фотографию",
            filetypes=[("Изображения", "*.jpg *.jpeg *.png"), ("Все файлы", "*.*")],
        )
        if not source:
            return
        dest = filedialog.askdirectory(parent=self.root,
                                      title="Куда сохранить сжатую фотографию")
        if not dest:
            return
        job = self.tasks.submit("photo_compress", "Сжать выбранную фотографию", source)
        self.status_var.set("Сжатие фотографии выполняется локально…")
        self._work(lambda: compress_one_photo(self.tasks, job, Path(dest)),
                   "Фотография обработана")

    def demo_selected(self):
        selected = self.table.selection()
        if not selected:
            messagebox.showinfo("JARVIX NEW", "Сначала выбери одно задание из списка.")
            return
        item = self.tasks.get(selected[0])
        if item["kind"] not in ("image", "video", "music") or item["status"] != "queued":
            messagebox.showinfo("JARVIX NEW", "Демофайл можно создать для ожидающего image/video/music.")
            return
        if not messagebox.askyesno("Только симуляция",
                                   "Создать демонстрационный файл? Он НЕ генерируется AI-моделью."):
            return
        folder = filedialog.askdirectory(parent=self.root,
                                        title="Куда сохранить ДЕМО файл")
        if not folder:
            return
        self._work(lambda: make_simulated_media(self.tasks, item["id"], Path(folder)),
                   "Демонстрационный файл создан")

    def toggle_bridge(self):
        if self.local_bridge:
            self.local_bridge.stop()
            self.local_bridge = None
            self.bridge_button.configure(text="Подключить тестовый сайт")
            self.status_var.set("Связь с тестовым сайтом остановлена.")
            return
        try:
            bridge = LocalBridge(self.tasks)
            bridge.start()
        except OSError as error:
            messagebox.showerror("Тестовая связь недоступна", str(error))
            return
        self.local_bridge = bridge
        self.root.clipboard_clear()
        self.root.clipboard_append(bridge.token)
        self.bridge_button.configure(text="Отключить тестовый сайт")
        self.status_var.set("Локальная связь включена. Код подключения скопирован в буфер обмена.")
        messagebox.showinfo(
            "Тестовое подключение JARVIX NEW",
            "Код подключения скопирован. Открой на ЭТОМ ЖЕ компьютере:\n"
            "https://jarvis-new.deepsyq.pages.dev/jarvix-connect.html\n\n"
            "Вставь код на странице и нажми «Подключить».\n"
            "Передаются только описания и статусы тестовых задач.\n"
            "Это не удалённая синхронизация и не AI-генерация."
        )

    def start_voice(self):
        if getattr(sys, "frozen", False):
            messagebox.showinfo(
                "Голосовой режим — отдельная проверка",
                "Тестовый установщик включает локальный координатор и обработку фото.\n"
                "Голосовой движок VoiceOS, его модели и аудиозависимости в эту сборку не входят.\n"
                "Для голосовых тестов пока используйте отдельный запуск из исходного кода."
            )
            return
        if self.voice_process and self.voice_process.poll() is None:
            self.status_var.set("VoiceOS уже запущен как отдельный локальный процесс.")
            return
        if not messagebox.askyesno(
            "VoiceOS — требуются зависимости",
            "Запустить исходный VoiceOS в голосовом режиме?\n"
            "Нужны установленные Python-зависимости, микрофон и локальная AI-модель.\n"
            "Это не включает платные API.",
        ):
            return
        try:
            root = Path(__file__).resolve().parents[1]
            self.voice_process = subprocess.Popen(
                [sys.executable, "-m", "jarvis_new.launch",
                 "--provider", "local", "--mode", "voice"],
                cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                creationflags=(subprocess.CREATE_NEW_CONSOLE if os.name == "nt" else 0),
            )
            self.status_var.set(
                "Попытка запуска VoiceOS выполнена. Наличие живого голоса не подтверждено; "
                "проверь установленные модели и разрешения."
            )
        except Exception as error:
            messagebox.showerror("Не удалось запустить VoiceOS", str(error))

    def drain_events(self):
        try:
            while True:
                outcome, message = self.messages.get_nowait()
                self.status_var.set(message)
                if outcome == "error":
                    messagebox.showerror("JARVIX NEW", message)
                self.refresh()
        except Empty:
            pass
        self.root.after(250, self.drain_events)

    def close(self):
        if self.local_bridge:
            self.local_bridge.stop()
            self.local_bridge = None
        # Child voice processes started by this window do not outlive its consent.
        if self.voice_process and self.voice_process.poll() is None:
            self.voice_process.terminate()
        self.root.destroy()


if __name__ == "__main__":
    launch()
