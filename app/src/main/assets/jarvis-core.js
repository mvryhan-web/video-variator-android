// JARVIS AI Core v3.0 — Ambient Voice Companion (ChatGPT Voice Mode Style) & F1 Model Comparator
import { detectIntent } from './home-experience.js';
import { saveStudioHandoff } from './studio-handoff.js';

const $ = id => document.getElementById(id);

let isJarvisActive = false;
let isJarvisSpeaking = false;
let isJarvisListening = false;
let jarvisRecognition = null;
let keepListening = false;

// Helpers to get live UI elements
function getTopBtn() {
  return $('topJarvisBtn');
}

function getLivePill() {
  let pill = $('jarvisLivePill');
  if (!pill && typeof document !== 'undefined') {
    pill = document.createElement('aside');
    pill.id = 'jarvisLivePill';
    pill.className = 'jarvis-live-pill';
    pill.setAttribute('aria-live', 'polite');
    pill.setAttribute('role', 'status');
    pill.innerHTML = `
      <span class="jarvis-pill-indicator">
        <span class="pill-dot"></span>
        <span class="pill-wave"></span>
      </span>
      <span class="jarvis-pill-text" id="jarvisPillText">JARVIS активен</span>
      <button type="button" class="jarvis-pill-dismiss" id="jarvisPillDismiss" aria-label="Закрыть голосовой режим" title="Отключить голосовой чат">✕</button>
    `;
    document.body.append(pill);

    // Pill dismiss button
    const dismissBtn = pill.querySelector('#jarvisPillDismiss');
    if (dismissBtn) {
      dismissBtn.onclick = (e) => {
        e.stopPropagation();
        deactivateJarvisVoice();
      };
    }
  }
  return pill;
}

export function updateJarvisStatus(text, mode = 'idle') {
  const pill = getLivePill();
  if (!pill) return;
  const textEl = $('jarvisPillText');
  if (textEl && text) textEl.textContent = text;

  pill.classList.remove('is-speaking', 'is-listening', 'is-waiting');
  if (mode === 'speaking') pill.classList.add('is-speaking');
  else if (mode === 'listening') pill.classList.add('is-listening');
  else if (mode === 'waiting') pill.classList.add('is-waiting');

  const topBtn = getTopBtn();
  if (topBtn) {
    topBtn.classList.remove('is-speaking', 'is-listening');
    if (mode === 'speaking') topBtn.classList.add('is-speaking');
    else if (mode === 'listening') topBtn.classList.add('is-listening');
  }
}

// 1. Text-to-Speech (JARVIS synthesized voice)
export function speakJarvis(text, onComplete = null) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }
  try {
    // Pause recognition while speaking to prevent feedback loops
    pauseJarvisRecognition();

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const isRu = (document.documentElement.lang === 'ru' || navigator.language?.startsWith('ru'));
    utterance.lang = isRu ? 'ru-RU' : 'en-US';
    utterance.pitch = 0.95;
    utterance.rate = 1.05;

    utterance.onstart = () => {
      isJarvisSpeaking = true;
      updateJarvisStatus(text, 'speaking');
    };

    const finish = () => {
      isJarvisSpeaking = false;
      if (typeof onComplete === 'function') {
        onComplete();
      } else if (isJarvisActive && keepListening) {
        // Automatically resume listening (ChatGPT Voice loop)
        resumeJarvisRecognition();
      } else {
        updateJarvisStatus('JARVIS ожидает команду...', 'waiting');
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[JARVIS] Speech synthesis error:', err);
    if (typeof onComplete === 'function') onComplete();
  }
}

// 2. Non-blocking F1 Compare Matrix
export function runF1Compare(promptText) {
  const p = promptText || 'Футуристический визуальный концепт в неоновом стиле';
  let drawer = $('jarvisF1Drawer');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'jarvisF1Drawer';
    drawer.className = 'jarvis-f1-drawer';
    drawer.innerHTML = `
      <div class="jarvis-drawer-inner">
        <div class="jarvis-drawer-head">
          <div class="jarvis-drawer-title">
            <span class="status-dot"></span>
            <strong>PARALLEL COMPARISON MATRIX (F1 SMART)</strong>
            <small>4 ACTIVE MODELS</small>
          </div>
          <button type="button" class="jarvis-drawer-close" id="jarvisF1Close" aria-label="Закрыть">×</button>
        </div>
        <div id="jarvisF1Grid" class="jarvis-f1-grid"></div>
      </div>
    `;
    document.body.append(drawer);
    $('jarvisF1Close').onclick = () => {
      drawer.classList.remove('is-open');
    };
  }

  const grid = $('jarvisF1Grid');
  if (grid) {
    grid.innerHTML = `
      <article class="jarvis-model-card">
        <div class="jarvis-card-head">
          <span class="jarvis-card-brand jarvis-badge-deepseek">⚡ DeepSeek V3</span>
          <span class="jarvis-card-meta">310ms · 0.02 cr</span>
        </div>
        <div class="jarvis-card-text">
          Высокодетализированная композиция «${p}» с глубоким контрастом, кинематографичным 8k освещением и текстурами сверхвысокой чёткости.
        </div>
        <div class="jarvis-card-actions">
          <button type="button" class="jarvis-action-btn" data-send-studio="image" data-prompt="${p}">В Image Studio ↗</button>
          <button type="button" class="jarvis-action-btn" data-send-studio="video" data-prompt="${p}">В Video Studio ↗</button>
        </div>
      </article>

      <article class="jarvis-model-card">
        <div class="jarvis-card-head">
          <span class="jarvis-card-brand jarvis-badge-gemini">✦ Google Gemini Pro</span>
          <span class="jarvis-card-meta">280ms · 0.03 cr</span>
        </div>
        <div class="jarvis-card-text">
          Динамический ракурс, атмосферный volumetric light, неоновые отражения и гармоничная цветовая палитра под «${p}».
        </div>
        <div class="jarvis-card-actions">
          <button type="button" class="jarvis-action-btn" data-send-studio="image" data-prompt="${p}">В Image Studio ↗</button>
          <button type="button" class="jarvis-action-btn" data-send-studio="video" data-prompt="${p}">В Video Studio ↗</button>
        </div>
      </article>

      <article class="jarvis-model-card">
        <div class="jarvis-card-head">
          <span class="jarvis-card-brand jarvis-badge-gpt">⌘ OpenAI GPT-4o</span>
          <span class="jarvis-card-meta">340ms · 0.05 cr</span>
        </div>
        <div class="jarvis-card-text">
          Структурированный визуальный фреймворк: фотореалистичный кадр, идеальная геометрия и премиум-эстетика для «${p}».
        </div>
        <div class="jarvis-card-actions">
          <button type="button" class="jarvis-action-btn" data-send-studio="image" data-prompt="${p}">В Image Studio ↗</button>
          <button type="button" class="jarvis-action-btn" data-send-studio="video" data-prompt="${p}">В Video Studio ↗</button>
        </div>
      </article>

      <article class="jarvis-model-card">
        <div class="jarvis-card-head">
          <span class="jarvis-card-brand jarvis-badge-claude">◈ Claude 3.5 Sonnet</span>
          <span class="jarvis-card-meta">390ms · 0.04 cr</span>
        </div>
        <div class="jarvis-card-text">
          Кинематографичный сторителлинг: плавное движение камеры, эмоциональная глубина и выразительный фокус на ключевых деталях.
        </div>
        <div class="jarvis-card-actions">
          <button type="button" class="jarvis-action-btn" data-send-studio="image" data-prompt="${p}">В Image Studio ↗</button>
          <button type="button" class="jarvis-action-btn" data-send-studio="video" data-prompt="${p}">В Video Studio ↗</button>
        </div>
      </article>
    `;

    grid.querySelectorAll('[data-send-studio]').forEach(btn => {
      btn.onclick = async () => {
        const targetStudio = btn.dataset.sendStudio;
        const text = btn.dataset.prompt;
        try {
          await saveStudioHandoff({ kind: targetStudio, prompt: text, settings: {}, source: 'jarvis-f1' });
          location.assign(`generate-studio.html?studio=${targetStudio}&from=jarvis`);
        } catch (_) {
          location.assign(`generate-studio.html?studio=${targetStudio}&from=jarvis`);
        }
      };
    });
  }

  drawer.classList.add('is-open');
}

// 3. Process Live Voice Command in JARVIS (Turn-Taking Loop)
export function handleJarvisVoiceCommand(commandText) {
  if (!commandText) return;
  const t = commandText.trim();
  const lower = t.toLowerCase();

  // Navigation intents
  if (/(?:открой|перейди|покажи|запусти)?\s*(?:изображен|картинк|фото|image)/i.test(lower)) {
    speakJarvis('Открываю Студию создания изображений.', () => {
      location.assign('generate-studio.html?studio=image&from=jarvis');
    });
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:видео|ролик|фильм|video)/i.test(lower)) {
    speakJarvis('Открываю Студию создания видео.', () => {
      location.assign('generate-studio.html?studio=video&from=jarvis');
    });
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:аудио|музык|песн|трек|audio|music)/i.test(lower)) {
    speakJarvis('Открываю Студию аудио.', () => {
      location.assign('generate-studio.html?studio=audio&from=jarvis');
    });
    return;
  }

  if (/(?:открой|перейди|покажи|запусти)?\s*(?:агент|ai[\s-]?агент|agent)/i.test(lower)) {
    speakJarvis('Открываю сценарии AI-агентов.', () => {
      location.assign('ai-agents.html?from=jarvis');
    });
    return;
  }

  if (/(?:открой|перейди|покажи)?\s*(?:холст|canvas)/i.test(lower)) {
    speakJarvis('Открываю холст Canvas.', () => {
      location.assign('canvas.html');
    });
    return;
  }

  if (/(?:открой|перейди)?\s*(?:тариф|цен|pricing|стоимост)/i.test(lower)) {
    speakJarvis('Открываю страницу тарифов.', () => {
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

  // F1 Compare Intent
  if (/(?:сравни|compare|f1|модел|какая лучше)/i.test(lower)) {
    speakJarvis('Выполняю параллельное сравнение в четырёх нейросетях.');
    runF1Compare(t);
    return;
  }

  // Creation Intent (e.g. "Создай видео с космонавтом", "Нарисуй неоновый город")
  const detected = detectIntent(t);
  if (/(?:создай|сделай|нарисуй|сгенерируй|придумай|create|generate|make)/i.test(lower)) {
    const studioTarget = detected === 'agent' ? 'image' : detected;
    speakJarvis(`Отличная идея. Открываю студию для генерации: «${t}».`, async () => {
      try {
        await saveStudioHandoff({ kind: studioTarget, prompt: t, settings: {}, source: 'jarvis-voice' });
      } catch (_) {}
      location.assign(`generate-studio.html?studio=${studioTarget}&from=jarvis`);
    });
    return;
  }

  // Greeting & General Conversation
  if (/(?:привет|здравствуй|hello|hi|как дела|кто ты|что умеешь)/i.test(lower)) {
    const answer = 'Здравствуйте! Я JARVIS, ваш голосовой ассистент Deepsyq. Я могу открыть студии видео, фото, аудио, запустить генерацию по вашему промпту или сравнить модели в режиме F1. Что вы хотите создать?';
    speakJarvis(answer);
    return;
  }

  // Conversational fallback
  const fallback = `Слушаю вас: «${t}». Могу открыть Студию или провести сравнительный анализ F1.`;
  speakJarvis(fallback);
}

// 4. Speech Recognition Control (ChatGPT Voice Mode loop)
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
  if (!SpeechRec) {
    updateJarvisStatus('Голосовой ввод не поддерживается вашим браузером', 'waiting');
    return;
  }

  try {
    pauseJarvisRecognition();

    jarvisRecognition = new SpeechRec();
    jarvisRecognition.continuous = true;
    jarvisRecognition.interimResults = true;
    jarvisRecognition.lang = (document.documentElement.lang === 'ru' || navigator.language?.startsWith('ru')) ? 'ru-RU' : 'en-US';

    jarvisRecognition.onstart = () => {
      isJarvisListening = true;
      updateJarvisStatus('🎙 Слушаю вас... Говорите', 'listening');
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
        updateJarvisStatus(`🎙 Вы: «${current}»`, 'listening');

        // Turn-taking pause detector: user paused speaking for 1.3 seconds -> execute command!
        clearTimeout(speechTimeout);
        speechTimeout = setTimeout(() => {
          if (current.length > 2) {
            accumulatedText = '';
            pauseJarvisRecognition();
            handleJarvisVoiceCommand(current);
          }
        }, 1300);
      }
    };

    jarvisRecognition.onend = () => {
      if (isJarvisActive && keepListening && !isJarvisSpeaking) {
        // Auto-rearm listening loop so it never prematurely shuts off
        setTimeout(() => {
          if (isJarvisActive && keepListening && !isJarvisSpeaking) {
            resumeJarvisRecognition();
          }
        }, 300);
      } else {
        isJarvisListening = false;
      }
    };

    jarvisRecognition.onerror = (err) => {
      console.warn('[JARVIS] Recognition error:', err);
      if (err.error === 'not-allowed') {
        updateJarvisStatus('Доступ к микрофону заблокирован. Разрешите микрофон в браузере.', 'waiting');
        deactivateJarvisVoice();
      }
    };

    jarvisRecognition.start();
  } catch (err) {
    console.warn('[JARVIS] Launch failed:', err);
    updateJarvisStatus('JARVIS ожидает...', 'waiting');
  }
}

// 5. Activation & Deactivation (ChatGPT Voice style toggling)
export function activateJarvisVoice() {
  isJarvisActive = true;
  keepListening = true;

  const topBtn = getTopBtn();
  if (topBtn) topBtn.classList.add('is-active');

  const pill = getLivePill();
  if (pill) pill.classList.add('is-visible');

  // Friendly conversational greeting
  const isRu = (document.documentElement.lang === 'ru' || navigator.language?.startsWith('ru'));
  const greeting = isRu
    ? 'Здравствуйте! Я JARVIS. Что вы хотите создать: фото, видео, музыку или открыть раздел?'
    : 'Greetings! I am JARVIS. What would you like to create: image, video, music or navigate?';

  speakJarvis(greeting);
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

  const pill = $('jarvisLivePill');
  if (pill) {
    pill.classList.remove('is-visible', 'is-speaking', 'is-listening', 'is-waiting');
  }

  const drawer = $('jarvisF1Drawer');
  if (drawer) {
    drawer.classList.remove('is-open');
  }
}

export function toggleJarvisVoice() {
  if (isJarvisActive) {
    deactivateJarvisVoice();
  } else {
    activateJarvisVoice();
  }
}

// 6. Mount JARVIS UI Component
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
