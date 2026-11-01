/**
 * Pure Workspace Cards Search and Sections (Block 4 W4.3)
 *
 * Pure, deterministic, fail-closed Workspace card selection, categorization,
 * and mobile-safe search/filter contract.
 *
 * Operates strictly over pre-sanitized, account-pre-filtered public card summaries
 * conforming to the W4.2 card contract:
 * { id, status, type, createdAt, title, hasPreview, isCompleted, isFailed, isProcessing }
 *
 * Guarantees:
 * - Pure & deterministic: No DB, network, auth, storage, or external side effects.
 * - Input immutability: Never mutates input arguments or objects.
 * - Fail-closed validation: Rejects malformed cards, duplicate IDs, and impossible dates.
 * - Information leakage prevention: Output cards only retain safe public fields.
 *   Raw prompts, URLs, output keys, customer IDs, tokens, costs, and arbitrary props are stripped.
 * - Section categorization: recent, drafts, completed, favorites.
 * - Favorites security: Only included if trusted proof is provided; otherwise empty with favoritesUnavailable flag.
 * - Bounded output: Max 30 items per section, newest-first sort with id tie-breaker.
 * - Safe search: Case-folded search strictly over title and id, clamped to 100 characters.
 */

const MAX_SECTION_ITEMS = 30;
const MAX_SEARCH_LENGTH = 100;
const CLOCK_SKEW_TOLERANCE_MS = 60 * 1000; // 60 seconds tolerance for future dates

const ALLOWED_TYPES = new Set(['video', 'image', 'audio', 'text', 'general']);
const ALLOWED_STATUSES = new Set(['queued', 'processing', 'completed', 'failed', 'cancelled', 'UNKNOWN']);

/**
 * Validates and sanitizes a single input card summary according to W4.2 contract.
 * Returns a sanitized clean card object or null if the card is malformed/invalid.
 *
 * @param {Object} rawCard
 * @param {number} nowMs - Current time in ms for date sanity checks
 * @returns {Object|null}
 */
function validateAndSanitizeCard(rawCard, nowMs) {
  if (!rawCard || typeof rawCard !== 'object' || Array.isArray(rawCard)) {
    return null;
  }

  // 1. Validate ID: non-empty string matching standard identifier pattern
  const rawId = rawCard.id;
  if (typeof rawId !== 'string' && !(typeof rawId === 'number' && Number.isSafeInteger(rawId) && rawId >= 0)) {
    return null;
  }
  const id = String(rawId).trim();
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return null;
  }

  // 2. Validate Type: must be one of allowed types
  const rawType = typeof rawCard.type === 'string' ? rawCard.type.trim().toLowerCase() : '';
  const type = ALLOWED_TYPES.has(rawType) ? rawType : 'general';

  // 3. Validate Status: must be one of allowed statuses or normalized
  const rawStatus = typeof rawCard.status === 'string' ? rawCard.status.trim().toLowerCase() : '';
  let status = 'UNKNOWN';
  if (['queued', 'pending'].includes(rawStatus)) status = 'queued';
  else if (['processing', 'running', 'generating', 'finalizing'].includes(rawStatus)) status = 'processing';
  else if (['completed', 'done', 'finished', 'ready', 'success'].includes(rawStatus)) status = 'completed';
  else if (['failed', 'error'].includes(rawStatus)) status = 'failed';
  else if (['cancelled', 'canceled'].includes(rawStatus)) status = 'cancelled';
  else if (ALLOWED_STATUSES.has(rawStatus)) status = rawStatus;

  // 4. Validate createdAt: parse timestamp, reject NaN, epoch 0 (unless explicit), and future dates
  const rawCreatedAt = rawCard.createdAt;
  if (!rawCreatedAt || (typeof rawCreatedAt !== 'string' && typeof rawCreatedAt !== 'number' && !(rawCreatedAt instanceof Date))) {
    return null;
  }
  const parsedDate = new Date(rawCreatedAt);
  const timeMs = parsedDate.getTime();
  if (isNaN(timeMs) || timeMs < 0) {
    return null;
  }
  // Reject future timestamps beyond clock skew tolerance
  if (timeMs > nowMs + CLOCK_SKEW_TOLERANCE_MS) {
    return null;
  }
  const createdAt = parsedDate.toISOString();

  // 5. Title: fallback-safe sanitized string
  let title = 'Workspace Item';
  if (typeof rawCard.title === 'string' && rawCard.title.trim().length > 0) {
    // Strip HTML tags and tag contents (like <script>...</script>) as well as dangling tags
    let stripped = rawCard.title.replace(/<[^>]+>[^<]*<\/[^>]+>/gi, '');
    stripped = stripped.replace(/<[^>]*>/g, '').trim();
    if (stripped.length > 0) {
      title = stripped.slice(0, 100);
    }
  }

  // 6. Evidence-backed Boolean flags
  const isCompleted = status === 'completed' && Boolean(rawCard.isCompleted);
  const isFailed = status === 'failed' || Boolean(rawCard.isFailed && status !== 'completed');
  const isProcessing = (status === 'processing' || status === 'queued') && Boolean(rawCard.isProcessing);
  const hasPreview = Boolean(rawCard.hasPreview && isCompleted);

  // 7. Preview Placeholder (safe contract)
  let previewPlaceholder = null;
  if (rawCard.previewPlaceholder && typeof rawCard.previewPlaceholder === 'object' && !Array.isArray(rawCard.previewPlaceholder)) {
    previewPlaceholder = {
      ready: Boolean(rawCard.previewPlaceholder.ready && hasPreview),
      placeholderType: typeof rawCard.previewPlaceholder.placeholderType === 'string'
        ? rawCard.previewPlaceholder.placeholderType.slice(0, 50)
        : `${type}_placeholder`,
      label: typeof rawCard.previewPlaceholder.label === 'string'
        ? rawCard.previewPlaceholder.label.slice(0, 50)
        : (hasPreview ? 'Preview Available' : 'No Preview')
    };
  } else {
    previewPlaceholder = {
      ready: hasPreview,
      placeholderType: `${type}_placeholder`,
      label: hasPreview
        ? 'Preview Available'
        : isProcessing
        ? 'Generating...'
        : isFailed
        ? 'Failed'
        : 'No Preview'
    };
  }

  // Pure sanitized card strictly containing allowed properties
  return {
    id,
    status,
    type,
    createdAt,
    title,
    previewPlaceholder,
    hasPreview,
    isCompleted,
    isFailed,
    isProcessing,
  };
}

/**
 * Validates favorite proof provided by the caller.
 * Favorite proof must be an explicit, trusted owner-scope proof:
 * e.g. a Set of verified favorite IDs, an Array of verified favorite IDs, or a predicate function.
 *
 * @param {*} favoriteProof
 * @returns {{ hasProof: boolean, isFavorite: function(string): boolean }}
 */
function resolveFavoriteVerifier(favoriteProof) {
  if (!favoriteProof) {
    return { hasProof: false, isFavorite: () => false };
  }

  if (typeof favoriteProof === 'function') {
    return {
      hasProof: true,
      isFavorite: (id) => {
        try {
          return Boolean(favoriteProof(id));
        } catch (_) {
          return false;
        }
      }
    };
  }

  if (favoriteProof instanceof Set) {
    return {
      hasProof: true,
      isFavorite: (id) => favoriteProof.has(id)
    };
  }

  if (Array.isArray(favoriteProof)) {
    const set = new Set(favoriteProof.map(String));
    return {
      hasProof: true,
      isFavorite: (id) => set.has(id)
    };
  }

  if (typeof favoriteProof === 'object' && favoriteProof !== null) {
    // If passed as an object mapping id -> boolean
    return {
      hasProof: true,
      isFavorite: (id) => Boolean(favoriteProof[id])
    };
  }

  return { hasProof: false, isFavorite: () => false };
}

/**
 * Deterministically sorts cards: newest first (createdAt descending), with ascending id tie-breaker.
 * Does not mutate the source array.
 *
 * @param {Array<Object>} cardList
 * @returns {Array<Object>}
 */
function sortCardsDeterministic(cardList) {
  return [...cardList].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * Selects, searches, and partitions Workspace cards into sections.
 *
 * @param {Object} params
 * @param {Array<Object>} [params.cards] - Preloaded, pre-sanitized card summaries
 * @param {Object} [params.options] - Search and filtering options
 * @param {string} [params.options.searchQuery] - Search term (clamped to 100 chars, matched over title/id)
 * @param {string} [params.options.typeFilter] - Optional type filter ('video', 'image', 'audio', 'text', 'general')
 * @param {string} [params.options.statusFilter] - Optional status filter ('queued', 'processing', 'completed', etc.)
 * @param {number} [params.options.limit] - Max items per section (default & max 30)
 * @param {number} [params.options.referenceTimeMs] - Optional reference time for testing future timestamps
 * @param {*} [params.favoriteProof] - Trusted favorite proof (Set, Array, Map/Object, or Predicate fn)
 * @returns {Object} Result object containing sections, counts, and metadata
 */
export function selectWorkspaceCardSections(params = {}) {
  // Fail-closed defaults
  const emptyResult = {
    sections: {
      recent: [],
      drafts: [],
      completed: [],
      favorites: []
    },
    counts: {
      total: 0,
      recent: 0,
      drafts: 0,
      completed: 0,
      favorites: 0,
      byType: {
        video: 0,
        image: 0,
        audio: 0,
        text: 0,
        general: 0
      }
    },
    metadata: {
      favoritesUnavailable: true,
      sourceValidated: false,
      filterApplied: false,
      resultBounded: false
    }
  };

  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return emptyResult;
  }

  const { cards, options = {}, favoriteProof } = params;

  if (!Array.isArray(cards)) {
    return emptyResult;
  }

  const nowMs = typeof options.referenceTimeMs === 'number' && Number.isFinite(options.referenceTimeMs)
    ? options.referenceTimeMs
    : Date.now();

  const maxItems = typeof options.limit === 'number' && options.limit > 0 && options.limit <= MAX_SECTION_ITEMS
    ? Math.floor(options.limit)
    : MAX_SECTION_ITEMS;

  // Sanitize search query: case-folded, length <= 100
  let searchQuery = '';
  if (typeof options.searchQuery === 'string') {
    searchQuery = options.searchQuery.trim().toLowerCase().slice(0, MAX_SEARCH_LENGTH);
  }

  // Validate type filter
  let typeFilter = null;
  if (typeof options.typeFilter === 'string') {
    const tf = options.typeFilter.trim().toLowerCase();
    if (ALLOWED_TYPES.has(tf)) {
      typeFilter = tf;
    }
  }

  // Validate status filter
  let statusFilter = null;
  if (typeof options.statusFilter === 'string') {
    const sf = options.statusFilter.trim().toLowerCase();
    if (ALLOWED_STATUSES.has(sf)) {
      statusFilter = sf;
    }
  }

  const filterApplied = Boolean(searchQuery.length > 0 || typeFilter || statusFilter);

  // Resolve favorite proof
  const favoriteVerifier = resolveFavoriteVerifier(favoriteProof);

  // Validate, deduplicate, and filter cards
  const seenIds = new Set();
  const validCards = [];

  for (let i = 0; i < cards.length; i++) {
    const card = validateAndSanitizeCard(cards[i], nowMs);
    if (!card) continue;

    // Reject duplicate IDs (fail closed on duplicate to prevent cross-card collisions)
    if (seenIds.has(card.id)) {
      continue;
    }
    seenIds.add(card.id);

    // Apply type filter
    if (typeFilter && card.type !== typeFilter) {
      continue;
    }

    // Apply status filter
    if (statusFilter && card.status !== statusFilter) {
      continue;
    }

    // Apply search query: search strictly on title and id
    if (searchQuery.length > 0) {
      const matchTitle = card.title.toLowerCase().includes(searchQuery);
      const matchId = card.id.toLowerCase().includes(searchQuery);
      if (!matchTitle && !matchId) {
        continue;
      }
    }

    validCards.push(card);
  }

  // Counts summary across all matched valid cards
  const counts = {
    total: validCards.length,
    recent: Math.min(validCards.length, maxItems),
    drafts: 0,
    completed: 0,
    favorites: 0,
    byType: {
      video: 0,
      image: 0,
      audio: 0,
      text: 0,
      general: 0
    }
  };

  const rawDrafts = [];
  const rawCompleted = [];
  const rawFavorites = [];

  for (const card of validCards) {
    if (counts.byType[card.type] !== undefined) {
      counts.byType[card.type]++;
    }

    // Drafts: queued or processing
    if (card.isProcessing || card.status === 'queued' || card.status === 'processing') {
      rawDrafts.push(card);
    }

    // Completed: strictly completed with isCompleted flag
    if (card.isCompleted && card.status === 'completed') {
      rawCompleted.push(card);
    }

    // Favorites: only if trusted proof is verified for this card
    if (favoriteVerifier.hasProof && favoriteVerifier.isFavorite(card.id)) {
      rawFavorites.push(card);
    }
  }

  counts.drafts = rawDrafts.length;
  counts.completed = rawCompleted.length;
  counts.favorites = rawFavorites.length;

  // Deterministic newest-first sort for each section
  const sortedRecent = sortCardsDeterministic(validCards);
  const sortedDrafts = sortCardsDeterministic(rawDrafts);
  const sortedCompleted = sortCardsDeterministic(rawCompleted);
  const sortedFavorites = sortCardsDeterministic(rawFavorites);

  const boundedRecent = sortedRecent.slice(0, maxItems);
  const boundedDrafts = sortedDrafts.slice(0, maxItems);
  const boundedCompleted = sortedCompleted.slice(0, maxItems);
  const boundedFavorites = sortedFavorites.slice(0, maxItems);

  const resultBounded = (
    sortedRecent.length > maxItems ||
    sortedDrafts.length > maxItems ||
    sortedCompleted.length > maxItems ||
    sortedFavorites.length > maxItems
  );

  return {
    sections: {
      recent: boundedRecent,
      drafts: boundedDrafts,
      completed: boundedCompleted,
      favorites: boundedFavorites
    },
    counts,
    metadata: {
      favoritesUnavailable: !favoriteVerifier.hasProof,
      sourceValidated: false, // Caller must perform real account authorization
      filterApplied,
      resultBounded
    }
  };
}

export default selectWorkspaceCardSections;
