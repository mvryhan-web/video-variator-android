import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
import {MODEL_CATALOG} from '../app/src/main/assets/generate-models.js';
import {
  SUPPORTED_LANGUAGES,
  INFRASTRUCTURE_SPEC,
  createWavBuffer,
  synthesizeSpeechWave,
  installJarvixVoiceRoutes
} from '../server/jarvix-voice.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const studioHtmlPath = path.join(rootDir, 'app', 'src', 'main', 'assets', 'jarvix-studio.html');

describe('JARVIX AI Brain & Multilingual Voice (Issue #498)', () => {
  // 1. Deepsyq Knowledge Registry
  describe('1. Truthful Deepsyq Platform Knowledge Registry', () => {
    it('contains strictly verified studios and everyday tools without hallucination', () => {
      assert.ok(DEEPSYQ_CAPABILITIES.studios.image, 'Image studio must be defined');
      assert.ok(DEEPSYQ_CAPABILITIES.studios.video, 'Video studio must be defined');
      assert.ok(DEEPSYQ_CAPABILITIES.studios.audio, 'Audio studio must be defined');

      assert.ok(DEEPSYQ_CAPABILITIES.studios.image.models.some(model=>model.id==='gpt-image-2.5-sunburst'));
      assert.ok(DEEPSYQ_CAPABILITIES.studios.image.models.some(model=>model.label==='Nano Banana Pro'));
      assert.ok(DEEPSYQ_CAPABILITIES.studios.video.models.some(model=>model.label==='Seedance 2.5'));
      assert.ok(DEEPSYQ_CAPABILITIES.studios.audio.models.some(model=>model.label==='Suno Voice'));
      assert.ok(DEEPSYQ_CAPABILITIES.studios.audio.models.some(model=>model.adapter===false));
      assert.ok(DEEPSYQ_CAPABILITIES.everydayTools.items.includes('Background Remover'));
      assert.ok(DEEPSYQ_CAPABILITIES.everydayTools.items.includes('Video Compressor'));
      assert.ok(DEEPSYQ_CAPABILITIES.everydayTools.items.includes('Avatar Studio'));
    });

    it('uses the model catalog as the only model-name source and avoids cached prices', () => {
      assert.equal(DEEPSYQ_CAPABILITIES.studios.image.models.length,MODEL_CATALOG.filter(model=>model.kind==='image').length);
      assert.equal(DEEPSYQ_CAPABILITIES.studios.video.models.length,MODEL_CATALOG.filter(model=>model.kind==='video').length);
      assert.equal('pricing' in DEEPSYQ_CAPABILITIES,false);
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

    it('allows navigation and themes but blocks unconfirmed prompt clearing', () => {
      const studioAction = executeSafeAction({ type: 'open_studio', studio: 'video' });
      assert.equal(studioAction.success, true);
      assert.equal(studioAction.type, 'open_studio');
      assert.ok(studioAction.url.includes('generate-studio.html?studio=video'));

      const themeAction = executeSafeAction({ type: 'adjust_theme', theme: 'cyberpunk' });
      assert.equal(themeAction.success, true);
      assert.equal(themeAction.theme, 'cyberpunk');

      const clearAction = executeSafeAction({ type: 'clear_inputs' });
      assert.equal(clearAction.success, false);
      assert.equal(clearAction.reason, 'MANUAL_CONFIRMATION_REQUIRED');
    });
  });

  // 4. Multilingual browser speech status
  describe('4. Multilingual Browser Speech Status', () => {
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

  // 5. Honest voice readiness
  it('does not claim an uninstalled backend or measured infrastructure', () => {
    assert.equal(INFRASTRUCTURE_SPEC.status, 'not_installed');
    assert.equal(INFRASTRUCTURE_SPEC.ttsEngine, null);
    assert.equal(INFRASTRUCTURE_SPEC.sttEngine, null);
    assert.equal(INFRASTRUCTURE_SPEC.latency, 'not_measured');
  });

  it('returns unavailable instead of serving generated tones as speech', async () => {
    const handlers = new Map();
    const app = {get:(route,fn)=>handlers.set(`GET ${route}`,fn),all:(route,fn)=>handlers.set(`ALL ${route}`,fn)};
    installJarvixVoiceRoutes(app);
    const config = await new Promise(resolve=>handlers.get('GET /api/jarvix/voice-config')({}, {json:resolve}));
    assert.equal(config.speechModelInstalled,false);
    assert.deepEqual(config.samples,{});
    for (const route of ['/api/jarvix/tts','/api/jarvix/stt']) {
      let status=200,body;
      const res={status(code){status=code;return this;},json(value){body=value;return this;}};
      handlers.get(`ALL ${route}`)({},res);
      assert.equal(status,503);
      assert.equal(body.error,'VOICE_MODEL_NOT_INSTALLED');
    }
  });

  // 7. Review Studio Interface
  describe('7. Interactive JARVIX Review Studio (jarvix-studio.html)', () => {
    it('shows the four browser-language previews without claiming a bundled voice engine', () => {
      assert.ok(fs.existsSync(studioHtmlPath), 'jarvix-studio.html must exist');
      const markup = fs.readFileSync(studioHtmlPath, 'utf8');
      assert.match(markup, /<script type="module" src="jarvix-studio-page\.js"><\/script>/);
      const html = markup + fs.readFileSync(path.join(path.dirname(studioHtmlPath), 'jarvix-studio-page.js'), 'utf8');

      assert.ok(html.includes('JARVIX Intelligence & Multilingual Voice Studio'));
      assert.ok(html.includes('id="samplesList"'));
      assert.ok(html.includes("sessionStorage.getItem('jarvix_studio_session')"));
      assert.ok(html.includes('id="terminalLogs"'));
      assert.ok(html.includes('id="stateInspector"'));
      assert.ok(html.includes('/api/jarvix/chat'));
      assert.ok(html.includes('locale:\'ru-RU\''));
      assert.ok(html.includes('locale:\'en-GB\''));
      assert.ok(html.includes('locale:\'es-ES\''));
      assert.ok(html.includes('locale:\'fr-FR\''));
      assert.ok(html.includes('dedicated JARVIX voice engine is not installed yet'));
      assert.ok(html.includes('Voice engine deployment plan'));
      assert.ok(!html.includes('sample_baritone_ru.wav'));
      assert.ok(html.includes("fetch('/api/studio/config')"));
      assert.ok(html.includes("fetch('/api/jarvix/site-map')"));
      assert.ok(!html.includes('Gemini 3.1 Flash'));
      assert.ok(html.includes('Тест защиты'));
    });
  });
});
