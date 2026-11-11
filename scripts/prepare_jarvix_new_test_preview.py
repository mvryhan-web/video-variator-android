#!/usr/bin/env python3
"""Prepare ONLY the temporary Cloudflare Pages preview tree for JARVIX NEW.

Do not touch production HTML/assets in Git. The preview has the same DEEPSYQ
shell, with old Jarvis core/home chat disabled on its two landing routes.
"""
from pathlib import Path
import re
import sys

assert len(sys.argv) == 2, 'Pass the isolated build output folder'
root=Path(sys.argv[1]).resolve(strict=True)
for name in ('index.html','deepsyq.html'):
    path=root/name
    content=path.read_text(encoding='utf-8')
    # Prevent legacy Jarvis startup from binding to the test home.
    content,core=re.subn(r'<script\s+type="module"\s+src="jarvis-core\.js"\s*></script>', '', content)
    content,home=re.subn(r'<script\s+type="module"\s+src="jarvix-home-chat\.js[^"]*"\s*></script>', '', content)
    if not core:
        raise RuntimeError('Unable to disable old JARVIX core in TEST copy of '+name)
    if not home:
        raise RuntimeError('Unable to disable old JARVIX home chat in TEST copy of '+name)
    injection='<script type="module" src="/jarvix-new-preview-entry.js"></script>'
    if '</body>' not in content:
        raise RuntimeError('Landing page missing </body>: '+name)
    content=content.replace('</body>',injection+'</body>',1)
    path.write_text(content,encoding='utf-8')
    print('TEST-ONLY: removed legacy Jarvis entry and installed NEW launcher on',name)
