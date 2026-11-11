from environment.active_window import get_active_window
from environment.clipboard_reader import get_clipboard
from environment.process_detector import list_running_apps


class ContextDetector:

    def get_context(self):

        context = {

            "active_window": get_active_window(),

            "clipboard": get_clipboard(),

            "running_apps": list_running_apps()[:10]

        }

        return context