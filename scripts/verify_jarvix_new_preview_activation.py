#!/usr/bin/env python3
"""Actual deployed TEST acceptance: existing sphere provides voice-only JARVIX.

Browser speech and model replies are STUBBED exclusively for UI verification;
this test does NOT assert that the user's Ollama/microphone works on their PC.
No hosted AI calls. No changes to production.
"""
import json
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from playwright.sync_api import sync_playwright, expect

ORIGIN = 'https://jarvis-new.deepsyq.pages.dev'


def fetch(path):
    request = Request(ORIGIN + path, headers={'User-Agent': 'JARVIX-NEW-TEST-ACCEPTANCE/1'})
    with urlopen(request, timeout=30) as result:
        return result.status, result.geturl(), result.read(150000).decode('utf-8', errors='replace')


# All browser media interfaces below are deliberately fake. Their only purpose
# is to verify that the released UI performs the correct sequence after clicks.
MOCK_BROWSER_VOICE = """
(() => {
  const events = [];
  window.__testVoiceEvents = events;
  Object.defineProperty(navigator, 'mediaDevices', {configurable:true,value:{
    getUserMedia:async() => ({getTracks:()=>[{stop(){events.push('mic-released');}}]})
  }});
  window.SpeechSynthesisUtterance=class {
    constructor(text){this.text=text;this.onend=null;this.onerror=null;}
  };
  Object.defineProperty(window, 'speechSynthesis', {configurable:true,value:{
    getVoices:()=>[],
    cancel(){},
    speak(u){events.push({spoken:u.text});setTimeout(()=>u.onend?.(),30);}
  }});
  window.SpeechRecognition=class {
    constructor(){window.__testLastRecognition=this;}
    start(){events.push('listening');this.onstart?.();}
    stop(){this.onend?.();}
    abort(){events.push('stopped');}
  };
  const originalFetch=window.fetch.bind(window);
  window.fetch=(input,init)=> {
    if(String(input).includes('127.0.0.1:8768/v1/voice/chat')){
      events.push({voiceRequest:JSON.parse(init.body)});
      // This response is a UI-TEST STUB only, not a live provider call.
      return Promise.resolve(new Response(JSON.stringify({
        provider:'local-ollama',reply:'Voice interface test response from stub'
      }),{status:200,headers:{'Content-Type':'application/json'}}));
    }
    return originalFetch(input,init);
  };
})();
"""


def main():
    status, where, home = fetch('/')
    assert status == 200 and 'jarvix-new-preview-entry.js' in home
    assert 'jarvix-new-download-menu.js' in home
    assert 'topJarvisBtn' in home
    assert 'src="jarvix-home-chat.js' not in home
    assert '<script type="module" src="jarvis-core.js"></script>' not in home
    _, _, module = fetch('/jarvix-new-preview-entry.js')
    assert 'installJarvixNewVoice' in module
    assert 'jarvix-new-preview-banner' in module  # removal of old UI
    assert "homeQuickBar')?.remove()" in module
    _, _, voice = fetch('/jarvix-new-voice.js')
    for term in ('SpeechRecognition', 'SpeechSynthesisUtterance', 'getUserMedia',
                 '/v1/voice/chat', 'targetAddressSpace'):
        assert term in voice, term
    print('PASS: Deployed TEST homepage has original sphere + true voice-only frontend.')

    for route in ('/ai-agents.html', '/jarvix-chat.html', '/jarvix-new.html'):
        status, redirected, _ = fetch(route)
        assert status == 200 and urlparse(redirected).path == '/', (route, redirected)
    print('PASS: Obsolete separate JARVIX chat pages redirect to existing sphere.')

    try:
        fetch('/api/jarvix/chat')
    except HTTPError as err:
        assert err.code == 503, err.code
    else:
        raise AssertionError('Canned/paid model API still enabled on test preview')
    print('PASS: Fake-answer / paid-provider cloud endpoint blocked.')

    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome', headless=True)
        try:
            for width,height in ((1440,900),(390,844)):
                context=browser.new_context(viewport={'width':width,'height':height})
                context.add_init_script(MOCK_BROWSER_VOICE)
                page=context.new_page()
                page.goto(ORIGIN+'/',wait_until='domcontentloaded',timeout=30000)
                sphere=page.locator('#topJarvisBtn')
                expect(sphere).to_be_visible(timeout=12000)
                expect(page.locator('#jarvix-new-preview-banner')).to_have_count(0)
                expect(page.locator('#homeQuickBar')).to_have_count(0)
                assert page.locator('#pairing').count()==0, 'Pairing form visible on homepage'
                before=urlparse(page.url).path
                sphere.click()
                expect(sphere).to_have_attribute('aria-pressed','true',timeout=10000)
                expect(page.locator('#jv-new-live-voice-status')).to_be_visible()
                page.wait_for_function("window.__testVoiceEvents.includes('listening')",timeout=10000)
                events=page.evaluate('window.__testVoiceEvents')
                assert any(isinstance(e,dict) and 'JARVIX' in e.get('spoken','') for e in events), events
                page.evaluate("""() => window.__testLastRecognition.onresult({
                  results:[{isFinal:true,0:{transcript:'Hello Jarvix'}}]
                })""")
                page.wait_for_function(
                    "window.__testVoiceEvents.some(e=>e.voiceRequest?.message==='Hello Jarvix')",
                    timeout=10000)
                page.wait_for_function(
                    "window.__testVoiceEvents.filter(e=>e==='listening').length>=2",
                    timeout=12000)
                assert urlparse(page.url).path == before, 'Clicking sphere navigated to separate chat page'
                assert page.evaluate(
                    "window.__testVoiceEvents.some(e=>e.spoken==='Voice interface test response from stub')"
                ), 'AI response was not spoken aloud'
                sphere.click()
                expect(sphere).to_have_attribute('aria-pressed','false')
                print(f'PASS: {width}px browser clicks original sphere: greeting -> microphone -> local model transport STUB -> spoken answer -> listening again -> stop. No page change.')
                context.close()
        finally:
            browser.close()
    return 0


if __name__=='__main__':
    raise SystemExit(main())
