import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLiteOwnerEmailDraft } from '../server/product-watcher/lite-email-draft.js';
import {
  evaluateLiteDeliveryReadiness,
  computeLiteAlertDraftFingerprint,
  computeLiteCandidateId,
  LITE_DELIVERY_STATUSES,
  LITE_DELIVERY_READINESS,
  LITE_DELIVERY_REASON_CODES
} from '../server/product-watcher/lite-delivery-policy.js';

const FIXED_NOW = '2026-10-30T12:00:00.000Z';

function buildValidFixture(overrides = {}) {
  const checks = overrides.checks ?? {
    http: { status: 'critical', code: 'HTTP_UNAVAILABLE' },
    billing: { status: 'critical', code: 'AI_REFUND_LEDGER_INCONSISTENT' }
  };
  const env = overrides.env ?? {
    ADMIN_EMAIL: 'owner@deepsyq.com',
    PRODUCT_WATCHER_OWNER_EMAIL: 'owner@deepsyq.com',
    PRODUCT_WATCHER_LITE_DELIVERY_ENABLED: 'true'
  };
  const settings = overrides.settings ?? {
    liteEmailDeliveryEnabled: true,
    ownerOptIn: true,
    recipientEmail: 'owner@deepsyq.com'
  };
  const ownerIdentity =
    overrides.ownerIdentity !== undefined
      ? overrides.ownerIdentity
      : {
          userId: 'owner-uid-1',
          email: 'owner@deepsyq.com',
          role: 'owner',
          provider: 'google',
          serverVerified: true
        };
  const draft = formatLiteOwnerEmailDraft(checks, {
    env,
    ownerEmail: settings.recipientEmail || env.PRODUCT_WATCHER_OWNER_EMAIL,
    now: FIXED_NOW
  });
  const alertFingerprint = computeLiteAlertDraftFingerprint(draft);
  const approval =
    overrides.approval !== undefined
      ? overrides.approval
      : {
          approvalId: 'appr-001',
          approvedByUserId: 'owner-uid-1',
          recipientEmail: 'owner@deepsyq.com',
          alertFingerprint,
          approvedAt: '2026-10-30T11:58:00.000Z',
          explicitConsent: true,
          serverVerified: true
        };

  return {
    now: overrides.now ?? FIXED_NOW,
    observedAt: overrides.observedAt ?? '2026-10-30T11:57:00.000Z',
    checks,
    env,
    settings,
    ownerIdentity,
    approval,
    deduplicationState: overrides.deduplicationState ?? { seenCandidateIds: [] }
  };
}

test('W5.5: ready candidate requires valid Stage-1 LITE alert draft, verified owner, recipient, and fresh approval; status stays NOT_SENT', () => {
  const input = buildValidFixture();
  const res = evaluateLiteDeliveryReadiness(input);

  assert.equal(res.readiness, LITE_DELIVERY_READINESS.READY);
  assert.equal(res.ready, true);
  assert.equal(res.blocked, false);
  assert.equal(res.status, LITE_DELIVERY_STATUSES.NOT_SENT);
  assert.equal(res.sent, false);
  assert.equal(res.draftOnly, true);
  assert.equal(res.requiresOwnerAction, true);
  assert.equal(res.reasonCode, LITE_DELIVERY_REASON_CODES.READY_FOR_OWNER_DELIVERY);
  assert.deepEqual(res.blockers, []);
  assert.equal(res.recipient, 'owner@deepsyq.com');
  assert.equal(res.ownerId, 'owner-uid-1');
  assert.ok(res.candidateId.startsWith('lite-cand-'));
  assert.ok(res.alertFingerprint.startsWith('lite-fp-'));
  assert.equal(res.draft.alertCount, 2);
  assert.equal(res.draft.sent, false);
  assert.equal(res. evaluatedAt, FIXED_NOW);
  assert.ok(Object.isFrozen(res));
  assert.ok(Object.isFrozen(res.draft));
});

test('W5.5: feature disabled or missing owner opt-in blocks candidate', () => {
  const disabledEnv = buildValidFixture({
    env: { ADMIN_EMAIL: 'owner@deepsyq.com', PRODUCT_WATCHER_LITE_DELIVERY_ENABLED: 'false' },
    settings: { liteEmailDeliveryEnabled: false, ownerOptIn: true, recipientEmail: 'owner@deepsyq.com' }
  });
  const r1 = evaluateLiteDeliveryReadiness(disabledEnv);
  assert.equal(r1.ready, false);
  assert.equal(r1.status, 'NOT_SENT');
  assert.equal(r1.reasonCode, LITE_DELIVERY_REASON_CODES.FEATURE_DISABLED);

  const noOptIn = buildValidFixture({
    settings: { liteEmailDeliveryEnabled: true, ownerOptIn: false, recipientEmail: 'owner@deepsyq.com' }
  });
  const r2 = evaluateLiteDeliveryReadiness(noOptIn);
  assert.equal(r2.ready, false);
  assert.equal(r2.reasonCode, LITE_DELIVERY_REASON_CODES.FEATURE_DISABLED);
});

test('W5.5: missing, caller-forged, or foreign account owner identity fails closed (two-account isolation)', () => {
  const missingOwner = buildValidFixture({ ownerIdentity: null });
  assert.equal(evaluateLiteDeliveryReadiness(missingOwner).reasonCode, LITE_DELIVERY_REASON_CODES.OWNER_IDENTITY_MISSING);

  const forgedOwner = buildValidFixture({
    ownerIdentity: {
      userId: 'owner-uid-1',
      email: 'owner@deepsyq.com',
      role: 'owner',
      provider: 'google',
      serverVerified: true,
      callerSupplied: true
    }
  });
  assert.equal(evaluateLiteDeliveryReadiness(forgedOwner).reasonCode, LITE_DELIVERY_REASON_CODES.OWNER_IDENTITY_UNVERIFIED);

  const unverifiedOwner = buildValidFixture({
    ownerIdentity: {
      userId: 'owner-uid-1',
      email: 'owner@deepsyq.com',
      role: 'owner',
      provider: 'google',
      serverVerified: false
    }
  });
  assert.equal(evaluateLiteDeliveryReadiness(unverifiedOwner).reasonCode, LITE_DELIVERY_REASON_CODES.OWNER_IDENTITY_UNVERIFIED);

  const foreignUserB = buildValidFixture({
    ownerIdentity: {
      userId: 'user-b-uid',
      email: 'attacker@external.com',
      role: 'owner',
      provider: 'google',
      serverVerified: true
    }
  });
  const resB = evaluateLiteDeliveryReadiness(foreignUserB);
  assert.equal(resB.ready, false);
  assert.equal(resB.reasonCode, LITE_DELIVERY_REASON_CODES.FOREIGN_ACCOUNT_DENIED);
  assert.ok(resB.blockers.includes(LITE_DELIVERY_REASON_CODES.APPROVAL_OWNER_MISMATCH));
});

test('W5.5: invalid or mismatched recipient email blocks candidate', () => {
  const invalidRecipient = buildValidFixture({
    settings: { liteEmailDeliveryEnabled: true, ownerOptIn: true, recipientEmail: 'not-an-email<script>' },
    env: { ADMIN_EMAIL: 'owner@deepsyq.com' }
  });
  assert.equal(evaluateLiteDeliveryReadiness(invalidRecipient).reasonCode, LITE_DELIVERY_REASON_CODES.RECIPIENT_INVALID);

  const foreignRecipient = buildValidFixture({
    settings: { liteEmailDeliveryEnabled: true, ownerOptIn: true, recipientEmail: 'other@deepsyq.com' }
  });
  const res = evaluateLiteDeliveryReadiness(foreignRecipient);
  assert.equal(res.ready, false);
  assert.equal(res.reasonCode, LITE_DELIVERY_REASON_CODES.RECIPIENT_OWNER_MISMATCH);
});

test('W5.5: healthy checks with no active Stage-1 LITE alerts block candidate', () => {
  const healthy = buildValidFixture({
    checks: {
      http: { status: 'healthy', code: 'HTTP_OK' },
      billing: { status: 'healthy', code: 'BILLING_LEDGER_NO_SIGNAL' }
    }
  });
  const res = evaluateLiteDeliveryReadiness(healthy);
  assert.equal(res.ready, false);
  assert.equal(res.reasonCode, LITE_DELIVERY_REASON_CODES.NO_ACTIVE_LITE_ALERTS);
  assert.equal(res.status, 'NOT_SENT');
});

test('W5.5: requires fresh approval for any change to recipient or alert fingerprint', () => {
  const base = buildValidFixture();
  // Change alert checks after approval was issued -> fingerprint mismatch
  const changedAlerts = {
    ...base,
    checks: {
      http: { status: 'critical', code: 'HTTP_UNAVAILABLE' },
      webhookConfig: { status: 'critical', code: 'AI_STRIPE_WEBHOOK_SECRET_MISSING' }
    }
  };
  const r1 = evaluateLiteDeliveryReadiness(changedAlerts);
  assert.equal(r1.ready, false);
  assert.equal(r1.reasonCode, LITE_DELIVERY_REASON_CODES.APPROVAL_FINGERPRINT_MISMATCH);

  // Change approval recipient -> recipient mismatch
  const mismatchedApprovalRecipient = buildValidFixture({
    approval: {
      ...base.approval,
      recipientEmail: 'different@deepsyq.com'
    }
  });
  const r2 = evaluateLiteDeliveryReadiness(mismatchedApprovalRecipient);
  assert.equal(r2.ready, false);
  assert.equal(r2.reasonCode, LITE_DELIVERY_REASON_CODES.APPROVAL_RECIPIENT_MISMATCH);

  // Forged approval without serverVerified
  const forgedApproval = buildValidFixture({
    approval: {
      ...base.approval,
      serverVerified: false
    }
  });
  assert.equal(evaluateLiteDeliveryReadiness(forgedApproval).reasonCode, LITE_DELIVERY_REASON_CODES.APPROVAL_UNVERIFIED);
});

test('W5.5: stale alert or stale approval blocks candidate', () => {
  const staleAlert = buildValidFixture({
    observedAt: '2026-10-30T10:00:00.000Z' // 2 hours old (> 15 min default)
  });
  assert.equal(evaluateLiteDeliveryReadiness(staleAlert).reasonCode, LITE_DELIVERY_REASON_CODES.ALERT_STALE);

  const base = buildValidFixture();
  const staleApproval = buildValidFixture({
    approval: {
      ...base.approval,
      approvedAt: '2026-10-30T10:00:00.000Z'
    }
  });
  assert.equal(evaluateLiteDeliveryReadiness(staleApproval).reasonCode, LITE_DELIVERY_REASON_CODES.APPROVAL_STALE);
});

test('W5.5: deduplication blocks duplicate candidate in deterministic injected state', () => {
  const firstInput = buildValidFixture();
  const firstRes = evaluateLiteDeliveryReadiness(firstInput);
  assert.equal(firstRes.ready, true);

  const secondInput = buildValidFixture({
    deduplicationState: firstRes.nextDeduplicationState
  });
  const secondRes = evaluateLiteDeliveryReadiness(secondInput);
  assert.equal(secondRes.ready, false);
  assert.equal(secondRes.reasonCode, LITE_DELIVERY_REASON_CODES.DUPLICATE_DELIVERY_CANDIDATE);
  assert.equal(secondRes.status, 'NOT_SENT');
});

test('W5.5: enforces 10-alert and 2048-byte draft bounds, redacts secrets, and never mutates caller inputs', () => {
  const manyAlerts = [];
  for (let i = 0; i < 15; i++) {
    manyAlerts.push({
      code: 'PROVIDER_HIGH_FAILURE_RATE',
      provider: `Provider_${i}_whsec_secret123456`,
      jobs: 50 + i,
      failed: 30 + i,
      rate: 0.6
    });
  }
  const checks = Object.freeze({
    operations: Object.freeze({
      status: 'critical',
      code: 'OPERATIONAL_CRITICAL',
      alerts: Object.freeze(manyAlerts.map(a => Object.freeze({ ...a })))
    })
  });

  const input = buildValidFixture({ checks });
  Object.freeze(input);

  const res = evaluateLiteDeliveryReadiness(input);
  assert.equal(res.ready, true);
  assert.equal(res.status, 'NOT_SENT');
  assert.equal(res.sent, false);
  assert.ok(res.draft.includedAlertCount <= 10);
  assert.ok(Buffer.byteLength(res.draft.text, 'utf8') <= 2048);
  assert.ok(!res.draft.text.includes('whsec_secret123456'));

  // Deterministic IDs across identical calls
  const resAgain = evaluateLiteDeliveryReadiness(input);
  assert.equal(res.candidateId, resAgain.candidateId);
  assert.equal(res.alertFingerprint, resAgain.alertFingerprint);
  assert.equal(
    computeLiteCandidateId({
      ownerId: 'owner-uid-1',
      recipient: 'owner@deepsyq.com',
      alertFingerprint: res.alertFingerprint
    }),
    res.candidateId
  );
});

test('W5.5 route: POST /api/product-watcher/admin/lite-delivery-readiness enforces owner-only access and server-verified ownerIdentity', async () => {
  const { default: express } = await import('express');
  const { installProductWatcher } = await import('../server/product-watcher/admin-api.js');
  const app = express();
  app.use(express.json());
  const env = { ADMIN_EMAIL: 'owner@deepsyq.com', PRODUCT_WATCHER_LITE_DELIVERY_ENABLED: 'true' };
  installProductWatcher(app, {
    env,
    auth: (req, _res, next) => {
      req.user = req.headers['x-role'] === 'owner'
        ? { id: 'owner-uid-1', email: 'owner@deepsyq.com', provider: 'google' }
        : { id: 'user-2', email: 'other@deepsyq.com', provider: 'google' };
      next();
    }
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  try {
    const url = 'http://127.0.0.1:' + server.address().port + '/api/product-watcher/admin/lite-delivery-readiness';
    const forbidden = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(forbidden.status, 403);
    const input = buildValidFixture();
    const ok = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-role': 'owner' },
      body: JSON.stringify(input)
    });
    assert.equal(ok.status, 200);
    const data = await ok.json();
    assert.equal(data.ready, true);
    assert.equal(data.status, 'NOT_SENT');
    assert.equal(data.sent, false);
  } finally {
    server.closeAllConnections();
    await new Promise(r => server.close(r));
  }
});
