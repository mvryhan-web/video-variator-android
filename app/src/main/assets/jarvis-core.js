// JARVIX AI Core v6.0 — Autonomous Voice Butler & Resident Intelligence
// Guaranteed Male Film Voice, Instant Navigation ("Сделано."), Multi-Turn Weather Brain & Smart ChatGPT Prompt Generation
import { detectIntent } from './home-experience.js';
import { saveStudioHandoff } from './studio-handoff.js';

const $ = id => document.getElementById(id);

let isJarvisActive = false;
let currentTtsAudio = null;
let jarvixSessionId = null;

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
let keepListening = false;
let silenceTimer = null;
const SILENCE_TIMEOUT_MS = 45000;

// Conversational context memory for multi-turn dialogs (e.g., weather city, prompt refinement)
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
      /(?:dmitry|дмитрий|pavel|павел|aleksandr|alexander|александр|maxim|максим|yuri|юрий|mikhail|михаил|boris|борис|igor|игорь|male|муж)/i.test(v.name + ' ' + (v.voiceURI || '')) &&
      !FEMALE_VOICE_REGEX.test(v.name + ' ' + (v.voiceURI || ''))
    );
    if (maleRu) return { voice: maleRu, isExplicitMale: true };

  } else if (isFr) {
    const maleFr = cachedVoices.find(v =>
      v.lang.startsWith('fr') &&
      /(?:henri|thomas|nicolas|paul|alain|claude|male|homme)/i.test(v.name + ' ' + (v.voiceURI || '')) &&
      !FEMALE_VOICE_REGEX.test(v.name + ' ' + (v.voiceURI || ''))
    );
    if (maleFr) return { voice: maleFr, isExplicitMale: true };

  } else if (isEs) {
    const maleEs = cachedVoices.find(v =>
      v.lang.startsWith('es') &&
      /(?:jorge|diego|pablo|carlos|alvaro|miguel|manuel|enrique|male|hombre)/i.test(v.name + ' ' + (v.voiceURI || '')) &&
      !FEMALE_VOICE_REGEX.test(v.name + ' ' + (v.voiceURI || ''))
    );
    if (maleEs) return { voice: maleEs, isExplicitMale: true };

  } else {
    // British / UK Male voice (Paul Bettany film JARVIS style)
    const ukMale = cachedVoices.find(v =>
      (v.lang === 'en-GB' || v.lang.startsWith('en')) &&
      /(?:george|ryan|oliver|arthur|daniel|male|guy|david|brian|mark|paul)/i.test(v.name + ' ' + (v.voiceURI || '')) &&
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

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
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
      isJarvisSpeaking = true;
      currentSpokenUtterance = text;
      updateJarvisState('speaking');
    };

    const finish = () => {
      // 300ms acoustic guard delay to prevent room reverberation / speaker tail from triggering mic
      setTimeout(() => {
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
  speakLocalSpeechSynthesis(text, onComplete, langCode, isRu);
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

  if (isSamePage) {
    speakJarvis('Сделано.');
    try {
      const targetUrl = new URL(url, location.href);
      if (targetUrl.hash) location.hash = targetUrl.hash;
    } catch (_) {}
    return;
  }

  // Cross-page navigation: speak cleanly ONCE upon target page mount, never doubled
  try {
    sessionStorage.setItem('jarvix_say_on_load', 'Сделано.');
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

function handleWeatherInquiry(cityKey, isRu) {
  const city = WORLD_CITIES[cityKey] || WORLD_CITIES.paris;
  jarvixContext.lastCity = cityKey || 'paris';
  jarvixContext.waitingFor = 'weather_week';

  const timeStr = new Intl.DateTimeFormat(isRu ? 'ru-RU' : 'en-US', {
    timeZone: city.tz,
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());

  const response = isRu
    ? `В ${city.ru} сейчас ${timeStr}, температура около ${city.temp} градусов, ${city.cond}. Хотите узнать прогноз на неделю?`
    : `In ${city.en} it is currently ${timeStr}, temperature around ${city.temp} degrees, ${city.cond}. Would you like to hear the weekly forecast?`;

  speakJarvis(response);
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
  const t = commandText.trim();
  const lower = t.toLowerCase();
  resetSilenceTimer();
  const isRu = (getJarvixLanguage() === 'ru');

  // 1. CAPABILITIES & BUTLER IDENTITY ("Что ты умеешь делать?", "Что ты умеешь?", "Кто ты", "Помощь")
  if (/(?:что\s+(?:ты\s+)?(?:умеешь|можешь)(?:\s+делать)?|твои\s+возможности|какие\s+(?:у\s+тебя\s+)?функции|что\s+ты\s+такое|кто\s+ты|расскажи\s+о\s+себе|справка|помощь|help|what can you do)/i.test(lower)) {
    const helpMsg = isRu
      ? 'Я JARVIX — ваш бортовой голосовой помощник Deepsyq. Я умею: моментально открывать студии видео, фото, аудио и инструменты сайта; создавать кинематографичные промпты для нейросетей на любую тему; регулировать тему и освещение сайта; очищать поля ввода; а также сообщать точное время и погоду в любых мировых столицах. Что для вас сделать?'
      : 'I am JARVIX — your resident voice intelligence on Deepsyq. I can instantly open video, photo, audio studios and site tools, generate cinematic AI prompts, adjust website lighting and themes, clear inputs, and report live time and weather worldwide. How can I help you?';
    speakJarvis(helpMsg);
    return;
  }

  // 2. SOCIAL DIALOG & STATUS ("Привет", "Как дела", "Кто тут")
  if (/^(?:привет|здравствуй(?:те)?|добрый\s+(?:день|вечер|утро)|салют|хай|hello|hi)$/i.test(lower) || /(?:как\s+(?:твои\s+)?дела|как\s+ты|как\s+настроение|как\s+поживаешь|how are you)/i.test(lower)) {
    if (/(?:как\s+(?:твои\s+)?дела|как\s+ты|как\s+настроение|how are you)/i.test(lower)) {
      const statusMsg = isRu
        ? 'Все системы функционируют безупречно. Готов открывать студии, генерировать промпты и помогать в работе. Что для вас сделать?'
        : 'All systems are fully operational and ready. What can I do for you today?';
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

  // 4. SHUTDOWN / STANDBY ("Выключись", "Пока", "Стоп")
  if (/(?:выключись|отключись|пока|до\s+свидания|замолчи|хватит|стоп|goodbye|bye|turn off|shut down)/i.test(lower)) {
    const byeMsg = isRu
      ? 'Выключаюсь. Если я вам понадоблюсь — просто нажмите на сферу вверху страницы.'
      : 'Deactivating. Whenever you need me, simply click the orb.';
    speakJarvis(byeMsg, () => {
      deactivateJarvisVoice();
    });
    return;
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
    speakJarvis('Сделано.', async () => {
      try {
        await saveStudioHandoff({
          kind: targetKind,
          prompt: expandedPrompt,
          settings: {},
          source: 'jarvix-smart-prompt',
          autoGenerate: true
        });
      } catch (_) {}
      location.assign(`generate-studio.html?studio=${targetKind}&from=jarvix&auto=1`);
    });
    return;
  }

  // D. IMAGE EDITING & ACTIONS ("Удали фон", "Переделай", "Замени вот это")
  if (/(?:удали фон|удаление фона|убрать фон|без фона|remove background)/i.test(lower)) {
    instantOpen('simple-background-remover.html');
    return;
  }

  if (/(?:переделай|замени|измени|повтори|еще вариант|regenerate)/i.test(lower)) {
    const genBtn = $('generate');
    if (genBtn && !genBtn.disabled) {
      speakJarvis('Сделано.');
      genBtn.click();
      return;
    }
  }

  // E. INSTANT PAGE OPENING ("Открой видео", "Открой картинку", "Открой инструменты" — моментально!)
  if (/(?:открой|перейди|запусти)?\s*(?:видео[\s-]?студи|видео|video)/i.test(lower) && !/удали|сжатие/i.test(lower)) {
    instantOpen('generate-studio.html?studio=video&from=jarvix');
    return;
  }

  if (/(?:открой|перейди|запусти)?\s*(?:изображен|картинк|фото|image|photo)/i.test(lower) && !/удали|сжатие/i.test(lower)) {
    instantOpen('generate-studio.html?studio=image&from=jarvix');
    return;
  }

  if (/(?:открой|перейди|запусти)?\s*(?:аудио|музык|audio|music)/i.test(lower)) {
    instantOpen('generate-studio.html?studio=audio&from=jarvix');
    return;
  }

  if (/(?:открой|перейди|запусти)?\s*(?:агент|ai[\s-]?агент|agent)/i.test(lower)) {
    instantOpen('ai-agents.html?from=jarvix');
    return;
  }

  if (/(?:открой|перейди|запусти)?\s*(?:уникализатор|видеоуникализатор|uniquifier|vu)/i.test(lower)) {
    instantOpen('index.html');
    return;
  }

  if (/(?:открой|перейди|запусти)?\s*(?:инструмент|everyday|tools)/i.test(lower)) {
    instantOpen('free-tools.html');
    return;
  }

  if (/(?:открой|перейди)?\s*(?:холст|canvas)/i.test(lower)) {
    instantOpen('canvas.html');
    return;
  }

  if (/(?:открой|перейди)?\s*(?:шаблон|apps|ai[\s-]?apps)/i.test(lower)) {
    instantOpen('ai-apps.html');
    return;
  }

  if (/(?:открой|перейди)?\s*(?:тариф|цен|стоимост|подписк|pricing)/i.test(lower)) {
    instantOpen('pricing.html');
    return;
  }

  if (/(?:главн|домой|home)/i.test(lower)) {
    instantOpen('deepsyq.html');
    return;
  }

  if (/(?:истори|мои работы|сохранен|assets|history)/i.test(lower)) {
    instantOpen('generate-studio.html?view=history');
    return;
  }

  if (/(?:аватар|avatar)/i.test(lower)) {
    instantOpen('avatar-studio.html');
    return;
  }

  if (/(?:суфлер|телесуфлер|teleprompter)/i.test(lower)) {
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
    clearCurrentInputs();
    speakJarvis('Сделано. Очистил.');
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
  if (/(?:посветлее|светлая тема|светлее|включи свет|light theme)/i.test(lower)) {
    applySiteTheme('light');
    speakJarvis('Сделано. Сделал освещение сайта ярким и светлым.');
    return;
  }

  if (/(?:потемнее|темная тема|темнее|ночной режим|dark theme)/i.test(lower)) {
    applySiteTheme('midnight');
    speakJarvis('Сделано. Переключил на глубокую темную тему.');
    return;
  }

  if (!/(?:выключи|отключи|не\s+надо)/i.test(lower) && /(?:неонов|киберпанк|neon|cyberpunk)/i.test(lower)) {
    applySiteTheme('neon');
    speakJarvis('Сделано. Включил неоновый киберпанк.');
    return;
  }

  if (!/(?:выключи|отключи|не\s+надо)/i.test(lower) && /(?:золот|люкс|gold|luxury)/i.test(lower)) {
    applySiteTheme('gold');
    speakJarvis('Сделано. Включил премиальный золотой стиль.');
    return;
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

      const res = await fetch('/api/jarvix/chat', {
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
        if (data.studioHandoff) {
          try {
            await saveStudioHandoff(data.studioHandoff);
          } catch (_) {}
        }

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
      console.warn('[JARVIX AI Brain API dispatch]', err);
    }

    // Intelligent Proactive Fallback (never repeat user's query)
    const smartFallback = isRu
      ? 'Слушаю вас. Могу открыть любую студию, сгенерировать кинематографичный промпт или настроить интерфейс. Что для вас сделать?'
      : 'Listening. I can open any studio, create a creative prompt, or adjust settings. What shall we do?';
    speakJarvis(smartFallback);
  })();
}

// 9. Speech Recognition Control (Pure Voice Loop)
function pauseJarvisRecognition() {
  if (jarvisRecognition) {
    try {
      jarvisRecognition.onend = null;
      jarvisRecognition.stop();
    } catch (_) {}
  }
  isJarvisListening = false;
}

function resumeJarvisRecognition() {
  if (!isJarvisActive || !keepListening) return;

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return;

  try {
    pauseJarvisRecognition();

    jarvisRecognition = new SpeechRec();
    jarvisRecognition.continuous = true;
    jarvisRecognition.interimResults = true;
    const lang = (localStorage.getItem('deepsyq_home_language') || localStorage.getItem('deepsyq_lang') || document.documentElement.lang || 'ru').toLowerCase();
    jarvisRecognition.lang = (lang === 'ru' || lang.startsWith('ru')) ? 'ru-RU' :
      (lang === 'fr' || lang.startsWith('fr')) ? 'fr-FR' :
      (lang === 'es' || lang.startsWith('es')) ? 'es-ES' : 'en-US';

    jarvisRecognition.onstart = () => {
      isJarvisListening = true;
      updateJarvisState('listening');
      resetSilenceTimer();
    };

    let speechTimeout = null;
    let accumulatedText = '';
    let lastHandledText = '';
    let lastHandledTime = 0;

    jarvisRecognition.onresult = e => {
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
        const isActionCommand = /(?:открой|перейди|запусти|видео|картинк|фото|тариф|инструмент|холст|посветлее|потемнее|неон|свет|очисти|сотри|open|theme|clear|pricing|video|studio)/i.test(heardLower);

        // 3. Acoustic echo check: Compare heard text with words JARVIX is speaking right now
        const spokenWords = (currentSpokenUtterance || '').toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter(w => w.length > 2);

        const heardWords = heardLower
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter(w => w.length > 2);

        const hasUserWords = heardWords.some(w => !spokenWords.includes(w));

        if (isExplicitInterrupt || isActionCommand || (hasUserWords && heardWords.length >= 1)) {
          // USER BARGE-IN DETECTED: Immediately cut off speech with 0ms latency
          stopAllSpeech();
          isJarvisSpeaking = false;
          currentSpokenUtterance = '';
          updateJarvisState('listening');
          accumulatedText = '';

          if (isExplicitInterrupt && !isActionCommand) {
            speakJarvis('Слушаю вас.');
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
        if (current.length > 2 && !isJarvisSpeaking) {
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
      if (isJarvisActive && keepListening) {
        setTimeout(() => {
          if (isJarvisActive && keepListening) {
            resumeJarvisRecognition();
          }
        }, 150);
      } else {
        isJarvisListening = false;
      }
    };

    jarvisRecognition.onerror = (err) => {
      if (err.error === 'not-allowed') {
        deactivateJarvisVoice();
      }
    };

    jarvisRecognition.start();
  } catch (err) {
    console.warn('[JARVIX] Launch failed:', err);
  }
}

// 10. Silence Timer: Polite auto-standby after silence
function startSilenceTimer() {
  clearTimeout(silenceTimer);
  silenceTimer = setTimeout(() => {
    if (isJarvisActive && !isJarvisSpeaking) {
      const isRu = (getJarvixLanguage() === 'ru');
      const farewell = isRu
        ? 'Я выключаюсь. Если я вам понадоблюсь, включите меня.'
        : 'I am turning off. If you need me, simply click on me.';
      speakJarvis(farewell, () => {
        deactivateJarvisVoice();
      });
    }
  }, SILENCE_TIMEOUT_MS);
}

function resetSilenceTimer() {
  clearTimeout(silenceTimer);
  if (isJarvisActive && !isJarvisSpeaking) {
    startSilenceTimer();
  }
}

// 11. Activation & Deactivation (Smart Conversational Memory)
export function activateJarvisVoice() {
  isJarvisActive = true;
  keepListening = true;
  try {
    sessionStorage.setItem('jarvix_active', '1');
  } catch (_) {}

  // Request audio hardware echo cancellation if available in browser
  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
    try {
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
        .then(stream => {
          setTimeout(() => stream.getTracks().forEach(t => t.stop()), 5000);
        })
        .catch(() => {});
    } catch (_) {}
  }

  const topBtn = getTopBtn();
  if (topBtn) topBtn.classList.add('is-active');

  const isRu = (getJarvixLanguage() === 'ru');
  const hasGreeted = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('jarvix_greeted') === '1';

  let greetingText = '';
  if (!hasGreeted) {
    // 1st time greeting: polite introduction & lighting/design check
    greetingText = isRu
      ? 'Здравствуйте! Я JARVIX. Готов к работе. Скажите, удобно ли вам текущее освещение и дизайн сайта? Могу сделать посветлее, потемнее или включить неоновый киберпанк.'
      : 'Greetings! I am JARVIX. Online and ready. How is the current lighting and design for you? I can make it brighter, darker, or switch to neon cyberpunk.';
    try {
      sessionStorage.setItem('jarvix_greeted', '1');
    } catch (_) {}
  } else {
    // Subsequent clicks: smart, attentive butler response
    const butlerRepliesRu = [
      'Да, слушаю вас.',
      'Всегда к вашим услугам.',
      'На связи. Что делаем?',
      'Слушаю вас.'
    ];
    const butlerRepliesEn = [
      'Yes, listening.',
      'At your service.',
      'Standing by. What shall we do?',
      'Listening.'
    ];
    const list = isRu ? butlerRepliesRu : butlerRepliesEn;
    greetingText = list[Math.floor(Math.random() * list.length)];
  }

  speakJarvis(greetingText);
}

export function deactivateJarvisVoice() {
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
  }
}

export function toggleJarvisVoice() {
  if (isJarvisSpeaking) {
    stopAllSpeech();
    isJarvisSpeaking = false;
    resumeJarvisRecognition();
    updateJarvisState('listening');
    return;
  }
  if (isJarvisActive) {
    deactivateJarvisVoice();
  } else {
    activateJarvisVoice();
  }
}

// 12. Mount JARVIX UI Component & restore state across pages
export function initJarvis() {
  if (typeof document === 'undefined') return;

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
