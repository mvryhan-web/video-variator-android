#!/usr/bin/env python3
"""Prepare an UNSIGNED MSIX submission for Microsoft Store review.

This package MUST NOT be sideloaded or offered to users. After Microsoft Store
certification Microsoft re-signs the published MSIX with a trusted certificate.
Identity.Name and Publisher must come from the actual Partner Center listing.
No user identity is guessed and no certificate is fabricated.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import re
import shutil
import subprocess
import os
import xml.etree.ElementTree as ET

FOUNDATION = "http://schemas.microsoft.com/appx/manifest/foundation/windows10"
UAP = "http://schemas.microsoft.com/appx/manifest/uap/windows10"
UAP10 = "http://schemas.microsoft.com/appx/manifest/uap/windows10/10"
RESCAP = "http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"

ET.register_namespace("", FOUNDATION)
ET.register_namespace("uap", UAP)
ET.register_namespace("uap10", UAP10)
ET.register_namespace("rescap", RESCAP)


def validate_identity(name: str, publisher: str, version: str, publisher_display: str) -> None:
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{2,99}", name):
        raise ValueError("Use the exact Partner Center package identity Name, not a guessed app name")
    if not publisher.startswith("CN=") or len(publisher) > 500 or any(c in publisher for c in "\r\n<>"):
        raise ValueError("Publisher must match the exact Partner Center publisher distinguished name")
    if not re.fullmatch(r"\d{1,5}\.\d{1,5}\.\d{1,5}\.\d{1,5}", version):
        raise ValueError("Package version must be four nonnegative dotted integers")
    if not publisher_display.strip() or len(publisher_display) > 256:
        raise ValueError("Verified Store publisher display name is required")


def render_manifest(name: str, publisher: str, display: str,
                    version: str = "0.2.0.0") -> bytes:
    validate_identity(name, publisher, version, display)
    root = ET.Element(f"{{{FOUNDATION}}}Package", {
        "IgnorableNamespaces": "uap uap10 rescap",
    })
    ET.SubElement(root, f"{{{FOUNDATION}}}Identity", {
        "Name": name, "Publisher": publisher,
        "Version": version, "ProcessorArchitecture": "x64",
    })
    props = ET.SubElement(root, f"{{{FOUNDATION}}}Properties")
    for key, value in (
        ("DisplayName", "JARVIX NEW"),
        ("PublisherDisplayName", display),
        ("Description", "JARVIX NEW Desktop Coordinator"),
        ("Logo", r"Assets\StoreLogo.png"),
    ):
        ET.SubElement(props, f"{{{FOUNDATION}}}{key}").text = value
    resources = ET.SubElement(root, f"{{{FOUNDATION}}}Resources")
    ET.SubElement(resources, f"{{{FOUNDATION}}}Resource", {"Language": "ru-RU"})
    ET.SubElement(resources, f"{{{FOUNDATION}}}Resource", {"Language": "en-US"})
    ET.SubElement(resources, f"{{{FOUNDATION}}}Resource", {"Language": "fr-FR"})
    ET.SubElement(resources, f"{{{FOUNDATION}}}Resource", {"Language": "es-ES"})
    deps = ET.SubElement(root, f"{{{FOUNDATION}}}Dependencies")
    ET.SubElement(deps, f"{{{FOUNDATION}}}TargetDeviceFamily", {
        "Name": "Windows.Desktop", "MinVersion": "10.0.19041.0",
        "MaxVersionTested": "10.0.26100.0",
    })
    capabilities = ET.SubElement(root, f"{{{FOUNDATION}}}Capabilities")
    ET.SubElement(capabilities, f"{{{RESCAP}}}Capability", {"Name": "runFullTrust"})
    applications = ET.SubElement(root, f"{{{FOUNDATION}}}Applications")
    app = ET.SubElement(applications, f"{{{FOUNDATION}}}Application", {
        "Id": "JARVIXNEW", "Executable": r"JARVIX_NEW\JARVIX_NEW.exe",
        f"{{{UAP10}}}RuntimeBehavior": "packagedClassicApp",
        f"{{{UAP10}}}TrustLevel": "mediumIL",
    })
    ET.SubElement(app, f"{{{UAP}}}VisualElements", {
        "DisplayName": "JARVIX NEW",
        "Description": "DEEPSYQ desktop companion — test",
        "Square150x150Logo": r"Assets\Square150x150Logo.png",
        "Square44x44Logo": r"Assets\Square44x44Logo.png",
        "BackgroundColor": "transparent",
    })
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def find_makeappx() -> Path:
    base = Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"))
    locations = list((base / "Windows Kits" / "10" / "bin").glob(r"*\x64\makeappx.exe"))
    if not locations:
        raise RuntimeError("Windows SDK MakeAppx.exe is unavailable; cannot prepare a Store package")
    return sorted(locations)[-1]


def build(args: argparse.Namespace) -> Path:
    manifest = render_manifest(args.name, args.publisher, args.publisher_display, args.version)
    repo = Path(__file__).resolve().parents[1]
    frozen = repo / "dist" / "JARVIX_NEW"
    if not (frozen / "JARVIX_NEW.exe").is_file():
        raise RuntimeError("Frozen Windows application missing: build with PyInstaller first")
    icon = repo / "build" / "jarvix-new-icon" / "jarvix-new.png"
    if not icon.is_file():
        raise RuntimeError("Owner-approved original icon missing; refusing a substituted logo")
    from PIL import Image
    with Image.open(icon) as image:
        if image.size != (1024, 1024):
            raise RuntimeError("Unexpected original icon size")
        art = image.convert("RGBA")
    stage = repo / "build" / "store-submission"
    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir(parents=True)
    shutil.copytree(frozen, stage / "JARVIX_NEW")
    assets = stage / "Assets"
    assets.mkdir()
    for name, size in (("StoreLogo", (50, 50)),
                       ("Square44x44Logo", (44, 44)),
                       ("Square150x150Logo", (150, 150))):
        art.resize(size, Image.Resampling.LANCZOS).save(assets / (name + ".png"))
    (stage / "AppxManifest.xml").write_bytes(manifest)
    output = repo / "dist" / "JARVIX_NEW-STORE-UNSIGNED.msix"
    if output.exists():
        output.unlink()
    subprocess.run([str(find_makeappx()), "pack", "/d", str(stage),
                    "/p", str(output), "/o"], check=True, timeout=240)
    if not output.is_file() or output.stat().st_size < 1_000_000:
        raise RuntimeError("Generated MSIX is missing or unexpectedly small")
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", required=True, help="Package identity Name from Partner Center")
    parser.add_argument("--publisher", required=True, help="Publisher DN from Partner Center")
    parser.add_argument("--publisher-display", required=True, help="Verified display name")
    parser.add_argument("--version", default="0.2.0.0")
    parser.add_argument("--manifest-only", action="store_true")
    args = parser.parse_args()
    if args.manifest_only:
        print(render_manifest(args.name, args.publisher, args.publisher_display,
                              args.version).decode("utf-8"))
        return
    output = build(args)
    print("Created UNSIGNED STORE SUBMISSION PACKAGE:", output)
    print("NOT INSTALLABLE OR TRUSTED BY ITSELF. Submit to Partner Center.")
    print("Never redistribute this unsigned package outside Store certification.")


if __name__ == "__main__":
    main()
