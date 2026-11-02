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
    assert.ok(html.includes('class="jarvis-name">JARVIS</span>'), 'JARVIS branding should be displayed');
  });

  it('verifies ai-apps.html has the redundant menu hidden and has JARVIS integrated', () => {
    const html = fs.readFileSync(path.join(assetsDir, 'ai-apps.html'), 'utf8');
    const css = fs.readFileSync(path.join(assetsDir, 'ai-apps.css'), 'utf8');

    assert.ok(html.includes('id="topJarvisBtn"'), 'topJarvisBtn must be present in ai-apps.html header');
    assert.ok(css.includes('header nav'), 'header nav hiding rule must be defined in ai-apps.css');
  });

  it('verifies jarvis-core.css has full futuristic Arc-Reactor animations and HUD styling', () => {
    const css = fs.readFileSync(path.join(assetsDir, 'jarvis-core.css'), 'utf8');

    assert.ok(css.includes('.top-jarvis-btn'), 'top-jarvis-btn style must exist');
    assert.ok(css.includes('.jarvis-ring'), 'jarvis-ring style must exist');
    assert.ok(css.includes('dialog.jarvis-hud-dialog'), 'HUD dialog must be styled');
    assert.ok(css.includes('.jarvis-f1-grid'), 'F1 Compare 4-model grid must be styled');
  });

  it('verifies deepsyq-site-shell.js injects JARVIS sitewide on subpages', () => {
    const shellJs = fs.readFileSync(path.join(assetsDir, 'deepsyq-site-shell.js'), 'utf8');
    assert.ok(shellJs.includes('jarvis-core.js'), 'deepsyq-site-shell.js must inject JARVIS script');
    assert.ok(shellJs.includes('topJarvisBtn'), 'deepsyq-site-shell.js must create topJarvisBtn if missing');
  });
});
