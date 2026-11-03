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
import { fileURLToPath } from 'node:url';
import { MODELS, MODEL_CATALOG } from '../app/src/main/assets/generate-models.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ASSETS_DIR = path.join(REPO_ROOT, 'app', 'src', 'main', 'assets');

// A small, public-only index of actual site screens and their visible controls.
// It is read from the shipped HTML so JARVIX answers about current forms rather
// than relying on an outdated hand-written list of field names.
const SITE_PAGE_FILES = Object.freeze([
  ['ai-pricing.html', 'AI credits and pricing'],
  ['deepsyq.html', 'Home'],
  ['deepsyq-vs-deepseek.html', 'Deepsyq and DeepSeek comparison'],
  ['generate-studio.html', 'Image, video and audio generation studio'],
  ['jarvix-studio.html', 'JARVIX chat and voice studio'],
  ['ai-agents.html', 'AI agents'],
  ['ai-apps.html', 'AI Apps templates'],
  ['canvas.html', 'Creative canvas'],
  ['my-creations.html', 'My Creations library'],
  ['compare-ai.html', 'Compare AI models'],
  ['contact.html', 'Contact and support'],
  ['cookie.html', 'Cookie information'],
  ['design-gallery.html', 'Design gallery'],
  ['free-tools.html', 'Free media tools'],
  ['avatar-studio.html', 'Avatar Studio'],
  ['mobile-utility.html', 'Photo, PDF and mobile utilities'],
  ['photo-collage.html', 'Photo collage'],
  ['simple-background-remover.html', 'Background remover'],
  ['smart-reminders.html', 'Smart reminders'],
  ['teleprompter.html', 'Teleprompter'],
  ['telegram-free-mini.html', 'Telegram mini app'],
  ['audio-studio.html', 'Audio tools'],
  ['voice-agent-preview.html', 'Voice agent preview'],
  ['index.html', 'Creative workspace and account pages'],
  ['pricing.html', 'Pricing'],
  ['ai-privacy.html', 'AI privacy information'],
  ['refund.html', 'Refund policy'],
  ['terms.html', 'Terms of service']
]);

let siteKnowledgeCache = null;

function visibleText(html) {
  return String(html || '')
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ').trim();
}

function attribute(tag, name) {
  const match = String(tag).match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? visibleText(match[2]) : '';
}

export function buildJarvixSiteKnowledge() {
  if (siteKnowledgeCache) return siteKnowledgeCache;
  const pages = [];
  for (const [file, label] of SITE_PAGE_FILES) {
    try {
      const html = fs.readFileSync(path.join(SITE_ASSETS_DIR, file), 'utf8');
      const title = visibleText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]) || label;
      const headings = [...html.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
        .map(match => visibleText(match[1])).filter(Boolean).slice(0, 10);
      const controls = [];
      for (const match of html.matchAll(/<(input|textarea|select)\b[^>]*>/gi)) {
        const tag = match[0];
        const description = [
          attribute(tag, 'aria-label'),
          attribute(tag, 'placeholder'),
          attribute(tag, 'data-label'),
          attribute(tag, 'id')
        ].filter(Boolean).join(' — ');
        if (description) controls.push(description);
      }
      for (const match of html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)) {
        const labelText = visibleText(match[1]);
        if (labelText) controls.push(`Field label: ${labelText}`);
      }
      for (const match of html.matchAll(/<select\b[^>]*>([\s\S]*?)<\/select>/gi)) {
        const options = [...match[1].matchAll(/<option\b[^>]*>([\s\S]*?)<\/option>/gi)]
          .map(option => visibleText(option[1])).filter(Boolean).slice(0, 12);
        if (options.length) controls.push(`Select options: ${options.join(', ')}`);
      }
      for (const match of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
        const labelText = visibleText(match[1]);
        if (labelText) controls.push(labelText);
      }
      const links = [];
      for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
        const href = attribute(`<a ${match[1]}>`, 'href');
        const linkLabel = visibleText(match[2]) || attribute(`<a ${match[1]}>`, 'aria-label') || attribute(`<a ${match[1]}>`, 'title');
        // Keep only navigable local routes. Never feed script or external URLs
        // into the assistant's knowledge or let them become navigation targets.
        if (!href || !linkLabel || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
        if (/^\/?virtual-pet(?:[./?#]|$)/i.test(href)) continue;
        links.push({ label: linkLabel.slice(0, 120), href: href.slice(0, 240) });
      }
      if (file === 'free-tools.html') {
        // The owner-approved tool cards are created from this small data table
        // at runtime, so index their actual labels and destinations as well.
        const cardsSource = fs.readFileSync(path.join(SITE_ASSETS_DIR, 'everyday-tools-visual.js'), 'utf8');
        for (const match of cardsSource.matchAll(/\{title:'([^']+)'[^}]*?href:'([^']+)'/g)) {
          links.push({ label: visibleText(match[1]).slice(0, 120), href: match[2].slice(0, 240) });
        }
      }
      pages.push({
        path: `/${file}`,
        label,
        title,
        headings: [...new Set(headings)].slice(0, 8),
        controls: [...new Set(controls)].slice(0, 36),
        links: links.filter((link, index) => links.findIndex(candidate => candidate.href === link.href && candidate.label === link.label) === index).slice(0, 60)
      });
    } catch (_) {
      // A missing optional page is omitted rather than invented.
    }
  }
  siteKnowledgeCache = Object.freeze(pages.map(page => Object.freeze(page)));
  return siteKnowledgeCache;
}

// 1. DEEPSYQ CAPABILITIES REGISTRY (Truthful knowledge base, zero hallucinated models)
export const DEEPSYQ_CAPABILITIES = Object.freeze({
  brand: 'DEEPSYQ',
  voiceButler: 'JARVIX',
  studios: {
    image: {
      name: 'Image Studio',
      models: MODEL_CATALOG.filter(model => model.kind === 'image').map(({ id, label, provider, adapter }) => ({ id, label, provider, adapter })),
      defaultModel: MODELS.image.id,
      ratios: [...MODELS.image.ratios]
    },
    video: {
      name: 'Video Studio',
      models: MODEL_CATALOG.filter(model => model.kind === 'video').map(({ id, label, provider, adapter }) => ({ id, label, provider, adapter })),
      defaultModel: MODELS.video.id,
      ratios: [...MODELS.video.ratios]
    },
    audio: {
      name: 'Audio Studio',
      models: MODEL_CATALOG.filter(model => ['music', 'voice'].includes(model.kind)).map(({ id, label, provider, adapter }) => ({ id, label, provider, adapter })),
      defaultModel: MODELS.music.id
    }
  },
  workspaces: {
    canvas: 'Interactive creative infinite canvas for multi-layer generative composition.',
    aiApps: 'Curated library of specialized AI prompt templates and styles.',
    uniquifier: 'Client-side ffmpeg video processor for Instagram Reels, TikTok, YouTube Shorts.'
  },
  everydayTools: {
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
  modelStatusNote: 'Catalog entries do not guarantee that a model is enabled in the current environment.'
});

// 2. CONVERSATIONAL SESSION MANAGER WITH MULTI-TURN MEMORY
export const activeSessions = new Map();
export const jarvixSessionStore = activeSessions; // Alias for convenience

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ACTIVE_SESSIONS = 2000;

export function getOrCreateSession(sessionId) {
  const sid = typeof sessionId === 'string' && /^[\w-]{1,80}$/.test(sessionId)
    ? sessionId
    : 'default-jarvix-session';
  const now = Date.now();

  let session = activeSessions.get(sid);
  if (session && now - session.lastActivityAt > SESSION_TTL_MS) {
    activeSessions.delete(sid);
    session = null;
  }
  if (!session) {
    if (activeSessions.size >= MAX_ACTIVE_SESSIONS) {
      for (const [key, value] of activeSessions) {
        if (now - value.lastActivityAt > SESSION_TTL_MS) activeSessions.delete(key);
      }
      if (activeSessions.size >= MAX_ACTIVE_SESSIONS) {
        const oldest = [...activeSessions.entries()].sort((a, b) => a[1].lastActivityAt - b[1].lastActivityAt)[0];
        if (oldest) activeSessions.delete(oldest[0]);
      }
    }
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
    const studio = ['image', 'video', 'audio'].includes(action.studio) ? action.studio : 'video';
    return {
      success: true,
      type: 'open_studio',
      studio,
      url: `generate-studio.html?studio=${studio}&from=jarvix`
    };
  }

  if (action.type === 'adjust_theme' || action.type === 'set_theme') {
    return {
      success: true,
      type: 'adjust_theme',
      theme: (action.theme === null || action.theme === 'default' || action.theme === 'standard') ? 'default' : (action.theme || 'cyberpunk')
    };
  }

  if (action.type === 'clear_inputs' || action.type === 'clear_input') {
    return {
      success: false,
      type: 'block_unauthorized',
      reason: 'MANUAL_CONFIRMATION_REQUIRED'
    };
  }

  return { success: false, reason: 'UNKNOWN_ACTION' };
}

const SITE_TOOL_ALIASES = Object.freeze([
  { pattern: /(?:photo\s*(?:to|→)\s*pdf|scan\s*pdf|pdf|фото\s*(?:в|to)\s*(?:pdf|пдф)|пдф|скан(?:ер)?)/i, terms: /(?:pdf|scan|скан|пдф)/i },
  { pattern: /(?:background\s*(?:remov|eras)|remove\s+(?:the\s+)?background|убрат\w*\s+фон|удал\w*\s+фон|фон\s+удал)/i, terms: /(?:background|фон|удал)/i },
  { pattern: /(?:photo\s*collage|collage|коллаж)/i, terms: /(?:collage|коллаж)/i },
  { pattern: /(?:avatar\s*studio|avatar|аватар)/i, terms: /(?:avatar|аватар)/i },
  { pattern: /(?:teleprompter|téléprompteur|prompter|телесуфл|суфлёр|суфлер)/i, terms: /(?:teleprompter|téléprompteur|prompter|суфл)/i, standalone: true, friendlyLabel: { ru: 'Телесуфлёр', en: 'Teleprompter', es: 'Teleprompter', fr: 'Téléprompteur' } },
  { pattern: /(?:smart\s*reminders?|reminders?|напоминан\w*)/i, terms: /(?:reminder|напоминан)/i },
  { pattern: /(?:my\s+creations?|library|мои\s+работ|библиотек)/i, terms: /(?:creation|library|работ|библиотек)/i },
  { pattern: /(?:compare\s+(?:ai|models?)|сравн\w*\s+модел)/i, terms: /(?:compare|сравн)/i },
  { pattern: /(?:privacy|конфиденц|приватност)/i, terms: /(?:privacy|конфиденц|приватност)/i },
  { pattern: /(?:pricing|plans?|цены|тариф\w*)/i, terms: /(?:pricing|plan|цен|тариф)/i }
]);

function findSiteDestination(text) {
  const pages = buildJarvixSiteKnowledge();
  for (const alias of SITE_TOOL_ALIASES) {
    if (!alias.pattern.test(text)) continue;
    const candidates = pages.flatMap(page => page.links.map(link => ({ page, link })));
    const byLabel = candidates.find(({ link }) => alias.terms.test(link.label));
    if (byLabel) return { ...byLabel, alias };
    const byRoute = candidates.find(({ link }) => alias.terms.test(link.href));
    if (byRoute) return { ...byRoute, alias };
  }
  return null;
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
  if (session.history.length > 24) session.history.splice(0, session.history.length - 24);

  let replyText = '';
  let action = null;
  let studioHandoff = null;

  if (/(?:llm|gpt|языковая модель|подключена ли модель|language model|modèle de langage|modelo de lenguaje)/i.test(lower)) {
    const replies={
      ru:'Для этого ответа LLM не подключена: сейчас работают локальные команды и временная память. Каталог моделей не означает их подключение. Собственный голос тоже ещё не установлен.',
      en:'No LLM is connected for this response: local commands and temporary memory are available. A model catalog does not mean the models are connected. A dedicated voice is not installed yet.',
      fr:'Aucun LLM n’est connecté pour cette réponse : les commandes locales et la mémoire temporaire sont disponibles. Le catalogue ne confirme pas la connexion des modèles. La voix dédiée n’est pas encore installée.',
      es:'No hay un LLM conectado para esta respuesta: están disponibles los comandos locales y la memoria temporal. El catálogo no confirma la conexión de los modelos. La voz propia aún no está instalada.'
    };
    return {reply:replies[lang]||replies.en,action:null,entities:{...session.accumulatedPrompt},compiledPrompt:compileAccumulatedPrompt(session.accumulatedPrompt),studioHandoff:null,language:lang,provider:'jarvix-mock-brain'};
  }

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

  // Answer find/open questions from actual visible links in the site index.
  // This keeps basic navigation useful in the $0 preview without a model API.
  if (/(?:where|find|how\s+(?:do\s+i\s+)?(?:open|access|find)|navigate|где|как\s+(?:найти|открыть|перейти)|куда|dónde|cómo\s+(?:encontrar|abrir)|où|comment\s+(?:trouver|ouvrir))/i.test(lower)) {
    const destination = findSiteDestination(t);
    if (destination) {
      const { page, link, alias } = destination;
      const label = alias.friendlyLabel?.[lang] || link.label;
      replyText = alias.standalone
        ? isRu
          ? `${label}: откройте ${link.href}`
          : isEs
            ? `${label}: abra ${link.href}`
            : isFr
              ? `${label} : ouvrez ${link.href}`
              : `${label}: open ${link.href}`
        : isRu
          ? `«${label}» находится в разделе «${page.label}». Откройте: ${link.href}`
          : isEs
            ? `«${label}» está en la sección «${page.label}». Abra: ${link.href}`
            : isFr
              ? `«${label}» se trouve dans la section «${page.label}». Ouvrez : ${link.href}`
              : `“${label}” is in “${page.label}”. Open: ${link.href}`;
      return {
        reply: replyText,
        action: null,
        entities: { ...session.accumulatedPrompt },
        compiledPrompt: compileAccumulatedPrompt(session.accumulatedPrompt),
        studioHandoff: null,
        language: lang,
        provider: 'jarvix-site-index'
      };
    }
  }

  // 1. CAPABILITIES & REGISTRY INQUIRY ("Что ты умеешь?", "What can you do?")
  if (/(?:что\s+(?:ты\s+)?(?:умеешь|можешь)|возможности|функции|help|capabilities|what can you do|que puedes hacer|que sais-tu faire)/i.test(lower)) {
    const imageModels = DEEPSYQ_CAPABILITIES.studios.image.models.map(model => model.label).join(', ');
    const videoModels = DEEPSYQ_CAPABILITIES.studios.video.models.map(model => model.label).join(', ');
    const audioModels = DEEPSYQ_CAPABILITIES.studios.audio.models.map(model => model.label).join(', ');
    replyText = isRu
      ? `Я JARVIX — голосовой помощник Deepsyq. Помогу с Image, Video и Audio Studio, Canvas, AI Apps и навигацией. В каталоге указаны модели изображений: ${imageModels}; видео: ${videoModels}; аудио и голос: ${audioModels}. Запись в каталоге не означает, что модель включена. Платная генерация в этом preview выключена.`
      : isEs
        ? `Soy JARVIX, su asistente de Deepsyq. Puedo ayudar con Image, Video y Audio Studio, Canvas, AI Apps y navegación. El catálogo incluye imagen: ${imageModels}; vídeo: ${videoModels}; audio y voz: ${audioModels}. Una entrada en el catálogo no significa que esté habilitada. La generación de pago está desactivada en esta vista previa.`
        : isFr
          ? `Je suis JARVIX, votre assistant Deepsyq. Je peux aider avec Image, Video et Audio Studio, Canvas, AI Apps et la navigation. Le catalogue comprend image: ${imageModels}; vidéo: ${videoModels}; audio et voix: ${audioModels}. Une entrée au catalogue ne garantit pas son activation. La génération payante est désactivée dans cet aperçu.`
          : `I am JARVIX, your Deepsyq assistant. I can help with Image, Video and Audio Studio, Canvas, AI Apps and site navigation. The catalog lists image models: ${imageModels}; video: ${videoModels}; audio and voice: ${audioModels}. A catalog entry does not mean a model is enabled. Paid generation is disabled in this preview.`;
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
      ? 'Концепт принят. Хотите настроить цвет, окружение или освещение? Например: «Пусть он будет чёрным» или «Добавь дождь».'
      : 'Concept noted. Would you like to refine the color, environment, or lighting?';
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
  if (/(?:открой|перейди|запусти|open|launch|ouvre|abre)\s+(?:video[\s-]?studio|image[\s-]?studio|видео[\s-]?студи|студи|studio)/i.test(lower)) {
    const targetKind = session.accumulatedPrompt.targetKind || 'image';
    const compiledPrompt = compileAccumulatedPrompt(session.accumulatedPrompt) || 'Высокодетализированный кадр 8k';
    const studioUrl = `generate-studio.html?studio=${targetKind}&from=jarvix`;

    action = executeSafeAction({
      type: 'open_studio',
      studio: targetKind,
      url: studioUrl
    });

    studioHandoff = {
      kind: targetKind,
      prompt: compiledPrompt,
      autoGenerate: false
    };

    replyText = isRu
      ? `Открываю ${targetKind === 'video' ? 'Video Studio' : 'студию'}. Сделано.`
      : `Opening ${targetKind} Studio. Done.`;

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
  if (/(?:выключи|отключи|убери|сбрось|верни)\s+(?:его|неон|киберпанк|тему|подсветку|стиль|режим|как было)|(?:выключи|отключи)\s+его|(?:стандартная|обычная|исходная|дефолтная)\s+тема|выключи тему|верни тему|верни как было|сбрось тему|default theme|reset theme|turn off neon/i.test(lower)) {
    action = executeSafeAction({ type: 'adjust_theme', theme: 'default' });
    return {
      reply: isRu ? 'Сделано. Выключил тему и вернул стандартное оформление.'
        : isFr ? 'Terminé. Le thème par défaut est restauré.'
        : isEs ? 'Hecho. Se ha restablecido el tema predeterminado.'
        : 'Done. Reverted to default theme.',
      action,
      entities: { ...session.accumulatedPrompt },
      compiledPrompt: compileAccumulatedPrompt(session.accumulatedPrompt),
      studioHandoff: null,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }

  if (!/(?:выключи|отключи|не\s+надо)/i.test(lower) && /(?:неонов|киберпанк|neon|cyberpunk)/i.test(lower)) {
    action = executeSafeAction({ type: 'adjust_theme', theme: 'neon' });
    return {
      reply: isRu ? 'Сделано. Включил неоновый киберпанк.'
        : isFr ? 'Thème cyberpunk néon activé.'
        : isEs ? 'Tema cyberpunk neón activado.'
        : 'Switched to neon cyberpunk theme.',
      action,
      entities: { ...session.accumulatedPrompt },
      compiledPrompt: compileAccumulatedPrompt(session.accumulatedPrompt),
      studioHandoff: null,
      language: lang,
      provider: 'jarvix-mock-brain'
    };
  }
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
      reply: isRu ? 'Очистите поле вручную, чтобы не потерять текст случайно.' : 'Please clear the field manually so your text is not lost accidentally.',
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
      ? 'Актуальные тарифы и условия указаны на странице Pricing. Проверьте её, чтобы увидеть действующие цены и ограничения.'
      : isFr ? 'Les tarifs et conditions à jour figurent sur la page Pricing. Consultez-la pour les informations actuelles.'
      : isEs ? 'Los precios y condiciones vigentes están en la página Pricing. Consúltela para ver la información actual.'
      : 'Current prices and terms are listed on the Pricing page. Please check that page for the latest details.';
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

  // 8. SOCIAL DIALOG & STATUS
  if (/(?:как дела|как ты|how are you|como estas|comment vas-tu)/i.test(lower)) {
    replyText = isRu
      ? 'Работают базовые локальные команды. Для этого ответа языковая модель не подключена.'
      : 'Basic local commands are available. A live language model is not connected for this response.';
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

  // 8.1. VIRAL VIDEO & REELS/TIKTOK ALGORITHM ADVICE
  if (/(?:совет|посоветуй|как\s+(?:лучше\s+)?(?:сделать|смонтировать|улучшить|снять|продвинуть)|алгоритм|тиктоке?|рилс|shorts|вирусн|хук|просмотр)/i.test(lower)) {
    replyText = isRu
      ? 'Начните ролик с понятной интриги, уберите затянутые фрагменты и проверьте удержание зрителей. Изменение метаданных не гарантирует оригинальность или охваты. Это локальная заготовка совета, а не анализ вашего ролика. Хотите подготовить сценарий?'
      : 'Start with a clear hook, remove slow sections and review audience retention. Changing metadata does not guarantee originality or reach. This is a local suggestion, not an analysis of your video. Shall we prepare a script?';
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

  // 8.2. CREATIVE IDEA GENERATOR
  if (/(?:иде(?:я|ю|и)|придумай|вдохнов|концепт|сюжет|сценарий|подскажи|что\s+создать)/i.test(lower)) {
    replyText = isRu
      ? 'Предлагаю кинематографичный концепт: ночной мегаполис в тумане с неоновыми отражениями на мокром асфальте и парящими силуэтами в стиле киберпанк. Могу сразу сформировать готовый промпт и открыть студию видео или фото. Что выберем?'
      : 'How about a cinematic concept: a misty night metropolis with glowing neon reflections on wet asphalt and cyberpunk silhouettes? I can prepare the prompt and open the studio. Shall we?';
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

  // 8.3. DEEPSYQ UTILITIES & EVERYDAY TOOLS
  if (/(?:утилит|инструмент|everyday|фон|сжат|сжатие|телесуфлер|аватар)/i.test(lower) && !/открой|перейди/i.test(lower)) {
    replyText = isRu
      ? 'В разделе Everyday Tools есть инструменты для фона, сжатия медиа, телесуфлёр и Avatar Studio. Доступность и условия проверяйте на странице выбранного инструмента. Сказать «Открой инструменты», чтобы перейти к ним?'
      : 'Everyday Tools includes background removal, media compression, Teleprompter and Avatar Studio. Check the selected tool page for availability and terms. Say "Open tools" to view them.';
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

  // 8.4. BUTLER WIT & LORE
  if (/(?:шутк|анекдот|пошути|кто\s+(?:твой\s+)?создатель|почему\s+джарвикс|джарвис)/i.test(lower)) {
    replyText = isRu
      ? 'Я JARVIX — ваш цифровой дворецкий. В отличие от Тони Старка, вам не нужен костюм из титанового сплава, чтобы творить шедевры в Deepsyq, хотя стильный неоновый интерфейс я всегда готов включить. Чем займемся?'
      : 'I am JARVIX — your resident intelligence. Unlike Tony Stark, you do not need titanium armor to create wonders on Deepsyq. What shall we create today?';
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
    ? 'Могу подготовить черновик промпта или помочь найти инструмент. Сейчас диалог ограничен локальными командами; LLM не подключена.'
    : isFr ? 'Je peux préparer un brouillon de prompt ou vous aider à trouver un outil. Le dialogue est actuellement limité aux commandes locales ; le LLM n’est pas connecté.'
    : isEs ? 'Puedo preparar un borrador de prompt o ayudarle a encontrar una herramienta. El diálogo está limitado a comandos locales; el LLM no está conectado.'
    : 'I can prepare a prompt draft or help find a tool. This dialogue currently uses local commands; the LLM is not connected.';

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
export async function processTurnWithOpenAI(userText, session, lang = 'ru', options = {}) {
  const env = options.env || process.env;
  const fetcher = options.fetcher || globalThis.fetch;
  const apiKey = (env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  // A key alone never enables billable calls. The owner must set the explicit flag.
  if (env.JARVIX_AI_ENABLED !== 'true' || !apiKey || apiKey.startsWith('mock-') || apiKey === 'dummy' || env.JARVIX_AI_DISABLE === 'true') {
    return processTurnWithMockBrain(userText, session, lang);
  }

  const model = env.JARVIX_AI_MODEL || 'gpt-6';
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
{"action":{"type":"open_studio","studio":"video","url":"generate-studio.html?studio=video&from=jarvix"}}
5. NEVER repeat or parrot the user's prompt or words back to them (e.g. do not say "I heard...", "You asked for...", "Я услышал..."). Answer directly and concisely.
Keep speech responses concise and natural for audio text-to-speech.

Verified public DEEPSYQ pages, visible form controls, and local navigation links:
${JSON.stringify(buildJarvixSiteKnowledge())}
Only describe a control if it appears in this site map.`;

  try {
    const input = [
      ...session.history.slice(-8).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: String(userText).slice(0, 2000) }
    ];

    const response = await fetcher('https://api.openai.com/v1/responses', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        instructions: systemPrompt,
        input,
        max_output_tokens: 300,
        store: false
      })
    });

    if (!response.ok) {
      console.warn('[JARVIX-AI] OpenAI API error, falling back to verified local brain:', response.status);
      return processTurnWithMockBrain(userText, session, lang);
    }

    const data = await response.json();
    const rawReply = data.output_text || (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === 'output_text' && typeof item.text === 'string')
      .map(item => item.text).join('');

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

    if (!cleanReply.trim()) return processTurnWithMockBrain(userText, session, lang);
    session.history.push({ role: 'user', content: userText, timestamp: Date.now() });
    session.history.push({ role: 'assistant', content: cleanReply, timestamp: Date.now() });
    if (session.history.length > 24) session.history.splice(0, session.history.length - 24);

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

// Configuration is not proof of a successful model response. Never expose secrets.
export function getJarvixRuntimeStatus({previewOnly=false,env=process.env}={}) {
  const configured=!previewOnly && env.JARVIX_AI_ENABLED==='true' && env.JARVIX_AI_DISABLE!=='true' &&
    !!String(env.OPENAI_API_KEY||'').trim() && !/^(mock-|dummy$)/.test(String(env.OPENAI_API_KEY||''));
  return {ok:true,mode:previewOnly?'isolated-preview':'server',
    llm:{connected:false,status:configured?'configured_unverified':'not_connected',model:configured?env.JARVIX_AI_MODEL||'gpt-6':null},
    memory:{storage:'process',ttlSeconds:SESSION_TTL_MS/1000,persistent:false},
    speech:{source:'browser',dedicatedVoiceInstalled:false,languages:['ru','en','es','fr']},
    paidGenerationEnabled:false};
}

// 7. MAIN ROUTE INSTALLER FOR EXPRESS
export function installJarvixBrainRoutes(app, options = {}) {
  app.get('/api/jarvix/status',(_req,res)=>res.json(getJarvixRuntimeStatus(options)));
  // Chat Turn Endpoint
  app.post('/api/jarvix/chat', async (req, res) => {
    try {
      const { message, sessionId, conversationId, language } = req.body || {};
      const sid = sessionId || conversationId;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'MISSING_MESSAGE' });
      }

      const lang = ['ru', 'en', 'es', 'fr'].includes(language) ? language : 'ru';
      const session = getOrCreateSession(sid);

      const result = await processTurnWithOpenAI(message, session, lang);
      res.json({
        ok: true,
        reply: result.reply,
        audioUrl: null,
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

  // Public site map used to ground assistant answers in live page labels.
  app.get('/api/jarvix/site-map', (_req, res) => {
    res.json({ ok: true, pages: buildJarvixSiteKnowledge() });
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
