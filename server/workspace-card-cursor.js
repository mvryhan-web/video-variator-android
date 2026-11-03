/**
 * Pure Owner-Scoped Workspace Card Pagination Cursor (Block 4 W4.4)
 *
 * Deterministic bounded card pagination policy composing the existing
 * selectWorkspaceCardSections output (W4.3), to support mobile Workspace card
 * lists without fetching or leaking raw private job fields.
 *
 * Guarantees:
 * - Pure & deterministic: No DB, network, auth, storage, or external side effects.
 * - Input immutability: Never mutates input arguments or card objects.
 * - Input contract: Accepts pre-sanitized card summaries from W4.3.
 * - Safe owner-scoped opaque cursor: base64url bounded <= 256 characters.
 * - Tamper-proof & integrity verified: cryptographically signed (HMAC-SHA256)
 *   binding requestedSection, account key hash, sort point (createdAt, id), and expiry.
 * - Strict rejection: Malformed, tampered, expired, cross-account, changed-section,
 *   oversized, or stale cursors fail-closed.
 * - Privacy protection: Never echoes raw account keys, prompts, image URLs, or raw job fields.
 * - Bounded pages: pageSize clamped between 1 and 30 (default 30).
 * - Approved sections ONLY: 'recent', 'drafts', 'completed'. Rejects 'favorites',
 *   'challenges', and any unapproved section names.
 * - Deterministic ordering: Consistent with W4.3 (createdAt descending, id ascending tie-breaker).
 * - Exact pagination: No duplicates, no skipped items across consecutive page fetches.
 */

import crypto from 'node:crypto';

export const MIN_PAGE_SIZE = 1;
export const MAX_PAGE_SIZE = 30;
export const DEFAULT_PAGE_SIZE = 30;
export const MAX_CURSOR_LENGTH = 256;
export const CURSOR_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours expiry window

export const APPROVED_SECTIONS = Object.freeze(new Set(['recent', 'drafts', 'completed']));

// Fixed salt / pepper for HMAC integrity check in pure memory domain
const CURSOR_HMAC_SALT = 'deepsyq:workspace:cursor:v1:immutable-pure';

/**
 * Derives a 16-character hex digest of the verified account key
 * to securely bind the cursor without ever storing or echoing the raw account key.
 *
 * @param {string} accountKey
 * @returns {string}
 */
function hashAccountKey(accountKey) {
  return crypto
    .createHmac('sha256', CURSOR_HMAC_SALT)
    .update(`acc:${accountKey}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Computes a compact HMAC-SHA256 signature for the cursor payload fields.
 *
 * @param {string} accountHash
 * @param {string} section
 * @param {number} timeMs
 * @param {string} id
 * @param {number} expMs
 * @returns {string} Base64url encoded 16-byte HMAC prefix
 */
function computeSignature(accountHash, section, timeMs, id, expMs) {
  const content = `${accountHash}:${section}:${timeMs}:${id}:${expMs}`;
  return crypto
    .createHmac('sha256', CURSOR_HMAC_SALT)
    .update(content)
    .digest('base64url')
    .slice(0, 22);
}

/**
 * Safely parses and validates an opaque base64url cursor.
 * Returns decoded cursor payload or null if invalid, tampered, expired, or cross-account.
 *
 * @param {string} cursorStr
 * @param {string} verifiedAccountKey
 * @param {string} requestedSection
 * @param {number} nowMs
 * @returns {{ lastCreatedAtMs: number, lastId: string } | null}
 */
export function decodeAndValidateCursor(cursorStr, verifiedAccountKey, requestedSection, nowMs) {
  if (typeof cursorStr !== 'string') {
    return null;
  }

  const trimmed = cursorStr.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_CURSOR_LENGTH) {
    return null;
  }

  // Base64url characters only
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return null;
  }

  let rawJson;
  try {
    const jsonStr = Buffer.from(trimmed, 'base64url').toString('utf8');
    rawJson = JSON.parse(jsonStr);
  } catch (_) {
    return null;
  }

  // Validate envelope structure: array format [v, accH, sec, timeMs, id, expMs, sig] for compactness
  if (!Array.isArray(rawJson) || rawJson.length !== 7) {
    return null;
  }

  const [version, cursorAccH, cursorSec, cursorTimeMs, cursorId, cursorExpMs, cursorSig] = rawJson;

  if (version !== 1) {
    return null;
  }

  if (typeof cursorAccH !== 'string' || typeof cursorSec !== 'string' || typeof cursorSig !== 'string') {
    return null;
  }

  if (typeof cursorTimeMs !== 'number' || !Number.isSafeInteger(cursorTimeMs) || cursorTimeMs < 0) {
    return null;
  }

  if (typeof cursorExpMs !== 'number' || !Number.isSafeInteger(cursorExpMs) || cursorExpMs <= 0) {
    return null;
  }

  if (typeof cursorId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(cursorId)) {
    return null;
  }

  // 1. Account binding: Must match verified account key hash
  const expectedAccH = hashAccountKey(verifiedAccountKey);
  if (cursorAccH !== expectedAccH) {
    return null; // Cross-account cursor rejected
  }

  // 2. Section binding: Must match the currently requested section
  if (cursorSec !== requestedSection) {
    return null; // Changed-filter/section cursor rejected
  }

  // 3. Expiry check: Must not be stale / expired
  if (nowMs > cursorExpMs) {
    return null; // Expired cursor rejected
  }

  // 4. Clock sanity: Cursor createdAt must not be impossibly far in the future compared to expiry
  if (cursorTimeMs > cursorExpMs) {
    return null;
  }

  // 5. Signature verification: Constant-time comparison
  const expectedSig = computeSignature(expectedAccH, cursorSec, cursorTimeMs, cursorId, cursorExpMs);
  if (cursorSig.length !== expectedSig.length) {
    return null;
  }

  const sigBufferA = Buffer.from(cursorSig);
  const sigBufferB = Buffer.from(expectedSig);
  if (!crypto.timingSafeEqual(sigBufferA, sigBufferB)) {
    return null; // Tampered signature rejected
  }

  return {
    lastCreatedAtMs: cursorTimeMs,
    lastId: cursorId
  };
}

/**
 * Encodes an opaque, bounded, tamper-evident base64url cursor for the given card.
 *
 * @param {Object} card
 * @param {string} verifiedAccountKey
 * @param {string} requestedSection
 * @param {number} nowMs
 * @returns {string | null}
 */
export function encodeCursor(card, verifiedAccountKey, requestedSection, nowMs) {
  if (!card || typeof card !== 'object' || !card.id || !card.createdAt) {
    return null;
  }

  const timeMs = new Date(card.createdAt).getTime();
  if (isNaN(timeMs) || timeMs < 0) {
    return null;
  }

  const id = String(card.id).trim();
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return null;
  }

  const accH = hashAccountKey(verifiedAccountKey);
  const expMs = nowMs + CURSOR_EXPIRY_MS;
  const sig = computeSignature(accH, requestedSection, timeMs, id, expMs);

  const payload = [1, accH, requestedSection, timeMs, id, expMs, sig];
  const cursorStr = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

  if (cursorStr.length > MAX_CURSOR_LENGTH) {
    return null;
  }

  return cursorStr;
}

/**
 * Pure, deterministic comparator matching W4.3:
 * Sorts cards newest-first (createdAt descending), with ascending id tie-breaker.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {number}
 */
function compareCardsDeterministic(a, b) {
  const timeA = new Date(a.createdAt).getTime();
  const timeB = new Date(b.createdAt).getTime();
  if (timeB !== timeA) {
    return timeB - timeA;
  }
  return String(a.id).localeCompare(String(b.id));
}

/**
 * Sanitizes and clones an output card strictly to public W4.2/W4.3 fields.
 * Never leaks private job prompts, URLs, storage keys, account keys, or arbitrary properties.
 *
 * @param {Object} card
 * @returns {Object}
 */
function sanitizeOutputCard(card) {
  const sanitized = {
    id: String(card.id),
    status: typeof card.status === 'string' ? card.status : 'UNKNOWN',
    type: typeof card.type === 'string' ? card.type : 'general',
    createdAt: new Date(card.createdAt).toISOString(),
    title: typeof card.title === 'string' ? card.title.slice(0, 100) : 'Workspace Item',
    previewPlaceholder: null,
    hasPreview: Boolean(card.hasPreview),
    isCompleted: Boolean(card.isCompleted),
    isFailed: Boolean(card.isFailed),
    isProcessing: Boolean(card.isProcessing)
  };

  if (card.previewPlaceholder && typeof card.previewPlaceholder === 'object' && !Array.isArray(card.previewPlaceholder)) {
    sanitized.previewPlaceholder = {
      ready: Boolean(card.previewPlaceholder.ready && sanitized.hasPreview),
      placeholderType: typeof card.previewPlaceholder.placeholderType === 'string'
        ? card.previewPlaceholder.placeholderType.slice(0, 50)
        : `${sanitized.type}_placeholder`,
      label: typeof card.previewPlaceholder.label === 'string'
        ? card.previewPlaceholder.label.slice(0, 50)
        : (sanitized.hasPreview ? 'Preview Available' : 'No Preview')
    };
  } else {
    sanitized.previewPlaceholder = {
      ready: sanitized.hasPreview,
      placeholderType: `${sanitized.type}_placeholder`,
      label: sanitized.hasPreview ? 'Preview Available' : 'No Preview'
    };
  }

  return Object.freeze(sanitized);
}

/**
 * Deterministically paginates Workspace cards from a section.
 *
 * @param {Object} params
 * @param {Object|Array} [params.sections] - Pre-sanitized section mapping or array of cards
 * @param {string} params.requestedSection - One of 'recent', 'drafts', 'completed'
 * @param {string} [params.cursor] - Optional base64url opaque pagination cursor
 * @param {number} [params.pageSize=30] - Page size clamped between 1 and 30
 * @param {number} [params.nowMs] - Current timestamp in ms (defaults to Date.now())
 * @param {string} params.verifiedAccountKey - Non-empty string account identifier
 * @returns {Object} Pure pagination result { items, pageInfo, error }
 */
export function pageWorkspaceCardSections(params) {
  // Fail-closed helper
  const fail = (errorCode) =>
    Object.freeze({
      items: Object.freeze([]),
      pageInfo: null,
      error: errorCode
    });

  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return fail('INVALID_PARAMS');
  }

  const {
    sections,
    requestedSection,
    cursor = null,
    pageSize = DEFAULT_PAGE_SIZE,
    nowMs: rawNowMs,
    verifiedAccountKey
  } = params;

  // 1. Account Key verification: Mandatory non-empty string
  if (typeof verifiedAccountKey !== 'string' || verifiedAccountKey.trim().length === 0) {
    return fail('MISSING_OR_INVALID_ACCOUNT_KEY');
  }
  const accountKey = verifiedAccountKey.trim();

  // 2. Section verification: Only owner-approved sections allowed
  if (typeof requestedSection !== 'string' || !APPROVED_SECTIONS.has(requestedSection.trim())) {
    return fail('UNAPPROVED_OR_INVALID_SECTION');
  }
  const sectionName = requestedSection.trim();

  // 3. Timestamp verification
  const nowMs = typeof rawNowMs === 'number' && Number.isFinite(rawNowMs) && rawNowMs > 0
    ? Math.floor(rawNowMs)
    : Date.now();

  // 4. Page Size normalization: bounded strictly between 1 and 30
  let limit = DEFAULT_PAGE_SIZE;
  if (typeof pageSize === 'number' && Number.isFinite(pageSize)) {
    limit = Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, Math.floor(pageSize)));
  } else if (pageSize !== undefined && pageSize !== null) {
    return fail('INVALID_PAGE_SIZE');
  }

  // 5. Extract section items
  let rawItems = [];
  if (Array.isArray(sections)) {
    rawItems = sections;
  } else if (sections && typeof sections === 'object') {
    if (Array.isArray(sections[sectionName])) {
      rawItems = sections[sectionName];
    } else if (sections.sections && typeof sections.sections === 'object' && Array.isArray(sections.sections[sectionName])) {
      rawItems = sections.sections[sectionName];
    } else {
      rawItems = [];
    }
  } else {
    return fail('INVALID_SECTIONS');
  }

  // 6. Deduplicate & sort items deterministically newest-first
  const seenIds = new Set();
  const validCards = [];

  for (let i = 0; i < rawItems.length; i++) {
    const c = rawItems[i];
    if (!c || typeof c !== 'object' || Array.isArray(c)) continue;
    const cid = String(c.id || '').trim();
    if (!cid || !/^[a-zA-Z0-9_-]{1,128}$/.test(cid)) continue;
    if (seenIds.has(cid)) continue;
    const time = new Date(c.createdAt).getTime();
    if (isNaN(time) || time < 0) continue;

    seenIds.add(cid);
    validCards.push(c);
  }

  validCards.sort(compareCardsDeterministic);

  // 7. Validate and apply cursor if present
  let startIndex = 0;
  if (cursor !== null && cursor !== undefined) {
    const decoded = decodeAndValidateCursor(cursor, accountKey, sectionName, nowMs);
    if (!decoded) {
      return fail('INVALID_OR_STALE_CURSOR');
    }

    // Find the item corresponding to the cursor point
    // Since cards are sorted descending by createdAt then ascending by id:
    // A card is "after" the cursor if:
    // - its createdAt < cursor.lastCreatedAtMs
    // - or its createdAt === cursor.lastCreatedAtMs and card.id > cursor.lastId
    let foundCursorPoint = false;
    for (let i = 0; i < validCards.length; i++) {
      const cardTime = new Date(validCards[i].createdAt).getTime();
      const cardId = String(validCards[i].id);

      if (cardTime === decoded.lastCreatedAtMs && cardId === decoded.lastId) {
        startIndex = i + 1;
        foundCursorPoint = true;
        break;
      }
    }

    if (!foundCursorPoint) {
      // If the exact card wasn't found (e.g. deleted or outside window),
      // advance to the first card strictly after the cursor sort position
      let idx = 0;
      while (idx < validCards.length) {
        const cardTime = new Date(validCards[idx].createdAt).getTime();
        const cardId = String(validCards[idx].id);
        const isAfter =
          cardTime < decoded.lastCreatedAtMs ||
          (cardTime === decoded.lastCreatedAtMs && cardId.localeCompare(decoded.lastId) > 0);

        if (isAfter) {
          break;
        }
        idx++;
      }
      startIndex = idx;
    }
  }

  // 8. Slice the page
  const pageSlice = validCards.slice(startIndex, startIndex + limit);
  const items = Object.freeze(pageSlice.map(sanitizeOutputCard));
  const hasMore = startIndex + pageSlice.length < validCards.length;

  let nextCursor = null;
  if (hasMore && pageSlice.length > 0) {
    const lastCard = pageSlice[pageSlice.length - 1];
    nextCursor = encodeCursor(lastCard, accountKey, sectionName, nowMs);
  }

  const pageInfo = Object.freeze({
    requestedSection: sectionName,
    pageSize: limit,
    count: items.length,
    total: validCards.length,
    hasMore,
    more: hasMore, // Convenience alias matching prompt description
    nextCursor
  });

  return Object.freeze({
    items,
    pageInfo,
    error: null
  });
}

export default pageWorkspaceCardSections;
