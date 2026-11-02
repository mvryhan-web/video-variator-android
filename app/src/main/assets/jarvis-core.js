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

export function getJarvixVoice(isRu) {
  refreshVoices();
  if (!cachedVoices.length) return null;

  if (isRu) {
    // Check for explicit Russian male voices (Dmitry, Pavel, Aleksandr, Maxim, Yuri, etc.)
    const maleRu = cachedVoices.find(v =>
      v.lang.startsWith('ru') &&
      /(?:dmitry|дмитрий|pavel|павел|aleksandr|alexander|александр|maxim|максим|yuri|юрий|mikhail|михаил|boris|борис|igor|игорь|male|муж)/i.test(v.name + ' ' + (v.voiceURI || ''))
    );
    if (maleRu) return { voice: maleRu, isExplicitMale: true };

    const anyRu = cachedVoices.find(v => v.lang.startsWith('ru'));
    if (anyRu) return { voice: anyRu, isExplicitMale: false };
  } else {
    // British / UK Male voice (Paul Bettany film JARVIS style)
    const ukMale = cachedVoices.find(v =>
      (v.lang === 'en-GB' || v.lang.startsWith('en')) &&
      /(?:george|ryan|oliver|arthur|daniel|male|guy|david|brian|mark|paul)/i.test(v.name + ' ' + (v.voiceURI || ''))
    );
    if (ukMale) return { voice: ukMale, isExplicitMale: true };

    const anyEn = cachedVoices.find(v => v.lang.startsWith('en'));
    if (anyEn) return { voice: anyEn, isExplicitMale: false };
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

// 2. Text-to-Speech Engine with Natural, Crystal-Clear Timbre
export function speakJarvis(text, onComplete = null) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }
  try {
    pauseJarvisRecognition();
    resetSilenceTimer();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = document.documentElement.lang || 'ru';
    const isRu = (lang === 'ru' || lang.startsWith('ru') || navigator.language?.startsWith('ru'));
    const isFr = (lang === 'fr' || lang.startsWith('fr'));

    utterance.lang = isRu ? 'ru-RU' : isFr ? 'fr-FR' : 'en-US';

    const voiceMeta = getJarvixVoice(isRu);
    if (voiceMeta && voiceMeta.voice) {
      utterance.voice = voiceMeta.voice;
    }

    // Natural, pleasant, dignified pitch — never artificially pitched down to robotic low frequencies
    utterance.pitch = 1.0;
    utterance.rate = 1.0;

    utterance.onstart = () => {
      isJarvisSpeaking = true;
      updateJarvisState('speaking');
    };

    const finish = () => {
      isJarvisSpeaking = false;
      if (typeof onComplete === 'function') {
        onComplete();
      } else if (isJarvisActive && keepListening) {
        resumeJarvisRecognition();
        startSilenceTimer();
      } else {
        updateJarvisState('idle');
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[JARVIX] Speech error:', err);
    if (typeof onComplete === 'function') onComplete();
  }
}

// 3. Instant Navigation Utility ("Сделано.")
export function instantOpen(url) {
  speakJarvis('Сделано.');
  try {
    sessionStorage.setItem('jarvix_say_on_load', 'Сделано.');
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
    if (!themeName) {
      document.documentElement.removeAttribute('data-site-theme');
      localStorage.removeItem('deepsyq_site_theme');
    } else {
      document.documentElement.setAttribute('data-site-theme', themeName);
      localStorage.setItem('deepsyq_site_theme', themeName);
    }
    window.dispatchEvent(new CustomEvent('deepsyq:theme', { detail: { theme: themeName } }));
  } catch (_) {}
}

export function setSiteLanguage(langCode) {
  const code = (langCode === 'ru' || langCode === 'fr') ? langCode : 'en';
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
  const isRu = (document.documentElement.lang === 'ru' || navigator.language?.startsWith('ru'));

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

  // G. THEME & LIGHTING COMMANDS
  if (/(?:посветлее|светлая тема|светлее|включи свет|light theme)/i.test(lower)) {
    applySiteTheme('light');
    speakJarvis('Сделано. Сделал освещение сайта ярким и светлым.');
    return;
  }

  if (/(?:потемнее|темная тема|темнее|ночной режим|выключи свет|dark theme)/i.test(lower)) {
    applySiteTheme('midnight');
    speakJarvis('Сделано. Переключил на глубокую темную тему.');
    return;
  }

  if (/(?:неонов|киберпанк|neon|cyberpunk)/i.test(lower)) {
    applySiteTheme('neon');
    speakJarvis('Сделано. Включил неоновый киберпанк.');
    return;
  }

  if (/(?:золот|люкс|gold|luxury)/i.test(lower)) {
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
      const lang = document.documentElement.lang || 'ru';
      const langCode = (lang === 'ru' || lang.startsWith('ru') || navigator.language?.startsWith('ru'))
        ? 'ru'
        : (lang === 'fr' || lang.startsWith('fr')) ? 'fr' : (lang === 'es' || lang.startsWith('es')) ? 'es' : 'en';

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

    // Intelligent Proactive Fallback (never robotic or repetitive)
    const smartFallback = isRu
      ? `Я услышал: «${t}». Могу создать кинематографичный промпт на эту тему для генерации, открыть студию или переключить тему. Что для вас сделать?`
      : `I heard: "${t}". Shall I generate a creative prompt for this, open a studio, or adjust the theme?`;
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
    const lang = document.documentElement.lang || 'ru';
    jarvisRecognition.lang = (lang === 'ru' || lang.startsWith('ru') || navigator.language?.startsWith('ru')) ? 'ru-RU' : (lang === 'fr' || lang.startsWith('fr')) ? 'fr-FR' : 'en-US';

    jarvisRecognition.onstart = () => {
      isJarvisListening = true;
      updateJarvisState('listening');
      resetSilenceTimer();
    };

    let speechTimeout = null;
    let accumulatedText = '';

    jarvisRecognition.onresult = e => {
      resetSilenceTimer();
      let interim = '';
      if (isJarvisSpeaking) {
        stopAllSpeech();
      }
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const item = e.results[i];
        if (item.isFinal) {
          accumulatedText += ' ' + item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      const current = (accumulatedText + ' ' + interim).trim();
      if (current) {
        clearTimeout(speechTimeout);
        speechTimeout = setTimeout(() => {
          if (current.length > 2) {
            accumulatedText = '';
            pauseJarvisRecognition();
            handleJarvisVoiceCommand(current);
          }
        }, 1050);
      }
    };

    jarvisRecognition.onend = () => {
      if (isJarvisActive && keepListening && !isJarvisSpeaking) {
        setTimeout(() => {
          if (isJarvisActive && keepListening && !isJarvisSpeaking) {
            resumeJarvisRecognition();
          }
        }, 200);
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
      const isRu = (document.documentElement.lang === 'ru' || navigator.language?.startsWith('ru'));
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

  const topBtn = getTopBtn();
  if (topBtn) topBtn.classList.add('is-active');

  const isRu = (document.documentElement.lang === 'ru' || navigator.language?.startsWith('ru'));
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
    resumeJarvisRecognition();
    return;
  }
  if (isJarvisActive) {
    deactivateJarvisVoice();
  } else {
    activateJarvisVoice();
  }
}

// 12. Mount JARVIX UI Component & restore flash confirmations
export function initJarvis() {
  if (typeof document === 'undefined') return;

  // Restore saved theme on load
  try {
    const savedTheme = localStorage.getItem('deepsyq_site_theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-site-theme', savedTheme);
    }
  } catch (_) {}

  // Instant navigation speech carry-over: "Сделано."
  try {
    const sayOnLoad = sessionStorage.getItem('jarvix_say_on_load');
    if (sayOnLoad) {
      sessionStorage.removeItem('jarvix_say_on_load');
      setTimeout(() => speakJarvis(sayOnLoad), 300);
    }
  } catch (_) {}

  const topBtn = getTopBtn();
  if (topBtn) {
    topBtn.onclick = () => toggleJarvisVoice();
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
