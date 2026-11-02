import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { renderOwnerStatusView } from '../server/product-watcher/owner-status-view.js';

const NOW = 1700000000000;
const trusted = { now: NOW, verifyHeartbeat: ms => ms === NOW - 30000 };
const worker = { enabled: true, paused: false, heartbeatAt: NOW - 30000, lastRunAt: NOW - 100000 };

test('trusted server-verified heartbeat can mark worker active; schedule is only a hint', () => {
  const view = renderOwnerStatusView({ ...worker, runs: [{ id: 1, status: 'ok', checks: 5 }] }, trusted);
  assert.equal(view.status, 'NOT_DUE');
  assert.equal(view.verifiedWorkerHeartbeat.active, true);
  assert.equal(view.verifiedWorkerHeartbeat.ageMs, 30000);
  assert.equal(view.boundedRecentSummaries[0].checksCount, 5);
  assert.equal(view.schedules.schedules.length, 4);
  assert.equal(view.pendingApprovalCount, 0);
});
test('fresh but unverified or forged heartbeat NEVER implies live worker', () => {
  for (const options of [{ now: NOW }, { now: NOW, verifyHeartbeat: () => false },
    { now: NOW, verifyHeartbeat: () => { throw Error('untrusted'); } }]) {
    const view = renderOwnerStatusView({ ...worker, verified: true, trusted: true }, options);
    assert.equal(view.status, 'WORKER_UNSEEN');
    assert.equal(view.verifiedWorkerHeartbeat.active, false);
    assert.equal(view.verifiedWorkerHeartbeat.heartbeatAt, null);
  }
});
test('invalid, future, stale heartbeat, invalid clock fail closed', () => {
  for (const heartbeatAt of [0, 'bad', NOW + 5000, NOW - 4 * 60 * 1000]) {
    const view = renderOwnerStatusView({ ...worker, heartbeatAt }, { now: NOW, verifyHeartbeat: () => true });
    assert.equal(view.verifiedWorkerHeartbeat.active, false);
    assert.equal(view.status, 'WORKER_UNSEEN');
  }
  assert.equal(renderOwnerStatusView(worker, { now: 'bad' }).reason, 'INVALID_NOW_TIMESTAMP');
});
test('disabled and paused are never active even with verified timestamp', () => {
  assert.equal(renderOwnerStatusView({ ...worker, enabled: false }, trusted).status, 'DISABLED');
  const view = renderOwnerStatusView({ ...worker, paused: true }, trusted);
  assert.equal(view.status, 'PAUSED');
  assert.equal(view.verifiedWorkerHeartbeat.active, false);
});
test('strict projection excludes arbitrary sensitive keys, values and raw proposal details', () => {
  const secret = 'PRIVATE_SENTINEL_DO_NOT_LEAK';
  const findings = Object.fromEntries(Array.from({ length: 1500 }, (_, i) => ['field_' + i, secret]));
  const snapshot = { ...worker,
    runs: Array.from({ length: 25 }, (_, i) => ({
      id: i, status: secret, checks: 3, findings,
      warningCount: 2, criticalCount: 1,
      phone: secret, session: secret, raw: secret
    })),
    pendingProposals: Array.from({ length: 25 }, (_, i) => ({
      id: 'prop-' + i, type: secret, details: findings,
      token: secret, autoApply: true
    }))
  };
  const view = renderOwnerStatusView(snapshot, trusted);
  const json = JSON.stringify(view);
  assert.equal(view.boundedRecentSummaries.length, 10);
  assert.equal(view.pendingProposals.length, 10);
  assert.equal(view.boundedRecentSummaries[0].status, 'unknown');
  assert.deepEqual(view.boundedRecentSummaries[0].findingsSummary, { warningCount: 2, criticalCount: 1 });
  assert.equal(view.pendingProposals[0].approvalRequired, true);
  assert.equal(view.pendingProposals[0].autoApply, false);
  assert.equal(view.pendingProposals[0].type, 'unknown');
  assert.equal(json.includes(secret), false);
  assert.equal(json.includes('field_1499'), false);
  assert.ok(Buffer.byteLength(json, 'utf8') <= 8192);
});
test('malicious huge strings, unicode, untrusted URL and nested objects do not leak', () => {
  const evil = '🔑'.repeat(10000) + 'sk_live_SECRET';
  const view = renderOwnerStatusView({ ...worker,
    runs: [{ status: evil, findings: { session: evil, raw: evil }, checks: [{ key: evil }] }],
    pendingProposals: [{ id: evil, type: evil, details: { customer: evil } }]
  }, trusted);
  const json = JSON.stringify(view);
  assert.ok(Buffer.byteLength(json, 'utf8') <= 8192);
  assert.equal(json.includes('sk_live_SECRET'), false);
  assert.equal(view.pendingProposals[0].id, null);
});
test('missing input, invalid snapshot and missing now never fabricate a result', () => {
  assert.equal(renderOwnerStatusView({}, { now: NOW }).status, 'DISABLED');
  assert.equal(renderOwnerStatusView([], { now: NOW }).status, 'WORKER_UNSEEN');
  assert.equal(renderOwnerStatusView({}, {}).reason, 'INVALID_NOW_TIMESTAMP');
});
test('proposal approval is mandatory, never auto-applied', () => {
  const view = renderOwnerStatusView({ ...worker,
    pendingProposals: [{ id: 'model-1', type: 'model_switch', autoApply: true }]
  }, trusted);
  assert.equal(view.status, 'APPROVAL_REQUIRED');
  assert.equal(view.pendingProposals[0].type, 'model_switch');
  assert.equal(view.pendingProposals[0].approvalRequired, true);
  assert.equal(view.pendingProposals[0].autoApply, false);
});
