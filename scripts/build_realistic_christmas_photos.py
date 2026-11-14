"""Build self-hosted, photorealistic Christmas TEST background assets.

Runs only in the disposable Cloudflare Pages Preview build. NEVER modifies source
assets, production, app logic or existing approved visual themes.

Sources are independently documented free Unsplash photographs, not image-generation
mockups with accidental interface text:
 - desktop: Kate Shashina (Christmas-lit cabin at night), Unsplash 2021,
   https://unsplash.com/photos/a-small-cabin-is-lit-up-with-christmas-lights-Dmczd2VgaHk
 - mobile: Vika Kirillova (snowy Christmas cottage and evergreen), Pexels 2022,
   https://www.pexels.com/photo/wooden-cabin-in-the-forest-decorated-for-christmas-10727609/
Licenses: https://unsplash.com/license ; https://www.pexels.com/license/
"""
from __future__ import annotations

import io
import os
import pathlib
import urllib.request

from PIL import Image, ImageOps, ImageEnhance, UnidentifiedImageError

TARGET = pathlib.Path(".soft-aurora-preview-build/themes/christmas")
assert TARGET.parents[1].name == ".soft-aurora-preview-build", "Output must stay isolated"
TARGET.mkdir(parents=True, exist_ok=True)

PHOTOS = [
    (
        "desktop",
        "https://images.unsplash.com/photo-1639162147668-a4b3599ba8e2?fm=jpg&fit=max&w=3200&q=90",
        (2560, 1440),
        (.51, .54),
        "Kate Shashina",
        "https://unsplash.com/photos/a-small-cabin-is-lit-up-with-christmas-lights-Dmczd2VgaHk"
    ),
    (
        "mobile",
        "https://images.pexels.com/photos/10727609/pexels-photo-10727609.jpeg?auto=compress&cs=tinysrgb&w=2300",
        (1080, 1920),
        (.79, .51),
        "Vika Kirillova",
        "https://www.pexels.com/photo/wooden-cabin-in-the-forest-decorated-for-christmas-10727609/"
    )
]

def load_photo(url: str) -> Image.Image:
    if not (url.startswith("https://images.unsplash.com/photo-") or
            url.startswith("https://images.pexels.com/photos/10727609/")):
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
    "Backgrounds are real photographs, not AI-generated or cartoon illustrations.\n"
    "Cropped and optimized for the TEST design only; not distributed as standalone stock photos.\n"
    "Desktop: Unsplash License https://unsplash.com/license\n"
    "Mobile: Pexels License https://www.pexels.com/license/\n\n"
    + "\n".join(f"{name}: {credit}\nSource: {page}" for name, _, _, _, credit, page in PHOTOS)
    + "\n", encoding="utf-8"
)
print("DEEPSYQ_CHRISTMAS_ASSET_BUILD_PASS")
