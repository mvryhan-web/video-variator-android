import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'app', 'src', 'main', 'assets');

describe('JARVIS AI Voice Commander & F1 Compare Matrix', () => {
  it('verifies deepsyq.html contains topJarvisBtn in the top header', () => {
    const html = fs.readFileSync(path.join(assetsDir, 'deepsyq.html'), 'utf8');
    assert.ok(html.includes('id="topJarvisBtn"'), 'topJarvisBtn must exist in deepsyq.html');
    assert.ok(html.includes('jarvis-core.css'), 'jarvis-core.css must be included in deepsyq.html');
    assert.ok(html.includes('jarvis-core.js'), 'jarvis-core.js must be included in deepsyq.html');
    assert.ok(html.includes('class="jarvis-name">JARVIX</span>'), 'JARVIX branding should be displayed');
  });

  it('verifies ai-apps.html has the redundant menu removed and has JARVIS integrated', () => {
    const html = fs.readFileSync(path.join(assetsDir, 'ai-apps.html'), 'utf8');
    const css = fs.readFileSync(path.join(assetsDir, 'ai-apps.css'), 'utf8');

    assert.ok(html.includes('id="topJarvisBtn"'), 'topJarvisBtn must be present in ai-apps.html header');
    assert.ok(!html.includes('aria-label="Main navigation"'), 'duplicate main nav must not be present in ai-apps.html');
    assert.ok(css.includes('header nav'), 'header nav hiding rule must be defined in ai-apps.css');
  });

  it('verifies canvas.html has the top header with JARVIS integrated', () => {
    const html = fs.readFileSync(path.join(assetsDir, 'canvas.html'), 'utf8');
    assert.ok(html.includes('id="topJarvisBtn"'), 'topJarvisBtn must be present in canvas.html header');
    assert.ok(html.includes('jarvis-core.js'), 'jarvis-core.js must be loaded in canvas.html');
  });

  it('verifies jarvis-core.css has ChatGPT Voice Mode styling and non-blocking elements', () => {
    const css = fs.readFileSync(path.join(assetsDir, 'jarvis-core.css'), 'utf8');

    assert.ok(css.includes('.top-jarvis-btn'), 'top-jarvis-btn style must exist');
    assert.ok(css.includes('.top-jarvis-btn.is-active'), 'is-active state must exist');
    assert.ok(css.includes('.top-jarvis-btn.is-speaking'), 'is-speaking state must exist');
    assert.ok(css.includes('.top-jarvis-btn.is-listening'), 'is-listening state must exist');
    assert.ok(css.includes('.jarvis-live-pill'), 'floating subtitle pill style must exist');
    assert.ok(css.includes('.jarvis-f1-drawer'), 'non-blocking F1 drawer style must exist');
    assert.ok(css.includes('.jarvis-f1-grid'), 'F1 Compare 4-model grid must be styled');
  });

  it('verifies deepsyq-site-shell.js injects JARVIS sitewide on subpages', () => {
    const shellJs = fs.readFileSync(path.join(assetsDir, 'deepsyq-site-shell.js'), 'utf8');
    assert.ok(shellJs.includes('jarvis-core.js'), 'deepsyq-site-shell.js must inject JARVIS script');
    assert.ok(shellJs.includes('topJarvisBtn'), 'deepsyq-site-shell.js must create topJarvisBtn if missing');
  });

  it('verifies jarvis-core.js exports voice activation, conversational turn-taking and command handling', async () => {
    const jarvisJs = fs.readFileSync(path.join(assetsDir, 'jarvis-core.js'), 'utf8');
    assert.ok(jarvisJs.includes('export function activateJarvisVoice'), 'activateJarvisVoice must be exported');
    assert.ok(jarvisJs.includes('export function deactivateJarvisVoice'), 'deactivateJarvisVoice must be exported');
    assert.ok(jarvisJs.includes('export function toggleJarvisVoice'), 'toggleJarvisVoice must be exported');
    assert.ok(jarvisJs.includes('export function handleJarvisVoiceCommand'), 'handleJarvisVoiceCommand must be exported');
    assert.ok(jarvisJs.includes('speakJarvis'), 'speakJarvis TTS must be present');
    assert.ok(jarvisJs.includes('runF1Compare'), 'runF1Compare must be present');
    assert.ok(jarvisJs.includes('JARVIX активен'), 'JARVIX name with ending X must be shown');
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
});
