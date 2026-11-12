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


# The download chooser belongs to the existing top header on all TEST pages.
# Inject the same delegated menu script without touching original source files.
# Keep the obsolete standalone download HTML out of the published preview:
# its old URL is redirected to Home with this dropdown opened by the Worker.
download_page = root / 'jarvix-download.html'
if download_page.exists():
    download_page.unlink()
# Previous temporary JARVIX NEW text-chat was rejected. It must never be
# deployed as a user-facing route: the approved sphere IS the voice UI.
obsolete_chat = root / 'jarvix-new.html'
if obsolete_chat.exists():
    obsolete_chat.unlink()
menu_src = '<script type="module" src="/jarvix-new-download-menu.js"></script>'
count = 0
for path in root.glob('*.html'):
    html = path.read_text(encoding='utf-8')
    if '</body>' not in html:
        continue
    original_html = html
    # Continue the same voice session on public TEST destinations.
    if path.name not in ('404.html', 'deepsyq-admin.html', 'product-watcher-admin.html') and injection not in html:
        html = html.replace('</body>', injection + '</body>', 1)
    if menu_src not in html:
        html = html.replace('</body>', menu_src + '</body>', 1)
        count += 1
    if html != original_html:
        path.write_text(html, encoding='utf-8')
if count < 3:
    raise RuntimeError('Too few TEST HTML pages received JARVIX dropdown')
print(f'TEST-ONLY: attached shared header download menu to {count} HTML pages.')


# On the test website only, place the existing JARVIX download link immediately
# after the Tour button in the mobile header (instead of the opposite pod).
# Desktop unified header already orders Tour -> Download side by side.
mobile_js = root / 'deepsyq-mobile-shell.js'
mobile_content = mobile_js.read_text(encoding='utf-8')
old_placement = 'move(tools, left); move(tour, right); move(pricing, right); move(login, right);'
new_placement = 'move(tour, right); move(tools, right); move(pricing, right); move(login, right);'
if mobile_content.count(old_placement) != 1:
    raise RuntimeError('TEST mobile header placement anchor changed; do not deploy')
mobile_js.write_text(mobile_content.replace(old_placement, new_placement), encoding='utf-8')
print('TEST-ONLY: Download JARVIX placed beside Tour in mobile header, no duplicate button.')
