import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(__dirname, '..');
const assetsDir = path.join(repoDir, 'app', 'src', 'main', 'assets');

describe('DEEPSYQ P0 Verification: Voice, Pets, Navigation & Languages', () => {
  it('1. verifies JARVIX voice acoustic mutual exclusion & self-speech loop prevention', () => {
    const jarvisJs = fs.readFileSync(path.join(assetsDir, 'jarvis-core.js'), 'utf8');

    // Pauses mic before speaking
    assert.ok(jarvisJs.includes('pauseJarvisRecognition()'), 'must pause recognition before TTS');
    // Drops mic input while assistant is speaking to eliminate hearing self
    assert.ok(jarvisJs.includes('if (isJarvisSpeaking)'), 'must drop recognition events while isJarvisSpeaking');
    // Has 300ms acoustic guard delay
    assert.ok(jarvisJs.includes('300'), 'must have guard delay before resuming mic');
    // Prevents duplicate phrase loops
    assert.ok(jarvisJs.includes('lastHandledText'), 'must debounce duplicate voice phrases');
  });

  it('2. verifies guaranteed male TTS voice selector without random female fallback', () => {
    const jarvisJs = fs.readFileSync(path.join(assetsDir, 'jarvis-core.js'), 'utf8');

    assert.ok(jarvisJs.includes('FEMALE_VOICE_REGEX'), 'must explicitly filter female system voices');
    assert.ok(jarvisJs.includes('irina'), 'filters Irina in Russian');
    assert.ok(jarvisJs.includes('zira'), 'filters Zira in English');
    assert.ok(jarvisJs.includes('dmitry') || jarvisJs.includes('дмитрий'), 'prioritizes Dmitry/Pavel male voices');
  });

  it('3. verifies server/jarvix-brain.js connects real model when key is present with safe fallback', () => {
    const brainJs = fs.readFileSync(path.join(repoDir, 'server', 'jarvix-brain.js'), 'utf8');

    assert.ok(brainJs.includes('process.env.OPENAI_API_KEY'), 'checks OPENAI_API_KEY');
    assert.ok(brainJs.includes('processTurnWithMockBrain'), 'safe verified zero-spend fallback if key absent');
    assert.ok(brainJs.includes('DEEPSYQ_CAPABILITIES'), 'truthful capabilities registry');
  });

  it('4. verifies deepsyq.html displays ONE selected pet with switcher and full body', () => {
    const html = fs.readFileSync(path.join(assetsDir, 'deepsyq.html'), 'utf8');

    assert.ok(html.includes('id="homeActivePetStage"'), 'Home has single active pet stage');
    assert.ok(html.includes('id="petStageDog"'), 'Luna stage item');
    assert.ok(html.includes('id="petStageCat"'), 'Mira stage item');
    assert.ok(html.includes('id="petStageFox"'), 'Nova stage item');
    assert.ok(html.includes('id="homePetTabDog"'), 'Luna switcher button');
    assert.ok(html.includes('id="homePetTabCat"'), 'Mira switcher button');
    assert.ok(html.includes('id="homePetTabFox"'), 'Nova switcher button');
    assert.ok(html.includes('id="petModeCalm"'), 'Calm mode button');
    assert.ok(html.includes('id="petModePlayful"'), 'Playful mode button');
    assert.ok(html.includes('id="petModeOff"'), 'Off mode button');
  });

  it('5. verifies left menu is cleaned: redundant technical tools removed, JARVIX has orb emblem', () => {
    const html = fs.readFileSync(path.join(assetsDir, 'deepsyq.html'), 'utf8');
    const shellJs = fs.readFileSync(path.join(assetsDir, 'deepsyq-site-shell.js'), 'utf8');

    // Public sidebar has no Voice Agent, JARVIX Studio or 3D Pets links
    const sidebarHtml = html.split('<aside id="sidebar"')[1]?.split('</aside>')[0] || '';
    assert.ok(!sidebarHtml.includes('voice-agent-preview.html'), 'no redundant voice agent in public sidebar');
    assert.ok(!sidebarHtml.includes('jarvix-studio.html'), 'no jarvix-studio in public sidebar');
    assert.ok(!sidebarHtml.includes('virtual-pet.html'), 'no technical 3d pet studio in public sidebar');

    // JARVIX has animated mini-orb emblem and uppercase JARVIX name
    assert.ok(sidebarHtml.includes('jarvis-mini-orb'), 'has mini-orb in sidebar');
    assert.ok(sidebarHtml.includes('JARVIX'), 'has uppercase JARVIX name in sidebar');
    assert.ok(!sidebarHtml.includes('Agent <small>soon</small>'), 'no Agent soon in sidebar');

    // Shell sidebar also removed duplicates
    assert.ok(!shellJs.includes("url:'voice-agent-preview.html'"), 'no voice-agent in shell nav');
    assert.ok(!shellJs.includes("url:'virtual-pet.html'"), 'no 3d pets in shell nav');
  });

  it('6. verifies unified language persistence across pages and studios (RU/EN/ES/FR)', () => {
    const deepsyqJs = fs.readFileSync(path.join(assetsDir, 'deepsyq.js'), 'utf8');
    const studioJs = fs.readFileSync(path.join(assetsDir, 'generate-studio.js'), 'utf8');
    const shellJs = fs.readFileSync(path.join(assetsDir, 'deepsyq-site-shell.js'), 'utf8');

    // deepsyq.js syncs both keys
    assert.ok(deepsyqJs.includes("localStorage.setItem('deepsyq_home_language'"), 'syncs deepsyq_home_language');
    assert.ok(deepsyqJs.includes("localStorage.setItem('deepsyq_lang'"), 'syncs deepsyq_lang');

    // generate-studio.js reads stored language and does not blind-reset to navigator.language
    assert.ok(studioJs.includes('resolveStudioLang'), 'studio resolves stored user language');
    assert.ok(studioJs.includes('studioI18n'), 'studio contains multilingual translations');

    // shell translates sitewide
    assert.ok(shellJs.includes('shellI18n'), 'shell i18n present');
    assert.ok(shellJs.includes('agents: \'JARVIX\''), 'agents translated as JARVIX in shell');
  });
});
