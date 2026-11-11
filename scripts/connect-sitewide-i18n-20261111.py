#!/usr/bin/env python3
"""Connect one existing, read-only locale loader to every DEEPSYQ HTML route.
Only adds a script reference before </head>. All site visuals unchanged.
"""
from pathlib import Path
import re
root=Path("app/src/main/assets")
files=sorted(root.glob("*.html"))
assert len(files)==34,f"Expected 34 page files, found {len(files)}"
tag='<script defer src="sitewide-i18n.js?v=20261111"></script>'
changed=0
for file in files:
    before=file.read_text(encoding="utf8")
    assert before.count("</head>")==1,f"HTML head incomplete: {file.name}"
    if tag in before:continue
    assert "sitewide-i18n.js" not in before,f"Other i18n loader already referenced: {file.name}"
    after=before.replace("</head>",tag+"\n</head>",1)
    assert after.replace(tag+"\n","",1)==before
    file.write_text(after,encoding="utf8")
    changed+=1
print(f"LOCALE_LOADER_CONNECTED: {changed} files; all {len(files)} HTML routes now covered")
