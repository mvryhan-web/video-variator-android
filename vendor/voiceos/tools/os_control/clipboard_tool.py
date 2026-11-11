import pyperclip


class ClipboardTool:

    def copy_text(self):

        return pyperclip.paste()

    def set_clipboard(self, text):

        pyperclip.copy(text)

        return "Clipboard updated."