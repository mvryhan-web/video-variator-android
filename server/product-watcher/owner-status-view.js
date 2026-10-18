/**
 * Pure Owner Status View Adapter for Product Watcher
 *
 * Transforms raw or synthetic snapshot data into a deterministic, bounded,
 * and owner-safe telemetry payload for owner dashboard consumption.
 *
 * Pure functions only. Zero side-effects, zero DB calls, zero networks.
 * Uses injected clock `now` (never Date.now()).
 * Uses scheduler-state-policy.js public functions for state and safety evaluations.
 */

import {
  evaluateSchedulerState,
  getScheduleIntervalHints,
  evaluateProposedChange,
  parseAndValidateTimestamp,
  WORKER_HEARTBEAT_TTL_MS
} from './scheduler-state-policy.js';

const MAX_RECENT_SUMMARIES = 10;
const MAX_PROPOSALS = 10;
const MAX_STRING_LENGTH = 200;

// Sensitive keys pattern for blocklisting specific property names
const SENSITIVE_KEY_PATTERNS = [
  /token/i, /secret/i, /password/i, /key/i, /auth/i, /credential/i, /bearer/i,
  /prompt/i, /customer/i, /user_?id/i, /email/i, /sql/i, /db_?error/i, /media/i
];

// Sensitive content patterns to sanitize strings regardless of key name (e.g. SQL statements, bearer tokens, error dumps)
const SENSITIVE_VALUE_PATTERNS = [
  /SELECT\s+.+?\s+FROM/i,
  /INSERT\s+INTO/i,
  /UPDATE\s+.+?\s+SET/i,
  /DELETE\s+FROM/i,
  /bearer\s+[a-z0-9._~+/-]+=*/i,
  /sk_live_[a-zA-Z0-9]+/i,
  /sk_test_[a-zA-Z0-9]+/i
];

/**
 * Truncate a string to MAX_STRING_LENGTH.
 */
function truncateString(str) {
  if (typeof str !== 'string') return '';
  const cleaned = str.replace(/[\r\n\t]+/g, ' ').trim();
  if (cleaned.length <= MAX_STRING_LENGTH) return cleaned;
  return cleaned.slice(0, MAX_STRING_LENGTH) + '...';
}

/**
 * Sanitize and scrub sensitive fields or prompt/sql/customer identifiers from an object or value.
 */
function redactAndSanitize(val, depth = 0) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean' || typeof val === 'number') return val;
  if (typeof val === 'string') {
    if (SENSITIVE_VALUE_PATTERNS.some(p => p.test(val))) {
      return '[REDACTED]';
    }
    return truncateString(val);
  }
  if (depth > 3) return '[DEPTH_EXCEEDED]';

  if (Array.isArray(val)) {
    return val.slice(0, 10).map(item => redactAndSanitize(item, depth + 1));
  }

  if (typeof val === 'object') {
    const cleanObj = {};
    for (const [k, v] of Object.entries(val)) {
      if (SENSITIVE_KEY_PATTERNS.some(p => p.test(k))) {
        cleanObj[k] = '[REDACTED]';
      } else {
        cleanObj[k] = redactAndSanitize(v, depth + 1);
      }
    }
    return cleanObj;
  }

  return String(val);
}

/**
 * Pure adapter generating an owner-safe status view JSON snapshot.
 *
 * @param {Object} snapshot - Injected read-only snapshot facts.
 * @param {Object} options - Options containing injected `now` clock.
 * @returns {Object} Deterministic owner-safe status view telemetry object.
 */
export function renderOwnerStatusView(snapshot = {}, options = {}) {
  // Extract and resolve injected `now` clock
  const rawNow = options.now ?? snapshot.now;
  const nowVal = typeof rawNow === 'function' ? rawNow() : rawNow;
  const nowMs = nowVal instanceof Date
    ? nowVal.getTime()
    : (typeof nowVal === 'number' ? nowVal : Date.parse(nowVal));

  if (!Number.isFinite(nowMs) || nowMs <= 0) {
    return {
      enabled: false,
      paused: false,
      status: 'WORKER_UNSEEN',
      reason: 'INVALID_NOW_TIMESTAMP',
      checkedAt: null,
      lastRunAt: null,
      nextRunAt: null,
      verifiedWorkerHeartbeat: { active: false, heartbeatAt: null, ageMs: null },
      schedules: getScheduleIntervalHints(),
      boundedRecentSummaries: [],
      pendingApprovalCount: 0,
      pendingProposals: []
    };
  }

  const checkedAtIso = new Date(nowMs).toISOString();

  // Validate facts via scheduler-state-policy
  const factsInput = { ...snapshot, now: nowMs };
  const evaluatedState = evaluateSchedulerState(factsInput);

  const enabled = snapshot?.enabled === true;
  const paused = snapshot?.paused === true;

  // Heartbeat verification
  const heartbeatMs = parseAndValidateTimestamp(snapshot?.heartbeatAt, nowMs);
  const isHeartbeatFresh = heartbeatMs !== null && (nowMs - heartbeatMs <= WORKER_HEARTBEAT_TTL_MS);
  const verifiedWorkerHeartbeat = {
    active: isHeartbeatFresh && enabled && !paused,
    heartbeatAt: heartbeatMs ? new Date(heartbeatMs).toISOString() : null,
    ageMs: heartbeatMs ? nowMs - heartbeatMs : null
  };

  // Last run validation
  const lastRunMs = parseAndValidateTimestamp(snapshot?.lastRunAt, nowMs);
  const lastRunIso = lastRunMs ? new Date(lastRunMs).toISOString() : null;
  const nextRunIso = evaluatedState.nextDueAt || null;

  // Recent summaries processing (bounded and redacted)
  const rawRuns = Array.isArray(snapshot?.recentRuns || snapshot?.runs) ? (snapshot.recentRuns || snapshot.runs) : [];
  const boundedRecentSummaries = rawRuns
    .slice(0, MAX_RECENT_SUMMARIES)
    .map(run => {
      if (!run || typeof run !== 'object') return null;
      const runTs = parseAndValidateTimestamp(run.checkedAt || run.createdAt || run.timestamp, nowMs);
      return {
        id: Number.isSafeInteger(Number(run.id)) ? Number(run.id) : null,
        status: typeof run.status === 'string' ? truncateString(run.status) : 'unknown',
        checkedAt: runTs ? new Date(runTs).toISOString() : null,
        checksCount: typeof run.checks === 'number' ? Math.max(0, Math.floor(run.checks)) : (Array.isArray(run.checks) ? run.checks.length : 0),
        findingsSummary: redactAndSanitize(run.findings || run.summary || run.findingsSummary || {})
      };
    })
    .filter(Boolean);

  // Process proposals and enforce human approval required
  const rawProposals = Array.isArray(snapshot?.pendingProposals || snapshot?.proposals)
    ? (snapshot.pendingProposals || snapshot.proposals)
    : [];

  const pendingProposals = rawProposals
    .slice(0, MAX_PROPOSALS)
    .map(p => {
      const evalRes = evaluateProposedChange(p);
      return {
        id: p?.id ? truncateString(String(p.id)) : null,
        type: evalRes.type,
        approvalRequired: true,
        autoApply: false,
        reason: evalRes.reason,
        details: redactAndSanitize(p?.details || p?.proposal || {})
      };
    });

  const pendingApprovalCount = pendingProposals.length;

  return {
    enabled,
    paused,
    status: evaluatedState.status,
    reason: evaluatedState.reason,
    checkedAt: checkedAtIso,
    lastRunAt: lastRunIso,
    nextRunAt: nextRunIso,
    verifiedWorkerHeartbeat,
    schedules: getScheduleIntervalHints(),
    boundedRecentSummaries,
    pendingApprovalCount,
    pendingProposals
  };
}
