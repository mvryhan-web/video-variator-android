import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateLiteDeliveryReadiness,
  DELIVERY_READINESS_STATUS,
  DELIVERY_STATUS,
  BLOCK_REASON_CODES
} from '../server/product-watcher/lite-delivery-policy.js';

const VALID_CHECKS_CRITICAL = Object.freeze({
  http: { status: 'critical', code: 'HTTP_DOWN' }
});

const VALID_CHECKS_WARNING = Object.freeze({
  operations: {
    status: 'warning',
    code: 'OPERATIONAL_ATTENTION',
    alerts: [
      { code: 'RECORDED_SPEND_SPIKE', currency: 'usd', ratio: 3.5, trackedJobsLastHour: 10 }
    ]
  }
});

const BASE_VALID_CONTEXT = Object.freeze({
  watcherEnabled: true,
  deliveryEnabled: true,
  trustedOwnerId: 'owner_usr_001',
  recipient: 'owner@deepsyq.com',
  now: '2026-10-30T12:00:00.000Z',
  ownerApproval: {
    approved: true,
    ownerId: 'owner_usr_001',
    approvedAt: '2026-10-30T11:55:00.000Z',
    recipient: 'owner@deepsyq.com'
  }
});

test('positive: valid checks, trusted owner, fresh approval produces READY candidate plan (NOT_SENT)', () => {
  const result = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, BASE_VALID_CONTEXT);

  assert.equal(result.readiness, DELIVERY_READINESS_STATUS.READY);
  assert.equal(result.deliveryStatus, DELIVERY_STATUS.NOT_SENT);
  assert.equal(result.reasonCode, null);
  assert.equal(result.requiresOwnerAction, false);
  assert.ok(result.candidate);
  assert.equal(result.candidate.to, 'owner@deepsyq.com');
  assert.match(result.candidate.subject, /\[ALERT\] Deepsyq Product Watcher LITE - 1 issue\(s\) observed/);
  assert.ok(result.candidate.text.includes('1. [CRITICAL] http: HTTP_DOWN'));
  assert.equal(result.candidate.alertCount, 1);
  assert.ok(result.fingerprint);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.candidate));
});

test('positive: warning spend spike alert produces valid delivery plan with bounds', () => {
  const result = evaluateLiteDeliveryReadiness(VALID_CHECKS_WARNING, BASE_VALID_CONTEXT);

  assert.equal(result.readiness, DELIVERY_READINESS_STATUS.READY);
  assert.equal(result.deliveryStatus, DELIVERY_STATUS.NOT_SENT);
  assert.ok(result.candidate.text.includes('RECORDED_SPEND_SPIKE'));
  assert.ok(Buffer.byteLength(result.candidate.text, 'utf-8') <= 2048);
});

test('negative: watcher disabled or delivery disabled blocks with fail-closed reason', () => {
  const disabledWatcher = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, {
    ...BASE_VALID_CONTEXT,
    watcherEnabled: false
  });
  assert.equal(disabledWatcher.readiness, DELIVERY_READINESS_STATUS.BLOCKED);
  assert.equal(disabledWatcher.reasonCode, BLOCK_REASON_CODES.WATCHER_DISABLED);
  assert.equal(disabledWatcher.deliveryStatus, DELIVERY_STATUS.NOT_SENT);

  const disabledDelivery = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, {
    ...BASE_VALID_CONTEXT,
    deliveryEnabled: false
  });
  assert.equal(disabledDelivery.readiness, DELIVERY_READINESS_STATUS.BLOCKED);
  assert.equal(disabledDelivery.reasonCode, BLOCK_REASON_CODES.DELIVERY_DISABLED);
  assert.equal(disabledDelivery.deliveryStatus, DELIVERY_STATUS.NOT_SENT);
});

test('negative: healthy / no stage 1 alerts blocks delivery candidate', () => {
  const healthyChecks = {
    http: { status: 'healthy', code: 'HTTP_OK' },
    operations: { status: 'healthy', code: 'OPERATIONAL_OK', alerts: [] }
  };
  const result = evaluateLiteDeliveryReadiness(healthyChecks, BASE_VALID_CONTEXT);

  assert.equal(result.readiness, DELIVERY_READINESS_STATUS.BLOCKED);
  assert.equal(result.reasonCode, BLOCK_REASON_CODES.NO_STAGE1_ALERTS);
  assert.equal(result.deliveryStatus, DELIVERY_STATUS.NOT_SENT);
  assert.equal(result.candidate, null);
});

test('negative: invalid or unconfigured recipient blocks delivery', () => {
  const invalidRecipient = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, {
    ...BASE_VALID_CONTEXT,
    recipient: 'bad-email-no-at-domain'
  });
  assert.equal(invalidRecipient.readiness, DELIVERY_READINESS_STATUS.BLOCKED);
  assert.equal(invalidRecipient.reasonCode, BLOCK_REASON_CODES.INVALID_RECIPIENT);
  assert.equal(invalidRecipient.deliveryStatus, DELIVERY_STATUS.NOT_SENT);

  const emptyRecipient = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, {
    ...BASE_VALID_CONTEXT,
    recipient: ''
  });
  assert.equal(emptyRecipient.readiness, DELIVERY_READINESS_STATUS.BLOCKED);
  assert.equal(emptyRecipient.reasonCode, BLOCK_REASON_CODES.INVALID_RECIPIENT);
});

test('negative: two-account isolation and foreign owner proof blocked', () => {
  // Foreign owner attempting to trigger or approve
  const foreignCaller = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, {
    ...BASE_VALID_CONTEXT,
    trustedOwnerId: 'owner_alice',
    callerOwnerId: 'foreign_bob'
  });
  assert.equal(foreignCaller.readiness, DELIVERY_READINESS_STATUS.BLOCKED);
  assert.equal(foreignCaller.reasonCode, BLOCK_REASON_CODES.FOREIGN_OR_UNTRUSTED_OWNER);
  assert.equal(foreignCaller.deliveryStatus, DELIVERY_STATUS.NOT_SENT);

  // Missing trusted owner
  const missingOwner = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, {
    ...BASE_VALID_CONTEXT,
    trustedOwnerId: null
  });
  assert.equal(missingOwner.readiness, DELIVERY_READINESS_STATUS.BLOCKED);
  assert.equal(missingOwner.reasonCode, BLOCK_REASON_CODES.MISSING_OWNER_IDENTITY);
});

test('negative: forged or foreign owner approval proof rejected', () => {
  // Approval signed by different user ID
  const forgedApproval = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, {
    ...BASE_VALID_CONTEXT,
    trustedOwnerId: 'owner_alice',
    ownerApproval: {
      approved: true,
      ownerId: 'attacker_eve',
      approvedAt: '2026-10-30T11:55:00.000Z',
      recipient: 'owner@deepsyq.com'
    }
  });
  assert.equal(forgedApproval.readiness, DELIVERY_READINESS_STATUS.BLOCKED);
  assert.equal(forgedApproval.reasonCode, BLOCK_REASON_CODES.FORGED_APPROVAL_PROOF);
  assert.equal(forgedApproval.deliveryStatus, DELIVERY_STATUS.NOT_SENT);
});

test('negative: fresh approval required when recipient or fingerprint changes', () => {
  // Approval granted for recipient A, but evaluation targeting recipient B
  const changedRecipient = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, {
    ...BASE_VALID_CONTEXT,
    recipient: 'new_target@deepsyq.com',
    ownerApproval: {
      approved: true,
      ownerId: 'owner_usr_001',
      approvedAt: '2026-10-30T11:55:00.000Z',
      recipient: 'old_approved@deepsyq.com'
    }
  });
  assert.equal(changedRecipient.readiness, DELIVERY_READINESS_STATUS.BLOCKED);
  assert.equal(changedRecipient.reasonCode, BLOCK_REASON_CODES.RECIPIENT_CHANGED_REQUIRES_FRESH_APPROVAL);

  // Mismatched delivery fingerprint
  const mismatchedFp = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, {
    ...BASE_VALID_CONTEXT,
    ownerApproval: {
      approved: true,
      ownerId: 'owner_usr_001',
      approvedAt: '2026-10-30T11:55:00.000Z',
      recipient: 'owner@deepsyq.com',
      deliveryFingerprint: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    }
  });
  assert.equal(mismatchedFp.readiness, DELIVERY_READINESS_STATUS.BLOCKED);
  assert.equal(mismatchedFp.reasonCode, BLOCK_REASON_CODES.FINGERPRINT_MISMATCH);
});

test('negative: stale or future approval timestamp rejected', () => {
  // Stale approval (> 1 hour old)
  const staleApproval = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, {
    ...BASE_VALID_CONTEXT,
    now: '2026-10-30T14:00:00.000Z',
    ownerApproval: {
      approved: true,
      ownerId: 'owner_usr_001',
      approvedAt: '2026-10-30T11:00:00.000Z', // 3 hours old
      recipient: 'owner@deepsyq.com'
    }
  });
  assert.equal(staleApproval.readiness, DELIVERY_READINESS_STATUS.BLOCKED);
  assert.equal(staleApproval.reasonCode, BLOCK_REASON_CODES.STALE_APPROVAL);

  // Future approval
  const futureApproval = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, {
    ...BASE_VALID_CONTEXT,
    now: '2026-10-30T12:00:00.000Z',
    ownerApproval: {
      approved: true,
      ownerId: 'owner_usr_001',
      approvedAt: '2026-10-30T15:00:00.000Z', // in the future
      recipient: 'owner@deepsyq.com'
    }
  });
  assert.equal(futureApproval.readiness, DELIVERY_READINESS_STATUS.BLOCKED);
  assert.equal(futureApproval.reasonCode, BLOCK_REASON_CODES.STALE_APPROVAL);
});

test('negative: double-send / deduplication against injected delivered history', () => {
  // First evaluate to obtain candidate fingerprint
  const first = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, BASE_VALID_CONTEXT);
  assert.equal(first.readiness, DELIVERY_READINESS_STATUS.READY);

  // Subsequent check with the same fingerprint in delivered history
  const duplicate = evaluateLiteDeliveryReadiness(VALID_CHECKS_CRITICAL, {
    ...BASE_VALID_CONTEXT,
    deliveredFingerprints: [first.fingerprint]
  });
  assert.equal(duplicate.readiness, DELIVERY_READINESS_STATUS.BLOCKED);
  assert.equal(duplicate.reasonCode, BLOCK_REASON_CODES.DUPLICATE_DELIVERY_SUPPRESSED);
  assert.equal(duplicate.deliveryStatus, DELIVERY_STATUS.NOT_SENT);
});

test('safety: secrets redacted, pure zero-spend, status=SENT is impossible', () => {
  let networkOrFetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    networkOrFetchCalled = true;
    throw new Error('NETWORK_CALL_FORBIDDEN');
  };

  try {
    const maliciousChecks = {
      http: {
        status: 'critical',
        code: 'HTTP_CRITICAL',
        token: 'sk_live_1234567890abcdef'
      }
    };
    const result = evaluateLiteDeliveryReadiness(maliciousChecks, BASE_VALID_CONTEXT);
    assert.equal(result.readiness, DELIVERY_READINESS_STATUS.READY);
    assert.equal(result.deliveryStatus, DELIVERY_STATUS.NOT_SENT);
    assert.notEqual(result.deliveryStatus, 'SENT');
    assert.equal(networkOrFetchCalled, false);

    const json = JSON.stringify(result);
    assert.equal(json.includes('sk_live_'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
