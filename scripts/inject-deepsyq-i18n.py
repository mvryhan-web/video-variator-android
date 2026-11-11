#!/usr/bin/env python3
"""Inject only the shared DEEPSYQ localization loader into every HTML page.
Preserve every other original byte of page markup, locked images and layout.
"""
from pathlib import Path
import re
root=Path('app/src/main/assets')
tag='<script defer src="deepsyq-page-i18n.js?v=20261111"></script>'
pages=sorted(root.glob('*.html'))
assert len(pages)==34,f'Unexpected page count: {len(pages)}'
changed=[]
for page in pages:
 original=page.read_text(encoding='utf-8')
 assert original.count('</head>')==1,f'Unexpected HTML header: {page.name}'
 if tag in original:continue
 result=original.replace('</head>',tag+'\n</head>')
 assert result.replace(tag+'\n','')==original,f'Unrelated HTML change: {page.name}'
 page.write_text(result,encoding='utf-8')
 changed.append(page.name)
print('DEEPSYQ_I18N_LOADER_INJECTED',len(changed),changed)
