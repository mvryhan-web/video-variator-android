#!/usr/bin/env python3
"""Read-only Cloudflare Pages deployment manifest audit. No network and no secrets."""
import base64
import json
from pathlib import Path
import sys
from blake3 import blake3

mode, manifest_path, folder = sys.argv[1:4]
base = Path(folder).resolve(strict=True)
manifest = json.loads(Path(manifest_path).read_text(encoding='utf-8'))
assert isinstance(manifest, dict) and len(manifest) >= 1000, 'Incomplete production file manifest'
safe = {}
for name, digest in manifest.items():
    assert name.startswith('/') and name not in ('/', '')
    rel = name.lstrip('/')
    parts = Path(rel).parts
    assert not any(x in ('.','..','') for x in parts), 'Invalid manifest path'
    assert len(digest)==32 and all(c in '0123456789abcdef' for c in digest)
    assert rel not in safe, 'Duplicate manifest entry'
    safe[rel]=digest

def wrangler_hash(filename, data):
    suffix=Path(filename).suffix.removeprefix('.').encode('ascii')
    return blake3(base64.b64encode(data)+suffix).hexdigest()[:32]

mismatches=[]
for name, expected in safe.items():
    file=base/name
    if not file.is_file():
        mismatches.append(name)
    elif wrangler_hash(name,file.read_bytes())!=expected:
        mismatches.append(name)

if mode=='scan':
    print(json.dumps({'count':len(safe),'mismatches':mismatches},separators=(',',':')))
elif mode=='verify':
    assert not mismatches, f'LIVE manifest differs on {len(mismatches)} paths: {mismatches[:20]}'
    print(json.dumps({'verified':len(safe),'mismatches':0}))
elif mode=='diff':
    approved={'canvas.html','canvas-workspace.js','canvas-workspace.css'}
    assert set(mismatches)==approved, f'Unexpected modified assets: {mismatches}'
    assert all((base/p).is_file() for p in approved)
    print(json.dumps({'verifiedManifestPaths':len(safe),'onlyChanged':sorted(mismatches)}))
else:
    raise ValueError('mode must be scan, verify or diff')
