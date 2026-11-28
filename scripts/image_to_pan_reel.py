"""
DeepSyQ Image-to-MP4 Ken Burns Pan/Zoom Reels Generator.
Turns any high-CTR static promo image into a smooth, cinematic MP4 video
(pan left/right + gentle zoom) ready for Facebook Groups, Reels, Shorts, and TikTok.

Usage:
  python scripts/image_to_pan_reel.py input.jpg output.mp4 [--mode pan_right|pan_left|zoom_in] [--aspect 16:9|9:16|1:1] [--duration 7]
"""
import argparse
import os
import shutil
import subprocess
import sys

FFMPEG_FALLBACK = r"C:\Program Files\ffmpeg-7.1.1-essentials_build\bin\ffmpeg.exe"


def find_ffmpeg() -> str:
    found = shutil.which("ffmpeg")
    if found:
        return found
    if os.path.exists(FFMPEG_FALLBACK):
        return FFMPEG_FALLBACK
    raise FileNotFoundError("ffmpeg not found in PATH or default install location.")


def make_pan_reel(
    input_path: str,
    output_path: str,
    mode: str = "pan_right",
    aspect: str = "16:9",
    duration: int = 7,
    fps: int = 30,
) -> str:
    ffmpeg = find_ffmpeg()
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    dims = {
        "16:9": (1920, 1080),
        "9:16": (1080, 1920),
        "1:1": (1080, 1080),
    }
    w, h = dims.get(aspect, (1920, 1080))
    total_frames = duration * fps

    # Upscale source first so zoompan has crisp headroom with zero jitter
    if mode == "pan_right":
        # Gentle zoom 1.12x while panning smoothly from left to right
        zp = (
            f"zoompan=z='1.12+0.04*on/{total_frames}':"
            f"x='(iw-iw/zoom)*on/{total_frames}':"
            f"y='(ih-ih/zoom)/2':"
            f"d={total_frames}:s={w}x{h}:fps={fps}"
        )
    elif mode == "pan_left":
        # Gentle zoom 1.12x while panning smoothly from right to left
        zp = (
            f"zoompan=z='1.12+0.04*on/{total_frames}':"
            f"x='(iw-iw/zoom)*(1-on/{total_frames})':"
            f"y='(ih-ih/zoom)/2':"
            f"d={total_frames}:s={w}x{h}:fps={fps}"
        )
    else:  # zoom_in
        # Smooth centered cinematic push-in
        zp = (
            f"zoompan=z='min(1.0+0.14*on/{total_frames},1.18)':"
            f"x='iw/2-(iw/zoom/2)':"
            f"y='ih/2-(ih/zoom/2)':"
            f"d={total_frames}:s={w}x{h}:fps={fps}"
        )

    vf = (
        f"scale={w*2}:{h*2}:force_original_aspect_ratio=increase,"
        f"crop={w*2}:{h*2},"
        f"{zp},"
        f"format=yuv420p"
    )

    cmd = [
        ffmpeg,
        "-y",
        "-loop",
        "1",
        "-i",
        input_path,
        "-vf",
        vf,
        "-t",
        str(duration),
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-movflags",
        "+faststart",
        output_path,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"ffmpeg failed:\n{res.stderr}")
    return output_path


def main():
    parser = argparse.ArgumentParser(description="Convert static image to smooth Ken Burns MP4 Reel.")
    parser.add_argument("input", help="Path to source image (jpg/png/webp)")
    parser.add_argument("output", help="Path to destination .mp4")
    parser.add_argument("--mode", choices=["pan_right", "pan_left", "zoom_in"], default="pan_right")
    parser.add_argument("--aspect", choices=["16:9", "9:16", "1:1"], default="16:9")
    parser.add_argument("--duration", type=int, default=7)
    parser.add_argument("--fps", type=int, default=30)
    args = parser.parse_args()

    out = make_pan_reel(args.input, args.output, args.mode, args.aspect, args.duration, args.fps)
    size_kb = os.path.getsize(out) // 1024
    print(f"OK: {out} ({size_kb} KB, {args.duration}s, {args.aspect}, {args.mode})")


if __name__ == "__main__":
    main()
