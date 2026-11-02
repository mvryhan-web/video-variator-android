import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(__dirname, '..');
const assetsDir = path.join(repoDir, 'app', 'src', 'main', 'assets');

describe('JARVIX Human Voice, Instant Barge-in, Theme Off & 3D Pets Showcase', () => {
  it('verifies speakJarvis uses Web Speech Synthesis directly and does not play oscillator audio', () => {
    const jarvisJs = fs.readFileSync(path.join(assetsDir, 'jarvis-core.js'), 'utf8');
    assert.ok(jarvisJs.includes('speakLocalSpeechSynthesis(text, onComplete, langCode, isRu)'), 'must use speakLocalSpeechSynthesis');
    assert.ok(!jarvisJs.includes('new Audio(ttsUrl)'), 'must NOT play synthetic oscillator tone in speakJarvis');
  });

  it('verifies getJarvixVoice supports 4 languages: RU, EN, ES, FR with proper male voice selectors', () => {
    const jarvisJs = fs.readFileSync(path.join(assetsDir, 'jarvis-core.js'), 'utf8');
    assert.ok(jarvisJs.includes("getJarvixVoice(langParam = 'ru')"), 'getJarvixVoice signature supports langParam');
    assert.ok(jarvisJs.includes("v.lang.startsWith('ru')"), 'Russian voice check');
    assert.ok(jarvisJs.includes("v.lang.startsWith('es')"), 'Spanish voice check');
    assert.ok(jarvisJs.includes("v.lang.startsWith('fr')"), 'French voice check');
    assert.ok(jarvisJs.includes("v.lang.startsWith('en')"), 'English voice check');
  });

  it('verifies theme reset/turn off voice command is supported in jarvis-core.js and jarvix-brain.js', () => {
    const jarvisJs = fs.readFileSync(path.join(assetsDir, 'jarvis-core.js'), 'utf8');
    const brainJs = fs.readFileSync(path.join(repoDir, 'server', 'jarvix-brain.js'), 'utf8');
    
    // Check regex for "выключи его", "выключи неоновый", "выключи тему", "верни как было", "сбрось тему"
    assert.ok(jarvisJs.includes('выключи его') || jarvisJs.includes('выключи|отключи'), 'theme reset regex in jarvis-core.js');
    assert.ok(brainJs.includes('turn off neon') || brainJs.includes('выключи тему'), 'theme reset regex in jarvix-brain.js');
  });

  it('verifies instant ChatGPT-style barge-in interruption in recognition.onresult', () => {
    const jarvisJs = fs.readFileSync(path.join(assetsDir, 'jarvis-core.js'), 'utf8');
    assert.ok(jarvisJs.includes('// Immediate ChatGPT-style interruption cutoff (0ms delay)'), 'barge-in comment exists');
    assert.ok(jarvisJs.includes('stopAllSpeech()'), 'stopAllSpeech invoked on user speech');
    assert.ok(jarvisJs.includes("updateJarvisState('listening')"), 'immediately switches state to listening');
  });

  it('verifies deepsyq.html contains Spanish language and 3D Living Pets showcase section', () => {
    const html = fs.readFileSync(path.join(assetsDir, 'deepsyq.html'), 'utf8');
    assert.ok(html.includes('<option value="es">Español</option>'), 'Spanish in language selector');
    assert.ok(html.includes('id="livingPetsSection"'), 'livingPetsSection must exist in deepsyq.html');
    assert.ok(html.includes('data-select-pet="dog"'), 'Luna selection button');
    assert.ok(html.includes('data-select-pet="cat"'), 'Mira selection button');
    assert.ok(html.includes('data-select-pet="fox"'), 'Nova selection button');
    assert.ok(html.includes('virtual-pet/luna/renders/three_quarter_dark.png'), 'Luna 3D render');
    assert.ok(html.includes('virtual-pet/mira/renders/three_quarter_dark.png'), 'Mira 3D render');
    assert.ok(html.includes('virtual-pet/nova/renders/three_quarter_dark.png'), 'Nova 3D render');
  });

  it('verifies virtual-pet/glb contains all three 3D models: luna.glb, mira.glb, nova.glb', () => {
    const glbDir = path.join(assetsDir, 'virtual-pet', 'glb');
    assert.ok(fs.existsSync(path.join(glbDir, 'luna.glb')), 'luna.glb physically exists');
    assert.ok(fs.existsSync(path.join(glbDir, 'mira.glb')), 'mira.glb physically exists');
    assert.ok(fs.existsSync(path.join(glbDir, 'nova.glb')), 'nova.glb physically exists');
  });

  it('verifies deepsyq-site-shell.js includes Spanish translations', () => {
    const shellJs = fs.readFileSync(path.join(assetsDir, 'deepsyq-site-shell.js'), 'utf8');
    assert.ok(shellJs.includes('es: {'), 'es translations in shellI18n');
    assert.ok(shellJs.includes('Mascota 3D'), 'Spanish pet label in shellI18n');
  });
});
