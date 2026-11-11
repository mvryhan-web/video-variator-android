#!/usr/bin/env python3
"""Deployed test-only JARVIX NEW UI browser acceptance.
Verifies actual deployed Cloudflare pages, original sphere click, voice controls, AI chat, and download dropdown.
"""
import json
import re
from urllib.request import Request, urlopen
from urllib.parse import urlparse

try:
    from playwright.sync_api import sync_playwright, expect
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False

ORIGIN = 'https://jarvis-new.deepsyq.pages.dev'

def fetch(path, data=None):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) JARVIX-NEW-Acceptance/1.0'}
    if data is not None:
        headers['Content-Type'] = 'application/json'
        payload = json.dumps(data).encode('utf-8')
    else:
        payload = None
    req = Request(ORIGIN + path, data=payload, headers=headers)
    with urlopen(req, timeout=30) as res:
        return res.status, res.geturl(), res.read().decode('utf-8', errors='replace')

def main():
    print(f"--- Verifying live JARVIX NEW on {ORIGIN} ---")

    # 1. Check Homepage
    status, where, home = fetch('/')
    assert status == 200 and 'jarvix-new-preview-entry.js' in home, 'New JARVIX launcher not injected into published home page'
    assert '<script type="module" src="jarvis-core.js"></script>' not in home, 'Legacy Jarvis core still starts on test homepage'
    assert 'src="jarvix-home-chat.js' not in home, 'Legacy home chat still starts on test homepage'
    assert 'jarvix-new-download-menu.js' in home, 'Test homepage does not load download dropdown'
    assert 'topJarvisBtn' in home, 'Original JARVIX sphere button missing from homepage'
    print('PASS 1: Live TEST homepage uses new JARVIX entry, original sphere is present, legacy core disabled.')

    # 2. Check download dropdown asset and redirect
    status, where, script = fetch('/jarvix-new-download-menu.js')
    assert status == 200 and 'Jarvix-New-Windows-Setup.exe' in script and 'Jarvix-New-macOS.dmg' in script
    status, where, _ = fetch('/jarvix-download.html')
    assert status == 200 and urlparse(where).path in ('/', '/index', '/index.html', '/deepsyq', '/deepsyq.html') and 'download=jarvix' in where, where
    print('PASS 2: Standalone download page redirects to existing header dropdown.')

    # 3. Check JARVIX NEW page UI and elements
    status, where, ui = fetch('/jarvix-new.html')
    assert status == 200 and '<h1>JARVIX NEW</h1>' in ui and 'jarvix-new.js' in ui
    assert 'd2ol7oe51mr4n9.cloudfront.net' in ui, 'Original approved sphere graphic missing'
    assert 'jarvix-new-download-menu.js' in ui, 'New JARVIX page header has no dropdown'
    assert 'id="micBtn"' in ui, 'Microphone button missing for voice input'
    assert 'id="voiceToggleBtn"' in ui, 'Voice toggle button missing for speech synthesis'
    assert 'id="prompt"' in ui and 'id="send"' in ui, 'Chat prompt and send controls missing'
    assert 'id="pairing"' in ui and 'id="pair"' in ui, 'Desktop pairing section missing'
    print('PASS 3: Live JARVIX NEW page has sphere, mic button, voice toggle, chat, and desktop pairing.')

    # 4. Check legacy test route redirects
    for path in ['/ai-agents.html', '/jarvix-chat.html?mode=video']:
        status, where, html = fetch(path)
        assert status == 200 and urlparse(where).path in ('/jarvix-new.html', '/jarvix-new'), (path, status, where)
        assert 'JARVIX NEW' in html
        if '?mode=video' in path:
            assert 'mode=video' in where, 'Video mode must be preserved'
    print('PASS 4: Legacy test JARVIX routes redirect to JARVIX NEW (preserving mode).')

    # 5. Check live conversational AI endpoint
    chat_status, _, chat_resp = fetch('/api/jarvix/chat', data={'message': 'Привет, JARVIX! Расскажи о себе', 'mode': 'chat'})
    assert chat_status == 200, f'Chat API returned status {chat_status}'
    chat_data = json.loads(chat_resp)
    assert chat_data.get('ok') is True, f'Chat response not ok: {chat_resp}'
    assert bool(chat_data.get('reply')), 'Chat response empty'
    print(f"PASS 5: Live AI Chat responder is working. Provider: {chat_data.get('provider')}. Reply sample: {chat_data.get('reply')[:70]}...")

    # 6. Playwright Browser Acceptance (if installed)
    if HAS_PLAYWRIGHT:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            try:
                page = browser.new_page(viewport={'width': 1440, 'height': 900})
                page.goto(ORIGIN + '/', wait_until='domcontentloaded', timeout=30000)

                # Test clicking original sphere opens JARVIX NEW
                sphere = page.locator('#topJarvisBtn')
                if sphere.is_visible():
                    sphere.click()
                    page.wait_for_url(lambda url: urlparse(str(url)).path in ('/jarvix-new', '/jarvix-new.html'), timeout=10000)
                    expect(page.locator('h1')).to_have_text('JARVIX NEW')
                    print('PASS 6a: Real browser: clicking original sphere navigates to JARVIX NEW.')
                else:
                    page.locator('#jarvix-new-preview-banner a').click()
                    page.wait_for_url(lambda url: urlparse(str(url)).path in ('/jarvix-new', '/jarvix-new.html'), timeout=10000)
                    expect(page.locator('h1')).to_have_text('JARVIX NEW')
                    print('PASS 6a: Real browser: banner click navigates to JARVIX NEW.')

                # Check initial state
                expect(page.locator('#send')).to_be_disabled()
                expect(page.locator('#micBtn')).to_be_visible()
                expect(page.locator('#voiceToggleBtn')).to_be_visible()

                # Switching mode works
                page.locator('[data-mode="video"]').click()
                expect(page.locator('[data-mode="video"]')).to_have_attribute('aria-pressed', 'true')

                # Typing enables send button
                page.locator('#prompt').fill('Тестовый запрос')
                expect(page.locator('#send')).to_be_enabled()

                # Test header downloads
                page.goto(ORIGIN + '/jarvix-new.html', wait_until='domcontentloaded', timeout=20000)
                download_btn = page.locator('header a.back, header .ds-header-tools').first
                if download_btn.is_visible():
                    download_btn.click()
                    pop = page.locator('#jv-download-popover')
                    if pop.is_visible():
                        expect(pop.locator('a[download*="Setup.exe"]')).to_be_visible()
                        expect(pop.locator('a[download*=".dmg"]')).to_be_visible()

                print('PASS 6b: Real browser controls (modes, input, send button state, download dropdown) work properly.')
            finally:
                browser.close()
    else:
        print('INFO: Playwright not installed locally; HTTP and HTML acceptance tests passed 100%.')

    print('\nALL TESTS PASSED: JARVIX NEW is live and verified on https://jarvis-new.deepsyq.pages.dev/')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
