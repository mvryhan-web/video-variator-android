/**
 * Deepsyq Virtual Pet Companion — Block 8 ("Волшебный нюх" / Magic Nose)
 *
 * Provides a voluntary, warm, non-intrusive companion (Dog 'Луна', Cat 'Мира' or Fox 'Нова')
 * with 3 core superpowers:
 *  1. Draft Saver / Rescue (Спасение потерянных идей)
 *  2. Format Sniffer (Нюх на параметры Reels/Shorts 9:16 vs 16:9)
 *  3. Job Ready Delivery (Доставка готового результата)
 *
 * Modes: Calm ('calm'), Playful ('playful'), Off ('off').
 * Client-side only, zero paid AI calls, zero telemetry abuse.
 */

const globalScope = typeof globalThis !== 'undefined' ? globalThis :
                    typeof window !== 'undefined' ? window :
                    typeof self !== 'undefined' ? self :
                    typeof global !== 'undefined' ? global : {};

(function(root, factory) {
  const mod = factory();
  if (typeof define === 'function' && define.amd) {
    define([], () => mod);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  }
  if (root) {
    root.DeepsyqVirtualPet = mod;
  }
})(globalScope, function() {
  'use strict';
  const root = globalScope;

  const STORAGE_KEY = 'deepsyq_virtual_pet_v1';
  const DRAFT_KEY = 'deepsyq_studio_draft';
  const DELIVERED_JOBS_KEY = 'deepsyq_delivered_jobs_v1';

  const DEFAULT_SETTINGS = {
    enabled: true,
    pet: 'dog', // 'dog' | 'cat' | 'fox'
    name: 'Луна',
    mode: 'calm', // 'calm' | 'playful' | 'off'
    sound: false,
    noseDraft: true,
    noseRatio: true,
    noseJobs: true,
    living: {movement:'gentle',side:'auto',size:'medium',face:'expressive',tipsEnabled:true,voiceEnabled:false,enabledByScenario:{}}
  };

  const PET_PROFILES = {
    dog: {
      defaultName: 'Луна',
      badge: '🐕',
      label: 'Собака',
      greeting: 'Привет! Я рядом, если понадобится помощь с идеями или генерациями.'
    },
    cat: {
      defaultName: 'Мира',
      badge: '🐱',
      label: 'Кошка',
      greeting: 'Мяу. Я тут в уголке, слежу за твоими черновиками и готовыми работами.'
    },
    fox: {
      defaultName: 'Нова',
      badge: '🦊',
      label: 'Лисёнок',
      greeting: 'Привет! Я любопытная Нова, могу бережно принести твою идею.'
    }
  };

  // SVGs for Dog and Cat with animated parts
  const SVG_DOG = `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Tail -->
      <path class="ds-pet-tail" d="M72 65 C85 60 88 45 78 40" stroke="#D89150" stroke-width="6" stroke-linecap="round"/>
      <!-- Body -->
      <ellipse cx="50" cy="62" rx="26" ry="20" fill="#D89150"/>
      <ellipse cx="50" cy="64" rx="20" ry="15" fill="#EECDA5"/>
      <!-- Paws -->
      <ellipse cx="36" cy="78" rx="8" ry="6" fill="#D89150"/>
      <ellipse cx="64" cy="78" rx="8" ry="6" fill="#D89150"/>
      <!-- Ears -->
      <g class="ds-pet-ears">
        <path d="M26 34 C20 40 18 55 24 60 C26 55 28 42 34 36 Z" fill="#B86B3C"/>
        <path d="M74 34 C80 40 82 55 76 60 C74 55 72 42 66 36 Z" fill="#B86B3C"/>
      </g>
      <!-- Head -->
      <circle cx="50" cy="40" r="22" fill="#EECDA5"/>
      <!-- Eyes -->
      <circle cx="41" cy="38" r="3.5" fill="#1e293b"/>
      <circle cx="42" cy="37" r="1.2" fill="#F6E8CE"/>
      <circle cx="59" cy="38" r="3.5" fill="#1e293b"/>
      <circle cx="60" cy="37" r="1.2" fill="#F6E8CE"/>
      <!-- Snout -->
      <ellipse cx="50" cy="47" rx="9" ry="7" fill="#F6E8CE"/>
      <polygon points="46,44 54,44 50,49" fill="#1e293b"/>
      <path d="M50 49 L50 52 M47 52 C48 54 52 54 53 52" stroke="#1e293b" stroke-width="1.5" stroke-linecap="round"/>
      <!-- Collar -->
      <path d="M36 56 Q50 62 64 56" stroke="#40DFAE" stroke-width="4" stroke-linecap="round"/>
      <circle cx="50" cy="60" r="3" fill="#e0f2fe"/>
    </svg>
  `;

  const SVG_CAT = `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Tail -->
      <path class="ds-pet-tail" d="M70 65 C85 65 92 48 84 35" stroke="#28394E" stroke-width="5" stroke-linecap="round"/>
      <!-- Body -->
      <ellipse cx="50" cy="64" rx="25" ry="18" fill="#28394E"/>
      <ellipse cx="50" cy="65" rx="19" ry="13" fill="#F1ECE6"/>
      <!-- Paws -->
      <ellipse cx="36" cy="78" rx="7" ry="5" fill="#171C2C"/>
      <ellipse cx="64" cy="78" rx="7" ry="5" fill="#171C2C"/>
      <!-- Ears -->
      <g class="ds-pet-ears">
        <polygon points="30,42 22,22 42,32" fill="#171C2C"/>
        <polygon points="29,39 25,26 38,33" fill="#C99BAD"/>
        <polygon points="70,42 78,22 58,32" fill="#171C2C"/>
        <polygon points="71,39 75,26 62,33" fill="#C99BAD"/>
      </g>
      <!-- Head -->
      <circle cx="50" cy="42" r="21" fill="#28394E"/>
      <!-- Eyes -->
      <ellipse cx="41" cy="40" rx="3.5" ry="4" fill="#66C4AD"/>
      <circle cx="41.5" cy="40" r="1.8" fill="#0f172a"/>
      <ellipse cx="59" cy="40" rx="3.5" ry="4" fill="#66C4AD"/>
      <circle cx="59.5" cy="40" r="1.8" fill="#0f172a"/>
      <!-- Nose & Mouth -->
      <polygon points="48,46 52,46 50,48" fill="#C99BAD"/>
      <path d="M47 50 Q50 52 53 50" stroke="#475569" stroke-width="1.2" stroke-linecap="round"/>
      <!-- Whiskers -->
      <line x1="36" y1="46" x2="24" y2="44" stroke="#F1ECE6" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="36" y1="49" x2="25" y2="50" stroke="#F1ECE6" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="64" y1="46" x2="76" y2="44" stroke="#F1ECE6" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="64" y1="49" x2="75" y2="50" stroke="#F1ECE6" stroke-width="1.2" stroke-linecap="round"/>
      <!-- Ribbon -->
      <path d="M38 58 Q50 62 62 58" stroke="#509BAA" stroke-width="3" stroke-linecap="round"/>
      <circle cx="50" cy="60" r="2.5" fill="#fdf4ff"/>
    </svg>
  `;

  // HONEST 2D placeholder while genuine Blender/GLB/alpha sprites are absent.
  // Nov 2 owner-approved FOX scope. This must never be marked as final 3D.
  const SVG_FOX = `
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <!-- Distinct fox silhouette: pointed ears, narrow muzzle, very long bushy tail, four paws -->
      <path class="ds-pet-tail" d="M64 72 C86 79 93 62 86 43 C91 47 97 60 94 71 C91 86 74 89 61 81 Z" fill="#EA853A" stroke="#AB562B" stroke-width="1.2"/>
      <path d="M93 59 Q102 78 81 82 Q87 72 93 59" fill="#FFF4DF"/>
      <ellipse cx="52" cy="69" rx="24" ry="17" fill="#EA853A"/>
      <path d="M34 70 Q50 82 70 71 L63 81 L42 82 Z" fill="#FFF4DF"/>
      <ellipse cx="35" cy="82" rx="7" ry="5" fill="#AB562B"/>
      <ellipse cx="49" cy="84" rx="7" ry="5" fill="#AB562B"/>
      <ellipse cx="62" cy="83" rx="7" ry="5" fill="#AB562B"/>
      <ellipse cx="71" cy="80" rx="6" ry="5" fill="#AB562B"/>
      <g class="ds-pet-ears">
        <path d="M24 42 L29 9 Q31 7 35 10 L47 33 Z" fill="#EA853A"/>
        <path d="M76 42 L70 9 Q68 7 65 10 L53 33 Z" fill="#EA853A"/>
        <path d="M30 32 L31 16 L40 33" fill="#F0BAAB"/>
        <path d="M70 32 L69 16 L60 33" fill="#F0BAAB"/>
      </g>
      <path d="M27 42 Q50 16 73 42 Q76 58 63 65 L37 65 Q24 56 27 42" fill="#EA853A"/>
      <path d="M27 50 Q38 45 50 54 Q62 45 73 50 Q64 66 50 65 Q35 65 27 50" fill="#FFF4DF"/>
      <ellipse cx="42" cy="43" rx="4" ry="5" fill="#66C4AD"/>
      <ellipse cx="58" cy="43" rx="4" ry="5" fill="#66C4AD"/>
      <ellipse cx="42" cy="43" rx="1.8" ry="3.1" fill="#183935"/>
      <ellipse cx="58" cy="43" rx="1.8" ry="3.1" fill="#183935"/>
      <path d="M46 54 Q50 57 54 54 L50 60 Z" fill="#211B1B"/>
      <path d="M34 62 Q50 70 66 62" stroke="#4ADDB7" stroke-width="3" stroke-linecap="round"/>
      <path d="M47 66 L50 70 L53 66 L50 62 Z" fill="#4ADDB7"/>
    </svg>
  `;


  class VirtualPetEngine {
    constructor() {
      this.settings = this.loadSettings();
      this.widgetEl = null;
      this.bubbleEl = null;
      this.avatarEl = null;
      this.activePromptInput = null;
      this.activeRatioSelect = null;
      this.draftDebounceTimer = null;
      this.lastSniffedRatioValue = null;
      this.isInitialized = false;
      this.livingController = root?.DeepsyqLivingPet?.createController?.() || null;
      this.ambientTimer = null;
    }

    getStorage() {
      try {
        if (typeof localStorage !== 'undefined') return localStorage;
        if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
      } catch (e) {}
      return null;
    }

    loadSettings() {
      try {
        const raw = this.getStorage()?.getItem(STORAGE_KEY);
        if (raw) {
          const saved=JSON.parse(raw);
          const selected=PET_PROFILES[saved?.pet] ? saved.pet : DEFAULT_SETTINGS.pet;
          const living = root?.DeepsyqLivingPet?.normalizeSettings?.(saved?.living) || DEFAULT_SETTINGS.living;
          return Object.assign({}, DEFAULT_SETTINGS, saved, { pet: selected, living });
        }
      } catch (err) {
        console.warn('[VirtualPet] Failed to read settings from localStorage:', err);
      }
      return Object.assign({}, DEFAULT_SETTINGS);
    }

    saveSettings(newSettings) {
      const nextPet=PET_PROFILES[newSettings?.pet] ? newSettings.pet : (this.settings.pet || 'dog');
      const living = root?.DeepsyqLivingPet?.normalizeSettings?.(newSettings?.living || this.settings.living) || DEFAULT_SETTINGS.living;
      this.settings = Object.assign({}, this.settings, newSettings, { pet: nextPet, living, sound:false });
      try {
        this.getStorage()?.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch (err) {
        console.warn('[VirtualPet] Failed to save settings to localStorage:', err);
      }
      this.render();
      return this.settings;
    }

    init(options = {}) {
      if (this.isInitialized && this.widgetEl) {
        return this;
      }
      if (typeof document === 'undefined') return this;

      this.createDOM();
      this.render();
      this.bindAutoSniffers();
      this.startAmbientMotion();

      if (options.promptInputSelector) {
        this.attachToPrompt(options.promptInputSelector, options.ratioSelectSelector);
      } else {
        // Auto-detect common Studio elements
        this.detectStudioElements();
      }

      this.isInitialized = true;
      return this;
    }

    createDOM() {
      if (document.getElementById('dsVirtualPetWidget')) {
        this.widgetEl = document.getElementById('dsVirtualPetWidget');
        return;
      }

      const widget = document.createElement('div');
      widget.id = 'dsVirtualPetWidget';
      widget.className = 'ds-virtual-pet-widget';

      widget.innerHTML = `
        <div id="dsPetBubble" class="ds-pet-bubble" style="display: none;" role="status" aria-live="polite"></div>
        <div class="ds-pet-avatar-wrapper">
          <div class="ds-pet-quick-controls">
            <button class="ds-pet-icon-btn" id="dsPetSettingsBtn" title="Настройки компаньона" aria-label="Настройки компаньона">⚙</button>
            <button class="ds-pet-icon-btn" id="dsPetToggleBtn" title="Свернуть / Режим" aria-label="Свернуть">✕</button>
          </div>
          <div id="dsPetAvatar" class="ds-pet-avatar" role="button" tabindex="0" aria-label="Открыть компаньона" title="Нажми, чтобы погладить!">
            <div id="dsPetSvgContainer"></div>
            <span id="dsPetBadge" class="ds-pet-badge" style="display: none;"></span>
          </div>
        </div>
      `;

      document.body.appendChild(widget);
      this.widgetEl = widget;
      this.bubbleEl = document.getElementById('dsPetBubble');
      this.avatarEl = document.getElementById('dsPetAvatar');

      // Setup click handlers safely
      if (this.avatarEl) {
        this.avatarEl.addEventListener('click', () => this.onAvatarClick());
        this.avatarEl.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();this.onAvatarClick();
          }
        });
      }
      const settingsBtn = document.getElementById('dsPetSettingsBtn');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openSettingsModal();
        });
      }
      const toggleBtn = document.getElementById('dsPetToggleBtn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleModeQuick();
        });
      }
    }

    render() {
      if (!this.widgetEl) return;

      if (!this.settings.enabled || this.settings.mode === 'off') {
        this.widgetEl.classList.add('ds-pet-hidden');
        return;
      }
      this.widgetEl.classList.remove('ds-pet-hidden');
      const motion = root?.DeepsyqLivingPet?.normalizeSettings?.(this.settings.living);
      if (motion) {
        this.widgetEl.setAttribute('data-pet-side',motion.side);
        this.widgetEl.setAttribute('data-pet-size',motion.size);
        this.widgetEl.setAttribute('data-pet-face',motion.face);
        this.widgetEl.setAttribute('data-pet-movement',motion.movement);
      }

      const svgContainer = document.getElementById('dsPetSvgContainer');
      if (svgContainer) {
        svgContainer.innerHTML = this.settings.pet === 'cat' ? SVG_CAT :
          this.settings.pet === 'fox' ? SVG_FOX : SVG_DOG;
      }

      const avatar = document.getElementById('dsPetAvatar');
      if (avatar) {
        avatar.setAttribute('title', `${this.settings.name} (${PET_PROFILES[this.settings.pet].label}) — нажми для настроек`);
      }
    }

    startAmbientMotion() {
      if (this.ambientTimer || typeof window === 'undefined' || !this.widgetEl ||
        !root?.DeepsyqLivingPet?.canAmbientWalk) return;
      // One short 1.8s movement every 90s, never continuous wandering.
      this.ambientTimer = window.setInterval(() => {
        const active = document.activeElement;
        const inputFocused = !!active?.matches?.('input,textarea,select,[contenteditable="true"]');
        const dialogOpen = !!document.querySelector?.('[aria-modal="true"]:not([hidden]),[role="dialog"]:not([hidden])');
        const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        const bubbleVisible = !!this.bubbleEl && this.bubbleEl.style.display !== 'none';
        const ok = root.DeepsyqLivingPet.canAmbientWalk({
          settings:{...this.settings.living,mode:this.settings.mode,enabled:this.settings.enabled},
          width:window.innerWidth,hidden:document.hidden,inputFocused,dialogOpen,
          reducedMotion,busy:bubbleVisible
        });
        if (!ok || !this.widgetEl?.classList) return;
        this.widgetEl.classList.add('ds-pet-ambient-walk');
        window.setTimeout(() => this.widgetEl?.classList?.remove('ds-pet-ambient-walk'),1900);
      },90000);
    }

    offerLivingHint(id,event,text,actions=[],mood='normal') {
      if (!this.livingController || !root?.DeepsyqLivingPet) return {show:false,reason:'NO_POLICY'};
      const active = typeof document !== 'undefined' && document.activeElement;
      const result = this.livingController.offer({
        id,event,settings:{...this.settings.living,mode:this.settings.mode,enabled:this.settings.enabled},
        userInitiated:event?.source==='mock-preview',
        state:{
          inputFocused:!!active?.matches?.('input,textarea,select,[contenteditable="true"]')&&!event?.userRequested,
          dialogOpen:!!document.querySelector?.('[aria-modal="true"]:not([hidden])'),
          bubbleVisible:!!this.bubbleEl&&this.bubbleEl.style.display!=='none'&&!event?.userRequested,
          hidden:!!document.hidden
        }
      });
      if(result.show)this.speak(text,actions,mood);
      return result;
    }

    onAvatarClick() {
      if (this.bubbleEl && this.bubbleEl.style.display !== 'none') {
        this.hideBubble();
        return;
      }
      const pet = PET_PROFILES[this.settings.pet];
      const name = this.settings.name || pet.defaultName;
      const actions = [
        { label: '⚙ Настройки', onClick: () => this.openSettingsModal(), primary: true },
        { label: 'Закрыть', onClick: () => this.hideBubble() }
      ];

      this.speak(
        `Привет! Я твой компаньон ${name}. Я помогу не потерять черновики и вовремя заметить готовые генерации.`,
        actions,
        'friendly'
      );
    }

    speak(text, actions = [], mood = 'normal') {
      if (!this.settings.enabled || this.settings.mode === 'off' || !this.bubbleEl) {
        return;
      }

      const name = this.settings.name || PET_PROFILES[this.settings.pet].defaultName;
      const icon = PET_PROFILES[this.settings.pet].badge;

      let actionsHtml = '';
      if (actions && actions.length > 0) {
        actionsHtml = '<div class="ds-pet-bubble-actions">' +
          actions.map((act, idx) => {
            const cls = act.danger ? 'ds-pet-btn-danger' : (act.primary ? 'ds-pet-btn-primary' : 'ds-pet-btn-secondary');
            return `<button class="ds-pet-btn ${cls}" data-action-idx="${idx}">${this.escapeHtml(act.label)}</button>`;
          }).join('') +
        '</div>';
      }

      this.bubbleEl.innerHTML = `
        <div class="ds-pet-bubble-header">
          <div class="ds-pet-bubble-title">
            <span>${icon}</span>
            <span>${this.escapeHtml(name)}</span>
          </div>
          <button class="ds-pet-bubble-close" id="dsPetBubbleCloseBtn" title="Скрыть">✕</button>
        </div>
        <p class="ds-pet-bubble-text">${this.escapeHtml(text)}</p>
        ${actionsHtml}
      `;

      // Bind button events
      const closeBtn = document.getElementById('dsPetBubbleCloseBtn');
      if (closeBtn) {
        closeBtn.onclick = () => this.hideBubble();
      }

      const actionButtons = this.bubbleEl.querySelectorAll('[data-action-idx]');
      actionButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(btn.getAttribute('data-action-idx'), 10);
          if (actions[idx] && typeof actions[idx].onClick === 'function') {
            actions[idx].onClick(e);
          }
          this.hideBubble();
        });
      });

      this.bubbleEl.style.display = 'block';

      // Set mood styling
      this.widgetEl.classList.remove('ds-pet-state-sniffing', 'ds-pet-state-alert', 'ds-pet-state-delivering');
      if (mood === 'sniffing') {
        this.widgetEl.classList.add('ds-pet-state-sniffing');
      } else if (mood === 'alert') {
        this.widgetEl.classList.add('ds-pet-state-alert');
      } else if (mood === 'delivering') {
        this.widgetEl.classList.add('ds-pet-state-delivering');
      }
    }

    hideBubble() {
      if (this.bubbleEl) {
        this.bubbleEl.style.display = 'none';
      }
      if (this.widgetEl) {
        this.widgetEl.classList.remove('ds-pet-state-sniffing', 'ds-pet-state-alert', 'ds-pet-state-delivering');
      }
    }

    setBadge(show = true, isAlert = false) {
      const badge = document.getElementById('dsPetBadge');
      if (!badge) return;
      if (show) {
        badge.style.display = 'block';
        badge.className = 'ds-pet-badge' + (isAlert ? ' alert' : '');
      } else {
        badge.style.display = 'none';
      }
    }

    // ==========================================
    // SUPERPOWER 1: Draft Saver / Rescue
    // ==========================================
    saveDraft(promptText, extra = {}) {
      if (!promptText || promptText.trim().length === 0) {
        return;
      }
      try {
        const draft = {
          text: promptText.trim(),
          timestamp: Date.now(),
          studio: extra.studio || 'image',
          aspectRatio: extra.aspectRatio || '1:1',
          model: extra.model || null
        };
        this.getStorage()?.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (err) {
        console.warn('[VirtualPet] Failed to save draft:', err);
      }
    }

    getSavedDraft() {
      try {
        const raw = this.getStorage()?.getItem(DRAFT_KEY);
        if (!raw) return null;
        const draft = JSON.parse(raw);
        // Exclude drafts older than 48 hours
        if (Date.now() - draft.timestamp > 48 * 3600 * 1000) {
          this.getStorage()?.removeItem(DRAFT_KEY);
          return null;
        }
        return draft;
      } catch (err) {
        return null;
      }
    }

    clearSavedDraft() {
      try {
        this.getStorage()?.removeItem(DRAFT_KEY);
      } catch (err) {}
    }

    sniffDraftRescue(targetTextarea) {
      if (!this.settings.noseDraft || this.settings.mode === 'off') return;

      const draft = this.getSavedDraft();
      if (!draft || !draft.text) return;

      const currentText = targetTextarea ? targetTextarea.value.trim() : '';
      if (currentText.length > 0) {
        // User already entered something, do not override
        return;
      }

      // Check if this draft is freshly saved within this session
      const snippet = draft.text.length > 60 ? draft.text.slice(0, 57) + '...' : draft.text;

      this.setBadge(true, true);
      this.speak(
        `Я сохранил твою идею: «${snippet}». Восстановим её в рабочей области?`,
        [
          {
            label: 'Восстановить',
            primary: true,
            onClick: () => {
              if (targetTextarea) {
                targetTextarea.value = draft.text;
                targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
              }
              this.setBadge(false);
            }
          },
          {
            label: 'Не сейчас',
            onClick: () => this.setBadge(false)
          },
          {
            label: 'Удалить черновик',
            danger: true,
            onClick: () => {
              this.clearSavedDraft();
              this.setBadge(false);
            }
          }
        ],
        'sniffing'
      );
    }

    // ==========================================
    // SUPERPOWER 2: Format / Ratio Sniffer
    // ==========================================
    checkFormatKeywords(text) {
      if (!text) return null;
      const lower = text.toLowerCase();
      const verticalKeywords = ['tiktok', 'tik tok', 'тикток', 'reels', 'рилс', 'shorts', 'шортс', 'stories', 'сторис', '9:16', 'вертикальн'];
      for (const kw of verticalKeywords) {
        if (lower.includes(kw)) {
          return kw;
        }
      }
      return null;
    }

    sniffFormatRatio(promptText, currentRatio, onFixRatio) {
      if (!this.settings.noseRatio || this.settings.mode === 'off') return;

      const detected = this.checkFormatKeywords(promptText);
      const isHorizontal = currentRatio === '16:9' || currentRatio === 'landscape';

      if (detected && isHorizontal && this.lastSniffedRatioValue !== currentRatio) {
        this.lastSniffedRatioValue = currentRatio;
        this.setBadge(true, true);

        this.speak(
          `В описании есть «${detected}»! Для мобильного видео и соцсетей обычно используют вертикальный формат 9:16. Переключить?`,
          [
            {
              label: 'Переключить на 9:16',
              primary: true,
              onClick: () => {
                if (typeof onFixRatio === 'function') {
                  onFixRatio('9:16');
                }
                this.setBadge(false);
              }
            },
            {
              label: 'Оставить 16:9',
              onClick: () => {
                this.setBadge(false);
              }
            }
          ],
          'sniffing'
        );
      }
    }

    // ==========================================
    // SUPERPOWER 3: Job Ready Delivery
    // ==========================================
    getDeliveredJobIds() {
      try {
        const raw = this.getStorage()?.getItem(DELIVERED_JOBS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (err) {
        return [];
      }
    }

    markJobDelivered(jobId) {
      try {
        const list = this.getDeliveredJobIds();
        if (!list.includes(jobId)) {
          list.push(jobId);
          if (list.length > 50) list.shift();
          this.getStorage()?.setItem(DELIVERED_JOBS_KEY, JSON.stringify(list));
        }
      } catch (err) {}
    }

    sniffJobReady(job) {
      if (!this.settings.noseJobs || this.settings.mode === 'off') return;
      if (!job || !job.id || (job.status !== 'ready' && job.status !== 'completed')) return;

      const delivered = this.getDeliveredJobIds();
      if (delivered.includes(job.id)) return;

      this.markJobDelivered(job.id);
      this.setBadge(true, false);

      const title = job.prompt ? (job.prompt.length > 40 ? job.prompt.slice(0, 37) + '...' : job.prompt) : 'Новый результат';
      const actionUrl = `my-creations.html?jobId=${encodeURIComponent(job.id)}`;

      this.speak(
        `Твоя работа готова! «${title}» уже ждёт тебя в My Creations.`,
        [
          {
            label: 'Открыть результат',
            primary: true,
            onClick: () => {
              window.location.href = actionUrl;
            }
          },
          {
            label: 'Позже',
            onClick: () => this.setBadge(false)
          }
        ],
        'delivering'
      );
    }

    // ==========================================
    // AUTO-DETECTION & BINDING IN STUDIO
    // ==========================================
    detectStudioElements() {
      const promptInput = document.getElementById('prompt') ||
                          document.getElementById('promptInput') ||
                          document.querySelector('textarea[name="prompt"]') ||
                          document.getElementById('studioPromptInput');
      const ratioSelect = document.getElementById('ratio') ||
                          document.getElementById('aspectRatioSelect') ||
                          document.getElementById('studioAspectRatio') ||
                          document.querySelector('select[name="aspectRatio"]');

      if (promptInput) {
        this.attachToPrompt(promptInput, ratioSelect);
      }
    }

    attachToPrompt(promptElOrSelector, ratioElOrSelector) {
      const promptInput = typeof promptElOrSelector === 'string'
        ? document.querySelector(promptElOrSelector)
        : promptElOrSelector;
      const ratioSelect = typeof ratioElOrSelector === 'string'
        ? document.querySelector(ratioElOrSelector)
        : ratioElOrSelector;

      if (!promptInput) return;
      this.activePromptInput = promptInput;
      this.activeRatioSelect = ratioSelect;

      // Check draft rescue on init
      setTimeout(() => {
        this.sniffDraftRescue(promptInput);
      }, 700);

      // Listen for typing -> debounce save draft & sniff format
      promptInput.addEventListener('input', () => {
        clearTimeout(this.draftDebounceTimer);
        this.draftDebounceTimer = setTimeout(() => {
          const val = promptInput.value;
          const ratio = ratioSelect ? ratioSelect.value : '1:1';
          this.saveDraft(val, { aspectRatio: ratio });

          this.sniffFormatRatio(val, ratio, (newRatio) => {
            if (ratioSelect) {
              ratioSelect.value = newRatio;
              ratioSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
        }, 600);
      });

      if (ratioSelect) {
        ratioSelect.addEventListener('change', () => {
          this.sniffFormatRatio(promptInput.value, ratioSelect.value, (newRatio) => {
            ratioSelect.value = newRatio;
            ratioSelect.dispatchEvent(new Event('change', { bubbles: true }));
          });
        });
      }
    }

    bindAutoSniffers() {
      // Listen for custom Deepsyq job ready events
      if (typeof window !== 'undefined') {
        window.addEventListener('deepsyq:job_ready', (e) => {
          if (e.detail) {
            this.sniffJobReady(e.detail);
          }
        });
      }

      // Poll workspace cards periodically if enabled
      if (typeof window !== 'undefined' && this.settings.noseJobs && this.settings.mode !== 'off') {
        setInterval(() => {
          this.pollWorkspaceReady();
        }, 20000);
      }
    }

    async pollWorkspaceReady() {
      if (!this.settings.noseJobs || this.settings.mode === 'off') return;
      try {
        const res = await fetch('/api/studio/workspace/cards?limit=3');
        if (!res.ok) return;
        const data = await res.json();
        const cards = data.cards || data.items || [];
        for (const card of cards) {
          if (card.status === 'ready' || card.status === 'completed') {
            this.sniffJobReady(card);
            break;
          }
        }
      } catch (err) {
        // Silent catch: network/offline friendly
      }
    }

    // ==========================================
    // SETTINGS MODAL
    // ==========================================
    openSettingsModal() {
      let modal = document.getElementById('dsPetSettingsModal');
      if (modal) {
        modal.remove();
      }

      modal = document.createElement('div');
      modal.id = 'dsPetSettingsModal';
      modal.className = 'ds-pet-modal-overlay';

      const s = this.settings;
      const livingApi = root?.DeepsyqLivingPet;
      const prefs = livingApi?.normalizeSettings?.(s.living) || DEFAULT_SETTINGS.living;
      const rows = livingApi?.SCENARIOS?.map(rule => `
        <label class="ds-pet-toggle-row">
          <span class="ds-pet-toggle-info"><strong>${rule.id} · ${rule.title}</strong>
            <span class="ds-pet-toggle-desc">${rule.stage === 'demo' ? 'Проверяемое демо · без платных вызовов' : 'Ожидает подтверждённого подключения'}</span></span>
          <input class="ds-pet-scenario-switch" type="checkbox" data-scenario="${rule.id}"
            ${prefs.enabledByScenario?.[rule.id] !== false ? 'checked' : ''}>
        </label>`).join('') || '';
      modal.innerHTML = `
        <div class="ds-pet-modal" role="dialog" aria-modal="true" aria-labelledby="dsPetModalTitle">
          <div class="ds-pet-modal-header">
            <h3 class="ds-pet-modal-title" id="dsPetModalTitle">
              <span>🐾</span>
              <span>Виртуальный компаньон («Волшебный нюх»)</span>
            </h3>
            <button class="ds-pet-bubble-close" id="dsPetModalCloseBtn">✕</button>
          </div>

          <div class="ds-pet-form-group">
            <label class="ds-pet-label">Выбери питомца</label>
            <div class="ds-pet-select-cards" role="radiogroup" aria-label="Выбор питомца">
              <div class="ds-pet-choice-card ${s.pet === 'dog' ? 'selected' : ''}" data-pet="dog" role="radio" tabindex="0" aria-checked="${s.pet === 'dog' ? 'true' : 'false'}">
                <div class="ds-pet-choice-icon">🐕</div>
                <div class="ds-pet-choice-name">Луна · Собака</div>
                <div class="ds-pet-toggle-desc">Дружелюбный, приносит идеи в зубах</div>
              </div>
              <div class="ds-pet-choice-card ${s.pet === 'cat' ? 'selected' : ''}" data-pet="cat" role="radio" tabindex="0" aria-checked="${s.pet === 'cat' ? 'true' : 'false'}">
                <div class="ds-pet-choice-icon">🐱</div>
                <div class="ds-pet-choice-name">Мира · Кошка</div>
                <div class="ds-pet-toggle-desc">Спокойная, аккуратно двигает карточки лапкой</div>
              </div>
              <div class="ds-pet-choice-card ${s.pet === 'fox' ? 'selected' : ''}" data-pet="fox" role="radio" tabindex="0" aria-checked="${s.pet === 'fox' ? 'true' : 'false'}">
                <div class="ds-pet-choice-icon">🦊</div>
                <div class="ds-pet-choice-name">Нова · Лисёнок</div>
                <div class="ds-pet-toggle-desc">Любопытная, умеет находить сохранённые идеи</div>
              </div>
            </div>
          </div>

          <div class="ds-pet-form-group">
            <label class="ds-pet-label" for="dsPetNameInput">Имя питомца</label>
            <input type="text" id="dsPetNameInput" class="ds-pet-input" value="${this.escapeHtml(s.name)}" maxlength="24">
          </div>

          <div class="ds-pet-form-group">
            <label class="ds-pet-label" for="dsPetModeSelect">Стиль поведения</label>
            <select id="dsPetModeSelect" class="ds-pet-select">
              <option value="calm" ${s.mode === 'calm' ? 'selected' : ''}>Спокойный (только важные подсказки и спасение идей)</option>
              <option value="playful" ${s.mode === 'playful' ? 'selected' : ''}>Игривый (приветствия и советы по творчеству)</option>
              <option value="off" ${s.mode === 'off' ? 'selected' : ''}>Выключен (скрыть компаньона)</option>
            </select>
          </div>

          <div class="ds-pet-form-group">
            <label class="ds-pet-label" for="dsPetMovement">Как питомец живёт на странице</label>
            <select id="dsPetMovement" class="ds-pet-select">
              <option value="gentle" ${prefs.movement === 'gentle' ? 'selected' : ''}>Спокойные короткие прогулки</option>
              <option value="playful" ${prefs.movement === 'playful' ? 'selected' : ''}>Игривый характер</option>
              <option value="still" ${prefs.movement === 'still' ? 'selected' : ''}>Без прогулок</option>
            </select>
            <label class="ds-pet-label" for="dsPetSide">Предпочитаемая сторона</label>
            <select id="dsPetSide" class="ds-pet-select">
              <option value="auto" ${prefs.side === 'auto' ? 'selected' : ''}>Автоматически</option>
              <option value="left" ${prefs.side === 'left' ? 'selected' : ''}>Слева</option>
              <option value="right" ${prefs.side === 'right' ? 'selected' : ''}>Справа</option>
            </select>
            <label class="ds-pet-label" for="dsPetSize">Размер</label>
            <select id="dsPetSize" class="ds-pet-select">
              <option value="small" ${prefs.size === 'small' ? 'selected' : ''}>Маленький</option>
              <option value="medium" ${prefs.size === 'medium' ? 'selected' : ''}>Средний</option>
              <option value="large" ${prefs.size === 'large' ? 'selected' : ''}>Крупный</option>
            </select>
            <label class="ds-pet-label" for="dsPetFace">Мимика (Face)</label>
            <select id="dsPetFace" class="ds-pet-select">
              <option value="expressive" ${prefs.face === 'expressive' ? 'selected' : ''}>Выразительная</option>
              <option value="subtle" ${prefs.face === 'subtle' ? 'selected' : ''}>Сдержанная</option>
            </select>
            <label class="ds-pet-toggle-row">Показывать проверенные советы
              <input id="dsPetTipsEnabled" type="checkbox" ${prefs.tipsEnabled ? 'checked' : ''}>
            </label>
            <p class="ds-pet-toggle-desc">Voice: звук и микрофон выключены. Голосовой режим будет доступен только после отдельной реализации и согласия.</p>
          </div>

          <div class="ds-pet-form-group">
            <label class="ds-pet-label">Суперспособности («Волшебный нюх»)</label>
            <div class="ds-pet-toggles">
              <label class="ds-pet-toggle-row">
                <div class="ds-pet-toggle-info">
                  <span>Спасение потерянных идей</span>
                  <span class="ds-pet-toggle-desc">Напомнит восстановить случайно закрытый черновик</span>
                </div>
                <input type="checkbox" id="dsPetNoseDraft" ${s.noseDraft ? 'checked' : ''}>
              </label>

              <label class="ds-pet-toggle-row">
                <div class="ds-pet-toggle-info">
                  <span>Нюх на формат (Shorts / Reels)</span>
                  <span class="ds-pet-toggle-desc">Подскажет переключить 16:9 на 9:16 при ключевых словах соцсетей</span>
                </div>
                <input type="checkbox" id="dsPetNoseRatio" ${s.noseRatio ? 'checked' : ''}>
              </label>

              <label class="ds-pet-toggle-row">
                <div class="ds-pet-toggle-info">
                  <span>Доставка готового результата</span>
                  <span class="ds-pet-toggle-desc">Уведомит, когда генерация перейдёт в статус READY</span>
                </div>
                <input type="checkbox" id="dsPetNoseJobs" ${s.noseJobs ? 'checked' : ''}>
              </label>
            </div>
          </div>

          <details class="ds-pet-form-group ds-pet-scenario-list">
            <summary>Все 16 сценариев Magic Shield · настроить</summary>
            <p class="ds-pet-toggle-desc">Галочка означает ваше предпочтение, но не включает неподтверждённые AI-функции. Пока пять событий работают в безопасном демо.</p>
            <div class="ds-pet-toggles">${rows}</div>
          </details>
          <div class="ds-pet-modal-footer">
            <button class="ds-pet-btn ds-pet-btn-secondary" id="dsPetModalCancelBtn">Отмена</button>
            <button class="ds-pet-btn ds-pet-btn-primary" id="dsPetModalSaveBtn">Сохранить</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      let selectedPet = s.pet;
      const petCards = modal.querySelectorAll('.ds-pet-choice-card');
      const selectPet = card => {
        petCards.forEach(c => {
          c.classList.remove('selected');
          c.setAttribute('aria-checked','false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-checked','true');
        selectedPet = card.getAttribute('data-pet');
        const nameInput = document.getElementById('dsPetNameInput');
        if(nameInput && ['Рекс','Луна','Мира','Нова'].includes(nameInput.value))
          nameInput.value = PET_PROFILES[selectedPet].defaultName;
      };
      petCards.forEach(card => {
        card.addEventListener('click', () => selectPet(card));
        card.addEventListener('keydown', event => {
          if(event.key === 'Enter' || event.key === ' '){
            event.preventDefault();selectPet(card);
          }
        });
      });

      const closeModal = () => modal.remove();
      document.getElementById('dsPetModalCloseBtn').onclick = closeModal;
      document.getElementById('dsPetModalCancelBtn').onclick = closeModal;

      document.getElementById('dsPetModalSaveBtn').onclick = () => {
        const nameVal = document.getElementById('dsPetNameInput').value.trim() || PET_PROFILES[selectedPet].defaultName;
        const modeVal = document.getElementById('dsPetModeSelect').value;
        const noseDraftVal = document.getElementById('dsPetNoseDraft').checked;
        const noseRatioVal = document.getElementById('dsPetNoseRatio').checked;
        const noseJobsVal = document.getElementById('dsPetNoseJobs').checked;
        const enabledByScenario = {};
        modal.querySelectorAll('.ds-pet-scenario-switch').forEach(el => {
          if (/^S(0[1-9]|1[0-6])$/.test(el.getAttribute('data-scenario')))
            enabledByScenario[el.getAttribute('data-scenario')] = el.checked;
        });
        const nextLiving = {
          movement:document.getElementById('dsPetMovement').value,
          side:document.getElementById('dsPetSide').value,
          size:document.getElementById('dsPetSize').value,
          face:document.getElementById('dsPetFace').value,
          tipsEnabled:document.getElementById('dsPetTipsEnabled').checked,
          enabledByScenario
        };

        this.saveSettings({
          pet: selectedPet,
          name: nameVal,
          mode: modeVal,
          noseDraft: noseDraftVal,
          noseRatio: noseRatioVal,
          noseJobs: noseJobsVal,
          living:nextLiving,
          enabled: modeVal !== 'off'
        });

        closeModal();
      };
    }

    toggleModeQuick() {
      if (this.settings.mode === 'off') {
        this.saveSettings({ mode: 'calm', enabled: true });
      } else {
        this.saveSettings({ mode: 'off', enabled: false });
      }
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  // Create singleton instance
  const instance = new VirtualPetEngine();

  // Auto-init on DOMContentLoaded if inside browser
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => instance.init());
    } else {
      instance.init();
    }
  }

  instance.default = instance;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = instance;
    module.exports.default = instance;
  }
  return instance;
});
