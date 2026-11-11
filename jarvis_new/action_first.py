"""Truthful, no-LLM fast path for JARVIX NEW's everyday coordinator commands.

Works with the original VoiceOS tool registry, never contacts a model,
and never claims that accepting a job generated media.
"""
from __future__ import annotations

import re

CREATE = re.compile(
    r"(?:\bсозда\w*|\bсдела\w*|\bсгенериру\w*|\bподготов\w*|"
    r"\bсоздай\b|\bсделай\b|\bгенериру\w*|"
    r"\bcreate\b|\bgenerate\b|\bmake\b|"
    r"\bcr[eé]e\w*|\bg[eé]n[eé]r\w*|"
    r"\bcrear\b|\bgenerar\b|\bhaz\b)", re.IGNORECASE
)
NEGATIVE = re.compile(
    r"(?:\bне\s+(?:созда|дела|генериру|подготов)|"
    r"\bdon.t\s+(?:make|create|generate)|"
    r"\bne\s+pas\s+(?:cr[eé]er|g[eé]n[eé]rer))", re.IGNORECASE
)
REPORT = re.compile(
    r"(?:что\s+(?:ты\s+)?(?:сегодня\s+|за\s+сегодня\s+)?(?:сделал|выполнил)|"
    r"отч[её]т|отчитайся|статус\s+задач|"
    r"какие\s+(?:есть\s+)?(?:задания|задачи)|"
    r"what\s+(?:did\s+you\s+do|have\s+you\s+done)|"
    r"task\s+(?:status|report)|"
    r"rapport\s+(?:des\s+)?t[aâ]ches|"
    r"estado\s+de\s+(?:las\s+)?tareas|qu[eé]\s+has\s+hecho)",
    re.IGNORECASE
)
KIND_WORDS = {
    "video": re.compile(r"(?:\bвидео\b|\bролик\w*|\bvideos?\b|\bvid[eé]os?\b)", re.IGNORECASE),
    "image": re.compile(
        r"(?:\bизображени\w*|\bкартинк\w*|\bрисунок\b|\bimages?\b|"
        r"\bphotos?\b|\bфото\b|\bфотограф\w*|\bfotos?\b)", re.IGNORECASE),
    "music": re.compile(
        r"(?:\bмузык\w*|\bтрек\w*|\bпесн\w*|\bmusic\b|\bsong\b|"
        r"\bmusique\b|\bcanci[oó]n\w*|\bm[uú]sica\b)", re.IGNORECASE),
}
PHOTO_COMPRESS = re.compile(
    r"(?:\bсожм\w*|\bсжать\b|\bуменьш\w*|\bcompress\w*|\bcomprim\w*)",
    re.IGNORECASE,
)


def identify(text: str) -> tuple[str, dict] | None:
    """Returns only safe actions. Ambiguous compound creation stays with VoiceOS."""
    message = str(text or "").strip()[:4000]
    if not message:
        return None
    if REPORT.search(message):
        return ("jarvix_new_task_report", {})
    if NEGATIVE.search(message):
        return None
    if PHOTO_COMPRESS.search(message) and KIND_WORDS["image"].search(message):
        return ("ask_photo", {})
    if not CREATE.search(message):
        return None
    kinds = [kind for kind, pattern in KIND_WORDS.items() if pattern.search(message)]
    if len(kinds) > 1:
        return ("ask_split", {})
    if len(kinds) == 1:
        return ("jarvix_new_accept_task", {"kind": kinds[0], "prompt": message})
    return None


async def handle(text: str, registry) -> str | None:
    action = identify(text)
    if not action:
        return None
    name, arguments = action
    if name == "ask_photo":
        return ("Для сжатия выбери фотографию и папку сохранения в JARVIX NEW Desktop. "
                "Я не буду самостоятельно читать файлы на компьютере.")
    if name == "ask_split":
        return ("В запросе несколько типов медиа. Отправь отдельные задания для видео, "
                "изображений и музыки, чтобы я не выбрал неверную модель.")
    answer = await registry.execute_tool(name, arguments)
    if not answer.get("ok"):
        return "Не удалось выполнить команду: " + str(answer.get("reason") or "нет доступа")
    if name == "jarvix_new_task_report":
        counts = answer.get("counts") or {}
        return (
            f"Журнал заданий: выполнено {counts.get('completed', 0)}, "
            f"ожидают {counts.get('queued', 0)}, "
            f"в работе {counts.get('processing', 0)}, "
            f"демонстрационных проверок {counts.get('simulated', 0)}, "
            f"ошибок {counts.get('failed', 0)}. "
            "Это реальные записи локального журнала, а не отчёт о генерации."
        )
    return (f"Принял и записал задание {answer['id']}. "
            "Оно в очереди. Генерация ещё не запущена, файл не создан.")
