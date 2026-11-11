#!/usr/bin/env python3
"""Deployed test-only JARVIX NEW UI browser acceptance (NO desktop install).
Verifies actual deployed Cloudflare pages not just committed source.
"""
from urllib.request import Request, urlopen
import re
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
    assert 'jarvix-new-download-menu.js' in home, 'Download dropdown missing from live test header'
    print('PASS: Live TEST homepage uses new JARVIX entry and header download dropdown.')

    status,where,script=fetch('/jarvix-new-download-menu.js')
    assert status==200 and 'Jarvix-New-Windows-Setup.exe' in script and 'Jarvix-New-macOS.dmg' in script
    status,where,_=fetch('/jarvix-download.html')
    assert status==200 and urlparse(where).path in ('/','/index','/index.html') and 'download=jarvix' in where, where
    print('PASS: Legacy download-page route opens the main page with dropdown; standalone page removed.')

    status,where,ui=fetch('/jarvix-new.html')
    assert status==200 and '<h1>JARVIX NEW</h1>' in ui and 'jarvix-new.js' in ui
    assert 'd2ol7oe51mr4n9.cloudfront.net' in ui
    assert 'jarvix-new-download-menu.js' in ui, 'New JARVIX header has no download menu'
    print('PASS: Live JARVIX NEW page, original owner sphere and header menu are present.')

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

            # Header dropdown: user must not navigate to a separate HTML download page.
            trigger=page.locator('header a.back')
            expect(trigger).to_be_visible()
            trigger.click()
            menu=page.locator('#jv-download-popover')
            expect(menu).to_be_visible(timeout=8000)
            assert menu.locator('a.jv-download-option').count()==2
            win=menu.locator('a[data-platform="windows"]')
            mac=menu.locator('a[data-platform="mac"]')
            expect(win).to_have_attribute('href',
                re.compile(r'^https://github\\.com/mvryhan-web/video-variator-android/releases/download/[^/]+/Jarvix-New-Windows-Setup\\.exe
        finally:
            browser.close()
    return 0

if __name__=='__main__':
    raise SystemExit(main())
),timeout=18000)
            expect(mac).to_have_attribute('href',
                re.compile(r'^https://github\\.com/mvryhan-web/video-variator-android/releases/download/[^/]+/Jarvix-New-macOS\\.dmg
        finally:
            browser.close()
    return 0

if __name__=='__main__':
    raise SystemExit(main())
),timeout=18000)
            assert page.url.rsplit('/',1)[-1].startswith('jarvix-new'), page.url
            print('PASS: Header opens exactly two DIRECT GitHub downloads; no standalone download page.')

            # Check actual mobile viewport: same two options and no overflow.
            mobile=browser.new_page(viewport={'width':390,'height':844})
            mobile.goto(ORIGIN+'/jarvix-new.html',wait_until='domcontentloaded',timeout=20000)
            mobile.locator('header a.back').click()
            expect(mobile.locator('#jv-download-popover')).to_be_visible(timeout=8000)
            assert mobile.locator('#jv-download-popover a.jv-download-option').count()==2
            dims=mobile.locator('#jv-download-popover').bounding_box()
            assert dims and dims['x']>=0 and dims['x']+dims['width']<=391, dims
            print('PASS: Windows/Mac dropdown fits mobile header.')
        finally:
            browser.close()
    return 0

if __name__=='__main__':
    raise SystemExit(main())
