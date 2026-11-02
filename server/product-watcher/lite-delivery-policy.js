import { createHash } from 'node:crypto';
import { formatLiteOwnerEmailDraft } from './lite-email-draft.js';

export const DELIVERY_READINESS_STATUS = Object.freeze({
  READY: 'READY',
  BLOCKED: 'BLOCKED'
});

export const DELIVERY_STATUS = Object.freeze({
  NOT_SENT: 'NOT_SENT'
});

export const BLOCK_REASON_CODES = Object.freeze({
  WATCHER_DISABLED: 'WATCHER_DISABLED',
  DELIVERY_DISABLED: 'DELIVERY_DISABLED',
  MISSING_OWNER_IDENTITY: 'MISSING_OWNER_IDENTITY',
  FOREIGN_OR_UNTRUSTED_OWNER: 'FOREIGN_OR_UNTRUSTED_OWNER',
  FORGED_APPROVAL_PROOF: 'FORGED_APPROVAL_PROOF',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  STALE_APPROVAL: 'STALE_APPROVAL',
  FINGERPRINT_MISMATCH: 'FINGERPRINT_MISMATCH',
  INVALID_RECIPIENT: 'INVALID_RECIPIENT',
  RECIPIENT_CHANGED_REQUIRES_FRESH_APPROVAL: 'RECIPIENT_CHANGED_REQUIRES_FRESH_APPROVAL',
  NO_STAGE1_ALERTS: 'NO_STAGE1_ALERTS',
  DUPLICATE_DELIVERY_SUPPRESSED: 'DUPLICATE_DELIVERY_SUPPRESSED',
  INVALID_STATE_INPUT: 'INVALID_STATE_INPUT'
});

const DEFAULT_APPROVAL_TTL_MS = 60 * 60 * 1000; // 1 hour

function parseTimestamp(ts) {
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
  return ms;
}

function computeDeliveryFingerprint({ recipient, alertFingerprints, subject }) {
  const normalizedRecipient = String(recipient || '').trim().toLowerCase();
  const sortedFp = Array.isArray(alertFingerprints) ? [...alertFingerprints].sort() : [];
  const normalizedSubject = String(subject || '').trim();
  const payload = JSON.stringify([normalizedRecipient, sortedFp, normalizedSubject]);
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Pure, fail-closed readiness and approval policy for owner-only Stage 1 LITE email alerts.
 * Composes formatLiteOwnerEmailDraft without sending emails, invoking network transport, or live alarms.
 *
 * @param {Object} checks Raw observed checks
 * @param {Object} context Execution context, owner proof, approval evidence, state
 * @returns {Object} Immutable candidate delivery plan
 */
export function evaluateLiteDeliveryReadiness(checks, context = {}) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.INVALID_STATE_INPUT,
      requiresOwnerAction: true,
      candidate: null,
      evaluatedAt: new Date().toISOString()
    });
  }

  const nowMs = parseTimestamp(context.now) ?? Date.now();
  const isoEvaluatedAt = new Date(nowMs).toISOString();

  // 1. Opt-in and feature enablement checks
  const watcherEnabled = context.watcherEnabled === true || context.enabled === true;
  if (!watcherEnabled) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.WATCHER_DISABLED,
      requiresOwnerAction: true,
      candidate: null,
      evaluatedAt: isoEvaluatedAt
    });
  }

  const deliveryEnabled = context.deliveryEnabled === true || context.emailDeliveryEnabled === true;
  if (!deliveryEnabled) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.DELIVERY_DISABLED,
      requiresOwnerAction: true,
      candidate: null,
      evaluatedAt: isoEvaluatedAt
    });
  }

  // 2. Format draft using merged formatLiteOwnerEmailDraft
  const draftOptions = {
    ownerEmail: context.recipient || context.ownerEmail,
    env: context.env || {},
    now: new Date(nowMs)
  };
  const draft = formatLiteOwnerEmailDraft(checks, draftOptions);

  if (!draft || !draft.hasAlerts || draft.alertCount === 0 || !draft.text) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.NO_STAGE1_ALERTS,
      requiresOwnerAction: false,
      candidate: null,
      draftSummary: {
        hasAlerts: false,
        alertCount: draft?.alertCount ?? 0
      },
      evaluatedAt: isoEvaluatedAt
    });
  }

  // 3. Valid recipient verification
  const recipient = draft.to;
  if (!recipient || typeof recipient !== 'string' || !draft.recipientConfigured) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.INVALID_RECIPIENT,
      requiresOwnerAction: true,
      candidate: null,
      evaluatedAt: isoEvaluatedAt
    });
  }

  // 4. Trusted owner identity verification
  const trustedOwnerId = context.trustedOwnerId ? String(context.trustedOwnerId).trim() : null;
  const callerOwnerId = context.callerOwnerId ? String(context.callerOwnerId).trim() : null;

  if (!trustedOwnerId) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.MISSING_OWNER_IDENTITY,
      requiresOwnerAction: true,
      candidate: null,
      evaluatedAt: isoEvaluatedAt
    });
  }

  if (callerOwnerId && callerOwnerId !== trustedOwnerId) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.FOREIGN_OR_UNTRUSTED_OWNER,
      requiresOwnerAction: true,
      candidate: null,
      evaluatedAt: isoEvaluatedAt
    });
  }

  // 5. Build candidate fingerprint
  // Extract alert fingerprints from draft or checks
  const candidateAlertFingerprints = [draft.subject, draft.alertCount];
  const candidateFingerprint = computeDeliveryFingerprint({
    recipient,
    alertFingerprints: candidateAlertFingerprints,
    subject: draft.subject
  });

  // 6. Explicit owner approval verification
  const approval = context.ownerApproval;
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.APPROVAL_REQUIRED,
      requiresOwnerAction: true,
      candidate: null,
      evaluatedAt: isoEvaluatedAt
    });
  }

  if (approval.approved !== true) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.APPROVAL_REQUIRED,
      requiresOwnerAction: true,
      candidate: null,
      evaluatedAt: isoEvaluatedAt
    });
  }

  // Verify approval was granted by the trusted owner
  const approvedByOwnerId = approval.ownerId ? String(approval.ownerId).trim() : null;
  if (!approvedByOwnerId || approvedByOwnerId !== trustedOwnerId) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.FORGED_APPROVAL_PROOF,
      requiresOwnerAction: true,
      candidate: null,
      evaluatedAt: isoEvaluatedAt
    });
  }

  // Verify fresh approval: check recipient in approval
  if (approval.recipient && String(approval.recipient).trim().toLowerCase() !== recipient.toLowerCase()) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.RECIPIENT_CHANGED_REQUIRES_FRESH_APPROVAL,
      requiresOwnerAction: true,
      candidate: null,
      evaluatedAt: isoEvaluatedAt
    });
  }

  // Verify fingerprint match
  if (approval.deliveryFingerprint && approval.deliveryFingerprint !== candidateFingerprint) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.FINGERPRINT_MISMATCH,
      requiresOwnerAction: true,
      candidate: null,
      evaluatedAt: isoEvaluatedAt
    });
  }

  // Verify freshness / TTL of approval
  const approvedAtMs = parseTimestamp(approval.approvedAt);
  if (!approvedAtMs || approvedAtMs > nowMs) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.STALE_APPROVAL,
      requiresOwnerAction: true,
      candidate: null,
      evaluatedAt: isoEvaluatedAt
    });
  }

  const approvalTtlMs = typeof context.approvalTtlMs === 'number' && context.approvalTtlMs > 0
    ? context.approvalTtlMs
    : DEFAULT_APPROVAL_TTL_MS;

  if (nowMs - approvedAtMs > approvalTtlMs) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.STALE_APPROVAL,
      requiresOwnerAction: true,
      candidate: null,
      evaluatedAt: isoEvaluatedAt
    });
  }

  // 7. Deduplication against deterministic injected state
  const deliveredHistory = Array.isArray(context.deliveredFingerprints)
    ? context.deliveredFingerprints
    : (context.state?.deliveredFingerprints || []);

  if (deliveredHistory.includes(candidateFingerprint)) {
    return Object.freeze({
      readiness: DELIVERY_READINESS_STATUS.BLOCKED,
      deliveryStatus: DELIVERY_STATUS.NOT_SENT,
      reasonCode: BLOCK_REASON_CODES.DUPLICATE_DELIVERY_SUPPRESSED,
      requiresOwnerAction: false,
      candidate: null,
      fingerprint: candidateFingerprint,
      evaluatedAt: isoEvaluatedAt
    });
  }

  // 8. Success: READY candidate delivery plan (pure candidate, NOT_SENT)
  const candidatePlan = Object.freeze({
    to: recipient,
    subject: draft.subject,
    text: draft.text,
    alertCount: draft.alertCount,
    includedAlertCount: draft.includedAlertCount,
    truncated: draft.truncated,
    fingerprint: candidateFingerprint,
    approvedBy: trustedOwnerId,
    approvedAt: new Date(approvedAtMs).toISOString(),
    draftGeneratedAt: draft.generatedAt,
    deliveryMode: 'STAGE1_LITE_OWNER_EMAIL'
  });

  return Object.freeze({
    readiness: DELIVERY_READINESS_STATUS.READY,
    deliveryStatus: DELIVERY_STATUS.NOT_SENT,
    reasonCode: null,
    requiresOwnerAction: false,
    candidate: candidatePlan,
    fingerprint: candidateFingerprint,
    evaluatedAt: isoEvaluatedAt
  });
}
