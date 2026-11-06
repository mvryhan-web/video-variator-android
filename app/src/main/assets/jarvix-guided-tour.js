/**
 * JARVIX Interactive Guided Tour & Site Presentation (Cinematic Walkthrough)
 * - Upper right floating Pause/Stop controls
 * - Interactive sidebar opening and navigation showcase
 * - Video & Audio studio showcase
 * - Highlight and narration of Video Uniquifier (TikTok/Reels/Shorts deduplication)
 * - Pricing showcase (Plans 1-5, $0.99 trial, Pro, Lifetime)
 * - Tour completion memory in localStorage
 * - Seamless handoff to interactive voice assistant: "Я слушаю, что открыть?"
 */
import { applySiteTheme, getJarvixLanguage, speakJarvis, stopAllSpeech, updateJarvisState, resumeJarvisRecognition } from './jarvis-core.js';

let isTourRunning = false;
let isTourPaused = false;
let tourTimeouts = [];
let currentTourAudio = null;
let currentSpeechUtterance = null;
let tourBarEl = null;

export function isTourActive() {
  return isTourRunning;
}

function clearTourTimers() {
  for (const t of tourTimeouts) clearTimeout(t);
  tourTimeouts = [];
}

function highlightElement(selector, durationMs = 4000) {
  try {
    const els = document.querySelectorAll(selector);
    if (!els.length) return;
    els.forEach(el => el.classList.add('jarvis-tour-spotlight'));
    const t = setTimeout(() => {
      els.forEach(el => el.classList.remove('jarvis-tour-spotlight'));
    }, durationMs);
    tourTimeouts.push(t);
  } catch (_) {}
}

function openSidebar() {
  try {
    document.body.classList.remove('sidebar-collapsed');
    document.body.classList.add('menu-open');
    const menuBtn = document.getElementById('menu');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.inert = false;
  } catch (_) {}
}

function closeSidebar() {
  try {
    document.body.classList.remove('menu-open');
    const menuBtn = document.getElementById('menu');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
  } catch (_) {}
}

function createTourBar(lang = 'ru') {
  if (tourBarEl) {
    tourBarEl.remove();
    tourBarEl = null;
  }

  const isRu = lang === 'ru';
  const pauseLabel = isRu ? '⏸ Пауза' : '⏸ Pause';
  const stopLabel = isRu ? '⏹ Стоп' : '⏹ Stop';

  const bar = document.createElement('div');
  bar.id = 'jarvixTourBar';
  bar.className = 'jarvix-tour-bar';
  bar.style.cssText = 'position:fixed;top:14px;right:20px;z-index:99999;display:flex;gap:8px;align-items:center;background:rgba(8,13,29,0.92);border:1px solid rgba(0,229,255,0.45);border-radius:999px;padding:6px 14px;box-shadow:0 8px 32px rgba(0,0,0,0.7),0 0 16px rgba(0,229,255,0.25);backdrop-filter:blur(12px);font-family:Inter,system-ui,sans-serif;animation:dsTourBarFadeIn 0.3s ease;';

  bar.innerHTML = `
    <span style="font-size:12px;font-weight:700;letter-spacing:1px;color:#00e5ff;display:flex;align-items:center;gap:6px">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#00e5ff;box-shadow:0 0 8px #00e5ff;animation:dsTourPulse 1.2s infinite"></span>
      JARVIX TOUR
    </span>
    <button id="jarvixTourPauseBtn" type="button" style="cursor:pointer;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:20px;padding:5px 12px;font-size:12px;font-weight:600;min-height:30px;transition:all 0.2s">${pauseLabel}</button>
    <button id="jarvixTourStopBtn" type="button" style="cursor:pointer;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.5);color:#fca5a5;border-radius:20px;padding:5px 12px;font-size:12px;font-weight:600;min-height:30px;transition:all 0.2s">${stopLabel}</button>
  `;

  document.body.appendChild(bar);
  tourBarEl = bar;

  const pauseBtn = document.getElementById('jarvixTourPauseBtn');
  const stopBtn = document.getElementById('jarvixTourStopBtn');

  if (pauseBtn) {
    pauseBtn.onclick = () => {
      toggleTourPause(isRu);
    };
  }

  if (stopBtn) {
    stopBtn.onclick = () => {
      stopJarvixGuidedTour();
    };
  }
}

function removeTourBar() {
  if (tourBarEl) {
    tourBarEl.remove();
    tourBarEl = null;
  }
  isTourPaused = false;
}

function toggleTourPause(isRu = true) {
  const pauseBtn = document.getElementById('jarvixTourPauseBtn');
  if (!isTourPaused) {
    isTourPaused = true;
    if (pauseBtn) pauseBtn.textContent = isRu ? '▶ Продолжить' : '▶ Resume';
    if (currentTourAudio) {
      try { currentTourAudio.pause(); } catch (_) {}
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.pause(); } catch (_) {}
    }
    updateJarvisState('idle');
  } else {
    isTourPaused = false;
    if (pauseBtn) pauseBtn.textContent = isRu ? '⏸ Пауза' : '⏸ Pause';
    if (currentTourAudio) {
      try { currentTourAudio.play(); } catch (_) {}
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.resume(); } catch (_) {}
    }
    updateJarvisState('speaking');
  }
}

const TOUR_TEXTS = {
  ru: {
    intro: 'JARVIS на связи. Добро пожаловать в Deepsyq! Я ваш персональный голосовой ассистент и управляю всей платформой прямо с вашего голоса. Показываю возможности нашего интерфейса.',
    studio: 'Смотрите: в левом меню открывается Студия генерации. Здесь создаются кинематографичные видеоролики, реалистичные изображения и музыкальные треки с лучшими мировыми нейросетями.',
    uniquifier: 'Особая гордость платформы — Видеоуникализатор. Он защищает ваш контент от теневого бана в TikTok, Reels и Shorts, устраняет цифровые дубликаты и делает каждое видео на 100% уникальным для алгоритмов.',
    pricing: 'А здесь представлены наши тарифы: от пробного доступа за 0.99$ до безлимитного пожизненного тарифа. Выбирайте идеальный план под ваши задачи.',
    finish: 'Я готов к работе. Назовите любую команду или скажите, что открыть, и я сделаю всё за вас.'
  },
  en: {
    intro: 'JARVIS online. Welcome to Deepsyq! I am your personal AI companion, commanding video, imagery, audio, and navigation straight from your voice. Let me show you what we can do.',
    studio: 'Here in the navigation is our Creation Studio: produce cinematic videos, artwork, and music tracks powered by leading AI models in one unified space.',
    uniquifier: 'Our standout feature is the Video Uniquifier. It prevents shadowbans on TikTok, Reels, and Shorts, removes digital duplicate signatures, and makes every clip 100% unique for discovery algorithms.',
    pricing: 'Explore our flexible plans: starting from a $0.99 trial up to our lifetime unlimited tier. Pick what fits your workflow and create without boundaries.',
    finish: 'I am standing by. Name your command or tell me what to open, and I will handle it for you.'
  },
  fr: {
    intro: 'JARVIS en ligne. Bienvenue sur Deepsyq ! Je contrôle la vidéo, l'image, le son et ce site à la voix. Laissez-moi vous présenter la plateforme.',
    studio: 'Dans le menu se trouve le Studio de création : réalisez des vidéos cinématographiques, des images et des pistes audio avec les meilleures IA.',
    uniquifier: 'Notre fonctionnalité clé : l'Uniquiseur Vidéo. Il évite le shadowban sur TikTok, Reels et Shorts, supprime les empreintes dupliquées et rend chaque vidéo 100% unique.',
    pricing: 'Voici nos tarifs : de l'essai à 0.99$ jusqu'à la formule Lifetime illimitée.',
    finish: 'Je suis à votre écoute. Donnez votre commande vocale et je m'occupe de tout.'
  },
  es: {
    intro: 'JARVIS en línea. ¡Bienvenido a Deepsyq! Controlo video, imagen, audio y navegación con tu voz. Déjame guiarte por la plataforma.',
    studio: 'En el menú tienes el Estudio de creación: genera videos cinematográficos, imágenes y música con las mejores redes neuronales.',
    uniquifier: 'Nuestra función estrella: el Unificador de Video. Evita el shadowban en TikTok, Reels y Shorts, eliminando duplicados y haciéndolo 100% único.',
    pricing: 'Aquí están nuestros planes: desde la prueba de 0.99$ hasta acceso ilimitado Lifetime.',
    finish: 'Estoy listo. Dime qué quieres abrir o qué generar y lo haré al instante.'
  }
};

function playClipOrSpeak(clipName, textFallback, onComplete) {
  if (!isTourRunning) return;
  const lang = getJarvixLanguage();
  const suffix = (lang === 'en' || lang === 'fr' || lang === 'es') ? `_${lang}` : '';
  const filename = `${clipName}${suffix}.mp3`;
  const clipUrl = `media/jarvix/clips/${filename}`;

  const audio = new Audio(clipUrl);
  currentTourAudio = audio;

  let hasEnded = false;
  const finish = () => {
    if (hasEnded) return;
    hasEnded = true;
    currentTourAudio = null;
    if (isTourRunning && typeof onComplete === 'function') {
      onComplete();
    }
  };

  audio.onplay = () => {
    if (!isTourRunning) {
      audio.pause();
      return;
    }
    updateJarvisState('speaking');
  };

  audio.onended = finish;
  audio.onerror = () => {
    currentTourAudio = null;
    if (!isTourRunning) return;
    speakJarvis(textFallback, finish);
  };

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      currentTourAudio = null;
      if (!isTourRunning) return;
      speakJarvis(textFallback, finish);
    });
  }
}

export function startJarvixGuidedTour() {
  if (isTourRunning) return;
  isTourRunning = true;
  isTourPaused = false;
  clearTourTimers();
  stopAllSpeech();

  const lang = getJarvixLanguage();
  const texts = TOUR_TEXTS[lang] || TOUR_TEXTS.en;

  // Render top right pause/stop controls
  createTourBar(lang);

  // Step 1: Open sidebar menu during greeting to showcase navigation
  openSidebar();
  highlightElement('#sidebar, #menu', 5000);

  playClipOrSpeak('jarvix_tour_intro', texts.intro, () => {
    if (!isTourRunning) return;

    // Step 2: Showcase Studio (Video & Audio)
    highlightElement('a[href*="generate-studio"], .sidebar a[href*="generate-studio"]', 6000);

    playClipOrSpeak('jarvix_tour_nav', texts.studio, () => {
      if (!isTourRunning) return;

      // Step 3: Highlight and showcase Video Uniquifier
      highlightElement('a[href="index.html"], .sidebar a[href="index.html"]', 7000);

      speakJarvis(texts.uniquifier, () => {
        if (!isTourRunning) return;

        // Step 4: Showcase Pricing
        closeSidebar();
        highlightElement('#topPricing, a[href*="pricing"], .price-card', 6000);

        // Smooth scroll toward pricing if present on page
        const pricingSection = document.getElementById('pricing') || document.querySelector('.pricing-section, .pricing-grid, #pricingPreview');
        if (pricingSection) {
          try { pricingSection.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
        }

        speakJarvis(texts.pricing, () => {
          if (!isTourRunning) return;

          // Step 5: Finish tour, save memory, activate voice listening
          speakJarvis(texts.finish, () => {
            if (!isTourRunning) return;
            isTourRunning = false;
            removeTourBar();
            try {
              localStorage.setItem('deepsyq_tour_completed', 'true');
            } catch (_) {}

            updateJarvisState('listening');
            resumeJarvisRecognition();
          });
        });
      });
    });
  });
}

export function stopJarvixGuidedTour() {
  isTourRunning = false;
  isTourPaused = false;
  clearTourTimers();
  removeTourBar();
  closeSidebar();
  if (currentTourAudio) {
    try {
      currentTourAudio.pause();
      currentTourAudio.currentTime = 0;
    } catch (_) {}
    currentTourAudio = null;
  }
  stopAllSpeech();
  document.querySelectorAll('.jarvis-tour-spotlight').forEach(el => el.classList.remove('jarvis-tour-spotlight'));
  try {
    localStorage.setItem('deepsyq_tour_completed', 'true');
  } catch (_) {}
}

// Global escape key handler
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isTourRunning) {
      stopJarvixGuidedTour();
    }
  });
}
