/**
 * JARVIX Interactive Guided Tour & Site Presentation (Cinematic Voice Walkthrough)
 * 1. Option 4 Voice Introduction (Film style, no robotic text frames)
 * 2. Dynamic Live Theme switching (Light, Dark, Neon Cyberpunk, Festive New Year!)
 * 3. Navigation & Studio Showcase
 * 4. Closing call-to-action & Voice Mic Activation
 */
import { applySiteTheme, getJarvixLanguage, speakJarvis, stopAllSpeech, updateJarvisState, resumeJarvisRecognition } from './jarvis-core.js';

let isTourRunning = false;
let tourTimeouts = [];
let currentTourAudio = null;

export function isTourActive() {
  return isTourRunning;
}

function clearTourTimers() {
  for (const t of tourTimeouts) clearTimeout(t);
  tourTimeouts = [];
}

function highlightElement(selector, durationMs = 3500) {
  try {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add('jarvis-tour-spotlight');
    const t = setTimeout(() => {
      el.classList.remove('jarvis-tour-spotlight');
    }, durationMs);
    tourTimeouts.push(t);
  } catch (_) {}
}

const TOUR_TEXTS = {
  ru: {
    intro: 'JARVIS в сети. Добро пожаловать в будущее генеративного контента. Я управляю видео, звуком, фото и этим сайтом прямо с вашего голоса. Хотите неоновую атмосферу или сразу запустим генерацию? Жду вашу команду.',
    styles: 'Могу менять оформление прямо на лету: светлая тема, тёмная, яркий неоновый стиль и эксклюзивный новогодний режим.',
    nav: 'Я умею открывать любые разделы платформы. Открываю Студию генерации. Здесь вы создаете видео, фото и аудио шедевры.',
    finish: 'С чего бы вы хотели начать? Назовите команду, и я сделаю всё за вас.'
  },
  en: {
    intro: 'JARVIS online. Welcome to the future of generative media. I command video, audio, imagery, and this entire interface straight from your voice. Would you like a neon vibe, or should we launch generation right away? Standing by.',
    styles: 'I can adapt the design on the fly: light theme, dark, neon cyberpunk, and our festive New Year style.',
    nav: 'I can navigate anywhere on the platform. Opening Creation Studio for video, imagery and audio.',
    finish: 'Where shall we begin? Name your command, and I will handle it all for you.'
  },
  fr: {
    intro: 'JARVIS en ligne. Bienvenue dans le futur de la création générative. Je contrôle la vidéo, le son, l\'image et ce site directement à votre voix.',
    styles: 'Je peux métamorphoser l’interface : thème clair, sombre, néon cyberpunk et le mode festif du Nouvel An !',
    nav: 'J’ouvre le Studio de création pour vos vidéos, images et pistes audio.',
    finish: 'Par quoi commencer ? Donnez votre commande vocale.'
  },
  es: {
    intro: 'JARVIS en línea. Bienvenido al futuro de la creación generativa. Controlo video, audio, imágenes y este sitio web directamente con tu voz.',
    styles: 'Puedo transformar el sitio: tema claro, oscuro, neón cyberpunk y el modo festivo de Año Nuevo.',
    nav: 'Abriendo el Estudio de creación para video, imagen y audio.',
    finish: '¿Por dónde empezamos? Da tu orden de voz.'
  }
};

function playClipOrSpeak(clipName, textFallback, onComplete) {
  if (!isTourRunning) return;
  const lang = getJarvixLanguage();
  const filename = lang === 'en' ? `${clipName}_en.mp3` : `${clipName}.mp3`;
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
  clearTourTimers();
  stopAllSpeech();

  const lang = getJarvixLanguage();
  const texts = TOUR_TEXTS[lang] || TOUR_TEXTS.en;

  // Step 1: Flagship Intro (Option 4)
  playClipOrSpeak('jarvix_tour_intro', texts.intro, () => {
    if (!isTourRunning) return;

    // Step 2: Dynamic Live Styles (with live theme changes during voice)
    tourTimeouts.push(setTimeout(() => { if (isTourRunning) applySiteTheme('light'); }, 1000));
    tourTimeouts.push(setTimeout(() => { if (isTourRunning) applySiteTheme('midnight'); }, 3500));
    tourTimeouts.push(setTimeout(() => { if (isTourRunning) applySiteTheme('neon'); }, 6000));
    tourTimeouts.push(setTimeout(() => { if (isTourRunning) applySiteTheme('festive-newyear'); }, 8500));

    playClipOrSpeak('jarvix_tour_styles', texts.styles, () => {
      if (!isTourRunning) return;

      // Step 3: Navigation & Studio walkthrough
      highlightElement('a[href*="generate-studio"], #homeCreativeTools, #homeQuickBar', 4500);

      playClipOrSpeak('jarvix_tour_nav', texts.nav, () => {
        if (!isTourRunning) return;

        // Step 4: Closing & Mic Activation
        playClipOrSpeak('jarvix_tour_finish', texts.finish, () => {
          if (!isTourRunning) return;
          isTourRunning = false;
          updateJarvisState('listening');
          resumeJarvisRecognition();
        });
      });
    });
  });
}

export function stopJarvixGuidedTour() {
  isTourRunning = false;
  clearTourTimers();
  if (currentTourAudio) {
    try {
      currentTourAudio.pause();
      currentTourAudio.currentTime = 0;
    } catch (_) {}
    currentTourAudio = null;
  }
  stopAllSpeech();
  document.querySelectorAll('.jarvis-tour-spotlight').forEach(el => el.classList.remove('jarvis-tour-spotlight'));
}

// Global escape key handler
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isTourRunning) {
      stopJarvixGuidedTour();
    }
  });
}
