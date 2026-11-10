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
    core={'canvas.html','canvas-workspace.js','canvas-workspace.css'}
    media={f'media/canvas-demos/20261110/canvas-demo-{i:02d}{ending}' for i in range(1,14) for ending in ('.webp','-thumb.webp')}
    approved=core|media
    assert set(mismatches)==(core&set(safe)), f'Unexpected changed baseline assets: {mismatches}'
    staged={str(f.relative_to(base)).replace('\\','/') for f in base.rglob('*') if f.is_file()}
    reserved={'_worker.js','_headers','_redirects','_routes.json','functions-filepath-routing-config.json'}
    extras=staged-set(safe)-reserved
    expected_added=approved-set(safe)
    assert extras==expected_added, f'Unexpected added files: {sorted(extras ^ expected_added)[:20]}'
    assert all((base/p).is_file() for p in approved)
    print(json.dumps({'verifiedManifestPaths':len(safe),'onlyChanged':sorted(mismatches),'onlyAdded':sorted(extras)}))
else:
    raise ValueError('mode must be scan, verify or diff')
