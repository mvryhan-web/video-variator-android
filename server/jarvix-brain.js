/**
 * DEEPSYQ JARVIX AI Brain & Dialog Intelligence — Issue #498 (Coordinator #233)
 *
 * Implements:
 * 1. Safe OpenAI Responses / Chat Completions backend with server-held keys.
 * 2. Deterministic, zero-spend mock brain when API is not configured.
 * 3. Verified Deepsyq Capabilities Registry (Image, Video, Audio, Everyday Tools, Pricing).
 * 4. Multi-turn dialogue memory preserving prompt refinements across steps.
 * 5. Strict Safe Tool Execution guardrail blocking unauthorized spends, credit deductions, or deletions.
 * 6. Studio handoff compiler for instant auto-generation on navigation.
 */

import path from 'node:path';
import fs from 'node:fs';

// 1. DEEPSYQ CAPABILITIES REGISTRY (Truthful knowledge base, zero hallucinated models)
export const DEEPSYQ_CAPABILITIES = Object.freeze({
  brand: 'DEEPSYQ',
  voiceButler: 'JARVIX',
  studios: {
    image: {
      name: 'Image Studio',
      models: [
        'gemini-3.1-flash-image',
        'gemini-nano-banana-2.1',
        'gemini-3-pro-image',
        'byteplus-seedream-4-5',
        'byteplus-seedream-3',
        'gpt-image-2.5-sunburst',
        'gpt-image-2'
      ],
      defaultModel: 'gemini-3.1-flash-image',
      ratios: ['1:1', '16:9', '9:16', '4:5', '3:2'],
      rateCredits: 5
    },
    video: {
      name: 'Video Studio',
      models: [
        'veo-3.1-lite-generate-preview',
        'veo-3.1-fast-generate-preview',
        'byteplus-seedance-2',
        'byteplus-seedance-1-pro'
      ],
      defaultModel: 'veo-3.1-lite-generate-preview',
      ratios: ['16:9', '9:16', '1:1'],
      rateCredits: 20
    },
    audio: {
      name: 'Audio Studio',
      models: ['lyria-3-clip-preview'],
      defaultModel: 'lyria-3-clip-preview',
      rateCredits: 10
    }
  },
  workspaces: {
    canvas: 'Interactive creative infinite canvas for multi-layer generative composition.',
    aiApps: 'Curated library of specialized AI prompt templates and styles.',
    uniquifier: 'Client-side ffmpeg video processor for Instagram Reels, TikTok, YouTube Shorts.'
  },
  everydayTools: {
    cost: '100% Free',
    privacy: '100% Local / In-Browser',
    items: [
      'Background Remover',
      'Video Compressor',
      'Photo Compressor',
      'Audio Extractor',
      'Teleprompter',
      'Subtitle Generator',
      'Avatar Studio'
    ]
  },
  pricing: {
    basic: { priceEur: 9, credits: 500 },
    pro: { priceEur: 24, credits: 1500 },
    business: { priceEur: 99, credits: 6000 },
    lifetime: { priceEur: 2999, unlimited: true, oneTime: true }
  }
});

// 2. CONVERSATIONAL SESSION MANAGER WITH MULTI-TURN MEMORY
export const activeSessions = new Map();
export const jarvixSessionStore = activeSessions; // Alias for convenience

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function getOrCreateSession(sessionId) {
  const sid = sessionId || 'default-jarvix-session';
  const now = Date.now();

  let session = activeSessions.get(sid);
  if (!session || (now - session.lastActivityAt > SESSION_TTL_MS)) {
    session = {
      id: sid,
      createdAt: now,
      lastActivityAt: now,
      history: [],
      accumulatedPrompt: {
        subject: '',
        color: '',
        lighting: '',
        environment: '',
        style: '',
        targetKind: 'video' // 'image' | 'video' | 'audio'
      },
      lastProposedAction: null
    };
    activeSessions.set(sid, session);
  } else {
    session.lastActivityAt = now;
  }
  return session;
}

export function clearSession(sessionId) {
  if (sessionId) activeSessions.delete(sessionId);
}

// 3. PROMPT ACCUMULATOR HELPER
export function compileAccumulatedPrompt(acc) {
  const parts = [];
  if (acc.color && acc.subject) {
    parts.push(`${acc.color} ${acc.subject}`);
  } else if (acc.subject) {
    parts.push(acc.subject);
  }

  if (acc.environment) parts.push(acc.environment);
  if (acc.lighting) parts.push(acc.lighting);
  if (acc.style) parts.push(acc.style);

  let compiled = parts.join(', ');
  if (!compiled) return '';

  if (acc.targetKind === 'video') {
    return `Кинематографичный ролик: ${compiled}, плавное движение камеры 4k, фотореалистичная детализация, 60fps`;
  } else if (acc.targetKind === 'audio') {
    return `Атмосферный музыкальный трек: ${compiled}, студийная акустика, глубокий бас`;
  }
  return `Высокодетализированный кадр 8k: ${compiled}, художественная глубина резкости, фотореализм`;
}

// 4. STRICT SAFE ACTION EXECUTOR & GUARDRAILS
export function executeSafeAction(action) {
  if (!action || typeof action !== 'object') {
    return { success: false, reason: 'INVALID_ACTION' };
  }

  // Guardrail 1: Block unauthorized billing / charge / subscription manipulation
  if (action.type === 'charge_user' || action.type === 'billing' || action.amount || /charge|deduct|spend|pay/i.test(action.type)) {
    return {
      success: false,
      type: 'block_unauthorized',
      reason: 'Unauthorized billing or credit deduction blocked by Deepsyq safety guardrails.'
    };
  }

  // Guardrail 2: Block database deletion or system wipe
  if (/delete_database|drop_table|wipe|rmdir/i.test(action.type) || action.target === 'all') {
    return {
      success: false,
      type: 'block_unauthorized',
      reason: 'Destructive system action blocked by Deepsyq safety guardrails.'
    };
  }

  // Permitted Safe Actions
  if (action.type === 'open_studio' || action.type === 'navigate') {
    const studio = action.studio || 'video';
    return {
      success: true,
      type: 'open_studio',
      studio,
      url: action.url || `generate-studio.html?studio=${studio}&from=jarvix&auto=1`
    };
  }

  if (action.type === 'adjust_theme' || action.type === 'set_theme') {
    return {
      success: true,
      type: 'adjust_theme',
      theme: action.theme || 'cyberpunk'
    };
  }

  if (action.type === 'clear_inputs' || action.type === 'clear_input') {
    return {
      success: true,
      type: 'clear_inputs'
    };
  }

  return { success: false, reason: 'UNKNOWN_ACTION' };
}

// 5. MULTI-TURN REASONING ENGINE (Zero-spend deterministic brain when live API is offline)
export function processTurnWithMockBrain(userText, session, lang = 'ru') {
  const t = (userText || '').trim();
  const lower = t.toLowerCase();
  const isRu = lang === 'ru';
  const isEn = lang === 'en';
  const isEs = lang === 'es';
  const isFr = lang === 'fr';

  session.history.push({ role: 'user', content: t, timestamp: Date.now() });

  let replyText = '';
  let action = null;
  let studioHandoff = null;

  // 0. GUARDRAIL CHECK: BLOCK UNAUTHORIZED SPENDS OR DELETIONS
  if (/(?:спиши|снять|оплати|charge|deduct|pay|\$|доллар)/i.test(lower) && /(?:счет|баланс|аккаунт|деньг|card|account)/i.test(lower)) {
    action = executeSafeAction({ type: 'charge_user', amount: 100 });
    return {
      reply: isRu
        ? 'Действие заблокировано системой безопасности Deepsyq: голосовой помощник не имеет права списывать средства или изменять баланс.'
        : 'Action blocked by Deepsyq safety guardrail: voice assistant cannot charge funds or alter billing.',
      action,
      entities: { ...session.accumulatedPrompt },
      compiledPrompt: compileAccumulatedPrompt(session.accumulatedPrompt),
      studioHandoff: null,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }

  if (/(?:удали|сотри)\s+(?:баз|сервер|файл|database|db|server)/i.test(lower)) {
    action = executeSafeAction({ type: 'delete_database', target: 'all' });
    return {
      reply: isRu
        ? 'Действие заблокировано: удаление системных данных запрещено.'
        : 'Action blocked: destructive database operations are forbidden.',
      action,
      entities: { ...session.accumulatedPrompt },
      compiledPrompt: compileAccumulatedPrompt(session.accumulatedPrompt),
      studioHandoff: null,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }

  // 1. CAPABILITIES & REGISTRY INQUIRY ("Что ты умеешь?", "What can you do?")
  if (/(?:что\s+(?:ты\s+)?(?:умеешь|можешь)|возможности|функции|help|capabilities|what can you do|que puedes hacer|que sais-tu faire)/i.test(lower)) {
    if (isRu) {
      replyText = 'Я JARVIX — ваш бортовой голосовой интеллект Deepsyq. Я знаю все возможности платформы:\n' +
        '1. Студии генерации: Video Studio (Veo, Seedance), Image Studio (Flash, Seedream), Audio Studio.\n' +
        '2. Творческие инструменты: Canvas для набросков, AI Apps с шаблонами, Видеоуникализатор.\n' +
        '3. Бесплатные утилиты: удаление фона, сжатие видео и фото без водяных знаков.\n' +
        '4. Управление сайтом: навигация, освещение, оформление промптов и подсказки по тарифам.\n' +
        'Что вас интересует подробнее?';
    } else if (isEs) {
      replyText = 'Soy JARVIX, su inteligencia de voz en Deepsyq. Conozco todas las herramientas:\n' +
        '1. Estudios creativos: Video Studio, Image Studio y Audio Studio.\n' +
        '2. Espacios de trabajo: Canvas, plantillas AI Apps y el Optimizador de vídeo.\n' +
        '3. Herramientas gratuitas: eliminación de fondos, compresión de medios.\n' +
        '¿En qué proyecto empezamos hoy?';
    } else if (isFr) {
      replyText = 'Je suis JARVIX, votre intelligence vocale sur Deepsyq. Voici les fonctionnalités vérifiées:\n' +
        '1. Studios créatifs: Video Studio, Image Studio et Audio Studio.\n' +
        '2. Espaces de création: Canvas, modèles AI Apps et Uniquificateur vidéo.\n' +
        '3. Utilitaires gratuits: détourage d\'image, compression vidéo et photo.\n' +
        'Comment puis-je vous assister?';
    } else {
      replyText = 'I am JARVIX — your resident voice intelligence on Deepsyq. Here is what I can do:\n' +
        '1. Generation Studios: Video Studio, Image Studio, and Audio Studio.\n' +
        '2. Creative Workspaces: Canvas, AI Apps templates, and Video Uniquifier.\n' +
        '3. Everyday Utilities: Background remover, video and photo compression.\n' +
        '4. Navigation & Smart Prompts: Instantly opening studios with tailored prompts.\n' +
        'What would you like to explore?';
    }
    return {
      reply: replyText,
      action: null,
      entities: { ...session.accumulatedPrompt },
      compiledPrompt: compileAccumulatedPrompt(session.accumulatedPrompt),
      studioHandoff: null,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }

  // 2. MULTI-TURN SUBJECT EXTRACTION (e.g. "Создай запрос для видео с Porsche", "Хочу создать изображение Порше")
  if (/(?:видео|video)/i.test(lower)) session.accumulatedPrompt.targetKind = 'video';
  if (/(?:картинк|фото|изображен|image|photo)/i.test(lower)) session.accumulatedPrompt.targetKind = 'image';
  if (/(?:аудио|музык|песн|трек|audio|music)/i.test(lower)) session.accumulatedPrompt.targetKind = 'audio';

  if (/(?:porsche|порше|машин|автомобил|спорткар|корабл|город|космос|замок|пейзаж)/i.test(lower)) {
    const rawSubj = /(?:porsche|порше)/i.test(lower) ? 'Porsche 911' : t.replace(/^(?:создай|сделай|напиши|придумай|хочу|запрос|промпт)?\s*(?:мне)?\s*(?:для|про|с)?\s*/i, '').trim();
    session.accumulatedPrompt.subject = rawSubj;
    session.accumulatedPrompt.concept = rawSubj;
    const compiled = compileAccumulatedPrompt(session.accumulatedPrompt);
    replyText = isRu
      ? `Принял концепт: «${rawSubj}». Хотите настроить цвет, окружение или освещение? Например: «Пусть он будет чёрным» или «Добавь дождь».`
      : `Concept noted: "${rawSubj}". Would you like to refine the color, environment, or lighting?`;
    return {
      reply: replyText,
      action: null,
      entities: { ...session.accumulatedPrompt },
      compiledPrompt: compiled,
      studioHandoff: null,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }

  // 3. COLOR REFINEMENT ("Пусть он будет чёрным", "Сделай его черным")
  const colorMatch = lower.match(/(?:пусть\s+(?:он|она|оно|его)\s+будет|сделай\s*(?:его|ее|их)?|цвет)?\s*(чёрн\w*|черн\w*|бел\w*|красн\w*|синий|синев\w*|серебрист\w*|золот\w*|неонов\w*|black|white|red|blue|silver|gold)/i);
  if (colorMatch && (session.accumulatedPrompt.subject || session.accumulatedPrompt.concept)) {
    const matchedColor = colorMatch[1].toLowerCase();
    const isBlack = /черн|чёрн|black/i.test(matchedColor);
    session.accumulatedPrompt.color = isBlack ? 'obsidian black finish' : matchedColor;
    session.accumulatedPrompt.colorValue = isBlack ? 'black' : matchedColor;
    const compiled = compileAccumulatedPrompt(session.accumulatedPrompt);
    replyText = isRu
      ? `Зафиксировал цвет: ${matchedColor}. Текущий промпт: «${compiled}». Что добавим в окружение?`
      : `Color set to ${matchedColor}. Current prompt: "${compiled}". What environment shall we add?`;
    return {
      reply: replyText,
      action: null,
      entities: { ...session.accumulatedPrompt, color: isBlack ? 'black' : matchedColor },
      compiledPrompt: compiled,
      studioHandoff: null,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }

  // 4. ENVIRONMENT / WEATHER REFINEMENT ("Добавь дождь", "Добавь дождь и отражения")
  if (/(?:добавь|включи|пусть\s+будет)?\s*(дожд\w*|ливень|ночн\w*|туман|неон|солнц\w*|снег|rain|night|fog|neon|snow)/i.test(lower)) {
    const envMatch = lower.match(/(дожд\w*|ливень|ночн\w*|туман|неон|солнц\w*|снег|rain|night|fog|neon|snow)/i)[1];
    const isRain = /дожд|ливень|rain/i.test(envMatch);
    session.accumulatedPrompt.environment = isRain ? 'rainy night reflections' : `${envMatch} ambiance`;
    session.accumulatedPrompt.weather = isRain ? 'rain' : envMatch;
    const compiled = compileAccumulatedPrompt(session.accumulatedPrompt);
    replyText = isRu
      ? `Добавил окружение: ${envMatch}. Сформированный промпт: «${compiled}». Сказать «Открой студию», чтобы перейти к генерации?`
      : `Added environment: ${envMatch}. Ready prompt: "${compiled}". Say "Open studio" to begin.`;
    return {
      reply: replyText,
      action: null,
      entities: { ...session.accumulatedPrompt, weather: isRain ? 'rain' : envMatch },
      compiledPrompt: compiled,
      studioHandoff: null,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }

  // 5. NAVIGATION / STUDIO OPENING ("Открой студию", "Открой видео", "Open studio")
  if (/(?:открой|перейди|запусти|open|launch)?\s*(?:video[\s-]?studio|image[\s-]?studio|видео[\s-]?студи|студи|studio)/i.test(lower)) {
    const targetKind = session.accumulatedPrompt.targetKind || 'image';
    const compiledPrompt = compileAccumulatedPrompt(session.accumulatedPrompt) || 'Высокодетализированный кадр 8k';
    const studioUrl = `generate-studio.html?studio=${targetKind}&from=jarvix&auto=1`;

    action = executeSafeAction({
      type: 'open_studio',
      studio: targetKind,
      url: studioUrl
    });

    studioHandoff = {
      kind: targetKind,
      prompt: compiledPrompt,
      autoGenerate: true
    };

    replyText = isRu
      ? `Открываю ${targetKind === 'video' ? 'Video Studio' : 'студию'} с вашим запросом: «${compiledPrompt}». Сделано.`
      : `Opening ${targetKind} Studio with your prompt: "${compiledPrompt}". Done.`;

    return {
      reply: replyText,
      action,
      entities: { ...session.accumulatedPrompt },
      compiledPrompt,
      studioHandoff,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }

  // 6. SAFE SITE ACTIONS (Lighting, Clear, Tools)
  if (/(?:посветлее|светлая тема|light theme)/i.test(lower)) {
    action = executeSafeAction({ type: 'adjust_theme', theme: 'light' });
    return {
      reply: isRu ? 'Сделал освещение сайта светлым и контрастным.' : 'Switched to light theme.',
      action,
      entities: { ...session.accumulatedPrompt },
      compiledPrompt: compileAccumulatedPrompt(session.accumulatedPrompt),
      studioHandoff: null,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }
  if (/(?:потемнее|темная тема|dark theme|ночной режим)/i.test(lower)) {
    action = executeSafeAction({ type: 'adjust_theme', theme: 'midnight' });
    return {
      reply: isRu ? 'Включил глубокую тёмную тему.' : 'Switched to midnight dark theme.',
      action,
      entities: { ...session.accumulatedPrompt },
      compiledPrompt: compileAccumulatedPrompt(session.accumulatedPrompt),
      studioHandoff: null,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }
  if (/(?:очисти|сотри|clear|delete)/i.test(lower)) {
    action = executeSafeAction({ type: 'clear_inputs' });
    return {
      reply: isRu ? 'Поля ввода очищены.' : 'Inputs cleared.',
      action,
      entities: { ...session.accumulatedPrompt },
      compiledPrompt: compileAccumulatedPrompt(session.accumulatedPrompt),
      studioHandoff: null,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }

  // 7. PRICING & TARIFFS
  if (/(?:тариф|цен|стоимост|подписк|pricing|plans|lifetime)/i.test(lower)) {
    replyText = isRu
      ? 'На Deepsyq доступны подписки Basic (9€), Pro (24€), Business (99€), а также пожизненная лицензия Lifetime за 2999€ со всеми возможностями навсегда. Открыть страницу тарифов?'
      : 'Deepsyq offers Basic (9€), Pro (24€), Business (99€) and permanent Lifetime for 2999€. Would you like to view Pricing?';
    return {
      reply: replyText,
      action: { type: 'open_studio', url: 'pricing.html' },
      entities: { ...session.accumulatedPrompt },
      compiledPrompt: compileAccumulatedPrompt(session.accumulatedPrompt),
      studioHandoff: null,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }

  // 8. SOCIAL DIALOG & STATUS
  if (/(?:как дела|как ты|how are you|como estas|comment vas-tu)/i.test(lower)) {
    replyText = isRu
      ? 'Все бортовые системы функционируют на максимальной производительности. Готов генерировать идеи или навигировать по платформе.'
      : 'All onboard systems are fully operational. Ready to assist with prompts and workflows.';
    return {
      reply: replyText,
      action: null,
      entities: { ...session.accumulatedPrompt },
      compiledPrompt: compileAccumulatedPrompt(session.accumulatedPrompt),
      studioHandoff: null,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }

  // 9. PROACTIVE NATURAL FALLBACK
  replyText = isRu
    ? `Я вас услышал: «${t}». Могу сформировать детальный промпт для нейросети на эту тему или открыть подходящий инструмент. Что выберем?`
    : `I heard: "${t}". Shall I formulate a prompt for this or open a relevant tool?`;

  return {
    reply: replyText,
    action: null,
    entities: { ...session.accumulatedPrompt },
    compiledPrompt: compileAccumulatedPrompt(session.accumulatedPrompt),
    studioHandoff: null,
    language: lang,
    provider: 'jarvix-mock-brain'
  };
}

// 6. LIVE OPENAI RESPONSES API DISPATCHER
export async function processTurnWithOpenAI(userText, session, lang = 'ru') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || process.env.JARVIX_AI_LIVE !== 'true') {
    return processTurnWithMockBrain(userText, session, lang);
  }

  const model = process.env.JARVIX_AI_MODEL || 'gpt-4o-mini';
  const systemPrompt = `You are JARVIX, the resident intelligent voice butler of DEEPSYQ creative AI platform.
Language: ${lang}.
Tone: Calm, confident, polite, sophisticated, concise butler persona (Marvel JARVIS inspired).
Capabilities Registry:
${JSON.stringify(DEEPSYQ_CAPABILITIES, null, 2)}

Strict Safety Rules:
1. NEVER invent non-existent features or platforms.
2. NEVER trigger paid generation, credit deduction, billing changes, or asset deletion without explicit client confirmation.
3. If the user refines a creative concept across turns (e.g. Porsche -> black -> rain), accumulate all details into a cohesive production prompt.
4. When instructed to open a studio or tool, output an action JSON block:
{"action":{"type":"open_studio","studio":"video","url":"generate-studio.html?studio=video&from=jarvix&auto=1"}}
Keep speech responses concise and natural for audio text-to-speech.`;

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...session.history.slice(-8).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userText }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      console.warn('[JARVIX-AI] OpenAI API error, falling back to verified local brain:', response.status);
      return processTurnWithMockBrain(userText, session, lang);
    }

    const data = await response.json();
    const rawReply = data.choices?.[0]?.message?.content || '';

    let action = null;
    let cleanReply = rawReply;
    const jsonMatch = rawReply.match(/\{[\s\S]*"action"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        action = executeSafeAction(parsed.action);
        cleanReply = rawReply.replace(jsonMatch[0], '').trim();
      } catch (_) {}
    }

    session.history.push({ role: 'user', content: userText, timestamp: Date.now() });
    session.history.push({ role: 'assistant', content: cleanReply, timestamp: Date.now() });

    return {
      reply: cleanReply,
      action,
      entities: { ...session.accumulatedPrompt },
      compiledPrompt: compileAccumulatedPrompt(session.accumulatedPrompt),
      studioHandoff: null,
      language: lang,
      provider: 'openai'
    };
  } catch (err) {
    console.warn('[JARVIX-AI] Network error, falling back to verified local brain:', err.message);
    return processTurnWithMockBrain(userText, session, lang);
  }
}

// 7. MAIN ROUTE INSTALLER FOR EXPRESS
export function installJarvixBrainRoutes(app, options = {}) {
  // Chat Turn Endpoint
  app.post('/api/jarvix/chat', async (req, res) => {
    try {
      const { message, sessionId, conversationId, language, timbre } = req.body || {};
      const sid = sessionId || conversationId;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'MISSING_MESSAGE' });
      }

      const lang = ['ru', 'en', 'es', 'fr'].includes(language) ? language : 'ru';
      const session = getOrCreateSession(sid);

      const result = await processTurnWithOpenAI(message, session, lang);
      const chosenTimbre = timbre || 'baritone';
      const audioUrl = `/api/jarvix/tts?text=${encodeURIComponent(result.reply.slice(0, 120))}&lang=${lang}&timbre=${chosenTimbre}`;

      res.json({
        ok: true,
        reply: result.reply,
        audioUrl,
        action: result.action,
        entities: result.entities,
        compiledPrompt: result.compiledPrompt,
        studioHandoff: result.studioHandoff,
        sessionId: session.id,
        conversationId: session.id,
        language: lang,
        provider: result.provider
      });
    } catch (err) {
      console.error('[JARVIX-AI] Route error:', err);
      res.status(500).json({ error: 'JARVIX_BRAIN_ERROR' });
    }
  });

  // Capabilities Registry Query
  app.get('/api/jarvix/capabilities', (req, res) => {
    res.json({
      ok: true,
      service: 'JARVIX AI Brain',
      capabilities: DEEPSYQ_CAPABILITIES
    });
  });

  // Reset Session Endpoint
  app.post('/api/jarvix/reset', (req, res) => {
    const { sessionId, conversationId } = req.body || {};
    const sid = sessionId || conversationId;
    if (sid) clearSession(sid);
    res.json({ ok: true });
  });
}
