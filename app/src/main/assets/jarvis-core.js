// JARVIX AI Core v4.0 — Ambient Voice Butler (ChatGPT Voice Mode Style, Marvel Film Male Timbre & Total Voice Navigation)
import { detectIntent } from './home-experience.js';
import { saveStudioHandoff } from './studio-handoff.js';

const $ = id => document.getElementById(id);

let isJarvisActive = false;
let isJarvisSpeaking = false;
let isJarvisListening = false;
let jarvisRecognition = null;
let keepListening = false;
let cachedVoices = [];

// Cache available speech synthesis voices
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices() || [];
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  };
}

// Select deep, authoritative male voice resembling the film JARVIS
function getJarvixVoice(isRu) {
  if (!cachedVoices.length && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    cachedVoices = window.speechSynthesis.getVoices() || [];
  }
  if (!cachedVoices.length) return null;

  if (isRu) {
    // Russian male voices: Pavel, Dmitry, Aleksandr, Yuri, Maxim, Mikhail
    const maleRu = cachedVoices.find(v => v.lang.startsWith('ru') && /(?:pavel|dmitry|aleksandr|alexander|yuri|maxim|mikhail|male|муж)/i.test(v.name));
    if (maleRu) return maleRu;
    const anyRu = cachedVoices.find(v => v.lang.startsWith('ru'));
    if (anyRu) return anyRu;
  } else {
    // British / UK English male voices (Paul Bettany film JARVIS style)
    const ukMale = cachedVoices.find(v => (v.lang === 'en-GB' || v.lang.startsWith('en')) && /(?:george|oliver|arthur|daniel|ryan|male|guy|david)/i.test(v.name));
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

// 1. Text-to-Speech (Deep film-like male voice)
export function speakJarvis(text, onComplete = null) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }
  try {
    pauseJarvisRecognition();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const isRu = (document.documentElement.lang === 'ru' || navigator.language?.startsWith('ru'));
    utterance.lang = isRu ? 'ru-RU' : 'en-US';

    const chosenVoice = getJarvixVoice(isRu);
    if (chosenVoice) utterance.voice = chosenVoice;

    // Resonant, authoritative male pitch and clear cinematic rate
    utterance.pitch = 0.86;
    utterance.rate = 1.04;

    utterance.onstart = () => {
      isJarvisSpeaking = true;
      updateJarvisState('speaking');
    };

    const finish = () => {
      isJarvisSpeaking = false;
      if (typeof onComplete === 'function') {
        onComplete();
      } else if (isJarvisActive && keepListening) {
        // Automatic turn-taking loop (resumes listening without blocking UI)
        resumeJarvisRecognition();
      } else {
        updateJarvisState('idle');
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[JARVIX] Speech synthesis error:', err);
    if (typeof onComplete === 'function') onComplete();
  }
}

// 2. Perform On-Page Direct Action (hands and ears)
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

// 3. Process Live Voice Command in JARVIX (Hands, Eyes & Total Navigation)
export function handleJarvisVoiceCommand(commandText) {
  if (!commandText) return;
  const t = commandText.trim();
  const lower = t.toLowerCase();

  // A. DIRECT ACTIONS: Clear / Delete
  if (/(?:удали|очисти|сотри|clear|delete|remove)/i.test(lower) && /(?:это|текст|поле|промпт|всё|все|draft|prompt)?/i.test(lower)) {
    clearCurrentInputs();
    speakJarvis('Сделано. Очистил.');
    return;
  }

  // B. DIRECT ACTIONS: Scrolling
  if (/(?:прокрути|листай|скролл)?\s*(?:вниз|down)/i.test(lower)) {
    if (typeof window !== 'undefined') {
      window.scrollBy({ top: 550, behavior: 'smooth' });
    }
    speakJarvis('Сделано.');
    return;
  }

  if (/(?:прокрути|листай|скролл)?\s*(?:вверх|наверх|up)/i.test(lower)) {
    if (typeof window !== 'undefined') {
      window.scrollBy({ top: -550, behavior: 'smooth' });
    }
    speakJarvis('Сделано.');
    return;
  }

  // C. DIRECT ACTIONS: Video Play / Pause
  if (/(?:запусти|включи|пауза|останови|play|pause)\s*(?:видео|ролик|воспроизведение)?/i.test(lower)) {
    toggleMediaPlayback();
    speakJarvis('Сделано.');
    return;
  }

  // D. CREATION COMMANDS: "Создай музыку на тему...", "Создай видео...", "Создай фото..."
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

  // E. FAST NAVIGATION: All Site Sections
  if (/(?:открой|перейди|покажи|запусти)?\s*(?:видео|видео[\s-]?студи|ролик|video)/i.test(lower)) {
    speakJarvis('Открываю студию видео.', () => {
      location.assign('generate-studio.html?studio=video&from=jarvix');
    });
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:изображен|картинк|фото|рисун|image|photo)/i.test(lower)) {
    speakJarvis('Открываю студию изображений.', () => {
      location.assign('generate-studio.html?studio=image&from=jarvix');
    });
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:аудио|музык|песн|трек|audio|music)/i.test(lower)) {
    speakJarvis('Открываю студию аудио.', () => {
      location.assign('generate-studio.html?studio=audio&from=jarvix');
    });
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:агент|ai[\s-]?агент|agent)/i.test(lower)) {
    speakJarvis('Открываю сценарии AI-агентов.', () => {
      location.assign('ai-agents.html?from=jarvix');
    });
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:уникализатор|видеоуникализатор|uniquifier|vu)/i.test(lower)) {
    speakJarvis('Открываю Видеоуникализатор.', () => {
      location.assign('index.html');
    });
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:инструмент|everyday|tools)/i.test(lower)) {
    speakJarvis('Открываю Everyday Tools.', () => {
      location.assign('free-tools.html');
    });
    return;
  }

  if (/(?:открой|перейди|покажи)?\s*(?:холст|canvas)/i.test(lower)) {
    speakJarvis('Открываю холст Canvas.', () => {
      location.assign('canvas.html');
    });
    return;
  }

  if (/(?:открой|перейди|покажи)?\s*(?:шаблон|apps|ai[\s-]?apps)/i.test(lower)) {
    speakJarvis('Открываю шаблоны AI Apps.', () => {
      location.assign('ai-apps.html');
    });
    return;
  }

  if (/(?:открой|перейди)?\s*(?:тариф|цен|стоимост|подписк|pricing)/i.test(lower)) {
    speakJarvis('Открываю тарифы.', () => {
      location.assign('pricing.html');
    });
    return;
  }

  if (/(?:главн|домой|home)/i.test(lower)) {
    speakJarvis('Перехожу на главную страницу.', () => {
      location.assign('deepsyq.html');
    });
    return;
  }

  if (/(?:истори|мои работы|сохранен|assets|history)/i.test(lower)) {
    speakJarvis('Открываю историю генераций.', () => {
      location.assign('generate-studio.html?view=history');
    });
    return;
  }

  if (/(?:аватар|avatar)/i.test(lower)) {
    speakJarvis('Открываю Avatar Studio.', () => {
      location.assign('avatar-studio.html');
    });
    return;
  }

  if (/(?:суфлер|телесуфлер|teleprompter)/i.test(lower)) {
    speakJarvis('Открываю телесуфлер.', () => {
      location.assign('teleprompter.html');
    });
    return;
  }

  if (/(?:сожми видео|сжатие видео|compress video)/i.test(lower)) {
    speakJarvis('Открываю сжатие видео.', () => {
      location.assign('free-tools.html#compress-video');
    });
    return;
  }

  if (/(?:сожми фото|сжатие фото|compress photo)/i.test(lower)) {
    speakJarvis('Открываю сжатие фото.', () => {
      location.assign('free-tools.html#compress-photos');
    });
    return;
  }

  if (/(?:удали фон|удаление фона|background remover)/i.test(lower)) {
    speakJarvis('Открываю удаление фона.', () => {
      location.assign('simple-background-remover.html');
    });
    return;
  }

  if (/(?:контакт|поддержк|support|contact)/i.test(lower)) {
    speakJarvis('Открываю контакты.', () => {
      location.assign('contact.html');
    });
    return;
  }

  if (/(?:правил|услови|terms)/i.test(lower)) {
    speakJarvis('Открываю условия сервиса.', () => {
      location.assign('terms.html');
    });
    return;
  }

  // F. GREETING & GENERAL QUERY
  if (/(?:привет|здравствуй|hello|hi|как дела|кто ты|что умеешь|jarvix|jarvik|жарвикс|жарвик)/i.test(lower)) {
    const answer = 'Здравствуйте! Я JARVIX, ваш голосовой ассистент Deepsyq. Я могу открыть любую студию, запустить создание медиа, скроллить и очищать промпты по вашей команде. Что делаем?';
    speakJarvis(answer);
    return;
  }

  // Default fallback: execute with quick verbal confirmation
  speakJarvis(`Слушаю вас. Обрабатываю запрос: «${t}».`);
}

// 4. Speech Recognition Control (Pure Voice, Zero Text UI)
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
    jarvisRecognition.lang = (document.documentElement.lang === 'ru' || navigator.language?.startsWith('ru')) ? 'ru-RU' : 'en-US';

    jarvisRecognition.onstart = () => {
      isJarvisListening = true;
      updateJarvisState('listening');
    };

    let speechTimeout = null;
    let accumulatedText = '';

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
      if (current) {
        // Turn-taking pause detector: user paused speaking -> execute action!
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

// 5. Activation & Deactivation (Smart Conversational Memory)
export function activateJarvisVoice() {
  isJarvisActive = true;
  keepListening = true;

  const topBtn = getTopBtn();
  if (topBtn) topBtn.classList.add('is-active');

  const isRu = (document.documentElement.lang === 'ru' || navigator.language?.startsWith('ru'));
  const hasGreeted = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('jarvix_greeted') === '1';

  let greetingText = '';
  if (!hasGreeted) {
    // 1st time greeting: full cinematic introduction
    greetingText = isRu
      ? 'Здравствуйте! Я JARVIX. Готов к работе. Что откроем или создадим?'
      : 'Greetings! I am JARVIX. Online and ready. What shall we create or navigate?';
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

// 6. Mount JARVIX UI Component
export function initJarvis() {
  if (typeof document === 'undefined') return;

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
