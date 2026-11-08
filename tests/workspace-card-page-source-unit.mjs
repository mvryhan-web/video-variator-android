import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginateAuthorizedWorkspaceRows as paginate, WORKSPACE_SOURCE_LIMIT } from '../server/workspace-card-page-source.js';

const NOW = Date.parse('2026-11-08T13:00:00Z');
const SECRET = Buffer.from('only an offline workspace pagination unit test signing key');
const owner = 'verified-account-alice';
const foreign = 'verified-account-bob';
const job = (i, opts = {}) => ({
  id: 'job_' + String(i).padStart(4, '0'),
  user_id: owner,
  kind: 'image',
  status: 'completed',
  created_at: new Date(NOW - i * 1000).toISOString(),
  output_assets: [],
  metadata: {},
  prompt: 'DO NOT RETURN PRIVATE PROMPT',
  ...opts
});
const run = (rows, opts = {}) => paginate({
  rows, verifiedAccountKey: owner, requestedSection: 'recent',
  signingSecret: SECRET, nowMs: NOW, pageSize: 30, ...opts
});

test('F4 integration: all 101 owner cards appear in 30-item pages with no gap/duplicate', () => {
  const rows = Array.from({length: 101}, (_, i) => job(i));
  let cursor = null;
  const ids = [];
  const pageCounts = [];
  for (let i = 0; i < 5; i++) {
    const p = run(rows, { cursor });
    assert.equal(p.error, null);
    ids.push(...p.items.map(item => item.id));
    pageCounts.push(p.items.length);
    if (!p.pageInfo.hasMore) break;
    cursor = p.pageInfo.nextCursor;
    assert.ok(cursor && cursor.length <= 256);
  }
  assert.deepEqual(pageCounts, [30, 30, 30, 11]);
  assert.deepEqual(ids, rows.map(item => item.id));
  assert.equal(new Set(ids).size, 101);
  assert.equal(run(rows, { pageSize: 1 }).items.length, 1);
});

test('F4 integration: archive exclusion, owner title search, type and status filter', () => {
  const rows = [
    job(1, {metadata:{workspace:{title:'Golden meadow'}}}),
    job(2, {metadata:{workspace:{title:'Cozy cottage', archived:true}}}),
    job(3, {kind:'video', status:'processing', metadata:{workspace:{title:'Forest video'}}}),
    job(4, {kind:'audio', status:'failed', metadata:{workspace:{title:'Rain audio'}}})
  ];
  assert.deepEqual(run(rows).items.map(x=>x.id), ['job_0001','job_0003','job_0004']);
  assert.equal(run(rows, {includeArchived:true}).items.length, 4);
  assert.deepEqual(run(rows, { filters:{ searchQuery:'golden'} }).items.map(x=>x.id), ['job_0001']);
  assert.deepEqual(run(rows, { filters:{typeFilter:'video'}, requestedSection:'drafts' }).items.map(x=>x.id), ['job_0003']);
  assert.deepEqual(run(rows, { filters:{statusFilter:'completed'}, requestedSection:'completed' }).items.map(x=>x.id), ['job_0001']);
  assert.equal(run(rows, {requestedSection:'completed'}).items.length, 1);
});

test('F4 integration: unexpected foreign user in query results fails closed', () => {
  const result = run([job(1),job(2,{user_id:foreign})]);
  assert.equal(result.error, 'UNAUTHORIZED_SOURCE');
  assert.deepEqual(result.items, []);
  assert.equal(result.pageInfo, null);
  assert.equal(run([job(1),{id:'bad',user_id:null}]).error,'UNAUTHORIZED_SOURCE');
});

test('F4 integration: no raw job prompts, storage keys or sensitive metadata in page', () => {
  const record = job(1,{
    metadata:{workspace:{title:'<b>Studio Result</b>'},secret:'HIDDEN_METADATA'},
    output_assets:[{storage:'s3',key:'PRIVATE_S3_KEY'}],
    prompt:'HIDDEN_PROMPT',
    access_token:'HIDDEN_TOKEN'
  });
  const before = structuredClone(record);
  const page = run([record]);
  assert.equal(page.error, null);
  assert.equal(page.items[0].title, 'Studio Result');
  const serialized = JSON.stringify(page);
  for (const secret of ['HIDDEN_METADATA','HIDDEN_PROMPT','HIDDEN_TOKEN','PRIVATE_S3_KEY']) {
    assert.equal(serialized.includes(secret), false, secret);
  }
  assert.deepEqual(record, before, 'must not mutate DB rows');
});

test('F4 integration: account and filter cannot reuse signed cursor', () => {
  const rows = Array.from({length:75}, (_,i)=>job(i));
  const first = run(rows, {pageSize:15,filters:{typeFilter:'image'}});
  assert.equal(first.error, null);
  assert.equal(run(rows, {cursor:first.pageInfo.nextCursor,pageSize:15,filters:{typeFilter:'video'}}).error,'INVALID_OR_STALE_CURSOR');
  assert.equal(run(rows, {cursor:first.pageInfo.nextCursor,pageSize:15,verifiedAccountKey:foreign}).error,'UNAUTHORIZED_SOURCE');
  assert.equal(run(rows.slice(1), {cursor:first.pageInfo.nextCursor,pageSize:15,filters:{typeFilter:'image'}}).error,'INVALID_OR_STALE_CURSOR');
});

test('F4 integration: invalid source and bounded 3000-record limit reject explicitly', () => {
  assert.equal(run(null).error, 'INVALID_SOURCE');
  assert.equal(run('wrong').error, 'INVALID_SOURCE');
  assert.equal(run([], {includeArchived:'true'}).error, 'INVALID_ARCHIVE_FLAG');
  assert.equal(run([], {requestedSection:'favorites'}).error, 'INVALID_SECTION');
  assert.equal(run([], {signingSecret:'unsafe'}).error, 'CURSOR_SECRET_UNAVAILABLE');
  assert.equal(WORKSPACE_SOURCE_LIMIT, 3000);
  const tooLarge = Array.from({length:3001},(_,i)=>job(i));
  assert.equal(run(tooLarge).error,'WORKSPACE_SOURCE_TOO_LARGE');
});

test('F4 integration: offline-only, no database/fetch/paid-provider side effects', () => {
  let calls = 0;
  const oldFetch = globalThis.fetch;
  globalThis.fetch = () => {calls++;throw Error('NETWORK_FORBIDDEN')};
  try {
    assert.equal(run([job(1),job(2)]).error,null);
    assert.equal(calls,0);
  } finally { globalThis.fetch=oldFetch; }
});
