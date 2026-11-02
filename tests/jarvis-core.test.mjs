import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'app', 'src', 'main', 'assets');

describe('JARVIX AI Voice Commander & Autonomous Butler System', () => {
  it('verifies deepsyq.html contains topJarvisBtn in the top header with JARVIX branding', () => {
    const html = fs.readFileSync(path.join(assetsDir, 'deepsyq.html'), 'utf8');
    assert.ok(html.includes('id="topJarvisBtn"'), 'topJarvisBtn must exist in deepsyq.html');
    assert.ok(html.includes('jarvis-core.css'), 'jarvis-core.css must be included in deepsyq.html');
    assert.ok(html.includes('jarvis-core.js'), 'jarvis-core.js must be included in deepsyq.html');
    assert.ok(html.includes('class="jarvis-name">JARVIX</span>'), 'JARVIX branding should be displayed');
  });

  it('verifies ai-apps.html has the redundant menu removed and has JARVIX integrated', () => {
    const html = fs.readFileSync(path.join(assetsDir, 'ai-apps.html'), 'utf8');
    const css = fs.readFileSync(path.join(assetsDir, 'ai-apps.css'), 'utf8');

    assert.ok(html.includes('id="topJarvisBtn"'), 'topJarvisBtn must be present in ai-apps.html header');
    assert.ok(!html.includes('aria-label="Main navigation"'), 'duplicate main nav must not be present in ai-apps.html');
    assert.ok(css.includes('header nav'), 'header nav hiding rule must be defined in ai-apps.css');
  });

  it('verifies canvas.html has the top header with JARVIX integrated', () => {
    const html = fs.readFileSync(path.join(assetsDir, 'canvas.html'), 'utf8');
    assert.ok(html.includes('id="topJarvisBtn"'), 'topJarvisBtn must be present in canvas.html header');
    assert.ok(html.includes('jarvis-core.js'), 'jarvis-core.js must be loaded in canvas.html');
  });

  it('verifies jarvis-core.css rigidly centers the orb dead-center across all pages without moving', () => {
    const css = fs.readFileSync(path.join(assetsDir, 'jarvis-core.css'), 'utf8');

    assert.ok(css.includes('position: absolute;'), 'must be absolutely positioned');
    assert.ok(css.includes('left: 50%;'), 'must be pinned horizontally at 50%');
    assert.ok(css.includes('top: 50%;'), 'must be pinned vertically at 50%');
    assert.ok(css.includes('transform: translate(-50%, -50%)'), 'must be centered using transform');
    assert.ok(css.includes('.top-jarvis-btn.is-active'), 'is-active state must exist');
    assert.ok(css.includes('.top-jarvis-btn.is-speaking'), 'is-speaking state must exist');
    assert.ok(css.includes('.top-jarvis-btn.is-listening'), 'is-listening state must exist');
    assert.ok(css.includes('jarvisSoundwaveAura'), 'soundwave aura animation must exist');
    assert.ok(css.includes('display: none !important;'), 'text popups must be hidden for clean UI');
  });

  it('verifies deepsyq-site-shell.js injects JARVIX and multilingual translations sitewide', () => {
    const shellJs = fs.readFileSync(path.join(assetsDir, 'deepsyq-site-shell.js'), 'utf8');
    assert.ok(shellJs.includes('jarvis-core.js'), 'deepsyq-site-shell.js must inject JARVIS script');
    assert.ok(shellJs.includes('topJarvisBtn'), 'deepsyq-site-shell.js must create topJarvisBtn if missing');
    assert.ok(shellJs.includes('shellI18n'), 'must contain multilingual translations');
    assert.ok(shellJs.includes('deepsyq_home_language'), 'must react to saved language');
  });

  it('verifies jarvis-core.js supports male film voice, silence auto-standby and theme lighting controls', async () => {
    const jarvisJs = fs.readFileSync(path.join(assetsDir, 'jarvis-core.js'), 'utf8');
    assert.ok(jarvisJs.includes('export function activateJarvisVoice'), 'activateJarvisVoice must be exported');
    assert.ok(jarvisJs.includes('export function deactivateJarvisVoice'), 'deactivateJarvisVoice must be exported');
    assert.ok(jarvisJs.includes('export function toggleJarvisVoice'), 'toggleJarvisVoice must be exported');
    assert.ok(jarvisJs.includes('export function handleJarvisVoiceCommand'), 'handleJarvisVoiceCommand must be exported');
    assert.ok(jarvisJs.includes('getJarvixVoice'), 'male voice selector must be defined');
    assert.ok(jarvisJs.includes('utterance.pitch = 1.0'), 'natural clear human pitch without demonic drop must be set');
    assert.ok(jarvisJs.includes('умеешь|можешь'), 'must match capabilities questions like что ты умеешь делать');
    assert.ok(jarvisJs.includes('smartFallback'), 'must have intelligent proactive fallback');
    assert.ok(jarvisJs.includes('jarvix_greeted'), 'smart memory session key must be used');
    assert.ok(jarvisJs.includes('SILENCE_TIMEOUT_MS'), 'silence timeout constant must be configured');
    assert.ok(jarvisJs.includes('applySiteTheme'), 'theme/lighting switcher must be exported');
    assert.ok(jarvisJs.includes('setSiteLanguage'), 'multilingual switcher must be exported');
    assert.ok(jarvisJs.includes('clearCurrentInputs'), 'deletion/clear action must be implemented');
    assert.ok(jarvisJs.includes('saveStudioHandoff'), 'generative handoff must be implemented');
  });

  it('verifies JARVIX resident brain: weather inquiries, instant opening and prompt expansion', () => {
    const jarvisJs = fs.readFileSync(path.join(assetsDir, 'jarvis-core.js'), 'utf8');
    assert.ok(jarvisJs.includes('WORLD_CITIES'), 'world cities weather knowledge base must exist');
    assert.ok(jarvisJs.includes('handleWeatherInquiry'), 'weather inquiry handler must be defined');
    assert.ok(jarvisJs.includes('instantOpen'), 'instantOpen must be exported');
    assert.ok(jarvisJs.includes('expandCreativePrompt'), 'prompt expander must be defined');
    assert.ok(jarvisJs.includes('halloween'), 'halloween prompt template must exist');
  });

  it('verifies generate-studio.js handles auto=1 for instant automatic generation start', () => {
    const studioJs = fs.readFileSync(path.join(assetsDir, 'generate-studio.js'), 'utf8');
    assert.ok(studioJs.includes("get('auto')==='1'"), 'studio must check auto=1 parameter');
  });

  it('verifies JARVIX naming convention with X ending across all headers', () => {
    const deepsyqHtml = fs.readFileSync(path.join(assetsDir, 'deepsyq.html'), 'utf8');
    const aiAppsHtml = fs.readFileSync(path.join(assetsDir, 'ai-apps.html'), 'utf8');
    const canvasHtml = fs.readFileSync(path.join(assetsDir, 'canvas.html'), 'utf8');
    const shellJs = fs.readFileSync(path.join(assetsDir, 'deepsyq-site-shell.js'), 'utf8');

    for (const content of [deepsyqHtml, aiAppsHtml, canvasHtml, shellJs]) {
      assert.ok(content.includes('JARVIX'), 'Must use JARVIX with X ending');
      assert.ok(!content.includes('>JARVIS<'), 'Must not display JARVIS');
    }
  });

  it('verifies comprehensive fast voice routing across all site tools and pages', () => {
    const jarvisJs = fs.readFileSync(path.join(assetsDir, 'jarvis-core.js'), 'utf8');
    assert.ok(jarvisJs.includes('generate-studio.html?studio=video'), 'routes to video studio');
    assert.ok(jarvisJs.includes('generate-studio.html?studio=image'), 'routes to image studio');
    assert.ok(jarvisJs.includes('generate-studio.html?studio=audio'), 'routes to audio studio');
    assert.ok(jarvisJs.includes('ai-agents.html'), 'routes to AI agents');
    assert.ok(jarvisJs.includes('index.html'), 'routes to video uniquifier');
    assert.ok(jarvisJs.includes('free-tools.html'), 'routes to everyday tools');
    assert.ok(jarvisJs.includes('canvas.html'), 'routes to canvas');
    assert.ok(jarvisJs.includes('ai-apps.html'), 'routes to AI apps');
    assert.ok(jarvisJs.includes('pricing.html'), 'routes to pricing');
    assert.ok(jarvisJs.includes('avatar-studio.html'), 'routes to avatar studio');
    assert.ok(jarvisJs.includes('teleprompter.html'), 'routes to teleprompter');
  });

  it('verifies deepsyq-global-theme.css contains light, midnight, neon and gold themes', () => {
    const themeCss = fs.readFileSync(path.join(assetsDir, 'deepsyq-global-theme.css'), 'utf8');
    assert.ok(themeCss.includes('html[data-site-theme="light"]'), 'light theme must exist');
    assert.ok(themeCss.includes('html[data-site-theme="midnight"]'), 'midnight theme must exist');
    assert.ok(themeCss.includes('html[data-site-theme="neon"]'), 'neon theme must exist');
    assert.ok(themeCss.includes('html[data-site-theme="gold"]'), 'gold theme must exist');
  });
});
