import { observedWatcherAlerts } from './alerts.js';

const STAGE1_LITE_SOURCES = new Set(['http', 'billing', 'webhookConfig', 'operations']);
const ALLOWED_DETAILS_KEYS = new Set([
  'jobs',
  'previousJobs',
  'failed',
  'rate',
  'ratio',
  'trackedJobsLastHour',
  'readyJobsWithoutActualCostLastHour',
  'recentSamples',
  'baselineSamples',
  'averageMsLastHour',
  'baselineAverageMs'
]);

const MAX_ALERTS_IN_DRAFT = 10;
const MAX_TEXT_BYTES = 2048;

function sanitizeEmail(val) {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && !/[<>\r\n"']/.test(trimmed)) {
    return trimmed.slice(0, 120);
  }
  return null;
}

function redactSecrets(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/whsec_[a-zA-Z0-9]+/g, '[REDACTED_SECRET]')
    .replace(/sk_live_[a-zA-Z0-9]+/g, '[REDACTED_SECRET]')
    .replace(/sk_test_[a-zA-Z0-9]+/g, '[REDACTED_SECRET]')
    .replace(/bearer\s+[a-zA-Z0-9._-]+/gi, '[REDACTED_TOKEN]')
    .replace(/(postgres|postgresql|mysql|mongodb):\/\/[^\s]+/gi, '[REDACTED_URI]')
    .replace(/https?:\/\/[^\s]+/gi, '[REDACTED_URL]')
    .replace(/select\s+.*?\s+from\s+/gi, '[REDACTED_SQL]')
    .replace(/<[^>]*>/g, '');
}

function parseNow(nowInput) {
  if (nowInput instanceof Date && !isNaN(nowInput.getTime())) {
    return nowInput.toISOString();
  }
  if (typeof nowInput === 'string' || typeof nowInput === 'number') {
    const d = new Date(nowInput);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Pure, deterministic email draft formatter for Block 5 Stage 1 LITE alerts.
 * Reuses observedWatcherAlerts(checks) to process checks without network/DB calls.
 *
 * @param {Object} checksInput Check outputs from product watcher checks
 * @param {Object} [optionsInput] Formatting options including env, ownerEmail, now
 * @returns {Object} Truthful draft object (draftOnly: true, sent: false)
 */
export function formatLiteOwnerEmailDraft(checksInput, optionsInput = {}) {
  let checks = checksInput || {};
  let options = optionsInput || {};

  if (
    checksInput &&
    typeof checksInput === 'object' &&
    !Array.isArray(checksInput) &&
    ('checks' in checksInput || 'env' in checksInput || 'now' in checksInput) &&
    !checksInput.http &&
    !checksInput.billing &&
    !checksInput.operations &&
    !checksInput.webhookConfig &&
    !checksInput.database &&
    !checksInput.generations
  ) {
    checks = checksInput.checks || {};
    options = checksInput;
  }

  const env = options.env || {};
  const ownerEmail = sanitizeEmail(options.ownerEmail || env.PRODUCT_WATCHER_OWNER_EMAIL || env.ADMIN_EMAIL);
  const isoNow = parseNow(options.now);

  const rawAlerts = observedWatcherAlerts(checks);

  const seenFingerprints = new Set();
  const liteAlerts = [];

  for (const alert of rawAlerts) {
    if (!alert || typeof alert !== 'object') continue;
    const source = String(alert.source || '').trim();
    if (!STAGE1_LITE_SOURCES.has(source)) continue;

    const severity = alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : null;
    if (!severity) continue;

    const fp = alert.fingerprint || `${source}:${alert.code}:${alert.provider}:${alert.currency}`;
    if (seenFingerprints.has(fp)) continue;
    seenFingerprints.add(fp);

    const code = redactSecrets(String(alert.code || 'CHECK_WARNING')).slice(0, 70);
    if (!/^[A-Z0-9_]{1,70}$/.test(code)) continue;

    let provider = null;
    if (typeof alert.provider === 'string' && alert.provider.trim()) {
      const cleanP = redactSecrets(alert.provider.trim()).slice(0, 50);
      if (/^[a-zA-Z0-9_ -]{1,50}$/.test(cleanP)) provider = cleanP;
    }

    let currency = null;
    if (typeof alert.currency === 'string' && /^[a-z]{3}$/i.test(alert.currency.trim())) {
      currency = alert.currency.trim().toLowerCase();
    }

    const cleanDetails = {};
    if (alert.details && typeof alert.details === 'object' && !Array.isArray(alert.details)) {
      for (const [key, val] of Object.entries(alert.details)) {
        if (ALLOWED_DETAILS_KEYS.has(key) && Number.isFinite(val) && val >= 0) {
          cleanDetails[key] = val;
        }
      }
    }

    liteAlerts.push({
      source,
      code,
      severity,
      provider,
      currency,
      details: cleanDetails,
      fingerprint: fp
    });
  }

  if (liteAlerts.length === 0) {
    return {
      hasAlerts: false,
      status: 'no_alerts',
      sent: false,
      draftOnly: true,
      to: ownerEmail,
      recipientConfigured: !!ownerEmail,
      subject: null,
      text: null,
      alertCount: 0,
      includedAlertCount: 0,
      truncated: false,
      generatedAt: isoNow,
      disclaimer: 'This is an un-sent local email draft formatter. No email was sent, and no network, database, payment, or SMTP call was executed.'
    };
  }

  const included = liteAlerts.slice(0, MAX_ALERTS_IN_DRAFT);
  const truncatedByCount = liteAlerts.length > MAX_ALERTS_IN_DRAFT;

  const subject = `[ALERT] Deepsyq Product Watcher LITE - ${liteAlerts.length} issue(s) observed`;

  const alertLines = included.map((a, idx) => {
    const parts = [];
    if (a.provider) parts.push(`provider: ${a.provider}`);
    if (a.currency) parts.push(`currency: ${a.currency}`);
    for (const [k, v] of Object.entries(a.details)) {
      parts.push(`${k}: ${v}`);
    }
    const meta = parts.length ? ` (${parts.join(', ')})` : '';
    return ` ${idx + 1}. [${a.severity.toUpperCase()}] ${a.source}: ${a.code}${meta}`;
  });

  if (truncatedByCount) {
    alertLines.push(` ... and ${liteAlerts.length - MAX_ALERTS_IN_DRAFT} additional alert(s) omitted.`);
  }

  const recipientDisplay = ownerEmail || '[NOT CONFIGURED - Set PRODUCT_WATCHER_OWNER_EMAIL or ADMIN_EMAIL]';

  let body = [
    'Deepsyq Product Watcher Stage 1 LITE - Owner Email Alert Draft',
    `Generated At: ${isoNow}`,
    `Recipient: ${recipientDisplay}`,
    '',
    'SUMMARY:',
    `Observed ${liteAlerts.length} issue(s) across owner-approved Stage 1 LITE categories (website uptime, Stripe errors, spend anomalies).`,
    '',
    'ALERT FINDINGS:',
    ...alertLines,
    '',
    'SAFETY & EXECUTION DISCLAIMER:',
    '- This message is a pure local plain-text DRAFT ONLY.',
    '- NO EMAIL WAS SENT. No SMTP transport, working email delivery, or live payment read/write occurred.',
    '- No database modifications, automatic repairs, or paid provider calls were executed.',
    '- Open the private owner Product Watcher admin panel to inspect status.'
  ].join('\n');

  let textTruncated = false;
  if (Buffer.byteLength(body, 'utf-8') > MAX_TEXT_BYTES) {
    const textBuf = Buffer.from(body, 'utf-8');
    body = textBuf.subarray(0, MAX_TEXT_BYTES - 60).toString('utf-8') + '\n\n[DRAFT TEXT TRUNCATED TO 2KB LIMIT]';
    textTruncated = true;
  }

  return {
    hasAlerts: true,
    status: 'draft_ready',
    sent: false,
    draftOnly: true,
    to: ownerEmail,
    recipientConfigured: !!ownerEmail,
    subject,
    text: body,
    alertCount: liteAlerts.length,
    includedAlertCount: included.length,
    truncated: truncatedByCount || textTruncated,
    generatedAt: isoNow,
    disclaimer: 'This is an un-sent local email draft formatter. No email was sent, and no network, database, payment, or SMTP call was executed.'
  };
}
