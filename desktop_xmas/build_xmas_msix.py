#!/usr/bin/env python3
"""Build unsigned Microsoft Store submission MSIX for Deepsyq.XmasPC (Store ID: 9PDN61GVCSMJ)."""
import os
import shutil
import subprocess
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw

FOUNDATION = "http://schemas.microsoft.com/appx/manifest/foundation/windows10"
UAP = "http://schemas.microsoft.com/appx/manifest/uap/windows10"
UAP10 = "http://schemas.microsoft.com/appx/manifest/uap/windows10/10"
RESCAP = "http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"

ET.register_namespace("", FOUNDATION)
ET.register_namespace("uap", UAP)
ET.register_namespace("uap10", UAP10)
ET.register_namespace("rescap", RESCAP)

NAME = "Deepsyq.XmasPC"
PUBLISHER = "CN=7B5BC7EE-DA65-44E2-8CAC-D02C7C2CA333"
PUBLISHER_DISPLAY = "Deepsyq"
VERSION = "1.0.0.0"

def make_manifest() -> bytes:
    root = ET.Element(f"{{{FOUNDATION}}}Package", {"IgnorableNamespaces": "uap uap10 rescap"})
    ET.SubElement(root, f"{{{FOUNDATION}}}Identity", {
        "Name": NAME,
        "Publisher": PUBLISHER,
        "Version": VERSION,
        "ProcessorArchitecture": "x64",
    })
    props = ET.SubElement(root, f"{{{FOUNDATION}}}Properties")
    for k, v in (
        ("DisplayName", "Xmas PC by Deepsyq"),
        ("PublisherDisplayName", PUBLISHER_DISPLAY),
        ("Description", "Interactive Winter Desktop & Holiday Atmosphere by DEEPSYQ"),
        ("Logo", r"Assets\StoreLogo.png"),
    ):
        ET.SubElement(props, f"{{{FOUNDATION}}}{k}").text = v
    res = ET.SubElement(root, f"{{{FOUNDATION}}}Resources")
    for lang in ("ru-RU", "en-US", "fr-FR", "es-ES"):
        ET.SubElement(res, f"{{{FOUNDATION}}}Resource", {"Language": lang})
    deps = ET.SubElement(root, f"{{{FOUNDATION}}}Dependencies")
    ET.SubElement(deps, f"{{{FOUNDATION}}}TargetDeviceFamily", {
        "Name": "Windows.Desktop",
        "MinVersion": "10.0.19041.0",
        "MaxVersionTested": "10.0.26100.0",
    })
    caps = ET.SubElement(root, f"{{{FOUNDATION}}}Capabilities")
    ET.SubElement(caps, f"{{{RESCAP}}}Capability", {"Name": "runFullTrust"})
    apps = ET.SubElement(root, f"{{{FOUNDATION}}}Applications")
    app = ET.SubElement(apps, f"{{{FOUNDATION}}}Application", {
        "Id": "XmasPC",
        "Executable": r"XmasPC\DEEPSYQ-Xmas-PC.exe",
        f"{{{UAP10}}}RuntimeBehavior": "packagedClassicApp",
        f"{{{UAP10}}}TrustLevel": "mediumIL",
    })
    ET.SubElement(app, f"{{{UAP}}}VisualElements", {
        "DisplayName": "DEEPSYQ Xmas PC",
        "Description": "Interactive Winter Desktop with Snow, Snowman Builder, Santa & Snowplow Tractor",
        "Square150x150Logo": r"Assets\Square150x150Logo.png",
        "Square44x44Logo": r"Assets\Square44x44Logo.png",
        "BackgroundColor": "#0B1221",
    })
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)

def draw_holiday_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (11, 18, 33, 255))
    d = ImageDraw.Draw(img)
    # Festive pine tree & gold star
    cx = size // 2
    for layer in range(3):
        top_y = int(size * (0.18 + layer * 0.16))
        bot_y = int(size * (0.48 + layer * 0.18))
        hw = int(size * (0.18 + layer * 0.09))
        d.polygon([(cx, top_y), (cx - hw, bot_y), (cx + hw, bot_y)], fill=(22, 130, 82, 255))
    r = max(2, size // 14)
    d.ellipse((cx - r, int(size * 0.12) - r, cx + r, int(size * 0.12) + r), fill=(245, 208, 120, 255))
    return img

def main():
    repo = Path(__file__).resolve().parents[1]
    stage = repo / "build" / "xmas-store-msix"
    if stage.exists():
        shutil.rmtree(stage)
    (stage / "XmasPC").mkdir(parents=True)
    (stage / "Assets").mkdir(parents=True)

    exe_src = repo / "app" / "src" / "main" / "assets" / "downloads" / "DEEPSYQ-Xmas-PC.exe"
    shutil.copy2(exe_src, stage / "XmasPC" / "DEEPSYQ-Xmas-PC.exe")

    for name, sz in (("StoreLogo", 50), ("Square44x44Logo", 44), ("Square150x150Logo", 150)):
        draw_holiday_icon(sz).save(stage / "Assets" / f"{name}.png")

    (stage / "AppxManifest.xml").write_bytes(make_manifest())

    base = Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"))
    makeappx = sorted((base / "Windows Kits" / "10" / "bin").glob("*/x64/makeappx.exe"))[-1]
    out_dir = repo / "dist"
    out_dir.mkdir(exist_ok=True)
    out_msix = out_dir / "Deepsyq.XmasPC_1.0.0.0_x64.msix"
    if out_msix.exists():
        out_msix.unlink()
    subprocess.run([str(makeappx), "pack", "/d", str(stage), "/p", str(out_msix), "/nv"], check=True)
    print("Built MSIX:", out_msix, out_msix.stat().st_size)

if __name__ == "__main__":
    main()
