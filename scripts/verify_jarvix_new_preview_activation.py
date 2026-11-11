#!/usr/bin/env python3
"""Deployed test-only JARVIX NEW UI browser acceptance (NO desktop install).
Verifies actual deployed Cloudflare pages not just committed source.
"""
from urllib.request import Request, urlopen
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ORIGIN='https://jarvis-new.deepsyq.pages.dev'

def fetch(path):
    req=Request(ORIGIN+path,headers={'User-Agent':'JARVIX-NEW-Preview-Acceptance/1.0'})
    with urlopen(req,timeout=30) as res:
        return res.status,res.geturl(),res.read(160000).decode('utf-8',errors='replace')

def main():
    status,where,home=fetch('/')
    assert status==200 and 'jarvix-new-preview-entry.js' in home, 'New JARVIX launcher not injected into published home page'
    assert '<script type="module" src="jarvis-core.js"></script>' not in home, 'Legacy Jarvis core still starts on test homepage'
    assert 'src="jarvix-home-chat.js' not in home, 'Legacy home chat still starts on test homepage'
    print('PASS: Live TEST homepage uses new JARVIX entry and disables legacy core.')

    status,where,ui=fetch('/jarvix-new.html')
    assert status==200 and '<h1>JARVIX NEW</h1>' in ui and 'jarvix-new.js' in ui
    assert 'd2ol7oe51mr4n9.cloudfront.net' in ui
    print('PASS: Live JARVIX NEW page and original owner sphere are present.')

    for path in ['/ai-agents.html','/jarvix-chat.html?mode=video']:
        status,where,html=fetch(path)
        assert status==200 and urlparse(where).path in ('/jarvix-new.html','/jarvix-new'), (path,status,where)
        assert 'JARVIX NEW' in html
        if '?mode=video' in path:
            assert 'mode=video' in where, 'Video mode must be preserved'
    print('PASS: Legacy test JARVIX routes now lead to JARVIX NEW.')

    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={'width':1440,'height':900})
            page.goto(ORIGIN+'/',wait_until='domcontentloaded',timeout=30000)
            expect(page.locator('#jarvix-new-preview-banner')).to_be_visible(timeout=12000)
            expect(page.locator('#jarvix-new-preview-banner')).to_contain_text('JARVIX NEW')
            # Clicking banner behaves as a visible real user's entry.
            page.locator('#jarvix-new-preview-banner a').click()
            page.wait_for_url(lambda url: urlparse(str(url)).path in ('/jarvix-new','/jarvix-new.html'),timeout=10000)
            expect(page.locator('h1')).to_have_text('JARVIX NEW')
            expect(page.locator('#send')).to_be_disabled()
            page.locator('[data-mode="video"]').click()
            expect(page.locator('[data-mode="video"]')).to_have_attribute('aria-pressed','true')
            # Old test chat URL must preserve video mode in the NEW interface.
            page.goto(ORIGIN+'/jarvix-chat.html?mode=video',wait_until='domcontentloaded',timeout=20000)
            expect(page.locator('h1')).to_have_text('JARVIX NEW')
            expect(page.locator('[data-mode="video"]')).to_have_attribute('aria-pressed','true')
            print('PASS: Real browser opens NEW agent page from test homepage; redirected Video mode works.')
        finally:
            browser.close()
    return 0

if __name__=='__main__':
    raise SystemExit(main())
