import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  DEEPSYQ_CAPABILITIES,
  jarvixSessionStore,
  compileAccumulatedPrompt,
  executeSafeAction,
  processTurnWithMockBrain,
  getOrCreateSession,
  clearSession
} from '../server/jarvix-brain.js';
import {
  JARVIX_TIMBRES,
  SUPPORTED_LANGUAGES,
  INFRASTRUCTURE_SPEC,
  createWavBuffer,
  synthesizeSpeechWave
} from '../server/jarvix-voice.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const samplesDir = path.join(rootDir, 'app', 'src', 'main', 'assets', 'media', 'jarvix', 'samples');
const manifestPath = path.join(rootDir, 'app', 'src', 'main', 'assets', 'media', 'jarvix', 'jarvix-voice.manifest.json');
const studioHtmlPath = path.join(rootDir, 'app', 'src', 'main', 'assets', 'jarvix-studio.html');

describe('JARVIX AI Brain & Multilingual Voice (Issue #498)', () => {
  // 1. Deepsyq Knowledge Registry
  describe('1. Truthful Deepsyq Platform Knowledge Registry', () => {
    it('contains strictly verified studios and everyday tools without hallucination', () => {
      assert.ok(DEEPSYQ_CAPABILITIES.studios.image, 'Image studio must be defined');
      assert.ok(DEEPSYQ_CAPABILITIES.studios.video, 'Video studio must be defined');
      assert.ok(DEEPSYQ_CAPABILITIES.studios.audio, 'Audio studio must be defined');

      assert.ok(DEEPSYQ_CAPABILITIES.studios.image.models.includes('gemini-3.1-flash-image'));
      assert.ok(DEEPSYQ_CAPABILITIES.studios.video.models.includes('veo-3.1-lite-generate-preview'));
      assert.ok(DEEPSYQ_CAPABILITIES.studios.audio.models.includes('lyria-3-clip-preview'));

      assert.equal(DEEPSYQ_CAPABILITIES.everydayTools.cost, '100% Free');
      assert.equal(DEEPSYQ_CAPABILITIES.everydayTools.privacy, '100% Local / In-Browser');
      assert.ok(DEEPSYQ_CAPABILITIES.everydayTools.items.includes('Background Remover'));
      assert.ok(DEEPSYQ_CAPABILITIES.everydayTools.items.includes('Video Compressor'));
      assert.ok(DEEPSYQ_CAPABILITIES.everydayTools.items.includes('Avatar Studio'));
    });

    it('contains verified pricing plans and zero credit costs for everyday tools', () => {
      assert.equal(DEEPSYQ_CAPABILITIES.pricing.basic.credits, 500);
      assert.equal(DEEPSYQ_CAPABILITIES.pricing.pro.credits, 1500);
      assert.equal(DEEPSYQ_CAPABILITIES.pricing.business.credits, 6000);
      assert.equal(DEEPSYQ_CAPABILITIES.pricing.lifetime.oneTime, true);
    });
  });

  // 2. Multi-turn Dialogue Memory
  describe('2. Multi-Turn Dialogue Memory & Context Preservation', () => {
    const testSessionId = 'test-session-porsche-chain';

    it('retains context across multi-step prompt building (Porsche -> black -> rain -> open studio)', () => {
      const session = getOrCreateSession(testSessionId);

      // Step 1: Base Porsche concept
      const turn1 = processTurnWithMockBrain('Хочу создать изображение Порше', session, 'ru');
      assert.ok(turn1.entities.concept.toLowerCase().includes('porsche') || turn1.entities.concept.toLowerCase().includes('порше'));
      assert.ok(turn1.compiledPrompt.includes('Porsche'));

      // Step 2: Refine color to black
      const turn2 = processTurnWithMockBrain('Сделай его черным', session, 'ru');
      assert.equal(turn2.entities.color, 'black');
      assert.ok(turn2.compiledPrompt.includes('obsidian black finish'));
      assert.ok(turn2.compiledPrompt.includes('Porsche'), 'Must retain Porsche concept');

      // Step 3: Add rain and reflections
      const turn3 = processTurnWithMockBrain('Добавь дождь и отражения', session, 'ru');
      assert.equal(turn3.entities.weather, 'rain');
      assert.ok(turn3.compiledPrompt.includes('rainy night reflections'));
      assert.ok(turn3.compiledPrompt.includes('Porsche'), 'Must still retain Porsche');
      assert.ok(turn3.compiledPrompt.includes('black'), 'Must still retain black color');

      // Step 4: Dispatch to studio
      const turn4 = processTurnWithMockBrain('Открой студию', session, 'ru');
      assert.equal(turn4.action.type, 'open_studio');
      assert.equal(turn4.studioHandoff.kind, 'image');
      assert.ok(turn4.studioHandoff.prompt.includes('Porsche'));
      assert.ok(turn4.studioHandoff.prompt.includes('obsidian black finish'));
      assert.ok(turn4.studioHandoff.prompt.includes('rainy night reflections'));
    });

    it('clears session context on explicit reset', () => {
      clearSession(testSessionId);
      const session = jarvixSessionStore.get(testSessionId);
      assert.equal(session, undefined);
    });
  });

  // 3. Safe Tool Execution Guardrails
  describe('3. Strict Safe Tool Execution Guardrails', () => {
    it('blocks unauthorized financial charges / balance deductions', () => {
      const blocked = executeSafeAction({
        type: 'charge_user',
        amount: 100,
        currency: 'usd'
      });
      assert.equal(blocked.success, false);
      assert.equal(blocked.type, 'block_unauthorized');
      assert.ok(blocked.reason.includes('Unauthorized billing'));
    });

    it('blocks dangerous deletion or database modifications', () => {
      const blocked = executeSafeAction({
        type: 'delete_database',
        target: 'all'
      });
      assert.equal(blocked.success, false);
      assert.equal(blocked.type, 'block_unauthorized');
    });

    it('allows safe UI actions: open_studio, adjust_theme, clear_inputs', () => {
      const studioAction = executeSafeAction({ type: 'open_studio', studio: 'video' });
      assert.equal(studioAction.success, true);
      assert.equal(studioAction.type, 'open_studio');
      assert.ok(studioAction.url.includes('generate-studio.html?studio=video'));

      const themeAction = executeSafeAction({ type: 'adjust_theme', theme: 'cyberpunk' });
      assert.equal(themeAction.success, true);
      assert.equal(themeAction.theme, 'cyberpunk');

      const clearAction = executeSafeAction({ type: 'clear_inputs' });
      assert.equal(clearAction.success, true);
    });
  });

  // 4. Multilingual Voice Profiles & Acoustic Harmonics
  describe('4. Recognizable Male Multilingual Voice Architecture', () => {
    it('defines 3 distinct male timbre variants with authentic base pitch (F0)', () => {
      assert.ok(JARVIX_TIMBRES.baritone, 'Baritone timbre must exist');
      assert.ok(JARVIX_TIMBRES.executive, 'Executive timbre must exist');
      assert.ok(JARVIX_TIMBRES.warm, 'Warm timbre must exist');

      assert.equal(JARVIX_TIMBRES.baritone.fundamentalHz, 105);
      assert.equal(JARVIX_TIMBRES.executive.fundamentalHz, 122);
      assert.equal(JARVIX_TIMBRES.warm.fundamentalHz, 115);

      // Verify pitch is in natural masculine range (never dropped to demonic robotics)
      for (const [key, profile] of Object.entries(JARVIX_TIMBRES)) {
        assert.ok(profile.fundamentalHz >= 95 && profile.fundamentalHz <= 135, `${key} pitch ${profile.fundamentalHz}Hz must be in natural baritone/tenor range`);
        assert.ok(profile.name && profile.description);
      }
    });

    it('supports all 4 core languages (RU, EN, ES, FR)', () => {
      const langs = Object.keys(SUPPORTED_LANGUAGES);
      assert.ok(langs.includes('ru'), 'Must support Russian');
      assert.ok(langs.includes('en'), 'Must support English');
      assert.ok(langs.includes('es'), 'Must support Spanish');
      assert.ok(langs.includes('fr'), 'Must support French');
    });

    it('generates valid PCM WAV buffer with accurate RIFF headers', () => {
      const wavBuf = synthesizeSpeechWave('Test synthesis', 'baritone');

      assert.ok(wavBuf instanceof Buffer);
      assert.equal(wavBuf.toString('ascii', 0, 4), 'RIFF');
      assert.equal(wavBuf.toString('ascii', 8, 12), 'WAVE');
      assert.equal(wavBuf.toString('ascii', 12, 16), 'fmt ');
      assert.equal(wavBuf.toString('ascii', 36, 40), 'data');
    });
  });

  // 5. 12 Generated WAV Audio Samples & Manifest Integrity
  describe('5. Voice Samples & Manifest Verification', () => {
    it('verifies jarvix-voice.manifest.json exists and catalogues all 12 samples', () => {
      assert.ok(fs.existsSync(manifestPath), 'Manifest file must exist');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      const sampleKeys = Object.keys(manifest.samples);
      assert.equal(sampleKeys.length, 12);
      assert.deepEqual(Object.keys(manifest.timbres), ['baritone', 'executive', 'warm']);

      for (const sample of Object.values(manifest.samples)) {
        assert.ok((sample.relPath || sample.fileName || '').endsWith('.wav'));
        assert.ok(sample.sha256 && sample.sha256.length === 64, 'Must have valid SHA256');
        assert.ok(sample.fileSize > 100000, 'Audio sample size must be non-empty valid audio');
      }
    });

    it('verifies every single one of the 12 WAV sample files exists on disk with valid RIFF header', () => {
      const timbres = ['baritone', 'executive', 'warm'];
      const langs = ['ru', 'en', 'es', 'fr'];

      for (const timbre of timbres) {
        for (const lang of langs) {
          const fileName = `sample_${timbre}_${lang}.wav`;
          const filePath = path.join(samplesDir, fileName);

          assert.ok(fs.existsSync(filePath), `Sample ${fileName} must exist on disk`);
          const buf = fs.readFileSync(filePath);

          // RIFF WAV Header check
          assert.equal(buf.toString('ascii', 0, 4), 'RIFF', `${fileName} must start with RIFF`);
          assert.equal(buf.toString('ascii', 8, 12), 'WAVE', `${fileName} format must be WAVE`);
          assert.equal(buf.toString('ascii', 12, 16), 'fmt ', `${fileName} subchunk1 must be fmt `);
          assert.equal(buf.toString('ascii', 36, 40), 'data', `${fileName} subchunk2 must be data`);
          assert.ok(buf.length > 150000, `${fileName} must be of realistic length`);
        }
      }
    });
  });

  // 6. Self-Hosted On-Premise Infrastructure Specs
  describe('6. Self-Hosted On-Premise Infrastructure & Latency Specs', () => {
    it('provides concrete hardware, engine, latency and zero-spend metrics', () => {
      assert.ok(INFRASTRUCTURE_SPEC.ttsEngine.includes('Chatterbox'));
      assert.ok(INFRASTRUCTURE_SPEC.sttEngine.includes('faster-whisper'));
      assert.ok(INFRASTRUCTURE_SPEC.latencyTarget.p95 <= 220, 'p95 target must be <= 220ms');
      assert.equal(INFRASTRUCTURE_SPEC.costModel.testingAndDevSpend, '$0.00');
      assert.ok(INFRASTRUCTURE_SPEC.productionHardware.gpu.includes('L4'));
    });
  });

  // 7. Review Studio Interface
  describe('7. Interactive JARVIX Review Studio (jarvix-studio.html)', () => {
    it('contains audio players for 12 samples, dialogue sandbox, and state inspector', () => {
      assert.ok(fs.existsSync(studioHtmlPath), 'jarvix-studio.html must exist');
      const html = fs.readFileSync(studioHtmlPath, 'utf8');

      assert.ok(html.includes('JARVIX Intelligence & Multilingual Voice Studio'));
      assert.ok(html.includes('id="timbreTabs"'));
      assert.ok(html.includes('id="samplesList"'));
      assert.ok(html.includes('id="terminalLogs"'));
      assert.ok(html.includes('id="stateInspector"'));
      assert.ok(html.includes('/api/jarvix/chat'));
      assert.ok(html.includes('sample_baritone_ru.wav'));
      assert.ok(html.includes('Self-Hosted On-Premise Architecture'));
      assert.ok(html.includes('Тест защиты'));
    });
  });
});
