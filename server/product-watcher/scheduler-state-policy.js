/**
 * Pure Scheduler & Owner Approval State Policy Contract
 *
 * Deterministic state policy evaluation for Product Watcher background scheduling,
 * interval hints, proposed changes, and transition deduplication.
 *
 * Pure functions only. Zero side-effects, zero DB calls, zero networks, pure injected clock.
 */

export const SCHEDULER_STATUSES = Object.freeze({
  DISABLED: 'DISABLED',
  PAUSED: 'PAUSED',
  WORKER_UNSEEN: 'WORKER_UNSEEN',
  NOT_DUE: 'NOT_DUE',
  OVERDUE: 'OVERDUE',
  READY_FOR_OWNER_REVIEW: 'READY_FOR_OWNER_REVIEW',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED'
});

export const WORKER_HEARTBEAT_TTL_MS = 3 * 60 * 1000; // 3 minutes
export const SCHEDULE_INTERVAL_15M_MS = 15 * 60 * 1000; // 15 minutes
export const SCHEDULE_OVERDUE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export const BOUNDED_SCHEDULE_HINTS = Object.freeze([
  { id: '15m', label: '15 min', intervalMs: 15 * 60 * 1000, deployed: true },
  { id: '1h', label: '1 hour', intervalMs: 60 * 60 * 1000, deployed: false },
  { id: '6h', label: '6 hours', intervalMs: 6 * 60 * 60 * 1000, deployed: false },
  { id: '24h', label: 'daily', intervalMs: 24 * 60 * 60 * 1000, deployed: false }
]);

const SECRET_PATTERNS = [/token/i, /secret/i, /password/i, /key/i, /auth/i, /credential/i, /bearer/i];

/**
 * Scrub potential credentials or secrets from any returned state object or string.
 */
export function sanitizeStateFacts(input) {
  if (input === null || input === undefined) return input;
  if (typeof input === 'function') return input;
  if (input instanceof Date) return input;
  if (typeof input === 'string') {
    return input.replace(/([a-zA-Z0-9_-]+:\/\/[^:]+:)[^@]+(@)/g, '$1[REDACTED]$2');
  }
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map(sanitizeStateFacts);

  const clean = {};
  for (const [k, v] of Object.entries(input)) {
    if (SECRET_PATTERNS.some(p => p.test(k))) {
      clean[k] = '[REDACTED]';
    } else {
      clean[k] = sanitizeStateFacts(v);
    }
  }
  return clean;
}

/**
 * Parse and validate an injected timestamp against `nowMs`.
 * Returns valid numeric timestamp in ms or null if invalid/missing/future.
 */
export function parseAndValidateTimestamp(ts, nowMs) {
  if (ts === null || ts === undefined || ts === '') return null;
  let ms;
  if (ts instanceof Date) {
    ms = ts.getTime();
  } else if (typeof ts === 'number') {
    ms = ts;
  } else if (typeof ts === 'string') {
    ms = Date.parse(ts);
  } else {
    return null;
  }

  if (!Number.isFinite(ms) || ms <= 0) return null;
  // Missing/invalid/future timestamps fail closed
  if (ms > nowMs) return null;

  return ms;
}

/**
 * Return bounded schedule interval hints.
 * Explicitly reports deployedCount: 1 (only 15m is real/deployed).
 */
export function getScheduleIntervalHints() {
  const hints = BOUNDED_SCHEDULE_HINTS.map(h => ({ ...h }));
  const deployedCount = hints.filter(h => h.deployed).length;
  return {
    schedules: hints,
    totalCount: hints.length,
    deployedCount,
    deployedIntervalMs: SCHEDULE_INTERVAL_15M_MS
  };
}

/**
 * Evaluate safety policy for proposed changes (provider, price, model, code, publish).
 * MUST remain owner approval required and NEVER auto-apply.
 */
export function evaluateProposedChange(proposal) {
  const clean = sanitizeStateFacts(proposal || {});
  const changeType = String(clean.type || clean.category || clean.changeType || 'unknown').toLowerCase();
  const requiresOwnerApproval = true;
  const autoApply = false;

  return {
    type: changeType,
    approvalRequired: requiresOwnerApproval,
    autoApply,
    allowedAutoApply: false,
    reason: 'OWNER_APPROVAL_REQUIRED_FOR_ALL_PROPOSED_CHANGES',
    details: clean
  };
}

/**
 * Deterministically evaluate scheduler state based on sanitized owner facts.
 */
export function evaluateSchedulerState(facts = {}) {
  // A policy contract must never invent a live clock or mutate state on bad input.
  if (!facts || typeof facts !== 'object' || Array.isArray(facts)) {
    return { status: SCHEDULER_STATUSES.WORKER_UNSEEN, reason: 'INVALID_STATE_FACTS', ok: false };
  }
  const cleanFacts = sanitizeStateFacts(facts);
  const nowVal = typeof facts.now === 'function' ? facts.now() : facts.now;
  const nowMs = nowVal instanceof Date ? nowVal.getTime() : (typeof nowVal === 'number' ? nowVal : Date.parse(nowVal));

  if (!Number.isFinite(nowMs) || nowMs <= 0) {
    return { status: SCHEDULER_STATUSES.WORKER_UNSEEN, reason: 'INVALID_NOW_TIMESTAMP', ok: false };
  }

  const enabled = cleanFacts.enabled === true;
  if (!enabled) {
    return { status: SCHEDULER_STATUSES.DISABLED, reason: 'WATCHER_DISABLED', checkedAt: new Date(nowMs).toISOString() };
  }

  const paused = cleanFacts.paused === true;
  if (paused) {
    return { status: SCHEDULER_STATUSES.PAUSED, reason: 'OWNER_PAUSED', checkedAt: new Date(nowMs).toISOString() };
  }

  // Heartbeat check: must be valid and within WORKER_HEARTBEAT_TTL_MS
  const heartbeatMs = parseAndValidateTimestamp(cleanFacts.heartbeatAt, nowMs);
  if (heartbeatMs === null || (nowMs - heartbeatMs > WORKER_HEARTBEAT_TTL_MS)) {
    return {
      status: SCHEDULER_STATUSES.WORKER_UNSEEN,
      reason: heartbeatMs === null ? 'MISSING_OR_FUTURE_HEARTBEAT' : 'STALE_HEARTBEAT',
      checkedAt: new Date(nowMs).toISOString()
    };
  }

  // Check pending owner approval
  const hasPendingApproval = cleanFacts.approvalPending === true ||
    (Array.isArray(cleanFacts.pendingProposals) && cleanFacts.pendingProposals.length > 0) ||
    (cleanFacts.proposedChanges && Object.keys(cleanFacts.proposedChanges).length > 0);

  if (hasPendingApproval) {
    return {
      status: SCHEDULER_STATUSES.APPROVAL_REQUIRED,
      reason: 'OWNER_APPROVAL_PENDING',
      checkedAt: new Date(nowMs).toISOString(),
      autoApply: false
    };
  }

  // Check last run timestamp
  const lastRunMs = parseAndValidateTimestamp(cleanFacts.lastRunAt, nowMs);

  if (cleanFacts.lastRunAt !== null && cleanFacts.lastRunAt !== undefined && cleanFacts.lastRunAt !== '' && lastRunMs === null) {
    // Fail closed on invalid/future lastRunAt timestamp
    return {
      status: SCHEDULER_STATUSES.WORKER_UNSEEN,
      reason: 'INVALID_LAST_RUN_TIMESTAMP',
      checkedAt: new Date(nowMs).toISOString()
    };
  }

  if (lastRunMs === null) {
    // Worker is alive, unpaused, no last run recorded -> Overdue for first run
    return {
      status: SCHEDULER_STATUSES.OVERDUE,
      reason: 'NO_PREVIOUS_RUN',
      checkedAt: new Date(nowMs).toISOString()
    };
  }

  const elapsedMs = nowMs - lastRunMs;

  if (elapsedMs < SCHEDULE_INTERVAL_15M_MS) {
    return {
      status: SCHEDULER_STATUSES.NOT_DUE,
      reason: 'RUN_RECENT',
      nextDueAt: new Date(lastRunMs + SCHEDULE_INTERVAL_15M_MS).toISOString(),
      checkedAt: new Date(nowMs).toISOString()
    };
  }

  if (elapsedMs >= SCHEDULE_OVERDUE_THRESHOLD_MS) {
    return {
      status: SCHEDULER_STATUSES.OVERDUE,
      reason: 'SCHEDULE_OVERDUE',
      checkedAt: new Date(nowMs).toISOString()
    };
  }

  return {
    status: SCHEDULER_STATUSES.READY_FOR_OWNER_REVIEW,
    reason: 'INTERVAL_ELAPSED_READY_FOR_CHECK',
    checkedAt: new Date(nowMs).toISOString()
  };
}

/**
 * Deduplicate state transitions when same owner-approved run ID is reused.
 * Prevents false fresh heartbeats and duplicate transitions.
 */
export function deduplicateStateTransition({ previousRunId, currentRunId, previousStatus, currentStatus, heartbeatAt, lastHeartbeatAt }) {
  // Missing or invalid run identity must not generate an apparent fresh heartbeat.
  if (typeof currentRunId !== 'string' || !currentRunId.trim() || !heartbeatAt) {
    return { deduplicated: true, status: previousStatus || 'WORKER_UNSEEN', heartbeatUpdated: false, reason: 'UNVERIFIED_RUN_OR_HEARTBEAT', effectiveHeartbeatAt: lastHeartbeatAt || null };
  }
  const sameRunId = previousRunId != null && currentRunId != null && String(previousRunId) === String(currentRunId);

  if (sameRunId) {
    return {
      deduplicated: true,
      status: previousStatus || currentStatus,
      reusedRunId: currentRunId,
      heartbeatUpdated: false,
      reason: 'DUPLICATE_RUN_ID_REUSED',
      effectiveHeartbeatAt: lastHeartbeatAt || heartbeatAt
    };
  }

  return {
    deduplicated: false,
    status: currentStatus,
    runId: currentRunId,
    heartbeatUpdated: true,
    effectiveHeartbeatAt: heartbeatAt
  };
}
