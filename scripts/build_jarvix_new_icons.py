#!/usr/bin/env python3
"""Create desktop icons directly from the owner's ORIGINAL JARVIX sphere.

Source of truth: the current jarvix-approved-orb.js.
The generated ICO/ICNS/PNG contain only the resized original artwork.
No substituted orb, synthetic effects or generated graphics.
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path
import re
import sys
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "app" / "src" / "main" / "assets" / "jarvix-approved-orb.js"
OUTPUT = ROOT / "build" / "jarvix-new-icon"
ALLOWED_HOST = "d2ol7oe51mr4n9.cloudfront.net"
MAX_DOWNLOAD = 9 * 1024 * 1024


def get_original() -> Image.Image:
    js = JS.read_text(encoding="utf-8")
    match = re.search(r"OWNER_SPHERE_TEST_URL\s*=\s*['\"](https://[^'\"\s]+\.png)['\"]", js)
    if match is None:
        raise RuntimeError("Original JARVIX sphere source was not found: no substitution allowed")
    url = match.group(1)
    parts = urlparse(url)
    if parts.scheme != "https" or parts.hostname != ALLOWED_HOST or parts.username or parts.password:
        raise RuntimeError("Untrusted JARVIX icon source domain")
    req = Request(url, headers={"User-Agent": "JARVIX-NEW-asset-build/1.0"})
    with urlopen(req, timeout=35) as response:
        payload = response.read(MAX_DOWNLOAD + 1)
    if len(payload) > MAX_DOWNLOAD or payload[:8] != b"\x89PNG\r\n\x1a\n":
        raise RuntimeError("Owner's original sphere is missing or is not a bounded PNG")
    with Image.open(BytesIO(payload)) as source:
        if source.format != "PNG" or source.size != (1254, 1254):
            raise RuntimeError("Unexpected owner sphere dimensions; refusing to use another picture")
        source.verify()
    with Image.open(BytesIO(payload)) as source:
        return source.convert("RGBA")


def build() -> None:
    source = get_original()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    # Fixed transparent edges/alpha from the original; no new artwork.
    base = source.resize((1024, 1024), Image.Resampling.LANCZOS)
    base.save(OUTPUT / "jarvix-new.png", "PNG", optimize=True)
    base.save(OUTPUT / "jarvix-new.ico", "ICO",
              sizes=[(16, 16), (24, 24), (32, 32), (48, 48),
                     (64, 64), (128, 128), (256, 256)])
    base.save(OUTPUT / "jarvix-new.icns", "ICNS")
    for extension in (".png", ".ico", ".icns"):
        path = OUTPUT / ("jarvix-new" + extension)
        if not path.is_file() or path.stat().st_size < 1024:
            raise RuntimeError("Empty or suspicious JARVIX icon: " + str(path))
    print("Built ICO, ICNS and PNG from verified original 1254x1254 owner sphere.")


if __name__ == "__main__":
    build()
