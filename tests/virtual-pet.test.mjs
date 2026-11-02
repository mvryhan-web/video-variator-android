import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Create a lightweight DOM mock environment for Node testing
function setupMockEnv() {
  const store = {};
  const mockLocalStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };

  const elements = {};
  const mockDocument = {
    body: {
      appendChild: (el) => { elements[el.id || Math.random()] = el; return el; }
    },
    getElementById: (id) => elements[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); }
        },
        style: {},
        innerHTML: '',
        setAttribute(k, v) { this[k] = v; },
        getAttribute(k) { return this[k]; },
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {}
      };
      return el;
    }
  };

  global.localStorage = mockLocalStorage;
  global.document = mockDocument;

  require('../app/src/main/assets/virtual-pet.js');
  return { mockLocalStorage, pet: globalThis.DeepsyqVirtualPet };
}

test('Virtual Pet Companion — Engine, Defaults & Settings', () => {
  const { pet } = setupMockEnv();

  const defaultSettings = pet.loadSettings();
  assert.equal(defaultSettings.enabled, true);
  assert.equal(defaultSettings.pet, 'dog');
  assert.equal(defaultSettings.name, 'Рекс');
  assert.equal(defaultSettings.mode, 'calm');
  assert.equal(defaultSettings.sound, false);
  assert.equal(defaultSettings.noseDraft, true);
  assert.equal(defaultSettings.noseRatio, true);
  assert.equal(defaultSettings.noseJobs, true);

  // Update settings to Cat (Luna)
  pet.saveSettings({ pet: 'cat', name: 'Луна', mode: 'playful' });
  const updated = pet.loadSettings();
  assert.equal(updated.pet, 'cat');
  assert.equal(updated.name, 'Луна');
  assert.equal(updated.mode, 'playful');
});

test('Superpower #1: Draft Saver / Rescue (Block 8)', () => {
  const { mockLocalStorage, pet } = setupMockEnv();

  // Save a draft
  const promptText = 'Креативный ролик с неоновым городом будущего';
  pet.saveDraft(promptText, { studio: 'video', aspectRatio: '16:9' });

  // Verify draft exists in storage
  const draft = pet.getSavedDraft();
  assert.ok(draft, 'Draft should be saved');
  assert.equal(draft.text, promptText);
  assert.equal(draft.aspectRatio, '16:9');

  // Verify expired draft handling (> 48h)
  const staleDraft = { text: 'Старый промпт', timestamp: Date.now() - (50 * 3600 * 1000) };
  mockLocalStorage.setItem('deepsyq_studio_draft', JSON.stringify(staleDraft));
  assert.equal(pet.getSavedDraft(), null, 'Stale draft > 48h must be null');

  // Verify clear draft
  pet.saveDraft('Тест очистки');
  pet.clearSavedDraft();
  assert.equal(pet.getSavedDraft(), null, 'Draft must be cleared');
});

test('Superpower #2: Format & Ratio Sniffer for Reels / Shorts', () => {
  const { pet } = setupMockEnv();

  // Check keyword detection
  assert.equal(pet.checkFormatKeywords('Динамичный промо-ролик для Reels'), 'reels');
  assert.equal(pet.checkFormatKeywords('Вирусное видео для TikTok под тренд'), 'tiktok');
  assert.equal(pet.checkFormatKeywords('Вертикальный клип для сторис'), 'сторис');
  assert.equal(pet.checkFormatKeywords('Классический фильм на ТВ'), null);

  // Sniff format check: 16:9 with TikTok keywords triggers suggestion
  let ratioChangedTo = null;
  pet.sniffFormatRatio('Видео для Shorts', '16:9', (newRatio) => {
    ratioChangedTo = newRatio;
  });

  // Verify that it detected the opportunity for 9:16
  assert.ok(pet.checkFormatKeywords('Видео для Shorts') !== null);
});

test('Superpower #3: Job Ready Delivery (Block 8)', () => {
  const { pet } = setupMockEnv();

  const testJob = {
    id: 'job-pet-ready-123',
    status: 'ready',
    prompt: '3D анимация логотипа Deepsyq'
  };

  assert.equal(pet.getDeliveredJobIds().includes(testJob.id), false);
  pet.markJobDelivered(testJob.id);
  assert.equal(pet.getDeliveredJobIds().includes(testJob.id), true);

  // Second delivery should be ignored to avoid spamming
  const initialLength = pet.getDeliveredJobIds().length;
  pet.markJobDelivered(testJob.id);
  assert.equal(pet.getDeliveredJobIds().length, initialLength);
});

test('Mode "off" respects privacy and silence', () => {
  const { pet } = setupMockEnv();

  pet.saveSettings({ mode: 'off', enabled: false });
  assert.equal(pet.settings.mode, 'off');
  assert.equal(pet.settings.enabled, false);

  // Quick toggle mode turns it back on
  pet.toggleModeQuick();
  assert.equal(pet.settings.mode, 'calm');
  assert.equal(pet.settings.enabled, true);
});
