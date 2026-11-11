/* JARVIX NEW: Conversational AI, Voice (STT & TTS), and Desktop Bridge.
 * No paid model APIs, completely zero spend for platform owner.
 */
const endpoint = 'http://127.0.0.1:8768';
const el = id => document.getElementById(id);

let key = '';
let mode = 'image';
let isRecognizing = false;
let recognition = null;
let voiceEnabled = true;

try {
  const savedVoice = localStorage.getItem('jarvix_new_voice_enabled');
  if (savedVoice !== null) voiceEnabled = savedVoice === 'true';
} catch (_) {}

const authorized = () => Boolean(key);
const status = message => { if (el('status')) el('status').textContent = message; };

const msg = (body, kind = 'system') => {
  const container = el('messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'msg' + (kind === 'user' ? ' user' : (kind === 'assistant' ? ' assistant' : ''));
  div.textContent = body;
  container.append(div);
  container.scrollTop = container.scrollHeight;
};

let typingNode = null;
function showTyping() {
  hideTyping();
  const container = el('messages');
  if (!container) return;
  typingNode = document.createElement('div');
  typingNode.className = 'msg assistant typing';
  typingNode.innerHTML = 'JARVIX думает<span class="dots"><span></span><span></span><span></span></span>';
  container.append(typingNode);
  container.scrollTop = container.scrollHeight;
}
function hideTyping() {
  if (typingNode) {
    typingNode.remove();
    typingNode = null;
  }
}

/* Local desktop bridge */
async function api(path, method = 'GET', payload = null) {
  const response = await fetch(endpoint + path, {
    method,
    mode: 'cors',
    targetAddressSpace: 'loopback',
    cache: 'no-store',
    headers: {
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: payload ? JSON.stringify(payload) : undefined
  });
  const body = await response.json();
  if (!response.ok) throw Error(body.error || 'Local bridge error');
  return body;
}

async function update() {
  const [report, list] = await Promise.all([api('/v1/report'), api('/v1/tasks')]);
  el('recent').replaceChildren();
  for (const job of list.tasks) {
    const li = document.createElement('li');
    li.textContent = job.kind + ' · ' + job.status + ' · ' + job.prompt;
    el('recent').append(li);
  }
  status('Связь работает. Заданий в журнале: ' + report.jobs_in_recent_window);
}

function setConnected(value) {
  if (el('refresh')) el('refresh').disabled = !value;
  if (el('connectionState')) el('connectionState').textContent = value ? 'ПОДКЛЮЧЁН' : 'НЕ ПОДКЛЮЧЁН';
}

/* Mode toggles */
document.querySelectorAll('button[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    document.querySelectorAll('button[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  });
});

const requestedMode = new URLSearchParams(location.search).get('mode');
const normalizedMode = requestedMode === 'audio' ? 'music' : requestedMode;
if (['chat', 'image', 'video', 'music'].includes(normalizedMode)) {
  const chosen = document.querySelector('button[data-mode="' + normalizedMode + '"]');
  if (chosen) chosen.click();
}

/* Prompt input & Send button state */
const promptEl = el('prompt');
const sendBtn = el('send');

function syncSendButton() {
  if (!sendBtn || !promptEl) return;
  sendBtn.disabled = !promptEl.value.trim();
}
if (promptEl) {
  promptEl.addEventListener('input', syncSendButton);
  promptEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) handleSend();
    }
  });
}

/* Voice Output (Speech Synthesis / TTS) */
const voiceBtn = el('voiceToggleBtn');
function syncVoiceBtn() {
  if (!voiceBtn) return;
  voiceBtn.setAttribute('aria-pressed', String(voiceEnabled));
  voiceBtn.textContent = voiceEnabled ? '🔊 Голос: ВКЛ' : '🔇 Голос: ВЫКЛ';
}
syncVoiceBtn();

if (voiceBtn) {
  voiceBtn.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    try { localStorage.setItem('jarvix_new_voice_enabled', String(voiceEnabled)); } catch (_) {}
    syncVoiceBtn();
    if (!voiceEnabled) stopSpeaking();
  });
}

function cleanSpeechText(text) {
  return String(text || '')
    .replace(/[*#_`~>\[\]\(\)]/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function speak(text) {
  if (!voiceEnabled || !('speechSynthesis' in window)) return;
  stopSpeaking();
  const clean = cleanSpeechText(text);
  if (!clean) return;

  const utterance = new SpeechSynthesisUtterance(clean);
  const isRu = /[а-яё]/i.test(clean);
  utterance.lang = isRu ? 'ru-RU' : 'en-US';
  utterance.rate = 1.05;

  const orb = el('heroOrb');
  utterance.onstart = () => { if (orb) orb.classList.add('is-speaking'); };
  utterance.onend = () => { if (orb) orb.classList.remove('is-speaking'); };
  utterance.onerror = () => { if (orb) orb.classList.remove('is-speaking'); };

  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length) {
    const match = voices.find(v => (isRu ? v.lang.startsWith('ru') : v.lang.startsWith('en')));
    if (match) utterance.voice = match;
  }

  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  const orb = el('heroOrb');
  if (orb) orb.classList.remove('is-speaking');
}

/* Voice Input (Microphone / STT) */
const micBtn = el('micBtn');
const micStatus = el('micStatusText');
const micBtnText = el('micBtnText');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function stopRecognition() {
  if (recognition) {
    try { recognition.stop(); } catch (_) {}
  }
  isRecognizing = false;
  if (micBtn) micBtn.classList.remove('recording');
  if (micBtnText) micBtnText.textContent = 'Микрофон';
  if (micStatus) micStatus.textContent = '';
}

if (micBtn) {
  if (!SpeechRecognition) {
    micBtn.disabled = true;
    micBtn.title = 'Голосовой ввод не поддерживается вашим браузером';
    if (micStatus) micStatus.textContent = 'Микрофон не поддерживается браузером';
  } else {
    micBtn.addEventListener('click', () => {
      if (isRecognizing) {
        stopRecognition();
        return;
      }

      stopSpeaking();

      try {
        recognition = new SpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onstart = () => {
          isRecognizing = true;
          micBtn.classList.add('recording');
          if (micBtnText) micBtnText.textContent = 'Остановить';
          if (micStatus) micStatus.textContent = 'Слушаю вас... Говорите';
        };

        recognition.onresult = event => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          if (promptEl) {
            promptEl.value = transcript;
            syncSendButton();
          }
          if (micStatus) micStatus.textContent = transcript.slice(0, 28) + (transcript.length > 28 ? '...' : '');
        };

        recognition.onerror = event => {
          stopRecognition();
          if (event.error === 'not-allowed') {
            if (micStatus) micStatus.textContent = 'Доступ к микрофону заблокирован';
          } else if (event.error !== 'no-speech') {
            if (micStatus) micStatus.textContent = 'Ошибка ввода: ' + event.error;
          }
        };

        recognition.onend = () => {
          stopRecognition();
        };

        recognition.start();
      } catch (err) {
        stopRecognition();
        if (micStatus) micStatus.textContent = 'Не удалось запустить микрофон';
      }
    });
  }
}

/* Fallback reply generator when server is offline */
function localSmartReply(text, taskMode) {
  const lower = String(text || '').toLowerCase();
  if (/привет|здравствуй|салют|добр|hello|hi/i.test(lower)) {
    return 'Привет! Я новый JARVIX NEW. Я умею общаться голосом, помогать формулировать промпты для генерации изображений, видео и музыки в DeepSyQ, а также передавать задания на твой ПК через локальное приложение!';
  }
  if (/кто ты|что ты умеешь|расскажи/i.test(lower)) {
    return 'Я JARVIX NEW — твой персональный AI-координатор на DeepSyQ. Я объединяю возможности чата, голосового управления и координации локальных творческих задач.';
  }
  if (/видео|video|ролик/i.test(lower)) {
    return 'Для создания отличного видео опиши сцену, динамику, движение камеры и освещение. Режим Video готов к работе!';
  }
  if (/картинк|изображени|фото|image|photo/i.test(lower)) {
    return 'Для генерации изображения в Image Studio укажи стиль, ключевой объект и композицию. Режим Image активен!';
  }
  if (/музык|аудио|трек|песн|music|audio/i.test(lower)) {
    return 'В Audio Studio можно сгенерировать музыкальный трек или саундтрек. Назови жанр и настроение!';
  }
  return `Принял твой запрос: "${text}". В режиме ${taskMode.toUpperCase()} я готов скоординировать его выполнение. Справа можно подключить локальное приложение JARVIX для обработки задач!`;
}

/* Send message handling */
async function handleSend() {
  const prompt = (promptEl ? promptEl.value : '').trim();
  if (!prompt) return;

  stopRecognition();
  stopSpeaking();

  msg(prompt, 'user');
  promptEl.value = '';
  syncSendButton();

  showTyping();

  // If local bridge is connected, record task locally
  if (authorized()) {
    try {
      const record = await api('/v1/tasks', 'POST', { kind: mode, prompt });
      status('Задание #' + record.id + ' передано в приложение на компьютере.');
      await update();
    } catch (_) {}
  }

  // Request AI chat response
  let replyText = '';
  try {
    const res = await fetch('/api/jarvix/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, mode, language: 'ru' }),
      signal: AbortSignal.timeout(12000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) replyText = data.reply;
    }
  } catch (_) {}

  hideTyping();

  if (!replyText) {
    replyText = localSmartReply(prompt, mode);
  }

  msg(replyText, 'assistant');
  speak(replyText);
}

if (sendBtn) {
  sendBtn.addEventListener('click', handleSend);
}

/* Pairing with desktop app */
el('pair').addEventListener('click', async () => {
  const token = el('pairing').value.trim();
  if (!token) {
    status('Вставь код подключения из приложения.');
    return;
  }
  key = token;
  el('pair').disabled = true;
  try {
    await update();
    setConnected(true);
    el('pairing').value = '';
    msg('Компьютер успешно подключён к JARVIX NEW! Теперь задания синхронизируются с локальным приложением.', 'system');
  } catch (e) {
    key = '';
    setConnected(false);
    status('Не удалось подключиться. Запусти JARVIX на ПК и проверь код.');
  } finally {
    el('pair').disabled = false;
  }
});

el('refresh').addEventListener('click', async () => {
  try {
    await update();
  } catch {
    setConnected(false);
    status('Связь с приложением потеряна. Проверь, запущено ли оно на ПК.');
  }
});

syncSendButton();
