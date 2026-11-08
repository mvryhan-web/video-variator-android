import { createHash } from 'node:crypto';
import {
  computeLiteCandidateId,
  LITE_DELIVERY_REASON_CODES,
  LITE_DELIVERY_READINESS,
  LITE_DELIVERY_STATUSES
} from './lite-delivery-policy.js';

/**
 * W5.6 is an in-memory, side-effect-free audit reducer. It neither sends mail
 * nor proves delivery. Only a trusted server caller may inject verifiedOwnerId
 * and a newly evaluated W5.5 readiness result; never use request-body claims.
 *
 * Actions: {type:'PREPARE'|'APPROVE'|'RECHECK'|'CANCEL'|'REVOKE',
 *           expectedRevision:number, candidateId?:string}.
 * The caller must persist compare-and-swap on revision externally if it needs
 * cross-process concurrency protection. This function has NO persistence.
 * Re-evaluate W5.5 at nowMs before every action except CANCEL / REVOKE.
 */
export const LITE_ATTEMPT_STATUSES = Object.freeze({
  UNPREPARED: 'UNPREPARED',
  REVIEW_PENDING: 'REVIEW_PENDING',
  APPROVED_FOR_MANUAL_REVIEW: 'APPROVED_FOR_MANUAL_REVIEW',
  BLOCKED: 'BLOCKED',
  REVOKED: 'REVOKED',
  CANCELLED: 'CANCELLED'
});
export const LITE_ATTEMPT_ACTIONS = Object.freeze({
  PREPARE: 'PREPARE', APPROVE: 'APPROVE', RECHECK: 'RECHECK',
  CANCEL: 'CANCEL', REVOKE: 'REVOKE'
});
export const LITE_ATTEMPT_REASONS = Object.freeze({
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  OWNER_REVIEW_APPROVED_NOT_SENT: 'OWNER_REVIEW_APPROVED_NOT_SENT',
  READY_UNCHANGED: 'READY_UNCHANGED',
  INVALID_CLOCK: 'INVALID_CLOCK',
  INVALID_ACTION: 'INVALID_ACTION',
  INVALID_PREVIOUS: 'INVALID_PREVIOUS',
  OWNER_UNVERIFIED: 'OWNER_UNVERIFIED',
  FOREIGN_OWNER_DENIED: 'FOREIGN_OWNER_DENIED',
  INVALID_READINESS: 'INVALID_READINESS',
  READINESS_STALE: 'READINESS_STALE',
  READINESS_BLOCKED: 'READINESS_BLOCKED',
  CANDIDATE_CHANGED: 'CANDIDATE_CHANGED',
  CANDIDATE_MISMATCH: 'CANDIDATE_MISMATCH',
  APPROVAL_EXPIRED: 'APPROVAL_EXPIRED',
  CONCURRENT_ACTION_CONFLICT: 'CONCURRENT_ACTION_CONFLICT',
  DUPLICATE_ACTION: 'DUPLICATE_ACTION',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  CANCELLED_BY_OWNER: 'CANCELLED_BY_OWNER',
  REVOKED_BY_OWNER: 'REVOKED_BY_OWNER',
  TERMINAL_STATE: 'TERMINAL_STATE'
});

const MAX_AUDIT = 20;
const MAX_AUDIT_ENTRY_BYTES = 200;
const MAX_APPROVED_AGE_MS = 15 * 60 * 1000;
const STATES = new Set(Object.values(LITE_ATTEMPT_STATUSES));
const ACTIONS = new Set(Object.values(LITE_ATTEMPT_ACTIONS));
const REASONS = new Set([...Object.values(LITE_ATTEMPT_REASONS),
  ...Object.values(LITE_DELIVERY_REASON_CODES)]);
const ID_PATTERN = /^[a-zA-Z0-9._:@-]{1,128}$/;
const CANDIDATE_PATTERN = /^lite-cand-[a-f0-9]{24}$/;
const FINGERPRINT_PATTERN = /^lite-fp-[a-f0-9]{32}$/;
const OWNER_TAG_PATTERN = /^[a-f0-9]{64}$/;
const INITIAL = LITE_ATTEMPT_STATUSES.UNPREPARED;
const VALID_ACTIONS = new Set(['PREPARE', 'APPROVE', 'RECHECK', 'CANCEL', 'REVOKE']);

function isRecord(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x) && !(x instanceof Date);
}
function validClock(ms) {
  return Number.isSafeInteger(ms) && ms > 0 && ms <= 8640000000000000;
}
function ownerTag(id) {
  return createHash('sha256').update('deepsyq-w5.6-owner-v1\0' + id).digest('hex');
}
function freezeState(value) {
  Object.freeze(value.audit);
  for (const item of value.audit) Object.freeze(item);
  return Object.freeze(value);
}
function event(atMs, from, to, reasonCode) {
  const record = { at: new Date(atMs).toISOString(), from, to, reasonCode };
  if (Buffer.byteLength(JSON.stringify(record), 'utf8') > MAX_AUDIT_ENTRY_BYTES) {
    throw new Error('Internal bounded audit event contract violated');
  }
  return record;
}
function initial(reasonCode, nowMs, withEvent = false) {
  const audit = withEvent && validClock(nowMs)
    ? [event(nowMs, INITIAL, LITE_ATTEMPT_STATUSES.BLOCKED, reasonCode)] : [];
  return freezeState({
    status: LITE_ATTEMPT_STATUSES.BLOCKED, reasonCode,
    candidateId: null, ownerTag: null,
    requiresOwnerAction: true, deliveryStatus: LITE_DELIVERY_STATUSES.NOT_SENT,
    sent: false, revision: 0, updatedAtMs: validClock(nowMs) ? nowMs : null,
    approvedAtMs: null, audit
  });
}
function validPrevious(previous) {
  if (!isRecord(previous) || !STATES.has(previous.status) || previous.status === INITIAL ||
      !CANDIDATE_PATTERN.test(previous.candidateId) ||
      !OWNER_TAG_PATTERN.test(previous.ownerTag) ||
      !Number.isSafeInteger(previous.revision) || previous.revision < 1 ||
      !validClock(previous.updatedAtMs) ||
      previous.sent !== false || previous.deliveryStatus !== LITE_DELIVERY_STATUSES.NOT_SENT ||
      !Array.isArray(previous.audit) || previous.audit.length < 1 || previous.audit.length > MAX_AUDIT ||
      (previous.approvedAtMs !== null && !validClock(previous.approvedAtMs)) ||
      (previous.status === LITE_ATTEMPT_STATUSES.APPROVED_FOR_MANUAL_REVIEW && !validClock(previous.approvedAtMs))) {
    return null;
  }
  const audit = [];
  let last = 0;
  for (const item of previous.audit) {
    if (!isRecord(item) || typeof item.at !== 'string' ||
        !STATES.has(item.from) || !STATES.has(item.to) ||
        !REASONS.has(item.reasonCode) ||
        Buffer.byteLength(JSON.stringify(item), 'utf8') > MAX_AUDIT_ENTRY_BYTES) return null;
    const atMs = Date.parse(item.at);
    if (!validClock(atMs) || new Date(atMs).toISOString() !== item.at ||
        atMs < last || atMs > previous.updatedAtMs) return null;
    last = atMs;
    // Take allowlisted fields only, so arbitrary properties can never be echoed.
    audit.push({ at: item.at, from: item.from, to: item.to, reasonCode: item.reasonCode });
  }
  if (previous.approvedAtMs !== null && previous.approvedAtMs > previous.updatedAtMs) return null;
  if (audit[audit.length - 1].to !== previous.status) return null;
  return {status: previous.status, reasonCode: REASONS.has(previous.reasonCode) ? previous.reasonCode : LITE_ATTEMPT_REASONS.INVALID_PREVIOUS,
    candidateId: previous.candidateId, ownerTag: previous.ownerTag,
    revision: previous.revision, updatedAtMs: previous.updatedAtMs,
    approvedAtMs: previous.approvedAtMs, audit};
}
function output(previous, status, reasonCode, nowMs, change = true) {
  const audit = [...previous.audit];
  const nextStatus = status;
  if (change) audit.push(event(nowMs, previous.status, status, reasonCode));
  const trimmed = audit.slice(-MAX_AUDIT);
  return freezeState({
    status: nextStatus, reasonCode,
    candidateId: previous.candidateId, ownerTag: previous.ownerTag,
    requiresOwnerAction: ![LITE_ATTEMPT_STATUSES.CANCELLED, LITE_ATTEMPT_STATUSES.REVOKED].includes(nextStatus),
    deliveryStatus: LITE_DELIVERY_STATUSES.NOT_SENT,
    sent: false,
    revision: previous.revision + (change ? 1 : 0),
    updatedAtMs: change ? nowMs : previous.updatedAtMs,
    approvedAtMs: nextStatus === LITE_ATTEMPT_STATUSES.APPROVED_FOR_MANUAL_REVIEW
      ? (change ? nowMs : previous.approvedAtMs) : null,
    audit: trimmed
  });
}
function verifiedReadiness(readiness, verifiedOwnerId, nowMs) {
  if (!isRecord(readiness) || readiness.status !== LITE_DELIVERY_STATUSES.NOT_SENT ||
      readiness.sent !== false || readiness.draftOnly !== true) {
    return { reason: LITE_ATTEMPT_REASONS.INVALID_READINESS };
  }
  // W5.5 validates its own alert age, opt-in, recipient and approval TTL at a
  // caller-injected clock. Require a fresh W5.5 evaluation for EACH action;
  // replaying a past "ready" snapshot must not extend its approval lifetime.
  if (readiness.evaluatedAt !== new Date(nowMs).toISOString()) {
    return { reason: LITE_ATTEMPT_REASONS.READINESS_STALE };
  }
  if (readiness.readiness === LITE_DELIVERY_READINESS.BLOCKED &&
      readiness.ready === false && readiness.blocked === true) {
    return {reason: REASONS.has(readiness.reasonCode)
      ? readiness.reasonCode : LITE_ATTEMPT_REASONS.READINESS_BLOCKED};
  }
  if (readiness.readiness !== LITE_DELIVERY_READINESS.READY ||
      readiness.ready !== true || readiness.blocked !== false ||
      readiness.reasonCode !== LITE_DELIVERY_REASON_CODES.READY_FOR_OWNER_DELIVERY ||
      !Array.isArray(readiness.blockers) || readiness.blockers.length !== 0 ||
      readiness.ownerId !== verifiedOwnerId ||
      !FINGERPRINT_PATTERN.test(readiness.alertFingerprint) ||
      typeof readiness.recipient !== 'string' ||
      readiness.recipient !== readiness.recipient.toLowerCase() ||
      readiness.recipient.length > 120 ||
      !/^[^\s@<>"']+@[a-z0-9.-]+\.[a-z]{2,}$/.test(readiness.recipient) ||
      !isRecord(readiness.draft) || readiness.draft.hasAlerts !== true ||
      readiness.draft.status !== 'draft_ready' ||
      readiness.draft.sent !== false || readiness.draft.draftOnly !== true ||
      readiness.draft.to !== readiness.recipient || readiness.draft.recipientConfigured !== true) {
    return { reason: readiness.ownerId && readiness.ownerId !== verifiedOwnerId
      ? LITE_ATTEMPT_REASONS.FOREIGN_OWNER_DENIED : LITE_ATTEMPT_REASONS.INVALID_READINESS };
  }
  const expected = computeLiteCandidateId({
    ownerId: verifiedOwnerId, recipient: readiness.recipient,
    alertFingerprint: readiness.alertFingerprint
  });
  if (!CANDIDATE_PATTERN.test(readiness.candidateId) || expected !== readiness.candidateId) {
    return { reason: LITE_ATTEMPT_REASONS.CANDIDATE_MISMATCH };
  }
  return { candidateId: expected, reason: null };
}

/** Never sends, queues, schedules or claims any notification delivery. */
export function reduceLiteDeliveryAttempt({previous = null, action, verifiedOwnerId, readiness, nowMs} = {}) {
  if (!validClock(nowMs)) return initial(LITE_ATTEMPT_REASONS.INVALID_CLOCK, nowMs);
  if (typeof verifiedOwnerId !== 'string' || !ID_PATTERN.test(verifiedOwnerId)) {
    // Do not echo another account's candidate or prior audit on authentication failure.
    return initial(LITE_ATTEMPT_REASONS.OWNER_UNVERIFIED, nowMs);
  }
  const ownTag = ownerTag(verifiedOwnerId);
  const prior = previous === null ? null : validPrevious(previous);
  if (previous !== null && (!prior || prior.ownerTag !== ownTag)) {
    return initial(!prior ? LITE_ATTEMPT_REASONS.INVALID_PREVIOUS : LITE_ATTEMPT_REASONS.FOREIGN_OWNER_DENIED, nowMs);
  }
  if (!isRecord(action) || !ACTIONS.has(action.type) ||
      !Number.isSafeInteger(action.expectedRevision) || action.expectedRevision < 0) {
    return prior ? output(prior, prior.status, LITE_ATTEMPT_REASONS.INVALID_ACTION, nowMs, false)
      : initial(LITE_ATTEMPT_REASONS.INVALID_ACTION, nowMs);
  }
  if (action.expectedRevision !== (prior?.revision || 0)) {
    return prior ? output(prior, prior.status, LITE_ATTEMPT_REASONS.CONCURRENT_ACTION_CONFLICT, nowMs, false)
      : initial(LITE_ATTEMPT_REASONS.CONCURRENT_ACTION_CONFLICT, nowMs);
  }
  if (typeof action.candidateId !== 'undefined' &&
      (!CANDIDATE_PATTERN.test(action.candidateId) ||
       (prior && action.candidateId !== prior.candidateId))) {
    return prior ? output(prior, prior.status, LITE_ATTEMPT_REASONS.CANDIDATE_MISMATCH, nowMs, false)
      : initial(LITE_ATTEMPT_REASONS.CANDIDATE_MISMATCH, nowMs);
  }
  if (prior && nowMs < prior.updatedAtMs) {
    return output(prior, prior.status, LITE_ATTEMPT_REASONS.INVALID_CLOCK, nowMs, false);
  }
  if (prior && [LITE_ATTEMPT_STATUSES.REVOKED, LITE_ATTEMPT_STATUSES.BLOCKED,
                LITE_ATTEMPT_STATUSES.CANCELLED].includes(prior.status)) {
    return output(prior, prior.status, LITE_ATTEMPT_REASONS.TERMINAL_STATE, nowMs, false);
  }
  if (prior && action.type === 'CANCEL') {
    return output(prior, LITE_ATTEMPT_STATUSES.CANCELLED, LITE_ATTEMPT_REASONS.CANCELLED_BY_OWNER, nowMs);
  }
  if (prior && action.type === 'REVOKE') {
    return output(prior, LITE_ATTEMPT_STATUSES.REVOKED, LITE_ATTEMPT_REASONS.REVOKED_BY_OWNER, nowMs);
  }
  if (!prior && action.type !== 'PREPARE') {
    return initial(LITE_ATTEMPT_REASONS.INVALID_TRANSITION, nowMs);
  }
  if (prior && action.type === 'PREPARE') {
    return output(prior, prior.status, LITE_ATTEMPT_REASONS.DUPLICATE_ACTION, nowMs, false);
  }
  if (prior && action.type === 'APPROVE' && prior.status === LITE_ATTEMPT_STATUSES.APPROVED_FOR_MANUAL_REVIEW) {
    return output(prior, prior.status, LITE_ATTEMPT_REASONS.DUPLICATE_ACTION, nowMs, false);
  }
  if (prior && action.type === 'APPROVE' && prior.status !== LITE_ATTEMPT_STATUSES.REVIEW_PENDING) {
    return output(prior, prior.status, LITE_ATTEMPT_REASONS.INVALID_TRANSITION, nowMs, false);
  }
  // A manual approval also expires locally. Do not extend its age with a new
  // W5.5 readiness object while keeping an old approval transition alive.
  if (prior?.status === LITE_ATTEMPT_STATUSES.APPROVED_FOR_MANUAL_REVIEW &&
      nowMs - prior.approvedAtMs > MAX_APPROVED_AGE_MS) {
    return output(prior, LITE_ATTEMPT_STATUSES.REVOKED, LITE_ATTEMPT_REASONS.APPROVAL_EXPIRED, nowMs);
  }
  const check = verifiedReadiness(readiness, verifiedOwnerId, nowMs);
  if (check.reason) {
    if (!prior) return initial(check.reason, nowMs, true);
    return output(prior, prior.status === LITE_ATTEMPT_STATUSES.APPROVED_FOR_MANUAL_REVIEW
      ? LITE_ATTEMPT_STATUSES.REVOKED : LITE_ATTEMPT_STATUSES.BLOCKED, check.reason, nowMs);
  }
  if (typeof action.candidateId !== 'undefined' && action.candidateId !== check.candidateId) {
    return prior ? output(prior, prior.status, LITE_ATTEMPT_REASONS.CANDIDATE_MISMATCH, nowMs, false)
      : initial(LITE_ATTEMPT_REASONS.CANDIDATE_MISMATCH, nowMs);
  }
  if (prior && prior.candidateId !== check.candidateId) {
    return output(prior, prior.status === LITE_ATTEMPT_STATUSES.APPROVED_FOR_MANUAL_REVIEW
      ? LITE_ATTEMPT_STATUSES.REVOKED : LITE_ATTEMPT_STATUSES.BLOCKED,
    LITE_ATTEMPT_REASONS.CANDIDATE_CHANGED, nowMs);
  }
  if (!prior) {
    return freezeState({
      status: LITE_ATTEMPT_STATUSES.REVIEW_PENDING,
      reasonCode: LITE_ATTEMPT_REASONS.REVIEW_REQUIRED,
      candidateId: check.candidateId, ownerTag: ownTag,
      requiresOwnerAction: true, deliveryStatus: LITE_DELIVERY_STATUSES.NOT_SENT,
      sent: false, revision: 1, updatedAtMs: nowMs, approvedAtMs: null,
      audit: [event(nowMs, INITIAL, LITE_ATTEMPT_STATUSES.REVIEW_PENDING, LITE_ATTEMPT_REASONS.REVIEW_REQUIRED)]
    });
  }
  if (action.type === 'APPROVE') {
    return output(prior, LITE_ATTEMPT_STATUSES.APPROVED_FOR_MANUAL_REVIEW,
      LITE_ATTEMPT_REASONS.OWNER_REVIEW_APPROVED_NOT_SENT, nowMs);
  }
  if (action.type === 'RECHECK') {
    return output(prior, prior.status, LITE_ATTEMPT_REASONS.READY_UNCHANGED, nowMs, false);
  }
  return output(prior, prior.status, LITE_ATTEMPT_REASONS.INVALID_TRANSITION, nowMs, false);
}
