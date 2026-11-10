#!/usr/bin/env python3
"""Upload ONLY the eight owner-approved My Creations images to permanent Cloudflare R2.

No Cloudflare Pages deployment, site code changes, Worker changes, public bucket
changes, or destructive object overwrites. Requires bucket-scoped R2 S3 credentials
in GitHub Actions secrets; never prints secrets or object contents.
"""
from __future__ import annotations
import hashlib
import os
from pathlib import Path
import sys

# SHA-256 values verified against the eight images supplied by the owner.
EXPECTED = {
    "crystal-bloom.webp": "3b5ccc6d24e19f4aeca58c8a6271df7b6b843fef6f2e16fd0217a9891c6ee223",
    "eclipse-portal.webp": "0e022345832dd617e106524425d4c3d95aafba39aff321cfbf39d7f966f10ffa",
    "velvet-rain.webp": "b47568ca40a2ce91d14224285cd5618cc4282bb3df47df5e1c70faee0cee6576",
    "bioluminescent-tide.webp": "c17728af71e85d06cad1d67e7f2474c03ccc4e9f2cc1cc374864cbac74054ee2",
    "skyward-citadel.webp": "417e43f68bcf4f97d2dedb1ab3ad5ca2fa5b13fe49a06adbb2d12126140c2abc",
    "porcelain-grace.webp": "c1c0d06e50be96c351cb694ab4d494f8247ad6f1ba07b3a4c83f7e019c61ba5c",
    "neon-rider.webp": "7a41c80a0fe7c10f6a6fc164c57d03d9179fa61e797d98d94072ea7051e0beeb",
    "sculpted-sound.webp": "8b52a4652e6df8ba160423166b5ac50f56e058d20f3e77e12bf075e1c74f51e2",
}
BUCKET = "deepsyq-media"
PREFIX = "my-creations/showcase/"
ASSETS = Path(__file__).resolve().parents[1] / "app/src/main/assets/media/my-creations/showcase"

def sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def main() -> int:
    import boto3
    from botocore.exceptions import ClientError
    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
    key_id = os.environ.get("CLOUDFLARE_R2_ACCESS_KEY_ID", "")
    secret = os.environ.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY", "")
    jurisdiction = os.environ.get("CLOUDFLARE_R2_JURISDICTION", "default").strip().lower()
    if not account or not key_id or not secret:
        print("R2_BLOCKED: Missing GitHub Actions R2 credentials; nothing uploaded.", file=sys.stderr)
        return 2
    if jurisdiction not in ("default", "eu", "us"):
        print("R2_BLOCKED: Unsupported jurisdiction; nothing uploaded.", file=sys.stderr)
        return 2
    actual = {p.name for p in ASSETS.glob("*.webp")}
    if actual != set(EXPECTED):
        print("R2_BLOCKED: Gallery filenames mismatch; nothing uploaded.", file=sys.stderr)
        return 2
    payloads = {}
    for filename, expected in EXPECTED.items():
        raw = (ASSETS / filename).read_bytes()
        if not (raw.startswith(b"RIFF") and raw[8:12] == b"WEBP" and sha(raw) == expected):
            print("R2_BLOCKED: Incorrect or damaged source: " + filename, file=sys.stderr)
            return 2
        payloads[filename] = raw
    hostname = account + ("." + jurisdiction if jurisdiction != "default" else "") + ".r2.cloudflarestorage.com"
    client = boto3.client(
        "s3",
        endpoint_url="https://" + hostname,
        region_name="auto",
        aws_access_key_id=key_id,
        aws_secret_access_key=secret,
        config=__import__("botocore.config", fromlist=["Config"]).Config(
            signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"}
        )
    )
    confirmed = 0
    for filename, raw in payloads.items():
        obj_key = PREFIX + filename
        try:
            existing = client.get_object(Bucket=BUCKET, Key=obj_key)
            old = existing["Body"].read()
            if sha(old) != EXPECTED[filename]:
                print("R2_BLOCKED: Existing object differs; refusing overwrite: " + obj_key, file=sys.stderr)
                return 2
            print("R2_ALREADY_STORED", obj_key, len(old))
        except ClientError as exc:
            status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
            error_code = exc.response.get("Error", {}).get("Code", "")
            if status != 404 and error_code not in ("NoSuchKey", "404"):
                print("R2_BLOCKED: Could not inspect object: " + obj_key + " (no overwrites)", file=sys.stderr)
                return 2
            try:
                client.put_object(
                    Bucket=BUCKET, Key=obj_key, Body=raw,
                    ContentType="image/webp",
                    CacheControl="public, max-age=3600",
                    IfNoneMatch="*",
                )
            except ClientError:
                print("R2_BLOCKED: R2 write failed for " + obj_key, file=sys.stderr)
                return 2
            readback = client.get_object(Bucket=BUCKET, Key=obj_key)["Body"].read()
            if sha(readback) != EXPECTED[filename]:
                print("R2_BLOCKED: Verification failed for " + obj_key, file=sys.stderr)
                return 2
            print("R2_STORED_AND_VERIFIED", obj_key, len(readback))
        confirmed += 1
    print("R2_EIGHT_ORIGINALS_STORED_AND_VERIFIED", confirmed, "bucket=" + BUCKET)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
