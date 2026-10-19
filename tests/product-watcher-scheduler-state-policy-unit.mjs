import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEDULER_STATUSES,
  WORKER_HEARTBEAT_TTL_MS,
  SCHEDULE_INTERVAL_15M_MS,
  SCHEDULE_OVERDUE_THRESHOLD_MS,
  BOUNDED_SCHEDULE_HINTS,
  sanitizeStateFacts,
  parseAndValidateTimestamp,
  getScheduleIntervalHints,
  evaluateProposedChange,
  evaluateSchedulerState,
  deduplicateStateTransition
} from '../server/product-watcher/scheduler-state-policy.js';

const mockNowMs = Date.parse('2026-10-18T12:00:00.000Z');
const mockNow = () => new Date(mockNowMs);

test('SCHEDULER_STATUSES contains expected 7 explicit status constants', () => {
  assert.equal(SCHEDULER_STATUSES.DISABLED, 'DISABLED');
  assert.equal(SCHEDULER_STATUSES.PAUSED, 'PAUSED');
  assert.equal(SCHEDULER_STATUSES.WORKER_UNSEEN, 'WORKER_UNSEEN');
  assert.equal(SCHEDULER_STATUSES.NOT_DUE, 'NOT_DUE');
  assert.equal(SCHEDULER_STATUSES.OVERDUE, 'OVERDUE');
  assert.equal(SCHEDULER_STATUSES.READY_FOR_OWNER_REVIEW, 'READY_FOR_OWNER_REVIEW');
  assert.equal(SCHEDULER_STATUSES.APPROVAL_REQUIRED, 'APPROVAL_REQUIRED');
});

test('evaluateSchedulerState returns DISABLED status when enabled is false', () => {
  const result = evaluateSchedulerState({ enabled: false, now: mockNow });
  assert.equal(result.status, SCHEDULER_STATUSES.DISABLED);
  assert.equal(result.reason, 'WATCHER_DISABLED');
});

test('evaluateSchedulerState returns PAUSED status when enabled is true but paused is true', () => {
  const result = evaluateSchedulerState({ enabled: true, paused: true, now: mockNow });
  assert.equal(result.status, SCHEDULER_STATUSES.PAUSED);
  assert.equal(result.reason, 'OWNER_PAUSED');
});

test('evaluateSchedulerState returns WORKER_UNSEEN when heartbeatAt is missing, stale, or in future', () => {
  // Missing heartbeat
  const missing = evaluateSchedulerState({ enabled: true, paused: false, heartbeatAt: null, now: mockNow });
  assert.equal(missing.status, SCHEDULER_STATUSES.WORKER_UNSEEN);
  assert.equal(missing.reason, 'MISSING_OR_FUTURE_HEARTBEAT');

  // Stale heartbeat (4 minutes ago, TTL is 3 min)
  const staleTime = new Date(mockNowMs - 4 * 60 * 1000);
  const stale = evaluateSchedulerState({ enabled: true, paused: false, heartbeatAt: staleTime, now: mockNow });
  assert.equal(stale.status, SCHEDULER_STATUSES.WORKER_UNSEEN);
  assert.equal(stale.reason, 'STALE_HEARTBEAT');

  // Future heartbeat (+1 minute)
  const futureTime = new Date(mockNowMs + 1 * 60 * 1000);
  const future = evaluateSchedulerState({ enabled: true, paused: false, heartbeatAt: futureTime, now: mockNow });
  assert.equal(future.status, SCHEDULER_STATUSES.WORKER_UNSEEN);
  assert.equal(future.reason, 'MISSING_OR_FUTURE_HEARTBEAT');
});

test('evaluateSchedulerState returns APPROVAL_REQUIRED when pending proposal or approval flag present', () => {
  const freshHeartbeat = new Date(mockNowMs - 30 * 1000); // 30 sec ago
  const result = evaluateSchedulerState({
    enabled: true,
    paused: false,
    heartbeatAt: freshHeartbeat,
    approvalPending: true,
    now: mockNow
  });
  assert.equal(result.status, SCHEDULER_STATUSES.APPROVAL_REQUIRED);
  assert.equal(result.autoApply, false);
});

test('evaluateSchedulerState returns NOT_DUE when last run was less than 15m ago', () => {
  const freshHeartbeat = new Date(mockNowMs - 30 * 1000);
  const recentRun = new Date(mockNowMs - 5 * 60 * 1000); // 5 min ago
  const result = evaluateSchedulerState({
    enabled: true,
    paused: false,
    heartbeatAt: freshHeartbeat,
    lastRunAt: recentRun,
    now: mockNow
  });
  assert.equal(result.status, SCHEDULER_STATUSES.NOT_DUE);
  assert.equal(result.nextDueAt, new Date(recentRun.getTime() + SCHEDULE_INTERVAL_15M_MS).toISOString());
});

test('evaluateSchedulerState returns OVERDUE when last run is missing or > 30m ago', () => {
  const freshHeartbeat = new Date(mockNowMs - 30 * 1000);

  // No last run
  const noRun = evaluateSchedulerState({
    enabled: true,
    paused: false,
    heartbeatAt: freshHeartbeat,
    lastRunAt: null,
    now: mockNow
  });
  assert.equal(noRun.status, SCHEDULER_STATUSES.OVERDUE);

  // Old run (35 min ago)
  const oldRun = new Date(mockNowMs - 35 * 60 * 1000);
  const overdue = evaluateSchedulerState({
    enabled: true,
    paused: false,
    heartbeatAt: freshHeartbeat,
    lastRunAt: oldRun,
    now: mockNow
  });
  assert.equal(overdue.status, SCHEDULER_STATUSES.OVERDUE);
});

test('evaluateSchedulerState returns READY_FOR_OWNER_REVIEW when last run was 15m-30m ago', () => {
  const freshHeartbeat = new Date(mockNowMs - 30 * 1000);
  const dueRun = new Date(mockNowMs - 20 * 60 * 1000); // 20 min ago
  const result = evaluateSchedulerState({
    enabled: true,
    paused: false,
    heartbeatAt: freshHeartbeat,
    lastRunAt: dueRun,
    now: mockNow
  });
  assert.equal(result.status, SCHEDULER_STATUSES.READY_FOR_OWNER_REVIEW);
});

test('getScheduleIntervalHints reports 4 bounded schedule labels but deployedCount strictly 1 (15m)', () => {
  const hints = getScheduleIntervalHints();
  assert.equal(hints.schedules.length, 4);
  assert.equal(hints.deployedCount, 1);
  assert.equal(hints.deployedIntervalMs, 15 * 60 * 1000);

  const deployed = hints.schedules.filter(s => s.deployed);
  assert.equal(deployed.length, 1);
  assert.equal(deployed[0].id, '15m');
  assert.equal(deployed[0].label, '15 min');
});

test('evaluateProposedChange enforces owner approval required and autoApply = false for all change types', () => {
  const changeTypes = ['provider', 'price', 'model', 'code', 'publish'];

  for (const type of changeTypes) {
    const evalResult = evaluateProposedChange({ type, model: 'gpt-4o', priceId: 'price_123', secretKey: 'sk-test-secret' });
    assert.equal(evalResult.approvalRequired, true);
    assert.equal(evalResult.autoApply, false);
    assert.equal(evalResult.allowedAutoApply, false);
    assert.equal(evalResult.details.secretKey, '[REDACTED]');
  }
});

test('deduplicateStateTransition handles same owner-approved run ID reuse without duplicate heartbeat update', () => {
  const transition1 = deduplicateStateTransition({
    previousRunId: 'run-100',
    currentRunId: 'run-101',
    previousStatus: 'NOT_DUE',
    currentStatus: 'READY_FOR_OWNER_REVIEW',
    heartbeatAt: '2026-10-18T12:00:00Z',
    lastHeartbeatAt: '2026-10-18T11:45:00Z'
  });
  assert.equal(transition1.deduplicated, false);
  assert.equal(transition1.heartbeatUpdated, true);

  const transition2 = deduplicateStateTransition({
    previousRunId: 'run-101',
    currentRunId: 'run-101', // duplicate run ID reuse
    previousStatus: 'READY_FOR_OWNER_REVIEW',
    currentStatus: 'READY_FOR_OWNER_REVIEW',
    heartbeatAt: '2026-10-18T12:05:00Z',
    lastHeartbeatAt: '2026-10-18T12:00:00Z'
  });
  assert.equal(transition2.deduplicated, true);
  assert.equal(transition2.heartbeatUpdated, false);
  assert.equal(transition2.effectiveHeartbeatAt, '2026-10-18T12:00:00Z');
});

test('sanitizeStateFacts strips sensitive tokens, database URLs with password, and secret keys', () => {
  const dirty = {
    apiKey: 'sk-proj-1234567890',
    dbUrl: 'postgres://user:super_secret_pw@db.example.com:5432/main',
    authToken: 'bearer-xyz-secret',
    safeField: 'normal_data'
  };

  const clean = sanitizeStateFacts(dirty);
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.authToken, '[REDACTED]');
  assert.equal(clean.safeField, 'normal_data');
  assert.equal(clean.dbUrl, 'postgres://user:[REDACTED]@db.example.com:5432/main');
});

test('parseAndValidateTimestamp fails closed on malformed, negative, or future inputs', () => {
  assert.equal(parseAndValidateTimestamp('invalid-date', mockNowMs), null);
  assert.equal(parseAndValidateTimestamp(-100, mockNowMs), null);
  assert.equal(parseAndValidateTimestamp(mockNowMs + 1000, mockNowMs), null); // Future timestamp
  assert.equal(parseAndValidateTimestamp(mockNowMs, mockNowMs), mockNowMs);
});


test('No implicit wall-clock: missing clock and malformed owner facts fail closed', () => {
  assert.equal(evaluateSchedulerState({ enabled: true, heartbeatAt: mockNowMs }).status, SCHEDULER_STATUSES.WORKER_UNSEEN);
  assert.equal(evaluateSchedulerState(null).reason, 'INVALID_STATE_FACTS');
  assert.equal(evaluateSchedulerState([]).reason, 'INVALID_STATE_FACTS');
  assert.equal(evaluateSchedulerState({ enabled: true, now: () => NaN }).reason, 'INVALID_NOW_TIMESTAMP');
});

test('Missing run identity or heartbeat cannot claim a new worker heartbeat', () => {
  const noRun = deduplicateStateTransition({
    previousRunId: 'run-001', currentRunId: null, previousStatus: 'NOT_DUE',
    currentStatus: 'READY_FOR_OWNER_REVIEW', heartbeatAt: mockNowMs, lastHeartbeatAt: mockNowMs - 1000
  });
  assert.equal(noRun.heartbeatUpdated, false);
  assert.equal(noRun.deduplicated, true);
  assert.equal(noRun.status, 'NOT_DUE');
  const missingHeartbeat = deduplicateStateTransition({
    previousRunId: 'run-001', currentRunId: 'run-002',
    currentStatus: 'READY_FOR_OWNER_REVIEW', heartbeatAt: null, lastHeartbeatAt: mockNowMs - 1000
  });
  assert.equal(missingHeartbeat.heartbeatUpdated, false);
});
