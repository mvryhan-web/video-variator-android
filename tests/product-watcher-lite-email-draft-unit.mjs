import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLiteOwnerEmailDraft } from '../server/product-watcher/lite-email-draft.js';

test('healthy or empty checks return no alert draft (hasAlerts: false)', () => {
  const healthyChecks = {
    http: { status: 'healthy', code: 'HTTP_OK' },
    database: { status: 'healthy', code: 'DB_OK' },
    generations: { status: 'healthy', code: 'GENERATION_OK' },
    operations: { status: 'healthy', code: 'OPERATIONAL_OK', alerts: [] },
    billing: { status: 'healthy', code: 'BILLING_LEDGER_NO_SIGNAL' },
    webhookConfig: { status: 'healthy', code: 'AI_STRIPE_CONFIG_READY_UNVERIFIED' }
  };

  const result = formatLiteOwnerEmailDraft(healthyChecks, {
    ownerEmail: 'owner@deepsyq.com',
    now: new Date('2026-10-19T10:00:00.000Z')
  });

  assert.equal(result.hasAlerts, false);
  assert.equal(result.status, 'no_alerts');
  assert.equal(result.sent, false);
  assert.equal(result.draftOnly, true);
  assert.equal(result.subject, null);
  assert.equal(result.text, null);
  assert.equal(result.alertCount, 0);
  assert.equal(result.to, 'owner@deepsyq.com');
  assert.equal(result.recipientConfigured, true);
  assert.equal(result.generatedAt, '2026-10-19T10:00:00.000Z');
  assert.ok(result.disclaimer.includes('No email was sent'));
});

test('website down (http critical) generates plain-text email draft', () => {
  const websiteDownChecks = {
    http: { status: 'critical', code: 'HTTP_UNAVAILABLE' }
  };

  const fixedNow = new Date('2026-10-19T12:00:00.000Z');
  const result = formatLiteOwnerEmailDraft(websiteDownChecks, {
    ownerEmail: 'owner@deepsyq.com',
    now: fixedNow
  });

  assert.equal(result.hasAlerts, true);
  assert.equal(result.status, 'draft_ready');
  assert.equal(result.sent, false);
  assert.equal(result.draftOnly, true);
  assert.equal(result.alertCount, 1);
  assert.match(result.subject, /\[ALERT\] Deepsyq Product Watcher LITE - 1 issue\(s\) observed/);
  assert.ok(result.text.includes('1. [CRITICAL] http: HTTP_UNAVAILABLE'));
  assert.ok(result.text.includes('Recipient: owner@deepsyq.com'));
  assert.ok(result.text.includes('Generated At: 2026-10-19T12:00:00.000Z'));
  assert.ok(result.text.includes('NO EMAIL WAS SENT'));
});

test('Stripe errors (billing and webhookConfig) generate plain-text email draft', () => {
  const stripeErrorChecks = {
    billing: { status: 'critical', code: 'AI_REFUND_LEDGER_INCONSISTENT' },
    webhookConfig: { status: 'critical', code: 'AI_STRIPE_WEBHOOK_SECRET_MISSING' }
  };

  const result = formatLiteOwnerEmailDraft(stripeErrorChecks, {
    env: { PRODUCT_WATCHER_OWNER_EMAIL: 'admin@deepsyq.com' },
    now: '2026-10-19T14:30:00.000Z'
  });

  assert.equal(result.hasAlerts, true);
  assert.equal(result.status, 'draft_ready');
  assert.equal(result.alertCount, 2);
  assert.equal(result.to, 'admin@deepsyq.com');
  assert.ok(result.text.includes('billing: AI_REFUND_LEDGER_INCONSISTENT'));
  assert.ok(result.text.includes('webhookConfig: AI_STRIPE_WEBHOOK_SECRET_MISSING'));
});

test('spend anomalies (operations spend/unit cost spikes) generate plain-text email draft', () => {
  const spendAnomalyChecks = {
    operations: {
      status: 'warning',
      code: 'OPERATIONAL_ATTENTION',
      alerts: [
        { code: 'RECORDED_SPEND_SPIKE', currency: 'usd', ratio: 4.25, trackedJobsLastHour: 15 },
        { code: 'RECORDED_UNIT_COST_SPIKE', currency: 'eur', ratio: 3.1, trackedJobsLastHour: 8 }
      ]
    }
  };

  const result = formatLiteOwnerEmailDraft(spendAnomalyChecks, {
    ownerEmail: 'finance@deepsyq.com',
    now: '2026-10-19T16:00:00.000Z'
  });

  assert.equal(result.hasAlerts, true);
  assert.equal(result.alertCount, 2);
  assert.ok(result.text.includes('operations: RECORDED_SPEND_SPIKE'));
  assert.ok(result.text.includes('currency: usd'));
  assert.ok(result.text.includes('ratio: 4.25'));
  assert.ok(result.text.includes('trackedJobsLastHour: 15'));

  assert.ok(result.text.includes('operations: RECORDED_UNIT_COST_SPIKE'));
  assert.ok(result.text.includes('currency: eur'));
  assert.ok(result.text.includes('ratio: 3.1'));
  assert.ok(result.text.includes('trackedJobsLastHour: 8'));
});

test('multi-signal deduplication and multi-alert capping limits', () => {
  const manyAlerts = [];
  for (let i = 0; i < 15; i++) {
    manyAlerts.push({
      code: 'PROVIDER_HIGH_FAILURE_RATE',
      provider: `Provider_${i % 5}`, // 5 unique providers -> 5 unique fingerprints
      jobs: 20 + i,
      failed: 10 + i,
      rate: 0.5
    });
  }
  // Add exact duplicates
  manyAlerts.push(manyAlerts[0]);
  manyAlerts.push(manyAlerts[1]);

  const multiChecks = {
    operations: {
      status: 'warning',
      code: 'OPERATIONAL_ATTENTION',
      alerts: manyAlerts
    }
  };

  const result = formatLiteOwnerEmailDraft(multiChecks, {
    now: '2026-10-19T18:00:00.000Z'
  });

  assert.equal(result.hasAlerts, true);
  assert.equal(result.alertCount, 5); // Deduplicated 17 entries into 5 unique fingerprints
  assert.equal(result.includedAlertCount, 5);
  assert.equal(result.recipientConfigured, false);
  assert.ok(result.text.includes('NOT CONFIGURED'));
});

test('untrusted strings, secret redaction, SQL/Stripe/URL removal', () => {
  const maliciousChecks = {
    http: {
      status: 'critical',
      code: 'HTTP_CHECK_ERROR',
      url: 'https://attacker.com/evil?token=sk_live_1234567890secret'
    },
    operations: {
      status: 'warning',
      code: 'OPERATIONAL_ATTENTION',
      alerts: [
        {
          code: 'RECORDED_SPEND_SPIKE',
          provider: 'Provider<script>alert(1)</script>whsec_ABCDEF123456',
          currency: 'USD',
          ratio: 5.5,
          trackedJobsLastHour: 10,
          rawSql: 'SELECT * FROM users WHERE id=1',
          secretKey: 'sk_live_123456789abcdef',
          customerPayload: { id: 'cus_12345', email: 'user@victim.com' }
        }
      ]
    }
  };

  const result = formatLiteOwnerEmailDraft(maliciousChecks, {
    now: '2026-10-19T20:00:00.000Z'
  });

  assert.equal(result.hasAlerts, true);
  const jsonStr = JSON.stringify(result);

  // Assert sensitive strings are completely absent
  assert.equal(jsonStr.includes('sk_live_'), false);
  assert.equal(jsonStr.includes('whsec_'), false);
  assert.equal(jsonStr.includes('attacker.com'), false);
  assert.equal(jsonStr.includes('SELECT * FROM users'), false);
  assert.equal(jsonStr.includes('cus_12345'), false);
  assert.equal(jsonStr.includes('user@victim.com'), false);
  assert.equal(jsonStr.includes('<script>'), false);
});

test('pure execution with no DB/HTTP/Stripe/SMTP network calls', () => {
  let networkOrDbCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    networkOrDbCalled = true;
    throw new Error('NETWORK_CALL_FORBIDDEN');
  };

  try {
    const checks = { http: { status: 'critical', code: 'HTTP_UNAVAILABLE' } };
    const result = formatLiteOwnerEmailDraft(checks, {
      ownerEmail: 'test@deepsyq.com',
      now: new Date()
    });

    assert.equal(result.hasAlerts, true);
    assert.equal(networkOrDbCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
