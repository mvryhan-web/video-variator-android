"""Build self-hosted, photorealistic Christmas TEST background assets.

Runs only in the disposable Cloudflare Pages Preview build. NEVER modifies source
assets, production, app logic or existing approved visual themes.

Sources are independently documented free Unsplash photographs, not image-generation
mockups with accidental interface text:
 - desktop: Fabian Kleiser, Feb 2026,
   https://unsplash.com/photos/a-cozy-cabin-nestled-in-a-snowy-forest-landscape-ki5HQo7XwQQ
 - mobile: Dustin Bowdige, Jan 2022,
   https://unsplash.com/photos/a-cabin-is-lit-up-at-night-in-the-snow-qF7CJLUJFvM
See Unsplash License: https://unsplash.com/license
"""
from __future__ import annotations

import io
import os
import pathlib
import urllib.request

from PIL import Image, ImageOps, ImageEnhance, UnidentifiedImageError

TARGET = pathlib.Path(".soft-aurora-preview-build/themes/christmas")
assert TARGET.parent.parent.parent.name == ".soft-aurora-preview-build", "Output must stay isolated"
TARGET.mkdir(parents=True, exist_ok=True)

PHOTOS = [
    (
        "desktop",
        "https://images.unsplash.com/photo-1769934788449-11e74d1da6aa?fm=jpg&fit=max&w=3200&q=90",
        (2560, 1440),
        (.52, .54),
        "Fabian Kleiser",
        "https://unsplash.com/photos/a-cozy-cabin-nestled-in-a-snowy-forest-landscape-ki5HQo7XwQQ"
    ),
    (
        "mobile",
        "https://images.unsplash.com/photo-1642829597575-16fae76cc2da?fm=jpg&fit=max&w=2500&q=88",
        (1080, 1920),
        (.52, .55),
        "Dustin Bowdige",
        "https://unsplash.com/photos/a-cabin-is-lit-up-at-night-in-the-snow-qF7CJLUJFvM"
    )
]

def load_photo(url: str) -> Image.Image:
    if not url.startswith("https://images.unsplash.com/photo-"):
        raise ValueError("Unexpected upstream image source")
    req = urllib.request.Request(url, headers={
        "User-Agent": "DEEPSYQ-Preview-Asset-Build/1.0 (+https://deepsyq.app)",
        "Accept": "image/jpeg,image/*"
    })
    with urllib.request.urlopen(req, timeout=38) as response:
        content_type = response.headers.get("Content-Type", "").split(";", 1)[0].strip()
        if content_type not in ("image/jpeg", "image/jpg", "image/png", "image/webp"):
            raise ValueError("Upstream did not serve an image")
        raw = response.read(18_000_001)
        if len(raw) > 18_000_000 or len(raw) < 35_000:
            raise ValueError("Invalid upstream image size")
    try:
        image = Image.open(io.BytesIO(raw))
        image.load()
    except (UnidentifiedImageError, OSError) as e:
        raise ValueError("Downloaded content is not a decodable photo") from e
    image = ImageOps.exif_transpose(image).convert("RGB")
    if image.width < 1200 or image.height < 800:
        raise ValueError("Source photo resolution too low")
    return image

for name, url, dims, focus, credit, page in PHOTOS:
    source = load_photo(url)
    out = ImageOps.fit(
        source, dims, method=Image.Resampling.LANCZOS,
        centering=focus
    )
    # Restrain saturation slightly for premium winter atmosphere; never falsify
    # lighting or add generated structures, text, UI or logos.
    out = ImageEnhance.Color(out).enhance(0.96)
    webp = TARGET / f"winter-{name}.webp"
    jpg = TARGET / f"winter-{name}.jpg"
    out.save(webp, format="WEBP", quality=85, method=6)
    out.save(jpg, format="JPEG", quality=84, optimize=True, progressive=True, subsampling=0)
    with Image.open(webp) as saved:
        assert saved.size == dims, "WebP dimensions mismatch"
    with Image.open(jpg) as saved:
        assert saved.size == dims, "JPEG dimensions mismatch"
    for file in (webp,jpg):
        assert file.stat().st_size > 90_000, f"{file.name} appears corrupted"
        assert file.stat().st_size < 6_000_000, f"{file.name} too large"
    print("DEEPSYQ_CHRISTMAS_REAL_PHOTO_READY",{
        "variant": name, "dimensions": dims, "webp_size": webp.stat().st_size,
        "jpg_size": jpg.stat().st_size, "photographer": credit
    })

(TARGET / "PHOTO_CREDITS.txt").write_text(
    "DEEPSYQ TEST Christmas photographic backgrounds\n"
    "The two background photographs are licensed for use under the Unsplash License.\n"
    "Not AI-generated photographs. Cropped and optimized for the TEST design only.\n"
    "License: https://unsplash.com/license\n\n"
    + "\n".join(f"{name}: {credit}\nSource: {page}" for name, _, _, _, credit, page in PHOTOS)
    + "\n", encoding="utf-8"
)
print("DEEPSYQ_CHRISTMAS_ASSET_BUILD_PASS")
