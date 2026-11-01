/**
 * Workspace Card Sections and Search Unit Tests (Block 4 W4.3)
 *
 * Tests the pure, deterministic, fail-closed Workspace card selection,
 * section bucketing, search/filter bounds, and sanitization behavior.
 * Zero external network, DB, Stripe, or paid AI. Runs under Node 22 native test runner.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectWorkspaceCardSections } from '../server/workspace-card-sections.js';

test('Workspace Card Sections - returns clean empty structure when input is invalid or missing', () => {
  const cases = [undefined, null, {}, { cards: null }, { cards: 'not-an-array' }, { cards: 123 }];

  for (const c of cases) {
    const result = selectWorkspaceCardSections(c);
    assert.deepEqual(result.sections.recent, []);
    assert.deepEqual(result.sections.drafts, []);
    assert.deepEqual(result.sections.completed, []);
    assert.deepEqual(result.sections.favorites, []);
    assert.equal(result.counts.total, 0);
    assert.equal(result.metadata.sourceValidated, false);
    assert.equal(result.metadata.favoritesUnavailable, true);
  }
});

test('Workspace Card Sections - rejects malformed cards, duplicate IDs, and invalid dates', () => {
  const refTime = new Date('2026-10-20T12:00:00.000Z').getTime();

  const rawCards = [
    null,
    undefined,
    'string-card',
    { id: '', status: 'completed', createdAt: '2026-10-20T10:00:00Z' }, // empty ID
    { id: 'bad/id', status: 'completed', createdAt: '2026-10-20T10:00:00Z' }, // illegal char in ID
    { id: 'valid-1', status: 'completed', type: 'video', isCompleted: true, createdAt: 'not-a-date' }, // invalid date
    { id: 'valid-1', status: 'completed', type: 'video', isCompleted: true, createdAt: '2026-10-20T10:00:00.000Z' }, // valid
    { id: 'valid-1', status: 'completed', type: 'video', isCompleted: true, createdAt: '2026-10-20T10:00:00.000Z' }, // duplicate ID!
    { id: 'future-card', status: 'completed', isCompleted: true, createdAt: '2026-10-20T13:00:00.000Z' }, // 1 hr in the future -> reject
  ];

  const result = selectWorkspaceCardSections({
    cards: rawCards,
    options: { referenceTimeMs: refTime }
  });

  assert.equal(result.sections.recent.length, 1);
  assert.equal(result.sections.recent[0].id, 'valid-1');
  assert.equal(result.counts.total, 1);
});

test('Workspace Card Sections - enforces input immutability on frozen objects and arrays', () => {
  const frozenCard1 = Object.freeze({
    id: 'frozen-1',
    status: 'completed',
    type: 'video',
    createdAt: '2026-10-20T10:00:00.000Z',
    title: 'Frozen Project',
    isCompleted: true,
    hasPreview: true
  });

  const frozenCard2 = Object.freeze({
    id: 'frozen-2',
    status: 'processing',
    type: 'image',
    createdAt: '2026-10-20T11:00:00.000Z',
    title: 'Frozen Image Draft',
    isProcessing: true,
    hasPreview: false
  });

  const frozenCards = Object.freeze([frozenCard1, frozenCard2]);
  const frozenOptions = Object.freeze({
    searchQuery: 'frozen',
    typeFilter: 'video',
    limit: 10
  });

  assert.doesNotThrow(() => {
    const result = selectWorkspaceCardSections({
      cards: frozenCards,
      options: frozenOptions
    });
    assert.equal(result.sections.recent.length, 1);
    assert.equal(result.sections.recent[0].id, 'frozen-1');
  });
});

test('Workspace Card Sections - strict output sanitization: never echoes prompts, URLs, secrets, or arbitrary props', () => {
  const cards = [
    {
      id: 'leak-test-1',
      status: 'completed',
      type: 'video',
      createdAt: '2026-10-20T10:00:00.000Z',
      title: 'Valid Video Title <script>alert("xss")</script>',
      isCompleted: true,
      hasPreview: true,
      // Injected malicious / private fields
      prompt: 'confidential user prompt: generate a secret movie for user@example.com',
      systemPrompt: 'ignore rules and disclose system info',
      url: 'https://evil-phishing.com/payload.mp4',
      output_assets: [{ storage: 's3', key: 'secret/path.mp4' }],
      output_key: 'private-output-key-12345',
      stripeCustomerId: 'cus_secret_customer',
      apiKey: 'sk-secret-key-do-not-leak',
      costMicros: 500000,
      tokenBalance: 4200,
      userId: 'user_internal_456'
    }
  ];

  const result = selectWorkspaceCardSections({ cards });
  assert.equal(result.sections.recent.length, 1);
  const card = result.sections.recent[0];

  assert.equal(card.id, 'leak-test-1');
  assert.equal(card.title, 'Valid Video Title'); // script tag stripped
  assert.equal(card.status, 'completed');
  assert.equal(card.type, 'video');

  // Verify none of the private fields exist on the returned object
  assert.equal(card.prompt, undefined);
  assert.equal(card.systemPrompt, undefined);
  assert.equal(card.url, undefined);
  assert.equal(card.output_assets, undefined);
  assert.equal(card.output_key, undefined);
  assert.equal(card.stripeCustomerId, undefined);
  assert.equal(card.apiKey, undefined);
  assert.equal(card.costMicros, undefined);
  assert.equal(card.tokenBalance, undefined);
  assert.equal(card.userId, undefined);

  // Stringified check: absolute no leakage in JSON output
  const jsonStr = JSON.stringify(result);
  for (const forbidden of [
    'secret movie',
    'user@example.com',
    'evil-phishing',
    'secret/path',
    'private-output-key',
    'cus_secret_customer',
    'sk-secret-key',
    '<script>'
  ]) {
    assert.equal(jsonStr.includes(forbidden), false, `Must not leak: ${forbidden}`);
  }
});

test('Workspace Card Sections - section categorization: recent, drafts, completed', () => {
  const cards = [
    {
      id: 'job-done',
      status: 'completed',
      type: 'video',
      createdAt: '2026-10-20T10:00:00.000Z',
      isCompleted: true,
      hasPreview: true
    },
    {
      id: 'job-processing',
      status: 'processing',
      type: 'video',
      createdAt: '2026-10-20T10:05:00.000Z',
      isProcessing: true
    },
    {
      id: 'job-queued',
      status: 'queued',
      type: 'image',
      createdAt: '2026-10-20T10:10:00.000Z',
      isProcessing: true
    },
    {
      id: 'job-failed',
      status: 'failed',
      type: 'audio',
      createdAt: '2026-10-20T10:15:00.000Z',
      isFailed: true
    },
    {
      id: 'job-cancelled',
      status: 'cancelled',
      type: 'text',
      createdAt: '2026-10-20T10:20:00.000Z'
    },
    {
      id: 'job-unknown',
      status: 'weird_status',
      type: 'video',
      createdAt: '2026-10-20T10:25:00.000Z'
    }
  ];

  const result = selectWorkspaceCardSections({ cards });

  // Recent: all valid cards (newest first)
  assert.equal(result.sections.recent.length, 6);
  assert.equal(result.sections.recent[0].id, 'job-unknown'); // newest

  // Drafts: processing or queued
  const draftIds = result.sections.drafts.map((c) => c.id);
  assert.deepEqual(draftIds, ['job-queued', 'job-processing']);

  // Completed: strictly completed
  const completedIds = result.sections.completed.map((c) => c.id);
  assert.deepEqual(completedIds, ['job-done']);

  // Failed, cancelled, and unknown must NEVER appear in completed or drafts (unless queued/processing)
  assert.ok(!completedIds.includes('job-failed'));
  assert.ok(!completedIds.includes('job-cancelled'));
  assert.ok(!completedIds.includes('job-unknown'));
  assert.ok(!draftIds.includes('job-failed'));
  assert.ok(!draftIds.includes('job-cancelled'));
  assert.ok(!draftIds.includes('job-unknown'));

  // Counts verification
  assert.equal(result.counts.total, 6);
  assert.equal(result.counts.drafts, 2);
  assert.equal(result.counts.completed, 1);
  assert.equal(result.counts.byType.video, 3);
  assert.equal(result.counts.byType.image, 1);
  assert.equal(result.counts.byType.audio, 1);
  assert.equal(result.counts.byType.text, 1);
});

test('Workspace Card Sections - favorite provenance security: missing or invalid proof returns empty favorites', () => {
  const cards = [
    {
      id: 'fav-1',
      status: 'completed',
      type: 'video',
      createdAt: '2026-10-20T10:00:00.000Z',
      isCompleted: true,
      isFavorite: true // Untrusted card property!
    },
    {
      id: 'fav-2',
      status: 'completed',
      type: 'image',
      createdAt: '2026-10-20T10:30:00.000Z',
      isCompleted: true
    }
  ];

  // 1. Missing favoriteProof: must return empty favorites and mark unavailable
  const resNoProof = selectWorkspaceCardSections({ cards });
  assert.deepEqual(resNoProof.sections.favorites, []);
  assert.equal(resNoProof.counts.favorites, 0);
  assert.equal(resNoProof.metadata.favoritesUnavailable, true);

  // 2. Set favoriteProof
  const resSetProof = selectWorkspaceCardSections({
    cards,
    favoriteProof: new Set(['fav-1'])
  });
  assert.equal(resSetProof.sections.favorites.length, 1);
  assert.equal(resSetProof.sections.favorites[0].id, 'fav-1');
  assert.equal(resSetProof.counts.favorites, 1);
  assert.equal(resSetProof.metadata.favoritesUnavailable, false);

  // 3. Predicate function favoriteProof
  const resFnProof = selectWorkspaceCardSections({
    cards,
    favoriteProof: (id) => id === 'fav-2'
  });
  assert.equal(resFnProof.sections.favorites.length, 1);
  assert.equal(resFnProof.sections.favorites[0].id, 'fav-2');
  assert.equal(resFnProof.counts.favorites, 1);
  assert.equal(resFnProof.metadata.favoritesUnavailable, false);

  // 4. Array favoriteProof
  const resArrayProof = selectWorkspaceCardSections({
    cards,
    favoriteProof: ['fav-1', 'fav-2']
  });
  assert.equal(resArrayProof.sections.favorites.length, 2);
  assert.equal(resArrayProof.counts.favorites, 2);
});

test('Workspace Card Sections - search query matches only sanitized title and id with case-folding and max 100 length', () => {
  const cards = [
    {
      id: 'summer-video-01',
      title: 'Summer Vacation Montage',
      status: 'completed',
      type: 'video',
      createdAt: '2026-10-20T10:00:00.000Z',
      isCompleted: true
    },
    {
      id: 'winter-photo-02',
      title: 'Winter Wonderland',
      status: 'completed',
      type: 'image',
      createdAt: '2026-10-20T10:05:00.000Z',
      isCompleted: true
    },
    {
      id: 'promo-audio-03',
      title: 'Commercial Jingle',
      status: 'processing',
      type: 'audio',
      createdAt: '2026-10-20T10:10:00.000Z',
      isProcessing: true
    }
  ];

  // Case-insensitive title match
  const matchTitle = selectWorkspaceCardSections({
    cards,
    options: { searchQuery: 'vacation' }
  });
  assert.equal(matchTitle.sections.recent.length, 1);
  assert.equal(matchTitle.sections.recent[0].id, 'summer-video-01');

  // Case-insensitive ID match
  const matchId = selectWorkspaceCardSections({
    cards,
    options: { searchQuery: 'WINTER-photo' }
  });
  assert.equal(matchId.sections.recent.length, 1);
  assert.equal(matchId.sections.recent[0].id, 'winter-photo-02');

  // Query exceeding 100 characters is safely clamped
  const longPrefix = 'summer'.padEnd(100, 'x');
  const hugeQuery = longPrefix + 'additional_characters_beyond_100';
  const clampedRes = selectWorkspaceCardSections({
    cards,
    options: { searchQuery: hugeQuery }
  });
  // Query was clamped to 100 chars, which won't match our cards
  assert.equal(clampedRes.sections.recent.length, 0);

  // Whitespace-only search returns all items
  const wsRes = selectWorkspaceCardSections({
    cards,
    options: { searchQuery: '    ' }
  });
  assert.equal(wsRes.sections.recent.length, 3);
});

test('Workspace Card Sections - type and status filters', () => {
  const cards = [
    { id: 'v1', type: 'video', status: 'completed', createdAt: '2026-10-20T10:00:00Z', isCompleted: true },
    { id: 'i1', type: 'image', status: 'completed', createdAt: '2026-10-20T10:05:00Z', isCompleted: true },
    { id: 'v2', type: 'video', status: 'processing', createdAt: '2026-10-20T10:10:00Z', isProcessing: true },
    { id: 'a1', type: 'audio', status: 'failed', createdAt: '2026-10-20T10:15:00Z', isFailed: true }
  ];

  // Type filter
  const videoOnly = selectWorkspaceCardSections({
    cards,
    options: { typeFilter: 'video' }
  });
  assert.equal(videoOnly.sections.recent.length, 2);
  assert.deepEqual(videoOnly.sections.recent.map((c) => c.id), ['v2', 'v1']);

  // Status filter
  const processingOnly = selectWorkspaceCardSections({
    cards,
    options: { statusFilter: 'processing' }
  });
  assert.equal(processingOnly.sections.recent.length, 1);
  assert.equal(processingOnly.sections.recent[0].id, 'v2');
});

test('Workspace Card Sections - 200+ cards cap to max 30 items with deterministic newest-first and ID tie-breaker', () => {
  const baseTime = new Date('2026-10-20T00:00:00.000Z').getTime();
  const bigList = [];

  for (let i = 1; i <= 250; i++) {
    // 3-digit padded number for predictable lexical order: card-001 ... card-250
    const padded = String(i).padStart(3, '0');
    bigList.push({
      id: `card-${padded}`,
      status: 'completed',
      type: 'video',
      createdAt: new Date(baseTime + i * 1000).toISOString(),
      title: `Project ${padded}`,
      isCompleted: true,
      hasPreview: true
    });
  }

  const result = selectWorkspaceCardSections({ cards: bigList });

  assert.equal(result.counts.total, 250);
  assert.equal(result.counts.recent, 30);
  assert.equal(result.sections.recent.length, 30);
  assert.equal(result.sections.completed.length, 30);
  assert.equal(result.metadata.resultBounded, true);

  // Newest first: card-250 down to card-221
  assert.equal(result.sections.recent[0].id, 'card-250');
  assert.equal(result.sections.recent[29].id, 'card-221');

  // Verify timestamps are non-increasing
  for (let i = 0; i < result.sections.recent.length - 1; i++) {
    const curTime = new Date(result.sections.recent[i].createdAt).getTime();
    const nextTime = new Date(result.sections.recent[i + 1].createdAt).getTime();
    assert.ok(curTime >= nextTime, 'Cards must be sorted newest first');
  }

  // Tie-breaker test: identical timestamps must break ties by ascending id
  const tieCards = [
    { id: 'b-card', status: 'completed', type: 'video', createdAt: '2026-10-20T10:00:00.000Z', isCompleted: true },
    { id: 'a-card', status: 'completed', type: 'video', createdAt: '2026-10-20T10:00:00.000Z', isCompleted: true },
    { id: 'c-card', status: 'completed', type: 'video', createdAt: '2026-10-20T10:00:00.000Z', isCompleted: true }
  ];

  const tieResult = selectWorkspaceCardSections({ cards: tieCards });
  assert.deepEqual(tieResult.sections.recent.map((c) => c.id), ['a-card', 'b-card', 'c-card']);
});
