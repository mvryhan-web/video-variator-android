// JARVIX AI Core v5.0 — Ambient Marvel Voice Butler & Cinematic Voice Companion
// Deep Male Voice, Smart Memory, Theme/Lighting Controls, Sitewide Multilingual & Total Hands/Ears Navigation
import { detectIntent } from './home-experience.js';
import { saveStudioHandoff } from './studio-handoff.js';

const $ = id => document.getElementById(id);

let isJarvisActive = false;
let isJarvisSpeaking = false;
let isJarvisListening = false;
let jarvisRecognition = null;
let keepListening = false;
let silenceTimer = null;
const SILENCE_TIMEOUT_MS = 45000; // 45 seconds of silence before polite auto-standby

// 1. Male Voice Engine: Deep, authoritative masculine timbre resembling film JARVIS
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
    // Russian male voices: Dmitry (Natural), Pavel, Aleksandr, Maxim, Yuri, Mikhail, Boris, male
    const maleRu = cachedVoices.find(v => v.lang.startsWith('ru') && /(?:dmitry|дмитрий|pavel|павел|aleksandr|alexander|александр|maxim|максим|yuri|юрий|mikhail|михаил|boris|борис|male|муж)/i.test(v.name + ' ' + (v.voiceURI || '')));
    if (maleRu) return maleRu;
    const anyRu = cachedVoices.find(v => v.lang.startsWith('ru'));
    if (anyRu) return anyRu;
  } else {
    // British / UK English male voices (Paul Bettany film JARVIS style)
    const ukMale = cachedVoices.find(v => (v.lang === 'en-GB' || v.lang.startsWith('en')) && /(?:george|ryan|oliver|arthur|daniel|male|guy|david|brian)/i.test(v.name + ' ' + (v.voiceURI || '')));
    if (ukMale) return ukMale;
    const anyEn = cachedVoices.find(v => v.lang.startsWith('en'));
    if (anyEn) return anyEn;
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

// 2. Text-to-Speech (Deep Film Male Timbre)
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

    const chosenVoice = getJarvixVoice(isRu);
    if (chosenVoice) utterance.voice = chosenVoice;

    // Resonant deep masculine pitch (0.76 produces a distinguished, film-like male tone)
    utterance.pitch = 0.76;
    utterance.rate = 1.02;

    utterance.onstart = () => {
      isJarvisSpeaking = true;
      updateJarvisState('speaking');
    };

    const finish = () => {
      isJarvisSpeaking = false;
      if (typeof onComplete === 'function') {
        onComplete();
      } else if (isJarvisActive && keepListening) {
        // Automatic turn-taking loop: return to listening
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

// 3. Dynamic Theme & Lighting Voice Controller
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

// 4. Sitewide Language Controller
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

// 5. On-Page Hands Actions: Clear, Scroll, Video Play
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

function toggleMediaPlayback() {
  const playBtn = $('homeHeroPlay');
  if (playBtn) {
    playBtn.click();
    return true;
  }
  const video = document.querySelector('video');
  if (video) {
    if (video.paused) video.play();
    else video.pause();
    return true;
  }
  return false;
}

// 6. Process Live Voice Command in JARVIX
export function handleJarvisVoiceCommand(commandText) {
  if (!commandText) return;
  const t = commandText.trim();
  const lower = t.toLowerCase();
  resetSilenceTimer();

  // A. THEME & LIGHTING COMMANDS ("Сделай посветлее", "Потемнее", "Неоновый", "Золотой")
  if (/(?:посветлее|светлая тема|светлее|включи свет|light theme|brighter)/i.test(lower)) {
    applySiteTheme('light');
    speakJarvis('Сделано. Сделал освещение сайта ярким и светлым.');
    return;
  }

  if (/(?:потемнее|темная тема|темнее|ночной режим|выключи свет|dark theme|darker|midnight)/i.test(lower)) {
    applySiteTheme('midnight');
    speakJarvis('Сделано. Переключил на глубокую ночную тему.');
    return;
  }

  if (/(?:неонов|киберпанк|neon|cyberpunk)/i.test(lower)) {
    applySiteTheme('neon');
    speakJarvis('Сделано. Активировал неоновый киберпанк.');
    return;
  }

  if (/(?:золот|люкс|gold|luxury)/i.test(lower)) {
    applySiteTheme('gold');
    speakJarvis('Сделано. Включил премиальный золотой стиль.');
    return;
  }

  if (/(?:стандартн|обычн|сбрось тему|default theme)/i.test(lower)) {
    applySiteTheme('');
    speakJarvis('Сделано. Вернул стандартное оформление.');
    return;
  }

  // B. MULTILINGUAL SWITCHING ("Переключи на английский", "На русский", "На французский")
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

  // C. DIRECT ACTIONS: Clear / Delete
  if (/(?:удали|очисти|сотри|clear|delete|remove)/i.test(lower)) {
    clearCurrentInputs();
    speakJarvis('Сделано. Очистил.');
    return;
  }

  // D. DIRECT ACTIONS: Scrolling
  if (/(?:прокрути|листай|скролл)?\s*(?:вниз|down)/i.test(lower)) {
    if (typeof window !== 'undefined') window.scrollBy({ top: 550, behavior: 'smooth' });
    speakJarvis('Сделано.');
    return;
  }

  if (/(?:прокрути|листай|скролл)?\s*(?:вверх|наверх|up)/i.test(lower)) {
    if (typeof window !== 'undefined') window.scrollBy({ top: -550, behavior: 'smooth' });
    speakJarvis('Сделано.');
    return;
  }

  // E. DIRECT ACTIONS: Video Play / Pause
  if (/(?:запусти|включи|пауза|останови|play|pause)\s*(?:видео|ролик)?/i.test(lower)) {
    toggleMediaPlayback();
    speakJarvis('Сделано.');
    return;
  }

  // F. FAST GENERATION & HANDOFF ("Создай музыку на тему рок", "Создай видео про космос")
  if (/(?:создай|сделай|нарисуй|напиши|сгенерируй|create|generate|make)/i.test(lower)) {
    let cleanPrompt = t
      .replace(/^(?:создай|сделай|нарисуй|напиши|сгенерируй|create|generate|make)\s*(?:мне|нам)?\s*/i, '')
      .replace(/^(?:музыку|аудио|песню|трек|текст|видео|ролик|картинку|фото|изображение)\s*(?:на тему|в стиле|про|о)?\s*/i, '')
      .trim();
    if (!cleanPrompt) cleanPrompt = t;

    if (/(?:музык|аудио|песн|трек|рок|джаз|рэп|sound|audio|music|song)/i.test(lower)) {
      speakJarvis('Сделано. Загружаю аудио студию с вашей композицией.', async () => {
        try {
          await saveStudioHandoff({ kind: 'audio', prompt: cleanPrompt, settings: {}, source: 'jarvix-voice' });
        } catch (_) {}
        location.assign('generate-studio.html?studio=audio&from=jarvix');
      });
      return;
    }

    if (/(?:видео|ролик|фильм|клип|video)/i.test(lower)) {
      speakJarvis('Сделано. Открываю видео студию с вашим запросом.', async () => {
        try {
          await saveStudioHandoff({ kind: 'video', prompt: cleanPrompt, settings: {}, source: 'jarvix-voice' });
        } catch (_) {}
        location.assign('generate-studio.html?studio=video&from=jarvix');
      });
      return;
    }

    // Default creative intent -> image
    speakJarvis('Сделано. Открываю студию изображений с вашим промптом.', async () => {
      try {
        await saveStudioHandoff({ kind: 'image', prompt: cleanPrompt, settings: {}, source: 'jarvix-voice' });
      } catch (_) {}
      location.assign('generate-studio.html?studio=image&from=jarvix');
    });
    return;
  }

  // G. TOTAL SITE NAVIGATION: Fast Routing across all pages
  if (/(?:открой|перейди|покажи|запусти)?\s*(?:видео|видео[\s-]?студи|ролик|video)/i.test(lower)) {
    speakJarvis('Открываю студию видео.', () => { location.assign('generate-studio.html?studio=video&from=jarvix'); });
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:изображен|картинк|фото|рисун|image|photo)/i.test(lower)) {
    speakJarvis('Открываю студию изображений.', () => { location.assign('generate-studio.html?studio=image&from=jarvix'); });
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:аудио|музык|песн|трек|audio|music)/i.test(lower)) {
    speakJarvis('Открываю студию аудио.', () => { location.assign('generate-studio.html?studio=audio&from=jarvix'); });
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:агент|ai[\s-]?агент|agent)/i.test(lower)) {
    speakJarvis('Открываю сценарии AI-агентов.', () => { location.assign('ai-agents.html?from=jarvix'); });
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:уникализатор|видеоуникализатор|uniquifier|vu)/i.test(lower)) {
    speakJarvis('Открываю Видеоуникализатор.', () => { location.assign('index.html'); });
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:инструмент|everyday|tools)/i.test(lower)) {
    speakJarvis('Открываю Everyday Tools.', () => { location.assign('free-tools.html'); });
    return;
  }

  if (/(?:открой|перейди|покажи)?\s*(?:холст|canvas)/i.test(lower)) {
    speakJarvis('Открываю холст Canvas.', () => { location.assign('canvas.html'); });
    return;
  }

  if (/(?:открой|перейди|покажи)?\s*(?:шаблон|apps|ai[\s-]?apps)/i.test(lower)) {
    speakJarvis('Открываю шаблоны AI Apps.', () => { location.assign('ai-apps.html'); });
    return;
  }

  if (/(?:открой|перейди)?\s*(?:тариф|цен|стоимост|подписк|pricing)/i.test(lower)) {
    speakJarvis('Открываю тарифы.', () => { location.assign('pricing.html'); });
    return;
  }

  if (/(?:главн|домой|home)/i.test(lower)) {
    speakJarvis('Перехожу на главную страницу.', () => { location.assign('deepsyq.html'); });
    return;
  }

  if (/(?:истори|мои работы|сохранен|assets|history)/i.test(lower)) {
    speakJarvis('Открываю историю генераций.', () => { location.assign('generate-studio.html?view=history'); });
    return;
  }

  if (/(?:аватар|avatar)/i.test(lower)) {
    speakJarvis('Открываю Avatar Studio.', () => { location.assign('avatar-studio.html'); });
    return;
  }

  if (/(?:суфлер|телесуфлер|teleprompter)/i.test(lower)) {
    speakJarvis('Открываю телесуфлер.', () => { location.assign('teleprompter.html'); });
    return;
  }

  if (/(?:сожми видео|сжатие видео|compress video)/i.test(lower)) {
    speakJarvis('Открываю сжатие видео.', () => { location.assign('free-tools.html#compress-video'); });
    return;
  }

  if (/(?:сожми фото|сжатие фото|compress photo)/i.test(lower)) {
    speakJarvis('Открываю сжатие фото.', () => { location.assign('free-tools.html#compress-photos'); });
    return;
  }

  if (/(?:удали фон|удаление фона|background remover)/i.test(lower)) {
    speakJarvis('Открываю удаление фона.', () => { location.assign('simple-background-remover.html'); });
    return;
  }

  if (/(?:контакт|поддержк|support|contact)/i.test(lower)) {
    speakJarvis('Открываю контакты.', () => { location.assign('contact.html'); });
    return;
  }

  if (/(?:правил|услови|terms)/i.test(lower)) {
    speakJarvis('Открываю условия сервиса.', () => { location.assign('terms.html'); });
    return;
  }

  // H. GREETINGS & WHO ARE YOU
  if (/(?:привет|здравствуй|hello|hi|как дела|кто ты|что умеешь|jarvix|jarvik|жарвикс|жарвик)/i.test(lower)) {
    const answer = 'Здравствуйте! Я JARVIX, ваш голосовой ассистент Deepsyq. Могу менять освещение и дизайн сайта, открывать любые разделы и создавать медиа по голосу. Чем займёмся?';
    speakJarvis(answer);
    return;
  }

  speakJarvis(`Слушаю вас. Обрабатываю: «${t}».`);
}

// 7. Speech Recognition Control (Pure Voice Loop)
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
        }, 1100);
      }
    };

    jarvisRecognition.onend = () => {
      if (isJarvisActive && keepListening && !isJarvisSpeaking) {
        setTimeout(() => {
          if (isJarvisActive && keepListening && !isJarvisSpeaking) {
            resumeJarvisRecognition();
          }
        }, 250);
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

// 8. Silence Timer: Polite auto-standby after silence
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

// 9. Activation & Deactivation (Smart Conversational Memory)
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
    // 2nd and subsequent clicks: smart, attentive butler response
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

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  pauseJarvisRecognition();

  const topBtn = getTopBtn();
  if (topBtn) {
    topBtn.classList.remove('is-active', 'is-speaking', 'is-listening');
  }
}

export function toggleJarvisVoice() {
  if (isJarvisActive) {
    deactivateJarvisVoice();
  } else {
    activateJarvisVoice();
  }
}

// 10. Mount JARVIX UI Component & restore saved theme
export function initJarvis() {
  if (typeof document === 'undefined') return;

  // Restore saved theme on load
  try {
    const savedTheme = localStorage.getItem('deepsyq_site_theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-site-theme', savedTheme);
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
