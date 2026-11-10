// JARVIX 500-Scenario Dynamic Dialog Intelligence & Audio Clip Library
// Indexes all 500 scenarios (1,900 clips) across RU, EN, ES, FR with topic tracking.

const normalize = text => String(text || '').normalize('NFC').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

let masterPromise = null;
let manifestPromise = null;
let tourPromise = null;
const blobs = new Map();
let totalBytes = 0;
const MAX_BYTES = 32 * 1024 * 1024;

// Section Keywords mapping for conversational topic detection
const SECTION_KEYWORDS = {
  HOME: ['главная', 'home', 'домой', 'начало'],
  UNIQ: ['уникализатор', 'уникализац', 'уникальн', 'uniquifier', 'вариатор'],
  PRICE: ['цена', 'цены', 'стоимост', 'тариф', 'тарифы', 'подписк', 'купить', 'pricing', 'план', 'сколько стоит'],
  CANVAS: ['холст', 'канвас', 'canvas', 'доск'],
  APPS: ['приложени', 'apps', 'шаблон', 'воркфлоу'],
  IMAGE: ['картинк', 'изображен', 'фото', 'image', 'рисунок', 'арт'],
  VIDEO: ['видео', 'ролик', 'video', 'клип', 'фильм'],
  AUDIO: ['аудио', 'музык', 'звук', 'трек', 'audio', 'песн'],
  CREDITS: ['кредит', 'баланс', 'пополн', 'токен'],
  TRIAL: ['триал', 'пробн', 'бесплатн', 'попроб'],
  MIC: ['микрофон', 'голос', 'диктовк', 'запис'],
  SETTINGS: ['настройк', 'тема', 'оформлен', 'темн', 'светл', 'неон'],
  ACCOUNT: ['аккаунт', 'профиль', 'кабинет', 'войти', 'логин'],
  AVATAR: ['аватар', 'диктор', 'avatar'],
  TOOLS: ['инструмент', 'утилит', 'everyday tools', 'tools'],
  CHAT: ['джарвис', 'jarvis', 'чат', 'помощник', 'ассистент', 'привет', 'здравствуй', 'дела', 'как ты', 'кто ты']
};

const INTENT_KEYWORDS = {
  0: ['что такое', 'расскажи о', 'что это', 'обзор', 'что значит', 'кто ты'],
  1: ['где найти', 'где находится', 'куда нажать', 'как открыть', 'где'],
  2: ['как начать', 'с чего начать', 'как работать', 'первые шаги', 'как запустить'],
  3: ['когда нужен', 'зачем', 'для чего', 'в каких случаях'],
  4: ['ограничения', 'лимиты', 'правила', 'минусы'],
  5: ['лучший результат', 'как улучшить', 'качество', 'максимальный'],
  6: ['разница', 'отличие', 'сравнение', 'чем отличается'],
  7: ['что делать после', 'что дальше', 'следующий шаг', 'открыл']
};

// Conversational Topic Context (persists across dialog turns)
export const topicContext = {
  section: null,
  chainStep: 0,
  lastScenarioId: null,
  updatedAt: 0
};

export function getTopicContext() {
  if (Date.now() - topicContext.updatedAt > 60000) {
    topicContext.section = null;
    topicContext.chainStep = 0;
    topicContext.lastScenarioId = null;
  }
  return topicContext;
}

export function setTopicContext({ section, chainStep, lastScenarioId }) {
  topicContext.section = section || null;
  topicContext.chainStep = typeof chainStep === 'number' ? chainStep : 0;
  topicContext.lastScenarioId = lastScenarioId || null;
  topicContext.updatedAt = Date.now();
  try {
    sessionStorage.setItem('jarvix_topic_section', topicContext.section || '');
  } catch (_) {}
}

export function createClipLibrary(fetchImpl = fetch) {
  // Load 500 Scenarios Master
  const loadMaster = () => masterPromise ||= fetchImpl('/media/jarvix/jarvix-unified-500-master.json', { signal: AbortSignal.timeout(6000) })
    .then(async r => {
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data.scenarios) ? data.scenarios : (Array.isArray(data) ? data : []);
    }).catch(() => []);

  // Load 1900 Audio Clips Manifest
  const loadManifest = () => manifestPromise ||= fetchImpl('/media/jarvix/clips/manifest-500.json', { signal: AbortSignal.timeout(6000) })
    .then(async r => {
      if (!r.ok) {
        const fallback = await fetchImpl('/media/jarvix/clips/manifest.json', { signal: AbortSignal.timeout(4000) }).catch(() => null);
        if (!fallback || !fallback.ok) return [];
        const fd = await fallback.json().catch(() => ({}));
        return Array.isArray(fd.clips) ? fd.clips : [];
      }
      const data = await r.json().catch(() => ({}));
      return Array.isArray(data.clips) ? data.clips : [];
    }).catch(() => []);

  // Reuse the owner's separately recorded V3 tour MP3s as read-only catalog aliases.
  // No copying, voice generation, server synthesis, or duplicate audio bytes.
  const loadTour = () => tourPromise ||= fetchImpl('/media/jarvix/tour-v3/manifest.json', { signal: AbortSignal.timeout(5000) })
    .then(async response => {
      if (!response.ok) return [];
      const data = await response.json();
      if (data.format !== 'mp3' || data.engine !== 'VoxCPM2' ||
          (data.previewApproved !== true && data.reviewed !== true)) return [];
      return (data.clips || []).filter(clip =>
        ['ru','en','fr','es'].includes(clip.language) &&
        /^t3_(ru|en|fr|es)_[a-f0-9]{12}\.mp3$/.test(clip.filename) &&
        (data.previewApproved === true || clip.reviewed === true) &&
        typeof clip.text === 'string' && clip.text.trim()
      ).map(clip => ({...clip, url:'/media/jarvix/tour-v3/' + clip.filename}));
    }).catch(() => []);

  return {
    prepare: async () => {
      const [scenarios, clips, tourClips] = await Promise.all([loadMaster(), loadManifest(), loadTour()]);
      return { scenarios, clips, tourClips };
    },

    // Intelligent Topic-Aware Scenario Matching
    async findReply(query, language = 'ru', {allowFallback = true} = {}) {
      const q = normalize(query);
      if (!q || q.length < 2) return null;

      const { scenarios, clips, tourClips } = await this.prepare();
      if (!scenarios || !scenarios.length) return null;

      const lang = ['ru', 'en', 'es', 'fr'].includes(language) ? language : 'ru';
      // Match a V3 narration only on an exact phrase, not on one vague keyword.
      const tourExact = tourClips.find(clip => clip.language === lang && normalize(clip.text) === q);
      if (tourExact) return {id:'tour-v3-'+tourExact.filename, text:tourExact.text,
        audioUrl:tourExact.url, action:null, section:'TOUR', chainStep:0};
      const available = new Set(clips.filter(c => c.language === lang).map(c => c.filename));
      const playableScenarios = scenarios.filter(sc => available.has(sc.audio?.[lang]));
      if (!playableScenarios.length) return null;
      const ctx = getTopicContext();

      // 1. Detect section from query keywords
      let detectedSection = null;
      for (const [sec, kws] of Object.entries(SECTION_KEYWORDS)) {
        if (kws.some(kw => q.includes(kw))) {
          detectedSection = sec;
          break;
        }
      }

      const section = detectedSection || ctx.section;

      // 2. Detect intent step
      let detectedStep = null;
      for (const [step, kws] of Object.entries(INTENT_KEYWORDS)) {
        if (kws.some(kw => q.includes(kw))) {
          detectedStep = Number(step);
          break;
        }
      }

      // If staying on the same topic and asking a follow-up, step forward in conversation chain
      if (detectedStep === null && section && section === ctx.section) {
        detectedStep = Math.min(7, ctx.chainStep + 1);
      } else if (detectedStep === null) {
        detectedStep = 0; // Default to topic intro
      }

      // 3. Find matching scenario in this section
      let bestScenario = null;
      if (section) {
        const sectionScenarios = playableScenarios.filter(s => s.section === section);
        if (sectionScenarios.length) {
          bestScenario = sectionScenarios.find(s => s.chainStep === detectedStep) || sectionScenarios[0];
        }
      }

      // 4. Fallback: Search by triggers and question text across all scenarios
      if (!bestScenario) {
        const queryWords = q.split(/\s+/).filter(w => w.length > 2);
        let highestScore = 0;

        for (const sc of playableScenarios) {
          let score = 0;
          const triggers = (sc.triggers && sc.triggers[lang]) || [];
          const qa = (sc.qa && sc.qa[lang]) || {};
          const qText = normalize(qa.question);

          for (const trig of triggers) {
            const tNorm = normalize(trig);
            if (q === tNorm) score = Math.max(score, 100);
            else if (q.includes(tNorm) && tNorm.length > 3) score = Math.max(score, 75);
          }

          if (qText) {
            if (q === qText) score = Math.max(score, 110);
            else {
              const matched = queryWords.filter(w => qText.includes(w)).length;
              if (matched > 0) score = Math.max(score, (matched / queryWords.length) * 50);
            }
          }

          if (score > highestScore) {
            highestScore = score;
            bestScenario = sc;
          }
        }
        if (highestScore < 30) bestScenario = null;
      }

      // A broad unrelated question must not be answered with a fabricated fact.
      // Use an existing neutral recording for queries without a reliable match.
      if (!bestScenario && allowFallback) bestScenario = playableScenarios.find(sc => sc.id === 'F-CHAT-08') || null;
      if (bestScenario) {
        setTopicContext({
          section: bestScenario.section,
          chainStep: bestScenario.chainStep,
          lastScenarioId: bestScenario.id
        });

        const answer = (bestScenario.qa && bestScenario.qa[lang] && bestScenario.qa[lang].answer) ||
                       (bestScenario.phrases && bestScenario.phrases[lang]) || '';
        const audioFile = (bestScenario.audio && bestScenario.audio[lang]) || '';
        const audioUrl = audioFile ? `/media/jarvix/clips/${audioFile}` : null;

        return {
          id: bestScenario.id,
          safeId: bestScenario.safeId,
          text: answer,
          audioUrl,
          action: bestScenario.action || null,
          section: bestScenario.section,
          chainStep: bestScenario.chainStep
        };
      }

      return null;
    },

    // Fetch and cache audio Blob by exact phrase or clip ID
    async get(text, language, signal) {
      if (signal?.aborted) return null;
      const tNorm = normalize(text);
      if (!tNorm) return null;

      const { clips, scenarios, tourClips } = await this.prepare();
      if (signal?.aborted) return null;

      // Find clip in manifest
      let clip = tourClips.find(c => c.language === language && normalize(c.text) === tNorm) ||
        clips.find(c => c.language === language && normalize(c.text) === tNorm);
      if (!clip) {
        const sc = scenarios.find(s => {
          const a = (s.qa && s.qa[language] && s.qa[language].answer) || (s.phrases && s.phrases[language]);
          return normalize(a) === tNorm;
        });
        if (sc && sc.audio && sc.audio[language]) {
          clip = { url: `/media/jarvix/clips/${sc.audio[language]}` };
        }
      }

      if (!clip || !clip.url) return null;

      if (blobs.has(clip.url)) {
        const blob = blobs.get(clip.url);
        blobs.delete(clip.url);
        blobs.set(clip.url, blob);
        return blob;
      }

      try {
        const response = await fetchImpl(clip.url, { signal });
        if (!response.ok || !response.headers.get('content-type')?.startsWith('audio/')) return null;
        const blob = await response.blob();
        if (!blob.size || blob.size > 12 * 1024 * 1024 || signal?.aborted) return null;

        while (totalBytes + blob.size > MAX_BYTES && blobs.size) {
          const key = blobs.keys().next().value;
          totalBytes -= blobs.get(key).size;
          blobs.delete(key);
        }
        blobs.set(clip.url, blob);
        totalBytes += blob.size;
        return blob;
      } catch (_) {
        return null;
      }
    }
  };
}

const defaultLib = createClipLibrary();
export const prepareStaticClips = defaultLib.prepare.bind(defaultLib);
export const getStaticClip = defaultLib.get.bind(defaultLib);
export const findCatalogReply = defaultLib.findReply.bind(defaultLib);
