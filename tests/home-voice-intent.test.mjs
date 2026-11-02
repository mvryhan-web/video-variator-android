import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'app', 'src', 'main', 'assets');

describe('Home Quick Bar Voice Input & Intent Routing', () => {
  it('detects intent accurately from Russian and English voice phrases', async () => {
    const { detectIntent } = await import('../app/src/main/assets/home-experience.js');
    
    // Image intent tests
    assert.equal(detectIntent('создай мне изображение киберпанк города'), 'image');
    assert.equal(detectIntent('нарисуй реалистичный портрет девушки'), 'image');
    assert.equal(detectIntent('сделай фото заката в горах'), 'image');
    assert.equal(detectIntent('generate a high quality editorial photo'), 'image');
    assert.equal(detectIntent('draw an oil painting illustration'), 'image');

    // Video intent tests
    assert.equal(detectIntent('создай мне видео про космос'), 'video');
    assert.equal(detectIntent('сделай ролик с анимацией'), 'video');
    assert.equal(detectIntent('сними короткий фильм на пляже'), 'video');
    assert.equal(detectIntent('generate a 4k cinematic video with drone motion'), 'video');
    assert.equal(detectIntent('animate this clip'), 'video');

    // Audio/Music intent tests
    assert.equal(detectIntent('создай мне аудио поздравление'), 'music');
    assert.equal(detectIntent('напиши музыку для сна'), 'music');
    assert.equal(detectIntent('запиши саундтрек или трек в стиле рок'), 'music');
    assert.equal(detectIntent('generate an energetic background song'), 'music');
    assert.equal(detectIntent('relaxing ambient sound'), 'music');

    // Agent intent tests
    assert.equal(detectIntent('создай мне AI агент для запуска бренда'), 'agent');
    assert.equal(detectIntent('ai-агент помоги сделать стратегию'), 'agent');
    assert.equal(detectIntent('запусти сценарий через агента'), 'agent');
    assert.equal(detectIntent('create an agent workflow for marketing'), 'agent');

    // Neutral or unspecific
    assert.equal(detectIntent('привет как дела'), null);
  });

  it('verifies deepsyq.html contains the microphone button and permission dialog', () => {
    const html = fs.readFileSync(path.join(assetsDir, 'deepsyq.html'), 'utf8');

    // Microphone button on the right side of homeQuickForm
    assert.ok(html.includes('id="homeQuickVoiceBtn"'), 'homeQuickVoiceBtn should exist');
    assert.ok(html.includes('home-quick-voice-btn'), 'home-quick-voice-btn class should be used');
    assert.ok(html.includes('id="homeVoiceWaves"'), 'wave indicator should exist');

    // Dialog for microphone permissions
    assert.ok(html.includes('id="micPermissionDialog"'), 'micPermissionDialog dialog should exist');
    assert.ok(html.includes('id="grantMicBtn"'), 'grantMicBtn should exist');

    // Agent mode link points to ai-agents.html
    assert.ok(html.includes('data-home-kind="agent" href="ai-agents.html"'), 'agent mode chip should point to ai-agents.html');
  });

  it('verifies deepsyq.css has styling for voice button, waves and dialog', () => {
    const css = fs.readFileSync(path.join(assetsDir, 'deepsyq.css'), 'utf8');

    assert.ok(css.includes('.home-quick-voice-btn'), 'Voice button style must be defined');
    assert.ok(css.includes('.home-quick-voice-btn.is-listening'), 'Listening state style must be defined');
    assert.ok(css.includes('dialog.mic-dialog'), 'Mic dialog style must be defined');
  });

  it('verifies ai-agents.html supports initial topic from URL parameter', () => {
    const aiHtml = fs.readFileSync(path.join(assetsDir, 'ai-agents.html'), 'utf8');
    assert.ok(aiHtml.includes('urlParams.get(\'topic\')'), 'ai-agents.html should read topic query param');
  });
});
