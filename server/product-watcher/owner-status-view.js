/**
 * Product Watcher owner-only status projection (pure, no I/O).
 * Only an authenticated server caller may provide verifyHeartbeat().
 * Input timestamps, free-form findings, and client booleans NEVER prove worker origin.
 * No raw customer, billing, provider, media, or error data may enter this output.
 */
import { Buffer } from 'node:buffer';
import {
  evaluateSchedulerState, getScheduleIntervalHints,
  evaluateProposedChange, parseAndValidateTimestamp, WORKER_HEARTBEAT_TTL_MS
} from './scheduler-state-policy.js';

const MAX_RECENT = 10;
const MAX_PROPOSALS = 10;
const MAX_JSON_BYTES = 8192;
const RUN_STATUSES = new Set(['ok', 'warning', 'critical', 'error', 'unknown']);
const PROPOSAL_TYPES = new Set(['model_switch', 'provider_change', 'price_change', 'route_change', 'code_change', 'unknown']);

function count(value) {
  return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 100000) : 0;
}
function safeRunStatus(value) {
  const s = typeof value === 'string' ? value.toLowerCase() : '';
  return RUN_STATUSES.has(s) ? s : 'unknown';
}
function safeProposalId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,48}$/.test(value) ? value : null;
}
function safeProposalType(value) {
  const s = typeof value === 'string' ? value.toLowerCase() : '';
  return PROPOSAL_TYPES.has(s) ? s : 'unknown';
}
function timestamp(value, nowMs) {
  const ms = parseAndValidateTimestamp(value, nowMs);
  return ms === null ? null : new Date(ms).toISOString();
}
function fallback(reason) {
  return {
    enabled: false, paused: false, status: 'WORKER_UNSEEN', reason,
    checkedAt: null, lastRunAt: null, nextRunAt: null,
    verifiedWorkerHeartbeat: { active: false, heartbeatAt: null, ageMs: null },
    schedules: getScheduleIntervalHints(), boundedRecentSummaries: [],
    pendingApprovalCount: 0, pendingProposals: []
  };
}

/**
 * options.verifyHeartbeat(timestampMs, nowMs) must be an injected, trusted
 * server-side verifier for a persisted worker heartbeat. Never wire this
 * callback from request JSON or from client-provided flags.
 */
export function renderOwnerStatusView(snapshot = {}, options = {}) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return fallback('INVALID_SNAPSHOT');
  const rawNow = options.now ?? snapshot.now;
  const val = typeof rawNow === 'function' ? rawNow() : rawNow;
  const nowMs = val instanceof Date ? val.getTime() : typeof val === 'number' ? val : Date.parse(val);
  if (!Number.isFinite(nowMs) || nowMs <= 0) return fallback('INVALID_NOW_TIMESTAMP');

  const enabled = snapshot.enabled === true;
  const paused = snapshot.paused === true;
  const heartbeatMs = parseAndValidateTimestamp(snapshot.heartbeatAt, nowMs);
  const fresh = heartbeatMs !== null && nowMs - heartbeatMs <= WORKER_HEARTBEAT_TTL_MS;
  let originVerified = false;
  if (fresh && typeof options.verifyHeartbeat === 'function') {
    try { originVerified = options.verifyHeartbeat(heartbeatMs, nowMs) === true; }
    catch { originVerified = false; }
  }
  const trustedFresh = fresh && originVerified;
  // Pass only fixed, bounded facts to the underlying scheduler evaluator.
  // An attacker-supplied timestamp alone must never imply a live worker.
  const rawProposals = Array.isArray(snapshot.pendingProposals) ? snapshot.pendingProposals :
    Array.isArray(snapshot.proposals) ? snapshot.proposals : [];
  const state = evaluateSchedulerState({
    enabled, paused, heartbeatAt: trustedFresh ? heartbeatMs : null,
    lastRunAt: snapshot.lastRunAt ?? null,
    approvalPending: snapshot.approvalPending === true || rawProposals.length > 0,
    now: nowMs
  });

  const runs = Array.isArray(snapshot.recentRuns) ? snapshot.recentRuns :
    Array.isArray(snapshot.runs) ? snapshot.runs : [];
  const boundedRecentSummaries = runs.slice(0, MAX_RECENT).filter(
    run => run && typeof run === 'object' && !Array.isArray(run)
  ).map(run => ({
    id: Number.isSafeInteger(run.id) && run.id >= 0 ? run.id : null,
    status: safeRunStatus(run.status),
    checkedAt: timestamp(run.checkedAt ?? run.createdAt ?? run.timestamp, nowMs),
    checksCount: typeof run.checks === 'number' ? count(run.checks) :
      Array.isArray(run.checks) ? Math.min(run.checks.length, 100000) : 0,
    // Strictly enumerated aggregate counters; NEVER copy findings/summary.
    findingsSummary: {
      warningCount: count(run.warningCount),
      criticalCount: count(run.criticalCount)
    }
  }));

  const pendingProposals = rawProposals.slice(0, MAX_PROPOSALS).map(p => {
    const type = safeProposalType(p?.type);
    // Keep approval decision from existing pure policy, but never expose
    // its unbounded raw details or untrusted strings.
    const decision = evaluateProposedChange({ type });
    return {
      id: safeProposalId(p?.id), type, approvalRequired: decision.approvalRequired === true,
      autoApply: false, reason: 'OWNER_APPROVAL_REQUIRED_FOR_ALL_PROPOSED_CHANGES'
    };
  });
  const result = {
    enabled, paused, status: state.status, reason: state.reason,
    checkedAt: new Date(nowMs).toISOString(),
    lastRunAt: timestamp(snapshot.lastRunAt, nowMs),
    nextRunAt: state.nextDueAt || null,
    verifiedWorkerHeartbeat: {
      active: trustedFresh && enabled && !paused,
      heartbeatAt: trustedFresh ? new Date(heartbeatMs).toISOString() : null,
      ageMs: trustedFresh ? nowMs - heartbeatMs : null
    },
    schedules: getScheduleIntervalHints(),
    boundedRecentSummaries, pendingApprovalCount: pendingProposals.length, pendingProposals
  };
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > MAX_JSON_BYTES) {
    return fallback('OUTPUT_TOO_LARGE');
  }
  return result;
}
