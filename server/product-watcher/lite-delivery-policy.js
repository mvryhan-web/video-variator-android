import { createHash } from 'node:crypto';
import { formatLiteOwnerEmailDraft } from './lite-email-draft.js';

export const LITE_DELIVERY_STATUSES = Object.freeze({
  NOT_SENT: 'NOT_SENT'
});

export const LITE_DELIVERY_READINESS = Object.freeze({
  READY: 'ready',
  BLOCKED: 'blocked'
});

export const LITE_DELIVERY_REASON_CODES = Object.freeze({
  READY_FOR_OWNER_DELIVERY: 'READY_FOR_OWNER_DELIVERY',
  INVALID_POLICY_INPUT: 'INVALID_POLICY_INPUT',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  OWNER_IDENTITY_MISSING: 'OWNER_IDENTITY_MISSING',
  OWNER_IDENTITY_UNVERIFIED: 'OWNER_IDENTITY_UNVERIFIED',
  FOREIGN_ACCOUNT_DENIED: 'FOREIGN_ACCOUNT_DENIED',
  RECIPIENT_INVALID: 'RECIPIENT_INVALID',
  RECIPIENT_OWNER_MISMATCH: 'RECIPIENT_OWNER_MISMATCH',
  NO_ACTIVE_LITE_ALERTS: 'NO_ACTIVE_LITE_ALERTS',
  DRAFT_BOUNDS_EXCEEDED: 'DRAFT_BOUNDS_EXCEEDED',
  ALERT_STALE: 'ALERT_STALE',
  APPROVAL_MISSING: 'APPROVAL_MISSING',
  APPROVAL_UNVERIFIED: 'APPROVAL_UNVERIFIED',
  APPROVAL_OWNER_MISMATCH: 'APPROVAL_OWNER_MISMATCH',
  APPROVAL_RECIPIENT_MISMATCH: 'APPROVAL_RECIPIENT_MISMATCH',
  APPROVAL_FINGERPRINT_MISMATCH: 'APPROVAL_FINGERPRINT_MISMATCH',
  APPROVAL_STALE: 'APPROVAL_STALE',
  DUPLICATE_DELIVERY_CANDIDATE: 'DUPLICATE_DELIVERY_CANDIDATE'
});

const MAX_ALERTS_IN_DRAFT = 10;
const MAX_TEXT_BYTES = 2048;
const DEFAULT_MAX_ALERT_AGE_MS = 15 * 60 * 1000;
const DEFAULT_MAX_APPROVAL_AGE_MS = 15 * 60 * 1000;

function sanitizeEmail(val) {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim().toLowerCase();
  if (
    trimmed.length >= 3 &&
    trimmed.length <= 120 &&
    /^[^\s@<>'"]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(trimmed) &&
    !/[\r\n<>'"\\]/.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
}

function sanitizeId(val, maxLen = 128) {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed.length > maxLen) return null;
  if (!/^[a-zA-Z0-9._:@-]+$/.test(trimmed)) return null;
  return trimmed;
}

function parseTimestampMs(input) {
  if (input instanceof Date) {
    const ms = input.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof input === 'number' && Number.isFinite(input) && input > 0) {
    return Math.trunc(input);
  }
  if (typeof input === 'string' && input.trim()) {
    const ms = Date.parse(input.trim());
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object' || Object.isFrozen(obj)) return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    deepFreeze(obj[key]);
  }
  return obj;
}

function extractStableAlertLines(draftText) {
  if (typeof draftText !== 'string' || !draftText) return [];
  const lines = draftText.split('\n');
  const startIdx = lines.indexOf('ALERT FINDINGS:');
  if (startIdx < 0) return [];
  const out = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === '' || line.startsWith('SAFETY & EXECUTION DISCLAIMER:')) break;
    out.push(line.trim());
  }
  return out;
}

export function computeLiteAlertDraftFingerprint(draft) {
  if (!draft || typeof draft !== 'object' || !draft.hasAlerts || draft.status !== 'draft_ready') {
    return null;
  }
  const findings = extractStableAlertLines(draft.text);
  const canonical = JSON.stringify({
    subject: String(draft.subject || ''),
    alertCount: Number(draft.alertCount || 0),
    includedAlertCount: Number(draft.includedAlertCount || 0),
    findings
  });
  return 'lite-fp-' + createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

export function computeLiteCandidateId({ ownerId, recipient, alertFingerprint }) {
  const canonical = JSON.stringify({
    ownerId: String(ownerId || ''),
    recipient: String(recipient || '').toLowerCase(),
    alertFingerprint: String(alertFingerprint || '')
  });
  return 'lite-cand-' + createHash('sha256').update(canonical).digest('hex').slice(0, 24);
}

/**
 * Pure, deterministic, fail-closed readiness/approval policy for owner-only
 * Stage 1 LITE alert email delivery. Composes formatLiteOwnerEmailDraft(...)
 * without network, SMTP, database, or paid provider side effects.
 *Status is strictly NOT_SENT; never claims an email was sent.
 */
export function evaluateLiteDeliveryReadiness(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return buildBlockedResult({
      reasonCode: LITE_DELIVERY_REASON_CODES.INVALID_POLICY_INPUT,
      blockers: [LITE_DELIVERY_REASON_CODES.INVALID_POLICY_INPUT],
      nowIso: new Date(0).toISOString()
    });
  }

  const nowMs = parseTimestampMs(input.now) ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const env = input.env && typeof input.env === 'object' && !Array.isArray(input.env) ? input.env : {};
  const settings = input.settings && typeof input.settings === 'object' && !Array.isArray(input.settings) ? input.settings : {};

  // Compose existing verified formatter without mutating caller inputs
  const configuredRecipientRaw =
    settings.recipientEmail ??
    input.recipientEmail ??
    env.PRODUCT_WATCHER_OWNER_EMAIL ??
    env.ADMIN_EMAIL ??
    null;
  const recipient = sanitizeEmail(configuredRecipientRaw);

  const draft = formatLiteOwnerEmailDraft(input.checks || {}, {
    env,
    ownerEmail: recipient,
    now: nowIso
  });

  const alertFingerprint = computeLiteAlertDraftFingerprint(draft);
  const blockers = [];

  // 1. Feature / opt-in check
  const featureEnabled =
    settings.liteEmailDeliveryEnabled === true ||
    env.PRODUCT_WATCHER_LITE_DELIVERY_ENABLED === 'true';
  const ownerOptIn = settings.ownerOptIn === true;
  if (!featureEnabled || !ownerOptIn) {
    blockers.push(LITE_DELIVERY_REASON_CODES.FEATURE_DISABLED);
  }

  // 2. Trusted server-verified owner identity proof (never accept caller-forged flags without server attestation)
  const ownerIdentity = input.ownerIdentity;
  const trustedAdminEmail = sanitizeEmail(env.ADMIN_EMAIL || settings.trustedOwnerEmail);
  const ownerId = sanitizeId(ownerIdentity?.userId);
  const ownerEmail = sanitizeEmail(ownerIdentity?.email);

  if (!ownerIdentity || typeof ownerIdentity !== 'object' || !ownerId || !ownerEmail) {
    blockers.push(LITE_DELIVERY_REASON_CODES.OWNER_IDENTITY_MISSING);
  } else if (
    ownerIdentity.serverVerified !== true ||
    ownerIdentity.role !== 'owner' ||
    ownerIdentity.provider !== 'google' ||
    ownerIdentity.callerSupplied === true
  ) {
    blockers.push(LITE_DELIVERY_REASON_CODES.OWNER_IDENTITY_UNVERIFIED);
  } else if (!trustedAdminEmail || ownerEmail !== trustedAdminEmail) {
    blockers.push(LITE_DELIVERY_REASON_CODES.FOREIGN_ACCOUNT_DENIED);
  }

  // 3. Recipient verification
  const expectedOwnerRecipient = sanitizeEmail(
    env.PRODUCT_WATCHER_OWNER_EMAIL || env.ADMIN_EMAIL || settings.trustedOwnerEmail
  );
  if (!recipient) {
    blockers.push(LITE_DELIVERY_REASON_CODES.RECIPIENT_INVALID);
  } else if (!expectedOwnerRecipient || recipient !== expectedOwnerRecipient) {
    blockers.push(LITE_DELIVERY_REASON_CODES.RECIPIENT_OWNER_MISMATCH);
  }

  // 4. Validated Stage-1 LITE alert draft & bounds check
  if (!draft.hasAlerts || draft.status !== 'draft_ready' || !alertFingerprint) {
    blockers.push(LITE_DELIVERY_REASON_CODES.NO_ACTIVE_LITE_ALERTS);
  } else {
    const textBytes = typeof draft.text === 'string' ? Buffer.byteLength(draft.text, 'utf8') : 0;
    if (
      draft.includedAlertCount <= 0 ||
      draft.includedAlertCount > MAX_ALERTS_IN_DRAFT ||
      textBytes <= 0 ||
      textBytes > MAX_TEXT_BYTES
    ) {
      blockers.push(LITE_DELIVERY_REASON_CODES.DRAFT_BOUNDS_EXCEEDED);
    }
  }

  // 5. Alert freshness check
  const maxAlertAgeMs =
    Number.isSafeInteger(settings.maxAlertAgeMs) && settings.maxAlertAgeMs > 0
      ? settings.maxAlertAgeMs
      : DEFAULT_MAX_ALERT_AGE_MS;
  if (input.observedAt !== undefined) {
    const observedMs = parseTimestampMs(input.observedAt);
    if (observedMs === null || observedMs > nowMs || nowMs - observedMs > maxAlertAgeMs) {
      blockers.push(LITE_DELIVERY_REASON_CODES.ALERT_STALE);
    }
  }

  // 6. Explicit server-verified owner approval bound to exact owner, recipient, and alert fingerprint
  const approval = input.approval;
  const maxApprovalAgeMs =
    Number.isSafeInteger(settings.maxApprovalAgeMs) && settings.maxApprovalAgeMs > 0
      ? settings.maxApprovalAgeMs
      : DEFAULT_MAX_APPROVAL_AGE_MS;

  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) {
    blockers.push(LITE_DELIVERY_REASON_CODES.APPROVAL_MISSING);
  } else if (
    approval.serverVerified !== true ||
    approval.explicitConsent !== true ||
    approval.callerSupplied === true ||
    !sanitizeId(approval.approvalId)
  ) {
    blockers.push(LITE_DELIVERY_REASON_CODES.APPROVAL_UNVERIFIED);
  } else {
    const approvedBy = sanitizeId(approval.approvedByUserId);
    const approvedRecipient = sanitizeEmail(approval.recipientEmail);
    const approvedFp = typeof approval.alertFingerprint === 'string' ? approval.alertFingerprint.trim() : '';
    const approvedAtMs = parseTimestampMs(approval.approvedAt);

    if (!ownerId || approvedBy !== ownerId) {
      blockers.push(LITE_DELIVERY_REASON_CODES.APPROVAL_OWNER_MISMATCH);
    }
    if (!recipient || approvedRecipient !== recipient) {
      blockers.push(LITE_DELIVERY_REASON_CODES.APPROVAL_RECIPIENT_MISMATCH);
    }
    if (!alertFingerprint || approvedFp !== alertFingerprint) {
      blockers.push(LITE_DELIVERY_REASON_CODES.APPROVAL_FINGERPRINT_MISMATCH);
    }
    if (approvedAtMs === null || approvedAtMs > nowMs || nowMs - approvedAtMs > maxApprovalAgeMs) {
      blockers.push(LITE_DELIVERY_REASON_CODES.APPROVAL_STALE);
    }
  }

  // 7. Deterministic deduplication against injected state
  const candidateId =
    ownerId && recipient && alertFingerprint
      ? computeLiteCandidateId({ ownerId, recipient, alertFingerprint })
      : null;

  const dedupState = input.deduplicationState;
  const seenCandidates = new Set();
  if (Array.isArray(dedupState)) {
    for (const item of dedupState) {
      if (typeof item === 'string' && item.trim()) seenCandidates.add(item.trim());
    }
  } else if (dedupState && typeof dedupState === 'object') {
    const list = Array.isArray(dedupState.seenCandidateIds)
      ? dedupState.seenCandidateIds
      : Array.isArray(dedupState.seenFingerprints)
        ? dedupState.seenFingerprints
        : [];
    for (const item of list) {
      if (typeof item === 'string' && item.trim()) seenCandidates.add(item.trim());
    }
  }

  if (
    (candidateId && seenCandidates.has(candidateId)) ||
    (alertFingerprint && seenCandidates.has(alertFingerprint))
  ) {
    blockers.push(LITE_DELIVERY_REASON_CODES.DUPLICATE_DELIVERY_CANDIDATE);
  }

  if (blockers.length > 0) {
    return buildBlockedResult({
      reasonCode: blockers[0],
      blockers,
      nowIso,
      recipient,
      candidateId,
      alertFingerprint,
      draft
    });
  }

  const nextSeen = [...seenCandidates];
  if (candidateId && !seenCandidates.has(candidateId)) nextSeen.push(candidateId);

  return deepFreeze({
    readiness: LITE_DELIVERY_READINESS.READY,
    ready: true,
    blocked: false,
    status: LITE_DELIVERY_STATUSES.NOT_SENT,
    sent: false,
    draftOnly: true,
    requiresOwnerAction: true,
    reasonCode: LITE_DELIVERY_REASON_CODES.READY_FOR_OWNER_DELIVERY,
    blockers: [],
    candidateId,
    alertFingerprint,
    ownerId,
    recipient,
    evaluatedAt: nowIso,
    draft: {
      hasAlerts: draft.hasAlerts,
      status: draft.status,
      sent: false,
      draftOnly: true,
      to: draft.to,
      recipientConfigured: draft.recipientConfigured,
      subject: draft.subject,
      text: draft.text,
      alertCount: draft.alertCount,
      includedAlertCount: draft.includedAlertCount,
      truncated: draft.truncated,
      generatedAt: draft.generatedAt
    },
    nextDeduplicationState: {
      seenCandidateIds: nextSeen
    },
    disclaimer:
      'Candidate delivery plan only. Status is strictly NOT_SENT; no email, SMTP, webhook, database, or paid provider call was executed.'
  });
}

function buildBlockedResult({
  reasonCode,
  blockers,
  nowIso,
  recipient = null,
  candidateId = null,
  alertFingerprint = null,
  draft = null
}) {
  return deepFreeze({
    readiness: LITE_DELIVERY_READINESS.BLOCKED,
    ready: false,
    blocked: true,
    status: LITE_DELIVERY_STATUSES.NOT_SENT,
    sent: false,
    draftOnly: true,
    requiresOwnerAction: true,
    reasonCode,
    blockers: [...blockers],
    candidateId,
    alertFingerprint,
    ownerId: null,
    recipient: recipient || null,
    evaluatedAt: nowIso,
    draft: draft
      ? {
          hasAlerts: !!draft.hasAlerts,
          status: draft.status,
          sent: false,
          draftOnly: true,
          to: draft.to || null,
          recipientConfigured: !!draft.recipientConfigured,
          subject: draft.subject || null,
          text: draft.text || null,
          alertCount: Number(draft.alertCount || 0),
          includedAlertCount: Number(draft.includedAlertCount || 0),
          truncated: !!draft.truncated,
          generatedAt: draft.generatedAt || nowIso
        }
      : null,
    nextDeduplicationState: null,
    disclaimer:
      'Candidate delivery plan blocked. Status is strictly NOT_SENT; no email, SMTP, webhook, database, or paid provider call was executed.'
  });
}
