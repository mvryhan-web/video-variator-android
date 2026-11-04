/**
 * JARVIX Interactive Guided Tour & Site Presentation (35-45s Cinematic Walkthrough)
 * Demonstrates:
 * 1. Self-introduction (Flagship audio Option 4)
 * 2. Sidebar Navigation walkthrough (Canvas, Studio, Everyday Tools, Pricing)
 * 3. Dynamic Live Theme switching (Light, Dark, Neon Cyberpunk, Festive New Year!)
 * 4. Studio Capabilities & Ratio controls (1:1, 16:9, 9:16)
 * 5. Interactive Closing Call-to-Action ("С чего начнём?")
 */
import { applySiteTheme, getJarvixLanguage, speakJarvis, stopAllSpeech } from './jarvis-core.js';

let isTourRunning = false;
let tourTimeouts = [];
let tourOverlay = null;

const TOUR_I18N = {
  ru: {
    startTour: 'Экскурсия с Джарвисом',
    skip: 'Пропустить',
    step1Title: 'JARVIS в сети',
    step1Text: 'Привет! Я JARVIS, персональный ассистент Deepsyq. Помогу с фото, видео, открою любой раздел и настрою стиль сайта.',
    step2Title: 'Навигация и разделы',
    step2Text: 'Слева расположено главное меню: Студия для фото и видео, Everyday Tools и галерея Inspiration.',
    step3Title: 'Управление стилями сайта',
    step3Text: 'Я умею менять оформление: светлое, тёмное, яркий неоновый стиль и эксклюзивный новогодний режим!',
    step4Title: 'Студия и форматы',
    step4Text: 'В Студии вы можете создавать шедевры в формате 16:9 для кино, 9:16 для мобильных или квадрате 1:1.',
    step5Title: 'С чего начнём?',
    step5Text: 'Выберите задачу, и мы сразу приступим:',
    actionPhoto: '📸 Создать фото',
    actionVideo: '🎬 Создать видео',
    actionTools: '🛠 Инструменты',
    actionAsk: '💬 Спросить Джарвиса'
  },
  en: {
    startTour: 'Tour with Jarvis',
    skip: 'Skip',
    step1Title: 'JARVIS Online',
    step1Text: 'Greetings! I am JARVIS, your personal Deepsyq assistant. I can open pages, generate photos and video, and customize the site.',
    step2Title: 'Navigation & Workspaces',
    step2Text: 'On the left is the main menu: Creation Studio for photo & video, Everyday Tools, and Inspiration showcase.',
    step3Title: 'Live Theme Switching',
    step3Text: 'I can transform the site in real time: Light, Dark, Neon Cyberpunk, and our exclusive Festive New Year mode!',
    step4Title: 'Studio & Aspect Ratios',
    step4Text: 'In Studio you can craft creations in 16:9 cinematic, 9:16 vertical for social media, or 1:1 square.',
    step5Title: 'Where shall we begin?',
    step5Text: 'Choose an action to start right away:',
    actionPhoto: '📸 Create Image',
    actionVideo: '🎬 Create Video',
    actionTools: '🛠 Everyday Tools',
    actionAsk: '💬 Ask Jarvis'
  },
  fr: {
    startTour: 'Visite avec Jarvis',
    skip: 'Passer',
    step1Title: 'JARVIS en ligne',
    step1Text: 'Bonjour ! Je suis JARVIS, votre assistant Deepsyq. Je peux ouvrir les pages, générer photos et vidéos et adapter le style.',
    step2Title: 'Navigation principale',
    step2Text: 'À gauche se trouve le menu : Studio de création, Everyday Tools et la galerie Inspiration.',
    step3Title: 'Changement de thème en direct',
    step3Text: 'Je peux métamorphoser l’interface : thème clair, sombre, néon cyberpunk et le mode festif du Nouvel An !',
    step4Title: 'Studio et formats',
    step4Text: 'Dans le Studio, créez en format 16:9 cinématique, 9:16 pour mobile ou carré 1:1.',
    step5Title: 'Par quoi commencer ?',
    step5Text: 'Choisissez une action pour démarrer :',
    actionPhoto: '📸 Créer image',
    actionVideo: '🎬 Créer vidéo',
    actionTools: '🛠 Outils gratuits',
    actionAsk: '💬 Parler à Jarvis'
  },
  es: {
    startTour: 'Tour con Jarvis',
    skip: 'Omitir',
    step1Title: 'JARVIS en línea',
    step1Text: '¡Hola! Soy JARVIS, tu asistente personal en Deepsyq. Puedo abrir secciones, generar foto y vídeo y cambiar estilos.',
    step2Title: 'Navegación principal',
    step2Text: 'A la izquierda está el menú: Estudio de foto y vídeo, Everyday Tools y la galería Inspiration.',
    step3Title: 'Cambio de temas en vivo',
    step3Text: 'Puedo transformar el sitio: tema claro, oscuro, neón cyberpunk y el modo festivo de Año Nuevo.',
    step4Title: 'Estudio y formatos',
    step4Text: 'En el Estudio puedes crear en formato 16:9 panorámico, 9:16 vertical para móviles o cuadrado 1:1.',
    step5Title: '¿Por dónde empezamos?',
    step5Text: 'Elige una acción para empezar:',
    actionPhoto: '📸 Crear foto',
    actionVideo: '🎬 Crear vídeo',
    actionTools: '🛠 Herramientas',
    actionAsk: '💬 Hablar con Jarvis'
  }
};

function getT() {
  const lang = getJarvixLanguage();
  return TOUR_I18N[lang] || TOUR_I18N.en;
}

function clearTourTimers() {
  for (const t of tourTimeouts) clearTimeout(t);
  tourTimeouts = [];
}

function highlightElement(selector, durationMs = 3000) {
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

function ensureTourHUD() {
  if (tourOverlay && document.body.contains(tourOverlay)) return tourOverlay;
  const overlay = document.createElement('aside');
  overlay.id = 'jarvixTourOverlay';
  overlay.className = 'jarvix-tour-overlay';
  overlay.setAttribute('aria-label', 'JARVIX Live Guided Tour');
  overlay.innerHTML = `
    <div class="jarvix-tour-card">
      <div class="jarvix-tour-header">
        <div class="jarvix-tour-brand">
          <div class="jarvis-mini-orb is-talking">
            <span class="jarvis-core"></span>
            <span class="jarvis-ring"></span>
            <span class="jarvis-ring ring-violet"></span>
          </div>
          <strong id="jarvixTourTitle" class="jarvix-tour-title">JARVIS</strong>
        </div>
        <button type="button" id="jarvixTourSkip" class="jarvix-tour-skip" aria-label="Skip tour">✕</button>
      </div>
      <p id="jarvixTourText" class="jarvix-tour-text"></p>
      <div class="jarvix-tour-progress"><div id="jarvixTourProgressBar" class="jarvix-tour-bar"></div></div>
      <div id="jarvixTourActions" class="jarvix-tour-actions" hidden></div>
    </div>
  `;
  document.body.appendChild(overlay);
  tourOverlay = overlay;
  overlay.querySelector('#jarvixTourSkip')?.addEventListener('click', stopJarvixGuidedTour);
  return overlay;
}

export function startJarvixGuidedTour(options = {}) {
  if (isTourRunning) return;
  isTourRunning = true;
  clearTourTimers();
  stopAllSpeech();

  const hud = ensureTourHUD();
  hud.classList.add('is-active');
  const t = getT();
  const titleEl = hud.querySelector('#jarvixTourTitle');
  const textEl = hud.querySelector('#jarvixTourText');
  const barEl = hud.querySelector('#jarvixTourProgressBar');
  const actionsEl = hud.querySelector('#jarvixTourActions');
  if (actionsEl) actionsEl.hidden = true;

  const updateHUD = (title, text, progressPct) => {
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
    if (barEl) barEl.style.width = progressPct + '%';
  };

  // Step 1: Self introduction (~0s - 7s)
  updateHUD(t.step1Title, t.step1Text, 10);
  speakJarvis(t.step1Text);
  highlightElement('#sidebar .brand, .top-brand', 4000);

  // Step 2: Sidebar Walkthrough (at 7s)
  tourTimeouts.push(setTimeout(() => {
    if (!isTourRunning) return;
    updateHUD(t.step2Title, t.step2Text, 35);
    speakJarvis(t.step2Text);
    highlightElement('a[href*="generate-studio"], a[href*="canvas"]', 3000);
    tourTimeouts.push(setTimeout(() => {
      if (!isTourRunning) return;
      highlightElement('a[href*="free-tools"], a[href*="inspiration"]', 3000);
    }, 2500));
  }, 7000));

  // Step 3: Dynamic Theme demonstration (at 15s)
  tourTimeouts.push(setTimeout(() => {
    if (!isTourRunning) return;
    updateHUD(t.step3Title, t.step3Text, 60);
    speakJarvis(t.step3Text);

    // Light theme
    tourTimeouts.push(setTimeout(() => {
      if (!isTourRunning) return;
      applySiteTheme('light');
    }, 1000));

    // Dark midnight
    tourTimeouts.push(setTimeout(() => {
      if (!isTourRunning) return;
      applySiteTheme('midnight');
    }, 3200));

    // Neon Cyberpunk
    tourTimeouts.push(setTimeout(() => {
      if (!isTourRunning) return;
      applySiteTheme('neon');
    }, 5500));

    // Festive New Year (grand finale theme)
    tourTimeouts.push(setTimeout(() => {
      if (!isTourRunning) return;
      applySiteTheme('festive-newyear');
    }, 8000));
  }, 15000));

  // Step 4: Studio & Aspect Ratios (at 26s)
  tourTimeouts.push(setTimeout(() => {
    if (!isTourRunning) return;
    updateHUD(t.step4Title, t.step4Text, 85);
    speakJarvis(t.step4Text);
    highlightElement('#homeQuickBar, .home-quick-form, #homeCreativeTools', 4000);
  }, 26000));

  // Step 5: Interactive Closing Call-to-Action (at 34s)
  tourTimeouts.push(setTimeout(() => {
    if (!isTourRunning) return;
    updateHUD(t.step5Title, t.step5Text, 100);
    speakJarvis(t.step5Text);

    if (actionsEl) {
      actionsEl.hidden = false;
      actionsEl.innerHTML = `
        <a href="generate-studio.html?studio=image" class="jarvix-tour-chip">${t.actionPhoto}</a>
        <a href="generate-studio.html?studio=video" class="jarvix-tour-chip">${t.actionVideo}</a>
        <a href="free-tools.html" class="jarvix-tour-chip">${t.actionTools}</a>
        <button type="button" id="jarvixTourChipAsk" class="jarvix-tour-chip jarvix-tour-chip-primary">${t.actionAsk}</button>
      `;
      actionsEl.querySelector('#jarvixTourChipAsk')?.addEventListener('click', () => {
        stopJarvixGuidedTour();
        const topBtn = document.getElementById('topJarvisBtn');
        if (topBtn) topBtn.click();
      });
    }
  }, 34000));
}

export function stopJarvixGuidedTour() {
  isTourRunning = false;
  clearTourTimers();
  stopAllSpeech();
  document.querySelectorAll('.jarvis-tour-spotlight').forEach(el => el.classList.remove('jarvis-tour-spotlight'));
  if (tourOverlay) {
    tourOverlay.classList.remove('is-active');
  }
}

// Global escape key handler
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && isTourRunning) {
    stopJarvixGuidedTour();
  }
});
