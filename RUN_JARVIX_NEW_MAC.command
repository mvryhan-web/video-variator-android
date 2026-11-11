#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -f "vendor/voiceos/main.py" ]]; then
  echo "Missing open-source VoiceOS. Switch to the jarvis-new branch."
  exit 1
fi
python3 -c 'import sys; assert sys.version_info >= (3,10), "Python 3.10+ required"; import tkinter'
STATE="$HOME/Library/Application Support/JARVIX_NEW"
VENV="$STATE/venv"
mkdir -p "$STATE"
if [[ ! -x "$VENV/bin/python" ]]; then
  python3 -m venv "$VENV"
fi
"$VENV/bin/python" -m pip install --disable-pip-version-check \
  "Pillow==11.3.0" "imageio-ffmpeg==0.6.0"
if [[ "$#" -ge 1 ]] && [[ "$1" == "voice" ]]; then
  echo "Installing original VoiceOS dependencies (optional large download)."
  "$VENV/bin/python" -m pip install -r "vendor/voiceos/requirements.txt"
  "$VENV/bin/python" -m pip install -e "vendor/voiceos"
fi
"$VENV/bin/python" -m jarvis_new.desktop
