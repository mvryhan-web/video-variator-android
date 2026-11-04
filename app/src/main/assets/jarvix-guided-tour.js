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
let tourVersion = 0;

export function isTourActive() {
  return isTourRunning;
}

function clearTourTimers() {
  for (const t of tourTimeouts) clearTimeout(t);
  tourTimeouts = [];
}

const TOUR_TEXTS = {
  ru: {
    intro: 'JARVIS в сети. Добро пожаловать в будущее генеративного контента. Я управляю видео, звуком, фото и этим сайтом прямо с вашего голоса. Хотите неоновую атмосферу или сразу запустим генерацию? Жду вашу команду.',
    styles: 'Могу менять оформление прямо на лету: светлая тема, тёмная, яркий неоновый стиль и эксклюзивный новогодний режим.',
    nav: 'Я умею открывать любые разделы платформы. В Студии генерации вы создаёте видео, фото и аудио шедевры.',
    finish: 'С чего бы вы хотели начать? Назовите команду, и я сделаю всё за вас.'
  },
  en: {
    intro: 'JARVIS online. Welcome to the future of generative media. I command video, audio, imagery, and this entire interface straight from your voice. Would you like a neon vibe, or should we launch generation right away? Standing by.',
    styles: 'I can adapt the design on the fly: light theme, dark, neon cyberpunk, and our festive New Year style.',
    nav: 'I can navigate anywhere on the platform. Creation Studio brings together video, imagery and audio.',
    finish: 'Where shall we begin? Name your command, and I will handle it all for you.'
  },
  fr: {
    intro: 'JARVIS en ligne. Bienvenue dans le futur de la création générative. Je contrôle la vidéo, le son, l\'image et ce site directement à votre voix. Prêt pour une ambiance néon ou on lance la génération ? J\'attends vos ordres.',
    styles: 'Je peux métamorphoser l\'interface en direct : thème clair, sombre, néon cyberpunk et le mode festif du Nouvel An.',
    nav: 'Je peux ouvrir n\'importe quelle section de la plateforme. J\'ouvre le Studio de création pour vos vidéos, images et pistes audio.',
    finish: 'Par quoi souhaitez-vous commencer ? Donnez votre commande vocale, et je m\'occupe de tout.'
  },
  es: {
    intro: 'JARVIS en línea. Bienvenido al futuro de la creación generativa. Controlo video, audio, imágenes y este sitio web directamente con tu voz. ¿Prefieres un ambiente neón o iniciamos la generación? Espero tu orden.',
    styles: 'Puedo transformar el sitio al instante: tema claro, oscuro, neón cyberpunk y el modo festivo de Año Nuevo.',
    nav: 'Puedo abrir cualquier sección de la plateforme. Abriendo el Estudio de creación para video, imagen y audio.',
    finish: '¿Por dónde empezamos? Da tu orden de voz y yo me encargaré de todo.'
  }
};

function playClipOrSpeak(clipName, textFallback, onComplete) {
  if (!isTourRunning) return;
  const turn = tourVersion;
  const active = () => isTourRunning && turn === tourVersion;
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
    if (active() && typeof onComplete === 'function') {
      onComplete();
    }
  };

  audio.onplay = () => {
    if (!active()) {
      audio.pause();
      return;
    }
    updateJarvisState('speaking');
  };

  audio.onended = finish;
  audio.onerror = () => {
    currentTourAudio = null;
    if (!active()) return;
    speakJarvis(textFallback, finish);
  };

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      currentTourAudio = null;
      if (!active()) return;
      speakJarvis(textFallback, finish);
    });
  }
}

export function startJarvixGuidedTour() {
  if (isTourRunning) return;
  isTourRunning = true;
  tourVersion += 1;
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
      // No HUD or spotlight overlays: the owner requested voice-only presentation.

      playClipOrSpeak('jarvix_tour_nav', texts.nav, () => {
        if (!isTourRunning) return;

        // Step 4: Closing & Mic Activation
        playClipOrSpeak('jarvix_tour_finish', texts.finish, () => {
          if (!isTourRunning) return;
          isTourRunning = false;
          clearTourTimers();
          const studio = new URL('generate-studio.html?studio=image', location.href);
          if (location.pathname.endsWith('/generate-studio.html')) {
            updateJarvisState('listening');resumeJarvisRecognition();
          } else {
            sessionStorage.setItem('jarvix_active','1');
            location.assign(studio.href);
          }
        });
      });
    });
  });
}

export function stopJarvixGuidedTour() {
  isTourRunning = false;
  tourVersion += 1;
  clearTourTimers();
  if (currentTourAudio) {
    try {
      currentTourAudio.onended = null;currentTourAudio.onerror = null;currentTourAudio.onplay = null;
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
