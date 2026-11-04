import {navigationReply} from './jarvix-navigation-reply.js';
import {findCatalogReply} from './jarvix-clip-library.js';
// JARVIX AI Core v6.0 — Autonomous Voice Butler & Resident Intelligence
// Guaranteed Male Film Voice, Instant Navigation ("Сделано."), Multi-Turn Weather Brain & Smart ChatGPT Prompt Generation
import {speakOwnerSpeech, stopOwnerSpeech, unlockOwnerSpeech, prepareOwnerGreetings, OWNER_GREETING_TEXT} from './jarvix-owner-speech.js';
import { detectIntent } from './home-experience.js';
import { saveStudioHandoff } from './studio-handoff.js';

const $ = id => document.getElementById(id);

let isJarvisActive = false;
let currentTtsAudio = null;
let speechVersion = 0;
let jarvixSessionId = null;
let pendingJarvixTurn = null;
let jarvixTurnVersion = 0;
function cancelJarvixTurn() {
  jarvixTurnVersion += 1;
  pendingJarvixTurn?.abort();
  pendingJarvixTurn = null;
}

export function getJarvixSessionId() {
  if (!jarvixSessionId) {
    try {
      jarvixSessionId = sessionStorage.getItem('jarvix_session_id');
      if (!jarvixSessionId) {
        jarvixSessionId = 'jarvix-' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('jarvix_session_id', jarvixSessionId);
      }
    } catch (_) {
      jarvixSessionId = 'jarvix-' + Date.now();
    }
  }
  return jarvixSessionId;
}

export function getStoredTimbre() {
  try {
    return localStorage.getItem('jarvix_timbre') || 'baritone';
  } catch (_) {
    return 'baritone';
  }
}

export function stopAllSpeech() {
  stopOwnerSpeech();
  speechVersion += 1;
  if (currentTtsAudio) {
    try {
      currentTtsAudio.pause();
      currentTtsAudio.currentTime = 0;
    } catch (_) {}
    currentTtsAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isJarvisSpeaking = false;
}

let isJarvisSpeaking = false;
let isJarvisListening = false;
let jarvisRecognition = null;
let recognitionVersion = 0;
let keepListening = false;
let silenceTimer = null;
const SILENCE_TIMEOUT_MS = 45000;

// Conversational context memory for multi-turn dialogs (e.g., weather city, prompt refinement)

const JARVIX_ONBOARDING = {"ru":{"ask":"Хотите изменить оформление сайта: сделать его светлее, темнее или включить неоновый стиль? Если нет, оставлю всё как есть.","choose":"Какой вариант выбрать: светлую тему, тёмную или неоновую?","no":"Хорошо, оставляю оформление без изменений. Что хотите сделать: фото, видео, аудио или посмотреть бесплатные инструменты?","dark":"Готово, включил тёмное оформление. Что дальше: фото, видео, аудио или бесплатные инструменты?","light":"Готово, включил светлое оформление. Что дальше: фото, видео, аудио или бесплатные инструменты?","neon":"Готово, включил неоновый стиль. Что дальше: фото, видео, аудио или бесплатные инструменты?","menu":"Могу помочь с фото, видео или аудио, открыть повседневные инструменты либо показать примеры во Вдохновении. Что выберете?","tools":"Everyday Tools собирает повседневные инструменты платформы. Сейчас открою этот раздел.","inspire":"В Inspiration собраны примеры, от которых можно оттолкнуться для собственного проекта. Сейчас открою галерею.","open":"Что открыть: Everyday Tools, Inspiration или Студию для создания фото и видео?"},"en":{"ask":"Would you like to change the site's look—lighter, darker, or neon? If not, I'll leave it as it is.","choose":"Which would you prefer: light, dark, or neon?","no":"No changes made. What would you like to do: make an image, video, audio, or explore free tools?","dark":"Done. The dark theme is on. What next: an image, video, audio, or free tools?","light":"Done. The light theme is on. What next: an image, video, audio, or free tools?","neon":"Done. The neon theme is on. What next: an image, video, audio, or free tools?","menu":"I can help with images, video, or audio, open Everyday Tools, or show examples in Inspiration. Which would you like?","tools":"Everyday Tools brings together the platform's everyday utilities. I'm opening that section now.","inspire":"Inspiration has examples you can use as a starting point for a project. I'm opening the showcase now.","open":"What should I open: Everyday Tools, Inspiration, or Studio for image and video creation?"},"fr":{"ask":"Souhaitez-vous modifier l’apparence du site : plus claire, plus sombre ou néon ? Sinon, je ne change rien.","choose":"Que préférez-vous : le thème clair, sombre ou néon ?","no":"D’accord, je ne change rien. Que voulez-vous faire : une image, une vidéo, de l’audio ou découvrir les outils gratuits ?","dark":"C’est fait, le thème sombre est activé. Ensuite : image, vidéo, audio ou outils gratuits ?","light":"C’est fait, le thème clair est activé. Ensuite : image, vidéo, audio ou outils gratuits ?","neon":"C’est fait, le thème néon est activé. Ensuite : image, vidéo, audio ou outils gratuits ?","menu":"Je peux vous aider pour une image, une vidéo ou de l’audio, ouvrir Everyday Tools ou montrer des exemples dans Inspiration. Que choisissez-vous ?","tools":"Everyday Tools rassemble les outils pratiques de la plateforme. J’ouvre cette rubrique.","inspire":"Inspiration propose des exemples pour démarrer un projet. J’ouvre la galerie.","open":"Que dois-je ouvrir : Everyday Tools, Inspiration ou le Studio de création ?"},"es":{"ask":"¿Quieres cambiar el aspecto del sitio: más claro|claro, más oscuro|oscuro o neón? Si no, lo dejaré como está.","choose":"¿Qué prefieres: tema claro, oscuro o neón?","no":"De acuerdo, no cambio nada. ¿Qué quieres hacer: una imagen, un vídeo, audio o ver herramientas gratuitas?","dark":"Listo, activé el tema oscuro. ¿Qué sigue: imagen, vídeo, audio o herramientas gratuitas?","light":"Listo, activé el tema claro. ¿Qué sigue: imagen, vídeo, audio o herramientas gratuitas?","neon":"Listo, activé el tema neón. ¿Qué sigue: imagen, vídeo, audio o herramientas gratuitas?","menu":"Puedo ayudarte con imágenes, vídeo o audio, abrir Everyday Tools o mostrar ejemplos en Inspiration. ¿Qué prefieres?","tools":"Everyday Tools reúne las utilidades cotidianas de la plataforma. Voy a abrir esa sección.","inspire":"Inspiration ofrece ejemplos para iniciar un proyecto. Voy a abrir la galería.","open":"¿Qué abro: Everyday Tools, Inspiration o Studio para crear imágenes y vídeos?"}};
function onboardingText(key, language = getJarvixLanguage()) { return JARVIX_ONBOARDING[language]?.[key] || JARVIX_ONBOARDING.en[key]; }

const jarvixContext = {
  waitingFor: null, // 'weather_city' | 'weather_week'
  lastCity: 'paris',
  lastPrompt: ''
};

// 1. Male Voice Guarantee: Detect male voice or natural clear human voice
let cachedVoices = [];
function refreshVoices() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  }
}
refreshVoices();
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

const FEMALE_VOICE_REGEX = /(?:irina|ирина|tatiana|татьяна|elena|елена|victoria|виктория|milena|милена|svetl|светл|anna|анна|daria|дарья|female|женск|zira|samantha|karen|moira|fiona|hazel|susan|linda|helena|monica|laura|marta|lucia|carmen|hortense|julie|celine|amelie|virginie)/i;

export function getJarvixLanguage() {
  let selected = document.documentElement.lang;
  try { selected = localStorage.getItem('deepsyq_home_language') || localStorage.getItem('deepsyq_lang') || selected; } catch (_) {}
  const code = String(selected || navigator.language || 'ru').toLowerCase().split('-')[0];
  return ['ru', 'en', 'es', 'fr'].includes(code) ? code : 'en';
}

export function getJarvixVoice(langParam = 'ru') {
  refreshVoices();
  if (!cachedVoices.length) return null;

  const isRu = (typeof langParam === 'boolean') ? langParam : (langParam === 'ru' || langParam?.startsWith?.('ru'));
  const isFr = langParam === 'fr' || langParam?.startsWith?.('fr');
  const isEs = langParam === 'es' || langParam?.startsWith?.('es');

  if (isRu) {
    // Check for explicit Russian male voices (Dmitry, Pavel, Aleksandr, Maxim, Yuri, etc.)
    const maleRu = cachedVoices.find(v =>
      v.lang.startsWith('ru') &&
      /(?<!\p{L})(?:dmitry|дмитрий|pavel|павел|aleksandr|alexander|александр|maxim|максим|yuri|юрий|mikhail|михаил|boris|борис|igor|игорь|male|муж)(?!\p{L})/iu.test(v.name + ' ' + (v.voiceURI || '')) &&
      !FEMALE_VOICE_REGEX.test(v.name + ' ' + (v.voiceURI || ''))
    );
    if (maleRu) return { voice: maleRu, isExplicitMale: true };

  } else if (isFr) {
    const maleFr = cachedVoices.find(v =>
      v.lang.startsWith('fr') &&
      /(?<!\p{L})(?:henri|thomas|nicolas|paul|alain|claude|male|homme)(?!\p{L})/iu.test(v.name + ' ' + (v.voiceURI || '')) &&
      !FEMALE_VOICE_REGEX.test(v.name + ' ' + (v.voiceURI || ''))
    );
    if (maleFr) return { voice: maleFr, isExplicitMale: true };

  } else if (isEs) {
    const maleEs = cachedVoices.find(v =>
      v.lang.startsWith('es') &&
      /(?<!\p{L})(?:jorge|diego|pablo|carlos|alvaro|miguel|manuel|enrique|male|hombre)(?!\p{L})/iu.test(v.name + ' ' + (v.voiceURI || '')) &&
      !FEMALE_VOICE_REGEX.test(v.name + ' ' + (v.voiceURI || ''))
    );
    if (maleEs) return { voice: maleEs, isExplicitMale: true };

  } else {
    // British / UK Male voice (Paul Bettany film JARVIS style)
    const ukMale = cachedVoices.find(v =>
      (v.lang === 'en-GB' || v.lang.startsWith('en')) &&
      /(?<!\p{L})(?:george|ryan|oliver|arthur|daniel|male|guy|david|brian|mark|paul)(?!\p{L})/iu.test(v.name + ' ' + (v.voiceURI || '')) &&
      !FEMALE_VOICE_REGEX.test(v.name + ' ' + (v.voiceURI || ''))
    );
    if (ukMale) return { voice: ukMale, isExplicitMale: true };

  }
  return null;
}

function getTopBtn() {
  return $('topJarvisBtn');
}

export function updateJarvisState(mode = 'idle') {
  const topBtn = getTopBtn();
  if (!topBtn) return;

  topBtn.classList.remove('is-speaking', 'is-listening');
  if (mode === 'speaking') {
    topBtn.classList.add('is-speaking');
  } else if (mode === 'listening') {
    topBtn.classList.add('is-listening');
  }
}

let currentSpokenUtterance = '';
let retainedSpeechUtterance = null;

// 2. Text-to-Speech Engine with Guaranteed Complete Output & Mutual Acoustic Exclusion
export function speakLocalSpeechSynthesis(text, onComplete = null, langCode = 'ru', isRu = true) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }
  try {
    // Keep recognition active for instant ChatGPT-style user interruption (barge-in)
    // pauseJarvisRecognition() is preserved for shutdown/standby
    if (isJarvisActive && keepListening && !isJarvisListening) {
      resumeJarvisRecognition();
    }

    const version = ++speechVersion;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    retainedSpeechUtterance = utterance;
    const resolvedLang = (typeof langCode === 'string') ? langCode : (isRu ? 'ru' : 'en');
    const isFr = resolvedLang === 'fr';
    const isEs = resolvedLang === 'es';
    const isRuTarget = resolvedLang === 'ru';
    utterance.lang = isRuTarget ? 'ru-RU' : isFr ? 'fr-FR' : isEs ? 'es-ES' : 'en-US';

    const voiceMeta = getJarvixVoice(resolvedLang);
    if (voiceMeta && voiceMeta.voice) {
      utterance.voice = voiceMeta.voice;
    }
    // Never silently substitute an unknown or female OS voice.
    if (!voiceMeta?.isExplicitMale) {
      window.dispatchEvent(new CustomEvent('jarvix:voice-unavailable', { detail: { language: resolvedLang } }));
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    utterance.pitch = 1.0;
    utterance.rate = 1.0;

    utterance.onstart = () => {
      if (version !== speechVersion) return;
      isJarvisSpeaking = true;
      currentSpokenUtterance = text;
      updateJarvisState('speaking');
    };

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      // 300ms acoustic guard delay to prevent room reverberation / speaker tail from triggering mic
      setTimeout(() => {
        if (version !== speechVersion) return;
        isJarvisSpeaking = false;
        currentSpokenUtterance = '';
        if (typeof onComplete === 'function') {
          onComplete();
        } else if (isJarvisActive && keepListening) {
          resumeJarvisRecognition();
          startSilenceTimer();
          updateJarvisState('listening');
        } else {
          updateJarvisState('idle');
        }
      }, 300);
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[JARVIX] Local speech error:', err);
    isJarvisSpeaking = false;
    currentSpokenUtterance = '';
    if (typeof onComplete === 'function') onComplete();
  }
}

let lastSpokenText = '';
let lastSpokenTime = 0;

export function speakJarvis(text, onComplete = null) {
  if (!text) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }

  const now = Date.now();
  if (text.trim() === lastSpokenText.trim() && (now - lastSpokenTime) < 2200) {
    // Drop immediate duplicate speech so JARVIX never repeats phrases like "Сделано. Сделано."
    if (typeof onComplete === 'function') onComplete();
    return;
  }
  lastSpokenText = text.trim();
  lastSpokenTime = now;

  stopAllSpeech();
  resetSilenceTimer();

  const langCode = getJarvixLanguage();
  const isRu = langCode === 'ru';

  // Browser speech synthesis uses the language selected on the site.
  // Microphone is strictly paused during speech and resumed safely on completion
  const version = speechVersion;
  const button = getTopBtn();
  const label = button?.querySelector('.jarvis-name');
  const waiting = {ru:'Готовлю…',en:'Preparing…',fr:'Prépare…',es:'Preparando…'};
  const waitingTitle = {ru:'Готовлю голос. Дождитесь ответа компьютера.',en:'Preparing voice. Waiting for your computer.',fr:'Préparation de la voix. En attente de votre ordinateur.',es:'Preparando la voz. Esperando a tu ordenador.'};
  if (button) { button.dataset.voicePhase = 'connecting'; button.setAttribute('aria-busy','true'); button.title = waitingTitle[langCode]; }
  if (label) label.textContent = waiting[langCode];
  let speechFailed = false;
  const speechStartedAt = performance.now();
  speakOwnerSpeech(text, langCode, {
    source: source => { if (button) button.dataset.voiceSource = source; },
    fallback: () => {
      if (label) label.textContent = 'JARVIX';
      if (button) button.removeAttribute('aria-busy');
      speakLocalSpeechSynthesis(text, onComplete, langCode, isRu);
    },
    phase: phase => {
      if (button) {
        button.dataset.voicePhase = phase;
        if (phase === 'playing') button.dataset.voiceLatencyMs = String(Math.round(performance.now() - speechStartedAt));
      }
      if (label) label.textContent = phase === 'playing' ? 'JARVIX' : waiting[langCode];
    },
    start: () => {
      resetSilenceTimer(); clearTimeout(silenceTimer);
      pauseJarvisRecognition(); isJarvisSpeaking = true;
      currentSpokenUtterance = text; updateJarvisState('speaking');
    },
    complete: () => setTimeout(() => {
      if (version !== speechVersion) return;
      isJarvisSpeaking = false; currentSpokenUtterance = '';
      if (button) { button.removeAttribute('aria-busy'); button.dataset.voicePhase = speechFailed ? 'error' : 'ready'; }
      if (!speechFailed && label) label.textContent = 'JARVIX';
      if (typeof onComplete === 'function') onComplete();
      else if (isJarvisActive && keepListening) {
        resumeJarvisRecognition(); startSilenceTimer(); updateJarvisState('listening');
      } else updateJarvisState('idle');
    }, 300),
    error: code => {
      speechFailed = true;
      if (label) label.textContent = {ru:'Нет звука',en:'No audio',fr:'Sans son',es:'Sin audio'}[langCode];
      if (button) button.dataset.voiceError = code;
      const messages = {ru:'Голосовой сервер недоступен. Попробуйте ещё раз.',en:'Voice server unavailable. Please try again.',fr:'Serveur vocal indisponible. Réessayez.',es:'Servidor de voz no disponible. Inténtalo de nuevo.'};
      if (button) button.title = messages[langCode] || messages.en;
      window.dispatchEvent(new CustomEvent('jarvix:voice-unavailable', {detail:{language:langCode,source:'self-hosted'}}));
    }
  });
}

// 3. Instant Navigation Utility ("Сделано." — spoken strictly ONCE)
export function instantOpen(url) {
  let isSamePage = false;
  try {
    const targetUrl = new URL(url, location.href);
    if (targetUrl.pathname === location.pathname && targetUrl.search === location.search) {
      isSamePage = true;
    }
  } catch (_) {}

  const navigationText = navigationReply(url, getJarvixLanguage());
  if (isSamePage) {
    speakJarvis(navigationText);
    try {
      const targetUrl = new URL(url, location.href);
      if (targetUrl.hash) location.hash = targetUrl.hash;
    } catch (_) {}
    return;
  }

  // Cross-page navigation: speak cleanly ONCE upon target page mount, never doubled
  try {
    sessionStorage.setItem('jarvix_say_on_load', navigationText);
    sessionStorage.setItem('jarvix_active', '1');
  } catch (_) {}
  location.assign(url);
}

// 4. Weather & Meteorological Knowledge Engine
const WORLD_CITIES = {
  paris: { ru: 'Париже', en: 'Paris', tz: 'Europe/Paris', temp: 15, cond: 'переменная облачность', week: 'в первой половине недели умеренно тепло до 16 градусов, к выходным возможен легкий дождь, температура около 13 градусов.' },
  moscow: { ru: 'Москве', en: 'Moscow', tz: 'Europe/Moscow', temp: 8, cond: 'облачно с прояснениями', week: 'всю неделю стабильная осенняя погода от 6 до 9 градусов, существенных осадков не ожидается.' },
  london: { ru: 'Лондоне', en: 'London', tz: 'Europe/London', temp: 13, cond: 'легкий туман и рассеянный свет', week: 'типичная британская погода: 12-14 градусов, периодические короткие дожди и свежий ветер.' },
  newyork: { ru: 'Нью-Йорке', en: 'New York', tz: 'America/New_York', temp: 17, cond: 'солнечно и ясно', week: 'солнечные дни до середины недели с температурой до 19 градусов, к пятнице переменная облачность.' },
  tokyo: { ru: 'Токио', en: 'Tokyo', tz: 'Asia/Tokyo', temp: 20, cond: 'ясно, комфортный бриз', week: 'теплая комфортная погода от 18 до 22 градусов, чистое небо.' },
  berlin: { ru: 'Берлине', en: 'Berlin', tz: 'Europe/Berlin', temp: 12, cond: 'облачно', week: 'прохладная погода 10-13 градусов, возможен кратковременный дождь во вторник.' },
  rome: { ru: 'Риме', en: 'Rome', tz: 'Europe/Rome', temp: 21, cond: 'тепло и солнечно', week: 'прекрасная средиземноморская погода, до 23 градусов тепла всю неделю.' },
  dubai: { ru: 'Дубае', en: 'Dubai', tz: 'Asia/Dubai', temp: 31, cond: 'солнечно и сухо', week: 'жарко и солнечно, днем до 33 градусов, ночью около 24.' },
  losangeles: { ru: 'Лос-Анджелесе', en: 'Los Angeles', tz: 'America/Los_Angeles', temp: 24, cond: 'солнечно', week: 'ясное небо, приятный океанский бриз, от 22 до 25 градусов тепла.' }
};

function detectCityKey(text) {
  const lower = text.toLowerCase();
  if (/(?:париж|paris)/i.test(lower)) return 'paris';
  if (/(?:москв|moscow)/i.test(lower)) return 'moscow';
  if (/(?:лондон|london)/i.test(lower)) return 'london';
  if (/(?:нью[\s-]?йорк|new york)/i.test(lower)) return 'newyork';
  if (/(?:токио|tokyo)/i.test(lower)) return 'tokyo';
  if (/(?:берлин|berlin)/i.test(lower)) return 'berlin';
  if (/(?:рим|rome)/i.test(lower)) return 'rome';
  if (/(?:дуба|dubai)/i.test(lower)) return 'dubai';
  if (/(?:лос[\s-]?анджелес|los angeles)/i.test(lower)) return 'losangeles';
  return null;
}

function handleWeatherInquiry(cityKey, isRu = true) {
  jarvixContext.waitingFor = null;
  const message={
    ru:'Сервис актуальной погоды не подключён. Не могу достоверно назвать температуру или прогноз.',
    en:'Live weather is not connected. I cannot reliably provide a temperature or forecast.',
    fr:'La météo en direct n’est pas connectée. Je ne peux pas donner une température ou des prévisions fiables.',
    es:'El servicio del tiempo no está conectado. No puedo dar una temperatura ni un pronóstico fiables.'
  };
  speakJarvis(message[getJarvixLanguage()] || message.en);
}

// 5. ChatGPT-Grade Creative Prompt Expander
function expandCreativePrompt(concept, kind = 'image') {
  const trimmed = concept.trim();
  if (/хэллоуин|halloween/i.test(trimmed)) {
    return 'Мистическая кинематографичная ночь на Хэллоуин: резные тыквы Jack-o\'-lantern со зловещим неоновым янтарным пламенем, готический викторианский замок на холме, клубящийся туман, фотореалистичная 8k детализация, темный фэнтези арт, объемное драматическое освещение';
  }
  if (/космос|space/i.test(trimmed)) {
    return 'Глубокий космос: колоссальная сияющая туманность с переливами ультрамарина и пурпура, футуристический межзвездный крейсер с неоновыми двигателями, фотореалистичная 8k детализация, cinematic sci-fi';
  }
  if (/киберпанк|cyberpunk/i.test(trimmed)) {
    return 'Футуристический киберпанк мегаполис в дождливую полночь: мокрый неоновый асфальт с отражениями голограмм, летающие кары, кинематографичный ракурс 8k, volumetric light';
  }
  if (kind === 'audio' || /музык|песн|трек/i.test(trimmed)) {
    return `Атмосферный музыкальный саундтрек: ${trimmed}, глубокие басы, динамичный ритм, кристальная студийная акустика`;
  }
  return `Высокодетализированный кинематографичный кадр: ${trimmed}, фотореализм 8k, объемное освещение, художественная глубина резкости, премиальная эстетика`;
}

// 6. Theme & Lighting Controller
export function applySiteTheme(themeName) {
  try {
    if (!themeName || themeName === 'default' || themeName === 'none' || themeName === 'standard') {
      document.documentElement.removeAttribute('data-site-theme');
      localStorage.removeItem('deepsyq_site_theme');
      window.dispatchEvent(new CustomEvent('deepsyq:theme', { detail: { theme: null } }));
      return;
    }
    document.documentElement.setAttribute('data-site-theme', themeName);
    localStorage.setItem('deepsyq_site_theme', themeName);
    window.dispatchEvent(new CustomEvent('deepsyq:theme', { detail: { theme: themeName } }));
  } catch (_) {}
}

export function setSiteLanguage(langCode) {
  const code = (langCode === 'ru' || langCode === 'fr' || langCode === 'es') ? langCode : 'en';
  try {
    localStorage.setItem('deepsyq_home_language', code);
    localStorage.setItem('deepsyq_lang', code);
    document.documentElement.lang = code === 'en' ? 'en-US' : code;
    const homeLang = $('homeLanguage');
    if (homeLang) {
      homeLang.value = code;
      homeLang.dispatchEvent(new Event('change', { bubbles: true }));
    }
    window.dispatchEvent(new CustomEvent('deepsyq:lang', { detail: { lang: code } }));
  } catch (_) {}
}

// 7. Clear & Action Helpers
function clearCurrentInputs() {
  const activeInput = (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA'))
    ? document.activeElement
    : document.querySelector('#homeQuickPrompt, #quickCreatePrompt, #prompt, textarea, input[type="text"], input[type="search"]');

  if (activeInput) {
    activeInput.value = '';
    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    activeInput.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

// 8. Main Voice Command Handler (Hands, Ears, Instant Navigation & Conversational Brain)
export function handleJarvisVoiceCommand(commandText) {
  if (!commandText) return;
  cancelJarvixTurn();
  const turnVersion = jarvixTurnVersion;
  const t = commandText.trim();
  const lower = t.toLowerCase();
  resetSilenceTimer();
  const lang = getJarvixLanguage();
  const isRu = lang === 'ru';
  const isFr = lang === 'fr';
  const isEs = lang === 'es';

  // 1. CAPABILITIES & GUIDED TOUR
  if (/(?:что\s+(?:ты\s+)?(?:умеешь|можешь)(?:\s+делать)?|твои\s+возможности|какие\s+(?:у\s+тебя\s+)?функции|кто\s+ты|расскажи\s+о\s+себе|справка|помощь|help|what can you do|que peux-tu faire|qué puedes hacer|que puedes hacer)/i.test(lower)) {
    jarvixContext.waitingFor = 'next_choice';
    speakJarvis(onboardingText('menu'));
    return;
  }

  // 2. SOCIAL DIALOG & STATUS ("Привет", "Как дела", "Кто тут")
  if (/^(?:привет|здравствуй(?:те)?|добрый\s+(?:день|вечер|утро)|салют|хай|hello|hi)$/i.test(lower) || /(?:как\s+(?:твои\s+)?дела|как\s+ты|как\s+настроение|как\s+поживаешь|how are you)/i.test(lower)) {
    if (/(?:как\s+(?:твои\s+)?дела|как\s+ты|как\s+настроение|how are you)/i.test(lower)) {
      const statusMsg = isRu
        ? 'Доступны базовые команды сайта. Подключение языковой модели можно проверить на странице Джарви.'
        : 'Basic site commands are available. Check the Jarvix page for language-model connection status.';
      speakJarvis(statusMsg);
      return;
    }
    const greetMsg = isRu
      ? 'Здравствуйте! Рад слышать вас. Назовите команду, и я выполню её моментально.'
      : 'Greetings! Ready and at your service. What shall we do?';
    speakJarvis(greetMsg);
    return;
  }

  // 3. GRATITUDE & COMPLIMENTS ("Спасибо", "Молодец")
  if (/(?:спасибо|благодарю|отлично|молодец|круто|супер|thank you|thanks)/i.test(lower)) {
    const thankMsg = isRu
      ? 'Всегда к вашим услугам! Если понадобится что-то еще — только скажите.'
      : 'Always at your service!';
    speakJarvis(thankMsg);
    return;
  }

  // 4. INSTANT SILENCE / BARGE-IN ("Стоп", "Замолчи", "Тихо", "Хватит")
  if (/^(?:стоп|стой|замолчи|тихо|хватит|stop|quiet|silence)$/i.test(lower)) {
    stopAllSpeech();
    isJarvisSpeaking = false;
    currentSpokenUtterance = '';
    updateJarvisState('listening');
    return;
  }

  // 4b. SHUTDOWN / STANDBY ("Выключись", "Пока", "До свидания")
  if (/^(?:выключись|отключись|пока|до\s+свидания|goodbye|bye|turn off|shut down)[.!]?$/i.test(lower)) {
    const byeMsg = isRu
      ? 'Выключаюсь. Нажмите на сферу, если понадоблюсь.'
      : 'Deactivating. Click the orb when you need me.';
    speakJarvis(byeMsg, () => {
      deactivateJarvisVoice();
    });
    return;
  }

  // Guided first conversation. A negative answer never resets the existing theme.
  if (jarvixContext.waitingFor === 'welcome_choice') {
    const no = /(?:нет|не надо|оставь|оставить|no|non|no gracias|déjalo|dejalo)/i.test(lower);
    const yes = /(?:да|хочу|давай|yes|sure|oui|sí|si|claro)/i.test(lower);
    const theme = /(?:светл|светлее|темнее|темная тема|темнее|потемнее|темн|тём|неонов|киберпанк|light|dark|darker|lighter|neon|clair|sombre|néon|más claro|claro|más oscuro|oscuro)/i.test(lower);
    if (no && !theme) { jarvixContext.waitingFor='next_choice'; speakJarvis(onboardingText('no')); return; }
    if (yes && !theme) { jarvixContext.waitingFor='theme_style'; speakJarvis(onboardingText('choose')); return; }
    jarvixContext.waitingFor=null;
  }
  if (jarvixContext.waitingFor === 'theme_style') {
    const no = /(?:нет|не надо|оставь|no|non|no gracias)/i.test(lower);
    const theme = /(?:светл|светлее|темнее|темная тема|темнее|потемнее|темн|тём|неонов|киберпанк|light|dark|darker|lighter|neon|clair|sombre|néon|más claro|claro|más oscuro|oscuro)/i.test(lower);
    if (no && !theme) { jarvixContext.waitingFor='next_choice'; speakJarvis(onboardingText('no')); return; }
    if (!theme) { speakJarvis(onboardingText('choose')); return; }
    jarvixContext.waitingFor=null;
  }
  if (jarvixContext.waitingFor === 'next_choice') {
    if (/(?:everyday|tools|инструмент|бесплатн|free tool|outil|herramient|gratis)/i.test(lower)) {
      jarvixContext.waitingFor=null; speakJarvis(onboardingText('tools'),()=>{if(isJarvisActive)instantOpen('free-tools.html');}); return;
    }
    if (/(?:inspiration|вдохнов|inspiración|inspiracion|пример|examples|exemples|ejemplos)/i.test(lower)) {
      jarvixContext.waitingFor=null; speakJarvis(onboardingText('inspire'),()=>{if(isJarvisActive)instantOpen('deepsyq.html#inspirationPreview');}); return;
    }
    if (/(?:studio|студи|фото|изображ|картин|video|видео|vidéo|vídeo|audio|аудио|music|музык|musique|música|create|созда|créer)/i.test(lower)) {
      jarvixContext.waitingFor=null; instantOpen('generate-studio.html'); return;
    }
    speakJarvis(onboardingText('open')); return;
  }

  // A. MULTI-TURN DIALOG CONTEXT HANDLERS
  if (jarvixContext.waitingFor === 'weather_city') {
    const cityKey = detectCityKey(lower);
    jarvixContext.waitingFor = null;
    if (cityKey) {
      handleWeatherInquiry(cityKey, isRu);
      return;
    }
  }

  if (jarvixContext.waitingFor === 'weather_week') {
    if (/(?:да|хочу|давай|на неделю|прогноз|расскажи|yes|sure)/i.test(lower)) {
      jarvixContext.waitingFor = null;
      const city = WORLD_CITIES[jarvixContext.lastCity] || WORLD_CITIES.paris;
      const weekResponse = isRu
        ? `Прогноз на неделю в ${city.ru}: ${city.week}`
        : `Weekly forecast for ${city.en}: ${city.week}`;
      speakJarvis(weekResponse);
      return;
    }
    jarvixContext.waitingFor = null;
  }

  // B. WEATHER QUERIES
  if (/(?:погода|погоду|погоде|температур|weather|temperature)/i.test(lower)) {
    const cityKey = detectCityKey(lower);
    if (cityKey) {
      handleWeatherInquiry(cityKey, isRu);
      return;
    }
    jarvixContext.waitingFor = 'weather_city';
    const askCity = isRu
      ? 'В каком городе вы хотите узнать погоду? Например, в Париже, Москве, Лондоне, Нью-Йорке или Токио?'
      : 'In which city would you like to check the weather? Paris, Moscow, London, New York, or Tokyo?';
    speakJarvis(askCity);
    return;
  }

  // C. INSTANT CREATION & CHATGPT PROMPT GENERATION ("Хочу создать изображение про Хэллоуин", "Создай видео")
  if (/(?:хочу создать|создай|сгенерируй|придумай|нарисуй|напиши)\s*(?:мне)?\s*(?:изображен|картинк|фото|видео|музык|песн)/i.test(lower)) {
    let concept = t
      .replace(/^(?:хочу создать|создай|сгенерируй|придумай|нарисуй|напиши)\s*(?:мне)?\s*/i, '')
      .replace(/^(?:изображение|картинку|фото|видео|ролик|музыку|песню|трек)\s*(?:про|на тему|с|в стиле|о)?\s*/i, '')
      .trim();
    if (!concept) concept = 'творческий концепт';

    const isVideo = /(?:видео|ролик|клип|фильм|video)/i.test(lower);
    const isAudio = /(?:музык|аудио|песн|трек|sound|music|audio)/i.test(lower);
    const targetKind = isVideo ? 'video' : isAudio ? 'audio' : 'image';

    const expandedPrompt = expandCreativePrompt(concept, targetKind);
    saveStudioHandoff({
      kind: targetKind,
      prompt: expandedPrompt,
      settings: {},
      source: 'jarvix-smart-prompt',
      autoGenerate: false
    }).then(() => {
      if (turnVersion !== jarvixTurnVersion) return;
      instantOpen(`generate-studio.html?studio=${targetKind}&from=jarvix`);
    }).catch(() => {
      if (turnVersion === jarvixTurnVersion) speakJarvis(isRu ? 'Не удалось подготовить черновик. Попробуйте ещё раз.' : 'The draft could not be prepared. Please try again.');
    });
    return;
  }

  // D. IMAGE EDITING & ACTIONS ("Удали фон", "Переделай", "Замени вот это")
  if (/(?:удали фон|удаление фона|убрать фон|без фона|remove background)/i.test(lower)) {
    instantOpen('simple-background-remover.html');
    return;
  }

  if (/(?:переделай|замени|измени|повтори|еще вариант|regenerate)/i.test(lower)) {
    speakJarvis(isRu ? 'Проверьте параметры и нажмите Create в студии. Голосовая команда не запускает платную генерацию.' : 'Review the settings and press Create in Studio. Voice commands do not start paid generation.');
    return;
  }

  // E. INSTANT PAGE OPENING ("Открой видео", "Открой картинку", "Открой инструменты" — моментально!)
  if (/(?:открой|перейди|запусти|open|launch|ouvre|abre)\s+(?:видео[\s-]?студи|видео|video)/i.test(lower) && !/удали|сжатие/i.test(lower)) {
    instantOpen('generate-studio.html?studio=video&from=jarvix');
    return;
  }

  if (/(?:открой|перейди|запусти|open|launch|ouvre|abre)\s+(?:изображен|картинк|фото|image|photo)/i.test(lower) && !/удали|сжатие/i.test(lower)) {
    instantOpen('generate-studio.html?studio=image&from=jarvix');
    return;
  }

  if (/(?:открой|перейди|запусти|open|launch|ouvre|abre)\s+(?:аудио|музык|audio|music)/i.test(lower)) {
    instantOpen('generate-studio.html?studio=audio&from=jarvix');
    return;
  }

  if (/(?:открой|перейди|запусти|open|launch|ouvre|abre)\s+(?:агент|ai[\s-]?агент|agent)/i.test(lower)) {
    instantOpen('ai-agents.html?from=jarvix');
    return;
  }

  if (/(?:открой|перейди|запусти|open|launch|ouvre|abre)\s+(?:уникализатор|видеоуникализатор|uniquifier|vu)/i.test(lower)) {
    instantOpen('index.html');
    return;
  }

  if (/(?:открой|перейди|запусти|open|launch|ouvre|abre)\s+(?:инструмент|everyday|tools)/i.test(lower)) {
    instantOpen('free-tools.html');
    return;
  }

  if (/(?:открой|перейди|open|ouvre|abre)\s+(?:холст|canvas)/i.test(lower)) {
    instantOpen('canvas.html');
    return;
  }

  if (/(?:открой|перейди|open|ouvre|abre)\s+(?:шаблон|apps|ai[\s-]?apps)/i.test(lower)) {
    instantOpen('ai-apps.html');
    return;
  }

  if (/(?:открой|перейди|open|ouvre|abre)\s+(?:тариф|цен|стоимост|подписк|pricing)/i.test(lower)) {
    instantOpen('pricing.html');
    return;
  }

  if (/(?:открой|перейди|open|ouvre|abre)\s+(?:главн|домой|home)/i.test(lower)) {
    instantOpen('deepsyq.html');
    return;
  }

  if (/(?:открой|перейди|open|ouvre|abre)\s+(?:истори|мои работы|сохранен|assets|history)/i.test(lower)) {
    instantOpen('generate-studio.html?view=history');
    return;
  }

  if (/(?:открой|перейди|open|ouvre|abre)\s+(?:аватар|avatar)/i.test(lower)) {
    instantOpen('avatar-studio.html');
    return;
  }

  if (/(?:открой|перейди|open|ouvre|abre)\s+(?:суфлер|телесуфлер|teleprompter)/i.test(lower)) {
    instantOpen('teleprompter.html');
    return;
  }

  if (/(?:сожми видео|сжатие видео)/i.test(lower)) {
    instantOpen('free-tools.html#compress-video');
    return;
  }

  if (/(?:сожми фото|сжатие фото)/i.test(lower)) {
    instantOpen('free-tools.html#compress-photos');
    return;
  }

  // F. DIRECT ACTIONS: Clear, Delete
  if (/(?:удали|очисти|сотри|clear|delete)/i.test(lower)) {
    speakJarvis(isRu ? 'Очистите поле вручную, чтобы случайно не потерять ваш текст.' : 'Please clear the field manually so your text is not lost accidentally.');
    return;
  }

  // G0. EXPLICIT THEME RESET / TURN OFF ("выключи его", "выключи тему", "выключи неоновый", "верни как было")
  if (/(?:выключи|отключи|убери|сбрось|верни)\s+(?:его|неон|киберпанк|тему|подсветку|стиль|режим|как было)|(?:выключи|отключи)\s+его|(?:стандартная|обычная|исходная|дефолтная)\s+тема|выключи тему|верни тему|верни как было|сбрось тему|default theme|reset theme|turn off neon/i.test(lower)) {
    applySiteTheme(null);
    const resp = isRu ? 'Сделано. Выключил тему и вернул стандартное оформление.'
      : isFr ? 'Terminé. Le thème a été réinitialisé.'
      : isEs ? 'Hecho. Se ha restablecido el tema predeterminado.'
      : 'Done. Reverted to default theme.';
    speakJarvis(resp);
    return;
  }

  // G1. THEME & LIGHTING COMMANDS
  if (/(?:посветлее|светлая тема|светлее|включи свет|light theme|lighter|plus clair|thème clair|tema claro|más claro|claro)/i.test(lower)) {
    applySiteTheme('light'); jarvixContext.waitingFor='next_choice'; speakJarvis(onboardingText('light')); return;
  }
  if (/(?:потемнее|темная тема|темнее|ночной режим|dark theme|darker|plus sombre|thème sombre|tema oscuro|más oscuro|oscuro)/i.test(lower)) {
    applySiteTheme('midnight'); jarvixContext.waitingFor='next_choice'; speakJarvis(onboardingText('dark')); return;
  }
  if (!/(?:выключи|отключи|не\s+надо|don't|do not|ne pas|no quiero)/i.test(lower) && /(?:неонов|киберпанк|neon|cyberpunk|néon)/i.test(lower)) {
    applySiteTheme('neon'); jarvixContext.waitingFor='next_choice'; speakJarvis(onboardingText('neon')); return;
  }
  if (!/(?:выключи|отключи|не\s+надо|don't|do not|ne pas|no quiero)/i.test(lower) && /(?:золот|люкс|gold|luxury)/i.test(lower)) {
    applySiteTheme('gold'); speakJarvis(isRu ? 'Готово, включил золотой стиль.' : isFr ? 'C’est fait, le thème doré est activé.' : isEs ? 'Listo, activé el tema dorado.' : 'Done. The gold theme is on.'); return;
  }

  // H. SITWIDE LANGUAGE SWITCHING
  if (/(?:английск|english|switch to english)/i.test(lower)) {
    setSiteLanguage('en');
    speakJarvis('Language switched to English.');
    return;
  }

  if (/(?:русск|russian|переключи на русский)/i.test(lower)) {
    setSiteLanguage('ru');
    speakJarvis('Язык переключен на русский.');
    return;
  }

  if (/(?:француз|french|français|passe en français)/i.test(lower)) {
    setSiteLanguage('fr');
    speakJarvis('Langue changée en français.');
    return;
  }

  if (/(?:испанск|spanish|español|cambiar a español|switch to spanish)/i.test(lower)) {
    setSiteLanguage('es');
    speakJarvis('Idioma cambiado a español.');
    return;
  }

  // I. TIME & DATE
  if (/(?:время|который час|time)/i.test(lower)) {
    const cityKey = detectCityKey(lower) || 'paris';
    const city = WORLD_CITIES[cityKey];
    const timeStr = new Intl.DateTimeFormat(isRu ? 'ru-RU' : 'en-US', {
      timeZone: city.tz,
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());
    speakJarvis(`В ${city.ru} сейчас ${timeStr}.`);
    return;
  }

  // J. MATH & CALCULATIONS
  const mathMatch = lower.match(/(\d+)\s*(?:умножить на|\*)\s*(\d+)/i);
  if (mathMatch) {
    const res = Number(mathMatch[1]) * Number(mathMatch[2]);
    speakJarvis(`Это будет ${res}.`);
    return;
  }

  const addMatch = lower.match(/(\d+)\s*(?:плюс|\+)\s*(\d+)/i);
  if (addMatch) {
    const res = Number(addMatch[1]) + Number(addMatch[2]);
    speakJarvis(`Это будет ${res}.`);
    return;
  }

  // K. PLATFORM KNOWLEDGE
  if (/(?:что такое deepsyq|что за сайт)/i.test(lower)) {
    speakJarvis('Deepsyq — это единая творческая платформа для генерации фото, видео, музыки и работы с полезными утилитами без подписок на десятки сервисов.');
    return;
  }

  if (/(?:что такое уникализатор)/i.test(lower)) {
    speakJarvis('Видеоуникализатор — это инструмент локальной обработки видео для соцсетей: Reels, TikTok, YouTube Shorts без потери качества.');
    return;
  }

  // L. ASYNC JARVIX AI BRAIN & MEMORY DISPATCH
  (async () => {
    try {
      const langCode = getJarvixLanguage();

      // Ready recordings answer known information questions before any AI request.
      const catalogReply = await findCatalogReply(t, langCode);
      if (turnVersion !== jarvixTurnVersion) return;
      if (catalogReply) {
        speakJarvis(catalogReply.text);
        return;
      }

      const controller = new AbortController();
      pendingJarvixTurn = controller;
      const res = await fetch('/api/jarvix/chat', {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: getJarvixSessionId(),
          message: t,
          language: langCode,
          timbre: getStoredTimbre()
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (turnVersion !== jarvixTurnVersion) return;
        if (data.studioHandoff) {
          try {
            await saveStudioHandoff(data.studioHandoff);
          } catch (_) {}
        }

        if (turnVersion !== jarvixTurnVersion) return;
        if (data.action) {
          if (data.action.type === 'open_studio') {
            speakJarvis(data.reply || 'Сделано.', () => {
              location.assign(data.action.url);
            });
            return;
          } else if (data.action.type === 'adjust_theme') {
            applySiteTheme(data.action.theme);
          } else if (data.action.type === 'clear_inputs') {
            clearCurrentInputs();
          } else if (data.action.type === 'block_unauthorized') {
            console.warn('[JARVIX SECURITY GUARD] Action blocked:', data.action.reason);
          }
        }

        if (data.reply) {
          speakJarvis(data.reply);
          return;
        }
      }
    } catch (err) {
      if (turnVersion !== jarvixTurnVersion || err.name === 'AbortError') return;
      console.warn('[JARVIX AI Brain API dispatch]', err);
    }

    if (turnVersion !== jarvixTurnVersion) return;
    // Intelligent Proactive Fallback (never repeat user's query)
    const smartFallback = isRu
      ? 'Слушаю вас. Могу открыть любую студию, сгенерировать кинематографичный промпт или настроить интерфейс. Что для вас сделать?'
      : 'Listening. I can open any studio, create a creative prompt, or adjust settings. What shall we do?';
    speakJarvis(smartFallback);
  })();
}

// 9. Speech Recognition Control (Pure Voice Loop)
function pauseJarvisRecognition() {
  recognitionVersion += 1;
  if (jarvisRecognition) {
    try {
      jarvisRecognition.onend = null;
      jarvisRecognition.stop();
    } catch (_) {}
  }
  isJarvisListening = false;
}

function showRecognitionError(reason) {
  const button = getTopBtn();
  if (!button) return;
  const language = getJarvixLanguage();
  const messages = {
    ru: { unsupported: 'Браузер не поддерживает распознавание речи', permission: 'Разреши Chrome доступ к микрофону', service: 'Служба распознавания речи недоступна', microphone: 'Не удалось открыть микрофон', network: 'Нет связи со службой распознавания речи', launch: 'Не удалось запустить распознавание речи' },
    en: { unsupported: 'Speech recognition is not supported by this browser', permission: 'Allow Chrome to use the microphone', service: 'Speech recognition service is unavailable', microphone: 'The microphone could not be opened', network: 'Speech recognition service connection failed', launch: 'Speech recognition could not start' },
    fr: { unsupported: 'La reconnaissance vocale n’est pas prise en charge par ce navigateur', permission: 'Autorisez Chrome à utiliser le microphone', service: 'Le service de reconnaissance vocale est indisponible', microphone: 'Impossible d’ouvrir le microphone', network: 'Connexion au service de reconnaissance vocale impossible', launch: 'Impossible de démarrer la reconnaissance vocale' },
    es: { unsupported: 'Este navegador no admite el reconocimiento de voz', permission: 'Permite que Chrome use el micrófono', service: 'El servicio de reconocimiento de voz no está disponible', microphone: 'No se pudo abrir el micrófono', network: 'Falló la conexión con el servicio de reconocimiento de voz', launch: 'No se pudo iniciar el reconocimiento de voz' }
  };
  const labels = { ru: 'Нет ввода', en: 'No input', fr: 'Aucune entrée', es: 'Sin entrada' };
  button.dataset.recognitionError = reason;
  button.title = (messages[language] || messages.en)[reason] || (messages.en)[reason] || messages.en.launch;
  const label = button.querySelector('.jarvis-name');
  if (label) label.textContent = labels[language] || labels.en;
}

function resumeJarvisRecognition() {
  if (!isJarvisActive || !keepListening || isJarvisSpeaking) return;

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    showRecognitionError('unsupported');
    return;
  }

  try {
    pauseJarvisRecognition();
    const recognitionTurn = recognitionVersion;

    jarvisRecognition = new SpeechRec();
    jarvisRecognition.continuous = true;
    jarvisRecognition.interimResults = true;
    const lang = (localStorage.getItem('deepsyq_home_language') || localStorage.getItem('deepsyq_lang') || document.documentElement.lang || 'ru').toLowerCase();
    jarvisRecognition.lang = (lang === 'ru' || lang.startsWith('ru')) ? 'ru-RU' :
      (lang === 'fr' || lang.startsWith('fr')) ? 'fr-FR' :
      (lang === 'es' || lang.startsWith('es')) ? 'es-ES' : 'en-US';

    jarvisRecognition.onstart = () => {
      if (recognitionTurn !== recognitionVersion || !isJarvisActive || !keepListening) return;
      isJarvisListening = true;
      updateJarvisState('listening');
      const button = getTopBtn();
      if (button) {
        delete button.dataset.recognitionError;
        button.dataset.voicePhase = 'listening';
        const label = button.querySelector('.jarvis-name');
        if (label) label.textContent = {ru:'Слушаю', en:'Listening', fr:'Écoute', es:'Escucho'}[getJarvixLanguage()];
      }
      resetSilenceTimer();
    };

    let speechTimeout = null;
    let accumulatedText = '';
    let lastHandledText = '';
    let lastHandledTime = 0;

    jarvisRecognition.onresult = e => {
      if (recognitionTurn !== recognitionVersion || !isJarvisActive || !keepListening) return;
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const item = e.results[i];
        if (item.isFinal) {
          accumulatedText += ' ' + item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      const current = (accumulatedText + ' ' + interim).trim();
      if (!current) return;

      // Immediate ChatGPT-style interruption cutoff (0ms delay)
      if (isJarvisSpeaking) {
        const heardLower = current.toLowerCase();

        // 1. Explicit interruption keywords (Stop, Wait, Quiet, Silence, Cancel, etc.)
        const isExplicitInterrupt = /(?:стоп|стой|подожди|погоди|хватит|замолчи|тихо|отмена|прерви|хватит болтать|stop|quiet|silence|wait|cancel|pause)/i.test(heardLower);

        // 2. Action command keywords (open video, pricing, theme, etc.)
        const isActionCommand = /(?:открой|перейди|запусти|очисти|сотри|open|launch|ouvre|ouvrez|abre|abrir)/i.test(heardLower);

        // 3. Acoustic echo check: Compare heard text with words JARVIX is speaking right now
        const spokenWords = (currentSpokenUtterance || '').toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter(w => w.length > 2);

        const heardWords = heardLower
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter(w => w.length > 2);

        // Speaker echo must never trigger action keywords from our own reply.
        const echoMatches = heardWords.filter(w => spokenWords.includes(w)).length;
        if (heardWords.length && echoMatches / heardWords.length >= 0.6) {
          accumulatedText = '';
          return;
        }
        const hasUserWords = heardWords.some(w => !spokenWords.includes(w));

        if (isExplicitInterrupt || isActionCommand || (hasUserWords && heardWords.length >= 1)) {
          // USER BARGE-IN DETECTED: Immediately cut off speech with 0ms latency
          cancelJarvixTurn();
          stopAllSpeech();
          isJarvisSpeaking = false;
          currentSpokenUtterance = '';
          updateJarvisState('listening');
          accumulatedText = '';

          if (isExplicitInterrupt && !isActionCommand) {
            // Instant silence upon user barge-in ("Стоп" / "Замолчи" / "Хватит")
            return;
          }

          if (isActionCommand || heardLower.length > 3) {
            handleJarvisVoiceCommand(current);
            return;
          }
          return;
        }

        // Drop acoustic feedback of JARVIX's own voice
        accumulatedText = '';
        return;
      }

      // Normal speech recognition handling
      resetSilenceTimer();
      updateJarvisState('listening');
      clearTimeout(speechTimeout);
      speechTimeout = setTimeout(() => {
        if (recognitionTurn !== recognitionVersion || !isJarvisActive || !keepListening) return;
        const trimmed = current.trim();
        // Ignore single filler syllables, coughs, mic pops
        if (/^(?:а|ну|эм|ээ|хм|uh|um|ah)$/i.test(trimmed)) {
          accumulatedText = '';
          return;
        }

        if ((current.length > 2 || /^(?:да|нет|yes|no|oui|non|si|sí)$/iu.test(trimmed)) && !isJarvisSpeaking) {
          const now = Date.now();
          // Prevent duplicate recognition loops of the exact same command within 2.5 seconds
          if (current.toLowerCase() === lastHandledText.toLowerCase() && (now - lastHandledTime) < 2500) {
            accumulatedText = '';
            return;
          }
          lastHandledText = current;
          lastHandledTime = now;
          accumulatedText = '';
          handleJarvisVoiceCommand(current);
        }
      }, 900);
    };

    jarvisRecognition.onend = () => {
      if (recognitionTurn !== recognitionVersion) return;
      isJarvisListening = false;
      clearTimeout(speechTimeout);
      if (isJarvisActive && keepListening) {
        setTimeout(() => {
          if (recognitionTurn === recognitionVersion && isJarvisActive && keepListening && !isJarvisSpeaking) {
            resumeJarvisRecognition();
          }
        }, 150);
      } else {
        isJarvisListening = false;
      }
    };

    jarvisRecognition.onerror = (err) => {
      if (recognitionTurn !== recognitionVersion || !isJarvisActive) return;
      const recognitionErrors = {
        'not-allowed': 'permission',
        'service-not-allowed': 'service',
        'audio-capture': 'microphone',
        network: 'network'
      };
      if (recognitionErrors[err.error]) showRecognitionError(recognitionErrors[err.error]);
      if (err.error === 'not-allowed') {
        const resumeOnGesture = () => {
          document.removeEventListener('click', resumeOnGesture);
          document.removeEventListener('keydown', resumeOnGesture);
          if (isJarvisActive && keepListening) {
            resumeJarvisRecognition();
          }
        };
        document.addEventListener('click', resumeOnGesture, { once: true });
        document.addEventListener('keydown', resumeOnGesture, { once: true });
        isJarvisListening = false;
        updateJarvisState('idle');
        return;
      }
    };

    jarvisRecognition.start();
  } catch (err) {
    console.warn('[JARVIX] Launch failed:', err);
    showRecognitionError('launch');
  }
}

// 10. Silence Timer: Polite auto-standby after silence (silent standby, never unprompted talk)
function startSilenceTimer() {
  // Do not end an active listening session just because the user pauses.
  clearTimeout(silenceTimer);
}

function resetSilenceTimer() {
  clearTimeout(silenceTimer);
  if (isJarvisActive && !isJarvisSpeaking) {
    startSilenceTimer();
  }
}

// 11. Activation & Deactivation (Smart Conversational Memory)
export function activateJarvisVoice() {
  unlockOwnerSpeech();
  isJarvisActive = true;
  keepListening = true;
  try {
    sessionStorage.setItem('jarvix_active', '1');
  } catch (_) {}

  const topBtn = getTopBtn();
  if (topBtn) topBtn.classList.add('is-active');

  const greetings = OWNER_GREETING_TEXT;
  const greetingText = greetings[getJarvixLanguage()] || greetings.en;
  jarvixContext.waitingFor = 'welcome_choice';
  speakJarvis(greetingText, () => {
    if (isJarvisActive && keepListening) speakJarvis(onboardingText('ask'));
  });
}

export function deactivateJarvisVoice() {
  cancelJarvixTurn();
  isJarvisActive = false;
  keepListening = false;
  isJarvisSpeaking = false;
  isJarvisListening = false;
  try {
    sessionStorage.removeItem('jarvix_active');
  } catch (_) {}
  clearTimeout(silenceTimer);
  stopAllSpeech();
  pauseJarvisRecognition();

  const topBtn = getTopBtn();
  if (topBtn) {
    topBtn.classList.remove('is-active', 'is-speaking', 'is-listening');
    topBtn.removeAttribute('aria-busy');
    topBtn.dataset.voicePhase = 'idle';
    const label = topBtn.querySelector('.jarvis-name');
    if (label) label.textContent = 'JARVIX';
  }
}

export function toggleJarvisVoice() {
  if (isJarvisSpeaking) {
    stopAllSpeech();
    isJarvisSpeaking = false;
    currentSpokenUtterance = '';
    deactivateJarvisVoice();
    return;
  }
  if (isJarvisActive) {
    deactivateJarvisVoice();
  } else {
    activateJarvisVoice();
  }
}

// Global Escape listener to immediately cancel speech synthesis
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cancelJarvixTurn();
      stopAllSpeech();
      isJarvisSpeaking = false;
      currentSpokenUtterance = '';
      updateJarvisState('listening');
    }
  });
}

// 12. Mount JARVIX UI Component & restore state across pages
export function initJarvis() {
  if (typeof document === 'undefined') return;
  prepareOwnerGreetings();

  // Restore saved theme on load
  try {
    const savedTheme = localStorage.getItem('deepsyq_site_theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-site-theme', savedTheme);
    }
  } catch (_) {}

  const setupBtn = () => {
    const topBtn = getTopBtn();
    if (topBtn && !topBtn.__jarvisBound) {
      topBtn.__jarvisBound = true;
      topBtn.onclick = () => toggleJarvisVoice();
      if (isJarvisActive) {
        topBtn.classList.add('is-active');
        if (isJarvisListening) topBtn.classList.add('is-listening');
      }
    }
  };
  setupBtn();
  setTimeout(setupBtn, 200);
  setTimeout(setupBtn, 600);

  // Cross-page persistence: restore JARVIX if active prior to navigation
  let wasActive = false;
  try {
    wasActive = sessionStorage.getItem('jarvix_active') === '1';
  } catch (_) {}

  let sayOnLoad = null;
  try {
    sayOnLoad = sessionStorage.getItem('jarvix_say_on_load');
    if (sayOnLoad) sessionStorage.removeItem('jarvix_say_on_load');
  } catch (_) {}

  // Home page protection: Home page (deepsyq.html) should NEVER auto-listen on fresh visit
  const isHomePage = location.pathname.endsWith('deepsyq.html') || location.pathname === '/' || location.pathname.endsWith('/');
  if (isHomePage && !sayOnLoad) {
    wasActive = false;
    try {
      sessionStorage.removeItem('jarvix_active');
    } catch (_) {}
  }

  if (wasActive || sayOnLoad) {
    isJarvisActive = true;
    keepListening = true;
    try {
      sessionStorage.setItem('jarvix_active', '1');
    } catch (_) {}

    updateJarvisState('listening');
    const topBtn = getTopBtn();
    if (topBtn) topBtn.classList.add('is-active');

    if (sayOnLoad) {
      setTimeout(() => {
        speakJarvis(sayOnLoad, () => {
          if (isJarvisActive && keepListening) {
            resumeJarvisRecognition();
            startSilenceTimer();
            updateJarvisState('listening');
          }
        });
      }, 350);
    } else {
      setTimeout(() => {
        if (isJarvisActive && keepListening) {
          resumeJarvisRecognition();
          startSilenceTimer();
          updateJarvisState('listening');
        }
      }, 350);
    }
  }
}

// Auto-boot on load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJarvis);
  } else {
    initJarvis();
  }
}

