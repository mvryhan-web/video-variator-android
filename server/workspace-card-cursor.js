/**
 * F4 / W4.4: pure, owner-scoped pagination policy for ALREADY AUTHORIZED and
 * sanitized W4.2/W4.3 card summaries. This module does not authenticate a user,
 * query Neon, or authorize a card: its caller MUST do that before passing cards.
 *
 * A caller must provide a high-entropy signingSecret from server-side config.
 * Never expose it in a client bundle, use an account ID as the signing key, or
 * use a constant checked into Git. Missing secret => fail closed.
 *
 * W4.3 currently caps sections at 30 and reports sourceValidated=false.
 * Paginating more than 30 entries requires an upstream, server-authorized,
 * untruncated array of sanitized summaries. This policy adds NO HTTP route.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const MAX_PAGE_SIZE = 30;
export const MAX_CURSOR_LENGTH = 256;
export const CURSOR_TTL_MS = 15 * 60 * 1000;
export const APPROVED_SECTIONS = Object.freeze(['recent', 'drafts', 'completed']);

const SECTION_SET = new Set(APPROVED_SECTIONS);
const TYPE_SET = new Set(['video', 'image', 'audio', 'text', 'general']);
const STATUS_SET = new Set(['queued', 'processing', 'completed', 'failed', 'cancelled', 'UNKNOWN']);
const VERSION = 1;
const HASH_BYTES = 12;
const MAC_BYTES = 16; // 128-bit truncated HMAC-SHA256 authentication tag
const HEADER_BYTES = 12;
const MAX_ID_BYTES = 128;
const MAX_FUTURE_SKEW_MS = 60_000;
const fail = (error) => Object.freeze({ items: Object.freeze([]), pageInfo: null, error });

function signingKey(value) {
  const key = typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
  return Buffer.isBuffer(key) && key.length >= 32 ? key : null;
}

function normalizeFilters(value) {
  if (value === undefined || value === null) value = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const allowed = new Set(['searchQuery', 'typeFilter', 'statusFilter']);
  if (Object.keys(value).some((key) => !allowed.has(key))) return null;
  if (value.searchQuery != null && typeof value.searchQuery !== 'string') return null;
  if (value.typeFilter != null && typeof value.typeFilter !== 'string') return null;
  if (value.statusFilter != null && typeof value.statusFilter !== 'string') return null;
  const searchQuery = (value.searchQuery || '').trim().toLowerCase().slice(0, 100);
  const typeFilter = (value.typeFilter || '').trim().toLowerCase();
  const statusFilter = (value.statusFilter || '').trim().toLowerCase();
  if (typeFilter && !TYPE_SET.has(typeFilter)) return null;
  if (statusFilter && !STATUS_SET.has(statusFilter)) return null;
  return [searchQuery, typeFilter, statusFilter];
}

function safeText(text, maxLength, fallback) {
  if (typeof text !== 'string') return fallback;
  const clean = text.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
  return clean || fallback;
}

function sanitizeSummary(card, nowMs) {
  if (!card || typeof card !== 'object' || Array.isArray(card)) return null;
  if (typeof card.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(card.id)) return null;
  if (!TYPE_SET.has(card.type) || !STATUS_SET.has(card.status)) return null;
  if (typeof card.createdAt !== 'string') return null;
  const ms = new Date(card.createdAt).getTime();
  if (!Number.isSafeInteger(ms) || ms < 0 || ms > nowMs + MAX_FUTURE_SKEW_MS || ms >= 2 ** 48) return null;
  const hasPreview = card.isCompleted === true && card.status === 'completed' && card.hasPreview === true;
  const rawPlaceholder = card.previewPlaceholder;
  const placeholder = rawPlaceholder && typeof rawPlaceholder === 'object' && !Array.isArray(rawPlaceholder)
    ? rawPlaceholder : {};
  const item = {
    id: card.id,
    status: card.status,
    type: card.type,
    createdAt: new Date(ms).toISOString(),
    title: safeText(card.title, 100, 'Workspace Item'),
    previewPlaceholder: Object.freeze({
      ready: Boolean(placeholder.ready && hasPreview),
      placeholderType: safeText(placeholder.placeholderType, 50, `${card.type}_placeholder`),
      label: safeText(placeholder.label, 50, hasPreview ? 'Preview Available' : 'No Preview')
    }),
    hasPreview,
    isCompleted: card.isCompleted === true && card.status === 'completed',
    isFailed: card.isFailed === true || card.status === 'failed',
    isProcessing: card.isProcessing === true && (card.status === 'queued' || card.status === 'processing')
  };
  return Object.freeze(item);
}

// Identical (createdAt DESC, ID localeCompare ASC) tie-break policy to W4.3.
function cardOrder(a, b) {
  const delta = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  return delta || a.id.localeCompare(b.id);
}

function inputSection(sections, section) {
  if (Array.isArray(sections)) return sections;
  if (!sections || typeof sections !== 'object') return null;
  if (Array.isArray(sections[section])) return sections[section];
  if (sections.sections && typeof sections.sections === 'object' && Array.isArray(sections.sections[section])) {
    return sections.sections[section];
  }
  return null;
}

function snapshotHash(items) {
  const hash = createHash('sha256');
  for (const item of items) {
    hash.update(item.id, 'utf8');
    hash.update('\0');
    hash.update(item.createdAt, 'utf8');
    hash.update('\0');
    hash.update(item.type, 'utf8');
    hash.update('\0');
    hash.update(item.status, 'utf8');
    hash.update('\0');
  }
  return hash.digest().subarray(0, HASH_BYTES);
}

function mac(key, accountKey, section, filters, unsigned) {
  return createHmac('sha256', key)
    .update('DEEPSYQ:W4.4:CURSOR:V1\0')
    .update(JSON.stringify([accountKey, section, filters]))
    .update('\0')
    .update(unsigned)
    .digest().subarray(0, MAC_BYTES);
}

// Compact binary cursor: [version:1, issuedSec:4, lastTimeMs:6, idLen:1,
// lastId:1..128, listFingerprint:12, HMAC-SHA256:16], base64url encoded.
// At maximal 128-byte ID, the token is only 224 characters (< 256).
function mintCursor(last, nowMs, fingerprint, key, accountKey, section, filters) {
  const id = Buffer.from(last.id, 'ascii');
  const unsigned = Buffer.alloc(HEADER_BYTES + id.length + HASH_BYTES);
  unsigned[0] = VERSION;
  unsigned.writeUInt32BE(Math.floor(nowMs / 1000), 1);
  unsigned.writeUIntBE(Date.parse(last.createdAt), 5, 6);
  unsigned[11] = id.length;
  id.copy(unsigned, HEADER_BYTES);
  fingerprint.copy(unsigned, HEADER_BYTES + id.length);
  const token = Buffer.concat([unsigned, mac(key, accountKey, section, filters, unsigned)]).toString('base64url');
  return token.length <= MAX_CURSOR_LENGTH ? token : null;
}

function readCursor(cursor, nowMs, fingerprint, key, accountKey, section, filters) {
  if (typeof cursor !== 'string' || cursor.length < 1 || cursor.length > MAX_CURSOR_LENGTH || !/^[A-Za-z0-9_-]+$/.test(cursor)) return null;
  const bytes = Buffer.from(cursor, 'base64url');
  if (bytes.toString('base64url') !== cursor || bytes.length < HEADER_BYTES + 1 + HASH_BYTES + MAC_BYTES) return null;
  if (bytes[0] !== VERSION) return null;
  const issuedMs = bytes.readUInt32BE(1) * 1000;
  if (issuedMs > nowMs + MAX_FUTURE_SKEW_MS || nowMs - issuedMs > CURSOR_TTL_MS) return null;
  const idLength = bytes[11];
  if (idLength < 1 || idLength > MAX_ID_BYTES || bytes.length !== HEADER_BYTES + idLength + HASH_BYTES + MAC_BYTES) return null;
  const unsigned = bytes.subarray(0, bytes.length - MAC_BYTES);
  const suppliedMac = bytes.subarray(bytes.length - MAC_BYTES);
  if (!timingSafeEqual(suppliedMac, mac(key, accountKey, section, filters, unsigned))) return null;
  const cursorFingerprint = bytes.subarray(HEADER_BYTES + idLength, unsigned.length);
  if (!timingSafeEqual(cursorFingerprint, fingerprint)) return null;
  const lastId = bytes.subarray(HEADER_BYTES, HEADER_BYTES + idLength).toString('ascii');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(lastId)) return null;
  return { lastId, lastTimeMs: unsigned.readUIntBE(5, 6) };
}

/**
 * @param {object} params
 * @param {object|Array} params.sections Pre-sanitized account-filtered arrays (untruncated for full pagination)
 * @param {'recent'|'drafts'|'completed'} params.requestedSection
 * @param {string} params.verifiedAccountKey Server-verified owner ID, NEVER user input
 * @param {string|Buffer} params.signingSecret Private server-side random secret (>=32 bytes)
 * @param {object} [params.filters] Exact W4.3 {searchQuery,typeFilter,statusFilter} used upstream
 * @param {string} [params.cursor] Opaque token returned by prior call
 * @param {number} [params.pageSize] 1..30, default 30
 * @param {number} [params.nowMs] Safe clock dependency for deterministic tests
 */
export function pageWorkspaceCardSections(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return fail('INVALID_PARAMS');
  const { sections, requestedSection, verifiedAccountKey, signingSecret, filters, cursor = null, pageSize = 30, nowMs = Date.now() } = params;
  if (typeof verifiedAccountKey !== 'string' || !verifiedAccountKey.trim() || Buffer.byteLength(verifiedAccountKey) > 256 || /[\u0000-\u001f]/.test(verifiedAccountKey)) return fail('INVALID_ACCOUNT');
  if (!SECTION_SET.has(requestedSection)) return fail('INVALID_SECTION');
  const key = signingKey(signingSecret);
  if (!key) return fail('CURSOR_SECRET_UNAVAILABLE');
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0 || nowMs >= 2 ** 48 || Math.floor(nowMs / 1000) > 0xffffffff) return fail('INVALID_TIME');
  if (typeof pageSize !== 'number' || !Number.isFinite(pageSize)) return fail('INVALID_PAGE_SIZE');
  const limit = Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(pageSize)));
  const normalizedFilters = normalizeFilters(filters);
  if (!normalizedFilters) return fail('INVALID_FILTERS');
  const rawItems = inputSection(sections, requestedSection);
  if (!rawItems) return fail('INVALID_SECTIONS');

  const seen = new Set();
  const items = [];
  for (const raw of rawItems) {
    const card = sanitizeSummary(raw, nowMs);
    if (!card || seen.has(card.id)) return fail('INVALID_CARD_DATA');
    seen.add(card.id);
    items.push(card);
  }
  items.sort(cardOrder);
  const fingerprint = snapshotHash(items);
  let offset = 0;
  if (cursor !== null && cursor !== undefined) {
    const parsed = readCursor(cursor, nowMs, fingerprint, key, verifiedAccountKey, requestedSection, normalizedFilters);
    if (!parsed) return fail('INVALID_OR_STALE_CURSOR');
    const idx = items.findIndex((item) => item.id === parsed.lastId && Date.parse(item.createdAt) === parsed.lastTimeMs);
    if (idx === -1) return fail('INVALID_OR_STALE_CURSOR');
    offset = idx + 1;
  }
  const page = Object.freeze(items.slice(offset, offset + limit));
  const hasMore = offset + page.length < items.length;
  const nextCursor = hasMore && page.length
    ? mintCursor(page[page.length - 1], nowMs, fingerprint, key, verifiedAccountKey, requestedSection, normalizedFilters)
    : null;
  if (hasMore && !nextCursor) return fail('CURSOR_ENCODING_ERROR');
  return Object.freeze({
    items: page,
    pageInfo: Object.freeze({
      requestedSection, pageSize: limit, count: page.length, total: items.length,
      hasMore, more: hasMore, nextCursor
    }),
    error: null
  });
}

export default pageWorkspaceCardSections;
