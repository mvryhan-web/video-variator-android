import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const chatJs = readFileSync(new URL('../app/src/main/assets/jarvix-chat.js', import.meta.url), 'utf8');
const chatHtml = readFileSync(new URL('../app/src/main/assets/jarvix-chat.html', import.meta.url), 'utf8');
const studioJs = readFileSync(new URL('../app/src/main/assets/generate-studio.js', import.meta.url), 'utf8');

function extractProcessMessage() {
  const start = chatJs.indexOf('function requestedChatMedia(message){');
  const end = chatJs.indexOf("const composer=bindComposer({");
  assert.ok(start !== -1 && end > start, 'processMessage slice should be found');
  return chatJs.slice(start, end);
}

function createHarness({ mode, text, credits, availableBalance, ownerAccess = false }) {
  const apiCalls = [];
  let confirmCalls = 0;
  let assignedUrl = null;
  let statusText = '';
  const modelId = mode === 'video' ? 'wan2.1-t2v-turbo' : 'wan2.1-t2i-turbo';
  const walletQuote = mode === 'video' ? 'wan-video-v1' : 'wan-image-v1';
  const message = { id: 'req_1234567890abcdef', role: 'user', text, mode, files: [], status: 'pending', createdAt: Date.now() };
  const conversation = { id: 'conv-1', title: '', messages: [message] };

  const context = {
    location: {
      hostname: 'deepsyq.app',
      assign(url) { assignedUrl = url; }
    },
    localStorage: {
      getItem: (key) => (key === 'vv_token' ? 'user-jwt-token' : null)
    },
    sessionStorage: {
      setItem() {},
      removeItem() {}
    },
    window: {
      dispatchEvent() {},
      confirm() {
        confirmCalls++;
        throw new Error('UNEXPECTED_CONFIRM_DIALOG');
      }
    },
    CustomEvent: function (name, opts) { return { name, detail: opts?.detail }; },
    Event: function (name) { return { name }; },
    conversation,
    config: {
      models: [
        { id: 'wan2.1-t2i-turbo', kind: 'image', enabled: true, adapter: true, ratios: ['1:1', '16:9', '9:16'] },
        { id: 'wan2.1-t2v-turbo', kind: 'video', enabled: true, adapter: true, ratios: ['16:9', '9:16'] }
      ]
    },
    pendingMediaFrame: null,
    epoch: 1,
    store: { guard() {} },
    makeId: () => 'id_' + Math.random().toString(36).slice(2, 10),
    getJarvixLanguage: () => 'ru',
    localGreeting: () => null,
    save: async () => {},
    render: () => {},
    status: (txt) => { statusText = txt; },
    poll: async () => {},
    speakJarvis: () => {},
    imageIntakeReply: (t) => ({ id: 'r1', role: 'assistant', text: t, createdAt: Date.now() }),
    siteKnowledge: () => null,
    builtinTool: () => null,
    extractAction: () => null,
    resolveMode: (_t, m) => m,
    setChatHeaderMode: () => {},
    generationRatio: (_kind, r) => r || (mode === 'video' ? '16:9' : '1:1'),
    generationPlanNotice: (m) => `Недостаточно AI-кредитов (${m}).`,
    recordChatReply: async () => false,
    addChatPlanOffer: () => {},
    node: (t, textContent) => ({ tagName: t.toUpperCase(), textContent, href: '' }),
    $: () => ({ append() {} }),
    setTimeout: (fn) => { fn(); return 1; },
    api: async (path, body) => {
      apiCalls.push({ path, body });
      if (path === '/api/studio/estimate') {
        return {
          ok: true,
          kind: body.kind,
          model: body.model,
          quantity: 1,
          credits,
          walletQuote,
          ownerAccess,
          previewOnly: false,
          freeTier: false
        };
      }
      if (path === '/api/ai-wallet/balance') {
        return { available: availableBalance, reserved: 0, debt: 0 };
      }
      if (path === '/api/jarvix/chat') {
        return { provider: 'Google Gemini', reply: JSON.stringify({ prompt: body.message }) };
      }
      if (path === '/api/studio/jobs') {
        return { ok: true, id: 'job_wan_123', jobId: 'job_wan_123', status: 'processing' };
      }
      throw new Error('Unexpected API path: ' + path);
    }
  };

  vm.runInNewContext(extractProcessMessage() + '\nthis.__run = () => processMessage(conversation.messages[0]);', context);
  return {
    run: () => context.__run(),
    getConfirmCalls: () => confirmCalls,
    getApiCalls: () => apiCalls,
    getAssignedUrl: () => assignedUrl,
    getStatusText: () => statusText,
    conversation,
    modelId,
    walletQuote
  };
}

test('JARVIX Chat runs paid video generation automatically without window.confirm when credits are sufficient', async () => {
  const h = createHarness({ mode: 'video', text: 'снег тепло уютно', credits: 20, availableBalance: 50 });
  await h.run();
  assert.equal(h.getConfirmCalls(), 0);
  const paths = h.getApiCalls().map((c) => c.path);
  assert.deepEqual(paths, ['/api/studio/estimate', '/api/ai-wallet/balance', '/api/jarvix/chat', '/api/studio/jobs']);
  const jobCall = h.getApiCalls().find((c) => c.path === '/api/studio/jobs');
  assert.equal(jobCall.body.consent, true);
  assert.equal(jobCall.body.expectedCredits, 20);
  assert.equal(jobCall.body.walletQuote, 'wan-video-v1');
  assert.equal(h.conversation.messages.at(-1)?.jobId, 'job_wan_123');
});

test('JARVIX Chat runs paid image generation automatically without window.confirm', async () => {
  const h = createHarness({ mode: 'image', text: 'зимний лес на закате', credits: 5, availableBalance: 10 });
  await h.run();
  assert.equal(h.getConfirmCalls(), 0);
  const jobCall = h.getApiCalls().find((c) => c.path === '/api/studio/jobs');
  assert.ok(jobCall, 'job should be dispatched directly without confirm dialog');
  assert.equal(jobCall.body.consent, true);
  assert.equal(jobCall.body.expectedCredits, 5);
  assert.equal(jobCall.body.walletQuote, 'wan-image-v1');
});

test('JARVIX Chat skips confirm dialog and rejects immediately when wallet balance is insufficient', async () => {
  const h = createHarness({ mode: 'video', text: 'снег тепло уютно', credits: 20, availableBalance: 5 });
  await h.run();
  assert.equal(h.getConfirmCalls(), 0);
  const paths = h.getApiCalls().map((c) => c.path);
  assert.deepEqual(paths, ['/api/studio/estimate', '/api/ai-wallet/balance']);
  assert.equal(h.conversation.messages.at(-1)?.limitReached, true);
  assert.equal(h.getAssignedUrl(), 'pricing.html#plan-trial');
  assert.match(h.getStatusText(), /Недостаточно AI-кредитов/);
});

test('Creative Studio removes paid confirm dialog while keeping expectedCredits and jarvix-chat cache bust', () => {
  assert.doesNotMatch(chatJs, /Запустить генерацию за|Start generation for/);
  assert.doesNotMatch(studioJs, /paidQuote\s*&&\s*!confirm/);
  assert.doesNotMatch(studioJs, /No job starts until you confirm|Задание начнётся только после подтверждения/);
  assert.match(studioJs, /expectedCredits:quote\.credits/);
  assert.match(studioJs, /freePreview&&!confirm/);
  assert.match(chatHtml, /jarvix-chat\.js\?v=auto-credits-1/);
});

for (const [kind, model, credits] of [
  ['image', 'wan2.1-t2i-turbo', 5],
  ['video', 'wan2.1-t2v-turbo', 20],
  ['music', 'lyria-3-clip-preview', 10]
]) {
  test(`Creative Studio dispatches paid ${kind} automatically without confirm popup`, async () => {
    const start = studioJs.indexOf("$('creator').onsubmit=async e=>{");
    const end = studioJs.indexOf('// Continue from an existing image in the same browser');
    assert.ok(start !== -1 && end > start);
    const handlerCode = studioJs.slice(start, end);
    const elements = {
      creator: {},
      generate: { disabled: false },
      status: { textContent: '' },
      prompt: { value: 'Test prompt' },
      ratio: { value: '16:9' },
      imageResolution: { value: '1K' },
      imageOutputFormat: { value: 'auto' },
      videoResolution: { value: '720p' },
      videoDuration: { value: '5' },
      videoInputMode: { value: 'text' },
      musicMode: { value: 'song' },
      consent: { checked: true }
    };
    const calls = [];
    let confirmCalls = 0;
    const context = {
      $: (id) => elements[id],
      kind,
      modelId: model,
      refs: [],
      busy: false,
      job: null,
      generation: 0,
      voiceActionPending: false,
      activeVideoWatchId: null,
      config: { enabled: true, freeTier: false, previewOnly: false },
      imageBatchQuantity: () => 1,
      availability: () => {},
      say: (en) => en,
      setHistory: () => {},
      clearResult: () => {},
      updateJobProgress: () => {},
      rememberStudioJob: () => {},
      watch: async () => {},
      errorText: (e) => e.message,
      crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' },
      confirm: () => {
        confirmCalls++;
        throw new Error('UNEXPECTED_STUDIO_CONFIRM');
      },
      api: async (path, opts) => {
        const body = JSON.parse(opts.body);
        calls.push({ path, body });
        if (path === '/api/studio/estimate') {
          return { json: async () => ({ kind, model, quantity: 1, credits, freeTier: false }) };
        }
        if (path === '/api/studio/jobs') {
          return { json: async () => ({ id: 'job_studio_1', status: 'processing', creditsReserved: credits }) };
        }
        throw new Error('Unexpected API path: ' + path);
      }
    };
    vm.runInNewContext(handlerCode, context);
    await elements.creator.onsubmit({ preventDefault() {} });
    assert.equal(confirmCalls, 0);
    assert.deepEqual(calls.map((c) => c.path), ['/api/studio/estimate', '/api/studio/jobs']);
    assert.equal(calls[1].body.expectedCredits, credits);
    assert.equal(calls[1].body.consent, true);
  });
}
