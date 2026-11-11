#!/usr/bin/env python3
"""Read-only MSIX submission audit, after MakeAppx. No code signing or install.

Inspects the *actual* archive and its validated manifest before the package
is handed to the owner for Microsoft Partner Center submission.
"""
from __future__ import annotations
import argparse
import hashlib
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile, is_zipfile

FOUNDATION = "http://schemas.microsoft.com/appx/manifest/foundation/windows10"
UAP = "http://schemas.microsoft.com/appx/manifest/uap/windows10"
UAP10 = "http://schemas.microsoft.com/appx/manifest/uap/windows10/10"
RESCAP = "http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"


def audit(path: Path, name: str, publisher: str, publisher_display: str) -> dict:
    path = path.resolve(strict=True)
    if path.suffix.lower() != ".msix" or not is_zipfile(path):
        raise ValueError("Not a valid MSIX ZIP container")
    with ZipFile(path) as z:
        archive = {s.filename.replace("\\", "/").casefold(): s.filename for s in z.infolist()}
        required = (
            "appxmanifest.xml",
            "jarvix_new/jarvix_new.exe",
            "assets/storelogo.png",
            "assets/square44x44logo.png",
            "assets/square150x150logo.png",
        )
        for member in required:
            if member not in archive:
                raise ValueError(f"MSIX payload is missing {member}")
        for member in archive:
            if member.endswith((".pfx", ".key", ".pem", ".env")) or "/.env" in member:
                raise ValueError("MSIX contains a private key or development environment file")
        if z.testzip() is not None:
            raise ValueError("MSIX ZIP internal CRC validation failed")
        if z.read(archive["jarvix_new/jarvix_new.exe"])[:2] != b"MZ":
            raise ValueError("Frozen binary is not a Windows PE executable")
        manifest = ET.fromstring(z.read(archive["appxmanifest.xml"]))
        ns = {"f": FOUNDATION, "uap": UAP, "uap10": UAP10, "rescap": RESCAP}
        identity = manifest.find("f:Identity", ns)
        if identity is None:
            raise ValueError("MSIX manifest missing Package Identity")
        expected = {"Name": name, "Publisher": publisher, "ProcessorArchitecture": "x64"}
        for k, v in expected.items():
            if identity.get(k) != v:
                raise ValueError(f"Unexpected MSIX Package Identity {k}: not Partner Center identity")
        props = manifest.find("f:Properties", ns)
        if props is None or props.findtext("f:PublisherDisplayName", namespaces=ns) != publisher_display:
            raise ValueError("MSIX PublisherDisplayName differs from Partner Center")
        if props.findtext("f:DisplayName", namespaces=ns) != "JARVIX by DEEPSYQ":
            raise ValueError("MSIX application brand mismatch")
        app = manifest.find("f:Applications/f:Application", ns)
        if app is None or app.get("Executable", "").replace("\\", "/").casefold() != required[1]:
            raise ValueError("MSIX launcher does not point to frozen JARVIX executable")
        if app.get(f"{{{UAP10}}}RuntimeBehavior") != "packagedClassicApp":
            raise ValueError("Unexpected MSIX runtime behavior")
        if app.get(f"{{{UAP10}}}TrustLevel") != "mediumIL":
            raise ValueError("Unexpected MSIX process trust level")
        visual = app.find("uap:VisualElements", ns)
        if visual is None:
            raise ValueError("No Windows start menu visual elements")
        if manifest.find("f:Capabilities/rescap:Capability[@Name='runFullTrust']", ns) is None:
            raise ValueError("Classic Windows application runFullTrust declaration missing")
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    return {"name": name, "publisher": publisher, "publisher_display": publisher_display,
            "package_size": path.stat().st_size, "sha256": digest, "valid": True}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("path", type=Path)
    parser.add_argument("--name", required=True)
    parser.add_argument("--publisher", required=True)
    parser.add_argument("--publisher-display", required=True)
    args = parser.parse_args()
    report = audit(args.path, args.name, args.publisher, args.publisher_display)
    print("Verified Store-only MSIX payload:")
    for key, value in report.items():
        print(f"  {key}: {value}")
    print("Unsigned package — do not sideload, bypass SmartScreen or distribute directly.")


if __name__ == "__main__":
    main()
