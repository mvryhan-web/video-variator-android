/** W4.4 no-spend native Node tests: private owner-scoped card cursor policy. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  pageWorkspaceCardSections, MAX_PAGE_SIZE, MAX_CURSOR_LENGTH,
  CURSOR_TTL_MS, APPROVED_SECTIONS
} from '../server/workspace-card-cursor.js';

const NOW = Date.parse('2026-11-08T12:00:00.000Z');
const SECRET = Buffer.from('W4.4 test signing key only - not for production!').subarray(0, 40);
const OTHER_SECRET = Buffer.from('different server key and still at least 32 bytes');
const alice = 'verified-owner-alice';
const bob = 'verified-owner-bob';
const card = (id, createdAt = '2026-11-01T10:00:00.000Z', status = 'completed') => ({
  id, createdAt, status, type: 'image', title: `Card ${id}`,
  hasPreview: status === 'completed', isCompleted: status === 'completed',
  isFailed: false, isProcessing: status === 'queued',
  previewPlaceholder: { ready: status === 'completed', placeholderType: 'image_placeholder', label: 'Preview Available' }
});
const page = (sections, options = {}) => pageWorkspaceCardSections({
  sections, requestedSection: 'recent', verifiedAccountKey: alice,
  signingSecret: SECRET, nowMs: NOW, ...options
});

async function collectAll(sections, pageSize, options = {}) {
  const result = [];
  let cursor = null;
  for (let i = 0; i < 200; i++) {
    const p = page(sections, { pageSize, cursor, ...options });
    assert.equal(p.error, null, p.error);
    assert.ok(p.items.length <= 30);
    result.push(...p.items.map(x => x.id));
    if (!p.pageInfo.hasMore) {
      assert.equal(p.pageInfo.nextCursor, null);
      return result;
    }
    assert.ok(p.pageInfo.nextCursor);
    assert.ok(p.pageInfo.nextCursor.length <= MAX_CURSOR_LENGTH);
    cursor = p.pageInfo.nextCursor;
  }
  assert.fail('cursor traversal did not terminate');
}

test('W4.4: approved sections and empty data are safe and immutable', () => {
  assert.deepEqual(APPROVED_SECTIONS, ['recent', 'drafts', 'completed']);
  for (const requestedSection of APPROVED_SECTIONS) {
    const result = page({ recent: [], drafts: [], completed: [] }, { requestedSection });
    assert.equal(result.error, null);
    assert.deepEqual(result.items, []);
    assert.deepEqual([result.pageInfo.count, result.pageInfo.total, result.pageInfo.hasMore, result.pageInfo.nextCursor], [0, 0, false, null]);
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.pageInfo));
    assert.ok(Object.isFrozen(result.items));
  }
  for (const requestedSection of ['favorites', 'challenges', 'admin', 'RECENT', '', null]) {
    const r = page([], { requestedSection });
    assert.equal(r.error, 'INVALID_SECTION');
    assert.deepEqual(r.items, []);
  }
});

test('W4.4: reject invalid params, unverified caller, missing or weak server signing secret', () => {
  assert.equal(pageWorkspaceCardSections(null).error, 'INVALID_PARAMS');
  assert.equal(page([], { verifiedAccountKey: '' }).error, 'INVALID_ACCOUNT');
  assert.equal(page([], { verifiedAccountKey: 'wrong\0owner' }).error, 'INVALID_ACCOUNT');
  assert.equal(page([], { signingSecret: undefined }).error, 'CURSOR_SECRET_UNAVAILABLE');
  assert.equal(page([], { signingSecret: alice }).error, 'CURSOR_SECRET_UNAVAILABLE');
  assert.equal(page([], { signingSecret: Buffer.alloc(31) }).error, 'CURSOR_SECRET_UNAVAILABLE');
  assert.equal(page([], { nowMs: Number.NaN }).error, 'INVALID_TIME');
  assert.equal(page([], { nowMs: -1 }).error, 'INVALID_TIME');
  assert.equal(page([], { pageSize: '5' }).error, 'INVALID_PAGE_SIZE');
  assert.equal(page([], { pageSize: NaN }).error, 'INVALID_PAGE_SIZE');
  assert.equal(page(123).error, 'INVALID_SECTIONS');
  assert.equal(page({ drafts: [] }).error, 'INVALID_SECTIONS');
});

test('W4.4: full 91-item traversal, date ties, deterministic ID order, no gaps or duplicates', async () => {
  const cards = [];
  for (let i = 90; i >= 0; i--) {
    cards.push(card(`id_${String(i).padStart(3,'0')}`, i < 60 ? '2026-11-01T10:00:00.000Z' : '2026-10-31T23:59:59.999Z'));
  }
  const original = structuredClone(cards);
  for (const mobileSize of [1, 3, 7, 15, 30, 35]) {
    const ids = await collectAll(cards, mobileSize);
    assert.equal(ids.length, 91);
    assert.equal(new Set(ids).size, 91);
    assert.deepEqual(ids, [...ids].sort((a,b) => {
      const aMs = Date.parse(cards.find(c => c.id === a).createdAt);
      const bMs = Date.parse(cards.find(c => c.id === b).createdAt);
      return bMs - aMs || a.localeCompare(b);
    }));
  }
  assert.deepEqual(cards, original);
});

test('W4.4: strict page sizes 1..30 and 128-byte IDs still yield <=256-byte cursors', () => {
  const largeIds = [card('a'.repeat(128)), card('b'.repeat(128)), card('c'.repeat(128))];
  assert.equal(MAX_PAGE_SIZE, 30);
  assert.equal(page(largeIds, { pageSize: 0 }).items.length, 1);
  assert.equal(page(largeIds, { pageSize: -999 }).items.length, 1);
  assert.equal(page(largeIds, { pageSize: 999 }).items.length, 3);
  const first = page(largeIds, { pageSize: 1 });
  assert.equal(first.error, null);
  assert.ok(first.pageInfo.nextCursor.length <= MAX_CURSOR_LENGTH);
  assert.ok(first.pageInfo.nextCursor.length > 0);
  assert.equal(page(largeIds, { pageSize: 1, cursor: first.pageInfo.nextCursor }).items[0].id, 'b'.repeat(128));
});

test('W4.4: reject tampered, malformed, noncanonical and oversized cursors', () => {
  const cards = [card('a'), card('b'), card('c')];
  const token = page(cards, {pageSize:1}).pageInfo.nextCursor;
  const mutated = token.slice(0, 7) + (token[7] === 'A' ? 'B' : 'A') + token.slice(8);
  for (const cursor of [mutated, token + 'A', token.slice(1), '%%%malformed%%%', 'x'.repeat(257), '', 'AA', 12345, {}, 'a='.repeat(15)]) {
    const r = page(cards, { pageSize: 1, cursor });
    assert.equal(r.error, 'INVALID_OR_STALE_CURSOR', String(cursor).slice(0,30));
    assert.equal(r.pageInfo, null);
    assert.deepEqual(r.items, []);
  }
  const badSignature = Buffer.from(token, 'base64url');
  badSignature[badSignature.length-1] ^= 0x40;
  assert.equal(page(cards, { cursor: badSignature.toString('base64url') }).error, 'INVALID_OR_STALE_CURSOR');
});

test('W4.4: owner/section/filter/signing-key binding, and filter normalization', () => {
  const cards = [card('a'),card('b'),card('c')];
  const filters = { searchQuery: '  KEYWORD  ', typeFilter: 'IMAGE', statusFilter: 'completed' };
  const cursor = page(cards, { pageSize:1, filters }).pageInfo.nextCursor;
  assert.equal(page(cards, {cursor, filters: { searchQuery:'keyword', typeFilter:'image', statusFilter:'completed'}}).error, null);
  assert.equal(page(cards, {cursor, verifiedAccountKey:bob, filters}).error, 'INVALID_OR_STALE_CURSOR');
  assert.equal(page({ drafts:cards }, {cursor, requestedSection:'drafts', filters}).error, 'INVALID_OR_STALE_CURSOR');
  assert.equal(page(cards, {cursor, filters:{ ...filters, searchQuery:'different'}}).error, 'INVALID_OR_STALE_CURSOR');
  assert.equal(page(cards, {cursor, filters:{ ...filters, typeFilter:'video'}}).error, 'INVALID_OR_STALE_CURSOR');
  assert.equal(page(cards, {cursor, filters:{ ...filters, statusFilter:'queued'}}).error, 'INVALID_OR_STALE_CURSOR');
  assert.equal(page(cards, {cursor, signingSecret:OTHER_SECRET, filters}).error, 'INVALID_OR_STALE_CURSOR');
  assert.equal(page(cards, {filters:{typeFilter:'not-an-allowed-type'}}).error, 'INVALID_FILTERS');
  assert.equal(page(cards, {filters:{unexpected:'ownerID'}}).error, 'INVALID_FILTERS');
  assert.ok(!Buffer.from(cursor,'base64url').includes(Buffer.from(alice)));
  assert.ok(!cursor.includes(alice));
});

test('W4.4: expired/future cursor, deleted or changed source snapshot rejects instead of skipping', () => {
  const cards = [card('a'),card('b'),card('c'),card('d')];
  const cursor = page(cards, {pageSize:2}).pageInfo.nextCursor;
  assert.equal(page(cards, {cursor, nowMs:NOW + CURSOR_TTL_MS - 1000}).error, null);
  assert.equal(page(cards, {cursor, nowMs:NOW + CURSOR_TTL_MS + 2000}).error, 'INVALID_OR_STALE_CURSOR');
  assert.equal(page(cards, {cursor, nowMs:NOW - 120000}).error, 'INVALID_OR_STALE_CURSOR');
  assert.equal(page(cards.slice(1), {cursor}).error, 'INVALID_OR_STALE_CURSOR');
  assert.equal(page([...cards, card('new')], {cursor}).error, 'INVALID_OR_STALE_CURSOR');
  assert.equal(page(cards.map(c => c.id==='d' ? {...c, createdAt:'2026-11-01T11:00:00.000Z'} : c), {cursor}).error, 'INVALID_OR_STALE_CURSOR');
});

test('W4.4: timezone normalization and exact chronological sort', async () => {
  const cards = [
    card('x', '2026-11-01T12:30:00+02:00'),
    card('y', '2026-11-01T10:30:00Z'),
    card('z', '2026-11-01T10:30:01Z'),
    card('q', '2026-10-31T23:59:59.999Z')
  ];
  assert.deepEqual(await collectAll(cards, 1), ['z','x','y','q']);
  assert.equal(page(cards, {pageSize:2}).items[1].createdAt, '2026-11-01T10:30:00.000Z');
});

test('W4.4: reject bad data and duplicated IDs, never return arbitrary private job fields', () => {
  const sensitive = { ...card('owner_one'), prompt:'PRIVATE PROMPT', rawUrl:'https://private.example/photo',
    accountKey:'foreign-account', token:'sk_secret', secretStoragePath:'private/bucket',
    previewPlaceholder: {ready:true, placeholderType:'image', label:'Available', secret:'NEVER'} };
  const original = structuredClone(sensitive);
  const result = page([sensitive]);
  assert.equal(result.error, null);
  const serialized = JSON.stringify(result);
  for (const privateValue of ['PRIVATE PROMPT','private.example','foreign-account','sk_secret','private/bucket','NEVER']) {
    assert.ok(!serialized.includes(privateValue));
  }
  assert.deepEqual(Object.keys(result.items[0]).sort(), ['createdAt','hasPreview','id','isCompleted','isFailed','isProcessing','previewPlaceholder','status','title','type'].sort());
  assert.ok(Object.isFrozen(result.items[0]));
  assert.ok(Object.isFrozen(result.items[0].previewPlaceholder));
  assert.deepEqual(sensitive, original);
  assert.equal(page([card('dup'),card('dup')]).error, 'INVALID_CARD_DATA');
  assert.equal(page([card('valid'),{...card('bad'),createdAt:'bad_date'}]).error, 'INVALID_CARD_DATA');
  assert.equal(page([card('valid'),{...card('bad'),id:'foreign:bad'}]).error, 'INVALID_CARD_DATA');
  assert.equal(page([{...card('valid'),createdAt:'2027-01-01T00:00:00.000Z'}]).error, 'INVALID_CARD_DATA');
});

test('W4.4: module does not fetch, query DB, or make paid/network calls', async () => {
  const previousFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = () => { fetchCalls++; throw new Error('NETWORK_FORBIDDEN'); };
  try {
    assert.equal(page([card('a'),card('b')], {pageSize:1}).error, null);
    assert.equal(fetchCalls, 0);
  } finally { globalThis.fetch = previousFetch; }
  const source = await readFile(fileURLToPath(new URL('../server/workspace-card-cursor.js', import.meta.url)), 'utf8');
  assert.ok(!/\b(?:fetch|https?\.request|pg\.Client|stripe|openai)\s*\(/i.test(source));
  assert.ok(!source.includes('deepsyq.app'));
});

test('W4.4: integration with existing W4.3 sanitized summaries (bounded to 30)', async (t) => {
  let selectWorkspaceCardSections;
  try {
    ({selectWorkspaceCardSections} = await import('../server/workspace-card-sections.js'));
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND') { t.skip('W4.3 source only available in GitHub repository; run in CI after PR'); return; }
    throw e;
  }
  const raw = [
    { ...card('a'), privatePrompt:'TOP SECRET', s3Url:'https://private.example/dummy' },
    { ...card('b'), privatePrompt:'TOP SECRET', status:'queued', isCompleted:false, isProcessing:true }
  ];
  const sections = selectWorkspaceCardSections({ cards: raw, options:{ referenceTimeMs:NOW } });
  const r = page(sections);
  assert.equal(r.error, null);
  assert.equal(r.items.length, 2);
  assert.ok(!JSON.stringify(r).includes('TOP SECRET'));
  assert.ok(!JSON.stringify(r).includes('private.example'));
  assert.equal(sections.metadata.sourceValidated, false, 'W4.3 does not authenticate; caller must do so');
});
