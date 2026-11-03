/**
 * Workspace Card Pagination Cursor Unit Tests (Block 4 W4.4)
 *
 * Tests the deterministic bounded card pagination policy, strict opaque cursor,
 * owner-scoped account key hashing, fail-closed validation, and immutability.
 * Zero external network, DB, Stripe, or paid AI. Runs under Node 22 native test runner.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectWorkspaceCardSections } from '../server/workspace-card-sections.js';
import {
  pageWorkspaceCardSections,
  decodeAndValidateCursor,
  encodeCursor,
  APPROVED_SECTIONS,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  MAX_CURSOR_LENGTH,
  CURSOR_EXPIRY_MS
} from '../server/workspace-card-cursor.js';

const ACCOUNT_ALICE = 'usr_alice_owner_42';
const ACCOUNT_BOB = 'usr_bob_owner_99';
const BASE_NOW_MS = 1793700000000; // Reference timestamp in ms

test('Workspace Card Cursor - input validation and fail-closed handling', () => {
  // Invalid params
  assert.equal(pageWorkspaceCardSections(null).error, 'INVALID_PARAMS');
  assert.equal(pageWorkspaceCardSections(undefined).error, 'INVALID_PARAMS');
  assert.equal(pageWorkspaceCardSections('string').error, 'INVALID_PARAMS');

  // Missing or invalid account key
  assert.equal(
    pageWorkspaceCardSections({ sections: [], requestedSection: 'recent' }).error,
    'MISSING_OR_INVALID_ACCOUNT_KEY'
  );
  assert.equal(
    pageWorkspaceCardSections({ sections: [], requestedSection: 'recent', verifiedAccountKey: '' }).error,
    'MISSING_OR_INVALID_ACCOUNT_KEY'
  );
  assert.equal(
    pageWorkspaceCardSections({ sections: [], requestedSection: 'recent', verifiedAccountKey: '   ' }).error,
    'MISSING_OR_INVALID_ACCOUNT_KEY'
  );

  // Unapproved sections (reject favorites, challenges, and arbitrary names)
  for (const badSection of ['favorites', 'challenges', 'admin', 'unknown', '', 'RECENT']) {
    const res = pageWorkspaceCardSections({
      sections: [],
      requestedSection: badSection,
      verifiedAccountKey: ACCOUNT_ALICE
    });
    assert.equal(res.error, 'UNAPPROVED_OR_INVALID_SECTION');
    assert.deepEqual(res.items, []);
    assert.equal(res.pageInfo, null);
  }

  // Invalid page size
  assert.equal(
    pageWorkspaceCardSections({
      sections: [],
      requestedSection: 'recent',
      verifiedAccountKey: ACCOUNT_ALICE,
      pageSize: 'not-a-number'
    }).error,
    'INVALID_PAGE_SIZE'
  );

  // Invalid sections structure
  assert.equal(
    pageWorkspaceCardSections({
      sections: 12345,
      requestedSection: 'recent',
      verifiedAccountKey: ACCOUNT_ALICE
    }).error,
    'INVALID_SECTIONS'
  );
});

test('Workspace Card Cursor - approved sections only', () => {
  assert.deepEqual(Array.from(APPROVED_SECTIONS).sort(), ['completed', 'drafts', 'recent']);

  for (const validSection of ['recent', 'drafts', 'completed']) {
    const res = pageWorkspaceCardSections({
      sections: { [validSection]: [] },
      requestedSection: validSection,
      verifiedAccountKey: ACCOUNT_ALICE,
      nowMs: BASE_NOW_MS
    });
    assert.equal(res.error, null);
    assert.deepEqual(res.items, []);
    assert.equal(res.pageInfo.requestedSection, validSection);
    assert.equal(res.pageInfo.count, 0);
    assert.equal(res.pageInfo.hasMore, false);
    assert.equal(res.pageInfo.more, false);
    assert.equal(res.pageInfo.nextCursor, null);
  }
});

test('Workspace Card Cursor - multi-page iteration with identical timestamp ties and no duplicates or gaps', () => {
  // 6 cards sharing the exact same timestamp with distinct lexical IDs
  const sharedTime = '2026-10-25T14:30:00.000Z';
  const cardIds = ['task-alpha', 'task-bravo', 'task-charlie', 'task-delta', 'task-echo', 'task-foxtrot'];

  const rawCards = cardIds.map((id) => ({
    id,
    status: 'completed',
    type: 'video',
    createdAt: sharedTime,
    title: `Title ${id}`,
    isCompleted: true
  }));

  // Fetch page by page with pageSize = 2
  const allPagedIds = [];
  let currentCursor = null;
  let pageCount = 0;

  do {
    const pageRes = pageWorkspaceCardSections({
      sections: rawCards,
      requestedSection: 'recent',
      cursor: currentCursor,
      pageSize: 2,
      nowMs: BASE_NOW_MS,
      verifiedAccountKey: ACCOUNT_ALICE
    });

    assert.equal(pageRes.error, null);
    assert.ok(pageRes.items.length <= 2);

    for (const card of pageRes.items) {
      allPagedIds.push(card.id);
    }

    currentCursor = pageRes.pageInfo.nextCursor;
    pageCount++;

    if (!pageRes.pageInfo.hasMore) {
      assert.equal(currentCursor, null);
      break;
    }
    assert.ok(typeof currentCursor === 'string');
    assert.ok(currentCursor.length <= MAX_CURSOR_LENGTH);
  } while (currentCursor && pageCount < 10);

  // Exactly 3 pages of 2 items
  assert.equal(pageCount, 3);
  // Lexical tie-breaker must preserve exact ascending ID order for ties
  assert.deepEqual(allPagedIds, cardIds.sort());
  // No duplicates and no gaps
  assert.equal(new Set(allPagedIds).size, 6);
});

test('Workspace Card Cursor - boundary test with 30 cards and page size limits (1..30)', () => {
  const baseTime = new Date('2026-10-20T00:00:00.000Z').getTime();
  const cardList = [];

  for (let i = 1; i <= 30; i++) {
    const padded = String(i).padStart(3, '0');
    cardList.push({
      id: `card-${padded}`,
      status: 'completed',
      type: 'image',
      createdAt: new Date(baseTime + i * 1000).toISOString(),
      title: `Item ${padded}`,
      isCompleted: true
    });
  }

  // 1. Clamping: pageSize < 1 clamps to 1
  const pageMin = pageWorkspaceCardSections({
    sections: cardList,
    requestedSection: 'recent',
    pageSize: 0,
    nowMs: BASE_NOW_MS,
    verifiedAccountKey: ACCOUNT_ALICE
  });
  assert.equal(pageMin.error, null);
  assert.equal(pageMin.pageInfo.pageSize, MIN_PAGE_SIZE);
  assert.equal(pageMin.items.length, 1);

  // 2. Clamping: pageSize > 30 clamps to 30
  const pageMax = pageWorkspaceCardSections({
    sections: cardList,
    requestedSection: 'recent',
    pageSize: 100,
    nowMs: BASE_NOW_MS,
    verifiedAccountKey: ACCOUNT_ALICE
  });
  assert.equal(pageMax.error, null);
  assert.equal(pageMax.pageInfo.pageSize, MAX_PAGE_SIZE);
  assert.equal(pageMax.items.length, 30);
  assert.equal(pageMax.pageInfo.hasMore, false);
  assert.equal(pageMax.pageInfo.more, false);
  assert.equal(pageMax.pageInfo.nextCursor, null);

  // 3. Page size 7 pagination: 30 items -> 5 pages (7, 7, 7, 7, 2)
  const collected = [];
  let cur = null;
  let iterations = 0;

  while (iterations < 10) {
    iterations++;
    const res = pageWorkspaceCardSections({
      sections: cardList,
      requestedSection: 'recent',
      cursor: cur,
      pageSize: 7,
      nowMs: BASE_NOW_MS,
      verifiedAccountKey: ACCOUNT_ALICE
    });

    assert.equal(res.error, null);
    for (const item of res.items) {
      collected.push(item.id);
    }

    if (!res.pageInfo.hasMore) break;
    cur = res.pageInfo.nextCursor;
  }

  assert.equal(iterations, 5);
  assert.equal(collected.length, 30);
  // Ensure newest first order (card-030 down to card-001)
  assert.equal(collected[0], 'card-030');
  assert.equal(collected[29], 'card-001');
  assert.equal(new Set(collected).size, 30);
});

test('Workspace Card Cursor - timezone and ISO 8601 edge cases', () => {
  // Different timezone representations for equivalent and ordering timestamps
  const cards = [
    {
      id: 'tz-utc',
      status: 'completed',
      type: 'video',
      createdAt: '2026-10-20T12:00:00.000Z',
      isCompleted: true
    },
    {
      id: 'tz-tokyo-earlier', // 2026-10-20T11:00:00.000Z
      status: 'completed',
      type: 'video',
      createdAt: '2026-10-20T20:00:00+09:00',
      isCompleted: true
    },
    {
      id: 'tz-ny-later', // 2026-10-20T13:00:00.000Z
      status: 'completed',
      type: 'video',
      createdAt: '2026-10-20T09:00:00-04:00',
      isCompleted: true
    }
  ];

  const res = pageWorkspaceCardSections({
    sections: cards,
    requestedSection: 'recent',
    pageSize: 1,
    nowMs: BASE_NOW_MS,
    verifiedAccountKey: ACCOUNT_ALICE
  });

  assert.equal(res.error, null);
  // tz-ny-later is 13:00 UTC (newest)
  assert.equal(res.items[0].id, 'tz-ny-later');
  assert.ok(res.pageInfo.hasMore);

  // Next page
  const page2 = pageWorkspaceCardSections({
    sections: cards,
    requestedSection: 'recent',
    cursor: res.pageInfo.nextCursor,
    pageSize: 1,
    nowMs: BASE_NOW_MS,
    verifiedAccountKey: ACCOUNT_ALICE
  });
  // tz-utc is 12:00 UTC
  assert.equal(page2.items[0].id, 'tz-utc');

  // Third page
  const page3 = pageWorkspaceCardSections({
    sections: cards,
    requestedSection: 'recent',
    cursor: page2.pageInfo.nextCursor,
    pageSize: 1,
    nowMs: BASE_NOW_MS,
    verifiedAccountKey: ACCOUNT_ALICE
  });
  // tz-tokyo-earlier is 11:00 UTC
  assert.equal(page3.items[0].id, 'tz-tokyo-earlier');
  assert.equal(page3.pageInfo.hasMore, false);
  assert.equal(page3.pageInfo.nextCursor, null);
});

test('Workspace Card Cursor - rejects malformed, tampered, expired, and oversized cursors', () => {
  const card = { id: 'c1', createdAt: '2026-10-20T10:00:00.000Z' };
  const validCursor = encodeCursor(card, ACCOUNT_ALICE, 'recent', BASE_NOW_MS);
  assert.ok(validCursor);

  // 1. Garbage strings
  const badStrings = ['not-base64!', '@@@', '{}', '', ' '];
  for (const bad of badStrings) {
    const res = pageWorkspaceCardSections({
      sections: [card],
      requestedSection: 'recent',
      cursor: bad,
      verifiedAccountKey: ACCOUNT_ALICE,
      nowMs: BASE_NOW_MS
    });
    assert.equal(res.error, 'INVALID_OR_STALE_CURSOR');
    assert.deepEqual(res.items, []);
  }

  // 2. Oversized cursor (> 256 chars)
  const hugeCursor = validCursor + 'A'.repeat(300);
  const oversizedRes = pageWorkspaceCardSections({
    sections: [card],
    requestedSection: 'recent',
    cursor: hugeCursor,
    verifiedAccountKey: ACCOUNT_ALICE,
    nowMs: BASE_NOW_MS
  });
  assert.equal(oversizedRes.error, 'INVALID_OR_STALE_CURSOR');

  // 3. Tampered payload JSON
  const rawDecoded = JSON.parse(Buffer.from(validCursor, 'base64url').toString('utf8'));
  // Tamper timestamp
  const tampered1 = Buffer.from(
    JSON.stringify([rawDecoded[0], rawDecoded[1], rawDecoded[2], 999999, rawDecoded[4], rawDecoded[5], rawDecoded[6]]),
    'utf8'
  ).toString('base64url');

  assert.equal(
    pageWorkspaceCardSections({
      sections: [card],
      requestedSection: 'recent',
      cursor: tampered1,
      verifiedAccountKey: ACCOUNT_ALICE,
      nowMs: BASE_NOW_MS
    }).error,
    'INVALID_OR_STALE_CURSOR'
  );

  // 4. Stale / expired cursor
  const expiredTime = BASE_NOW_MS + CURSOR_EXPIRY_MS + 5000;
  const expiredRes = pageWorkspaceCardSections({
    sections: [card],
    requestedSection: 'recent',
    cursor: validCursor,
    verifiedAccountKey: ACCOUNT_ALICE,
    nowMs: expiredTime
  });
  assert.equal(expiredRes.error, 'INVALID_OR_STALE_CURSOR');
});

test('Workspace Card Cursor - rejects cross-account and changed-section cursors', () => {
  const card = { id: 'c1', createdAt: '2026-10-20T10:00:00.000Z' };
  const aliceRecentCursor = encodeCursor(card, ACCOUNT_ALICE, 'recent', BASE_NOW_MS);

  // 1. Bob attempts to use Alice's cursor -> Rejected
  const crossAccountRes = pageWorkspaceCardSections({
    sections: [card],
    requestedSection: 'recent',
    cursor: aliceRecentCursor,
    verifiedAccountKey: ACCOUNT_BOB,
    nowMs: BASE_NOW_MS
  });
  assert.equal(crossAccountRes.error, 'INVALID_OR_STALE_CURSOR');
  assert.deepEqual(crossAccountRes.items, []);

  // 2. Alice requests 'drafts' using her 'recent' cursor -> Rejected
  const changedSectionRes = pageWorkspaceCardSections({
    sections: [card],
    requestedSection: 'drafts',
    cursor: aliceRecentCursor,
    verifiedAccountKey: ACCOUNT_ALICE,
    nowMs: BASE_NOW_MS
  });
  assert.equal(changedSectionRes.error, 'INVALID_OR_STALE_CURSOR');
  assert.deepEqual(changedSectionRes.items, []);
});

test('Workspace Card Cursor - composition with selectWorkspaceCardSections and privacy guarantees', () => {
  const rawCards = [
    {
      id: 'job-leak-01',
      status: 'completed',
      type: 'video',
      createdAt: '2026-10-20T10:00:00.000Z',
      title: '<b>Super Cinema</b>',
      isCompleted: true,
      // Raw sensitive fields that must NEVER appear in output
      privatePrompt: 'raw sensitive owner prompt that should never leak',
      prompt: 'top secret generation instructions',
      rawUrl: 'https://s3.secret.deepsyq.internal/bucket/video.mp4',
      storageKey: 'secrets/prod/video.mp4',
      costUsd: 0.12,
      accountKey: 'usr_internal_admin_token'
    },
    {
      id: 'job-leak-02',
      status: 'queued',
      type: 'image',
      createdAt: '2026-10-20T09:00:00.000Z',
      title: 'Draft Project',
      isProcessing: true,
      userSecretApiKey: 'sk_live_12345'
    }
  ];

  // Compose with W4.3
  const sectionResult = selectWorkspaceCardSections({ cards: rawCards });

  // Page 'recent'
  const pagedRecent = pageWorkspaceCardSections({
    sections: sectionResult,
    requestedSection: 'recent',
    pageSize: 10,
    nowMs: BASE_NOW_MS,
    verifiedAccountKey: ACCOUNT_ALICE
  });

  assert.equal(pagedRecent.error, null);
  assert.equal(pagedRecent.items.length, 2);

  // Verify privacy: no raw fields in output items
  for (const item of pagedRecent.items) {
    assert.equal(item.privatePrompt, undefined);
    assert.equal(item.prompt, undefined);
    assert.equal(item.rawUrl, undefined);
    assert.equal(item.storageKey, undefined);
    assert.equal(item.costUsd, undefined);
    assert.equal(item.accountKey, undefined);
    assert.equal(item.userSecretApiKey, undefined);

    // Only allowed W4.2/W4.3 fields
    const keys = Object.keys(item).sort();
    assert.deepEqual(keys, [
      'createdAt',
      'hasPreview',
      'id',
      'isCompleted',
      'isFailed',
      'isProcessing',
      'previewPlaceholder',
      'status',
      'title',
      'type'
    ]);
  }

  // Also verify nextCursor does NOT contain the raw account key or sensitive strings
  const cursorP1 = pageWorkspaceCardSections({
    sections: sectionResult,
    requestedSection: 'recent',
    pageSize: 1,
    nowMs: BASE_NOW_MS,
    verifiedAccountKey: ACCOUNT_ALICE
  });

  const nextCur = cursorP1.pageInfo.nextCursor;
  assert.ok(nextCur);
  assert.ok(!nextCur.includes(ACCOUNT_ALICE));
  assert.ok(!Buffer.from(nextCur, 'base64url').toString('utf8').includes(ACCOUNT_ALICE));
  assert.ok(!Buffer.from(nextCur, 'base64url').toString('utf8').includes('privatePrompt'));
});

test('Workspace Card Cursor - input immutability and pure behavior', () => {
  const originalCard = {
    id: 'imm-1',
    status: 'completed',
    type: 'video',
    createdAt: '2026-10-20T10:00:00.000Z',
    title: 'Frozen Item',
    isCompleted: true
  };
  const cardFrozen = Object.freeze({ ...originalCard });
  const listFrozen = Object.freeze([cardFrozen]);

  const res = pageWorkspaceCardSections({
    sections: listFrozen,
    requestedSection: 'recent',
    pageSize: 10,
    nowMs: BASE_NOW_MS,
    verifiedAccountKey: ACCOUNT_ALICE
  });

  assert.equal(res.error, null);
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].id, 'imm-1');

  // Verify result objects are frozen
  assert.ok(Object.isFrozen(res));
  assert.ok(Object.isFrozen(res.items));
  assert.ok(Object.isFrozen(res.items[0]));
  assert.ok(Object.isFrozen(res.pageInfo));

  // Original inputs unmodified
  assert.deepEqual(cardFrozen, originalCard);
});
