/**
 * Block 5 Product Watcher: first, read-only monitoring slice.
 * No access to customer prompts/media, billing secrets, or paid providers.
 * Externally scheduled only after the owner enables and deploys it.
 */
import { checkOperationalSignals } from './operational-signals.js';
import {checkWebhookConfiguration} from './webhook-config.js';
import { saveWatcherAlerts } from './alerts.js';
import {checkBillingReconciliation,billingObserverEnabled} from './billing-signals.js';

const DEFAULT_TIMEOUT_MS = 5000;
const ADVISORY_LOCK_KEYS = [455033, 5];

export function watcherConfig(env = {}) {
  if (env.PRODUCT_WATCHER_ENABLED !== 'true') return { enabled: false };
  const raw = String(env.PRODUCT_WATCHER_BASE_URL || env.APP_URL || '').trim();
  let url;
  try { url = new URL(raw); } catch { throw Error('WATCHER_INVALID_BASE_URL'); }
  const local = env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (!(url.protocol === 'https:' || local) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw Error('WATCHER_INVALID_BASE_URL');
  }
  const value = Number(env.PRODUCT_WATCHER_HTTP_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  if (!Number.isInteger(value) || value < 1000 || value > 15000) throw Error('WATCHER_INVALID_TIMEOUT');
  return { enabled: true, healthUrl: new URL('/api/health', url).toString(), timeoutMs: value };
}

async function httpHealth({ fetchFn, healthUrl, timeoutMs }) {
  try {
    const response = await fetchFn(healthUrl, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } });
    if (!response.ok) return { status: 'critical', code: 'HTTP_UNAVAILABLE', httpStatus: response.status };
    if (Number(response.headers?.get?.('content-length') || 0) > 16384) return { status: 'critical', code: 'HEALTH_RESPONSE_TOO_LARGE' };

    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      let totalBytes = 0;
      const chunks = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalBytes += value.byteLength || value.length || 0;
            if (totalBytes > 16384) {
              try { await reader.cancel(); } catch {}
              return { status: 'critical', code: 'HEALTH_RESPONSE_TOO_LARGE' };
            }
            chunks.push(value);
          }
        }
      } catch {
        try { await reader.cancel(); } catch {}
        return { status: 'critical', code: 'HTTP_CHECK_ERROR' };
      }
      const combined = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        const arr = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
        combined.set(arr, offset);
        offset += arr.length;
      }
      let body;
      try {
        body = JSON.parse(new TextDecoder('utf-8').decode(combined));
      } catch {
        return { status: 'critical', code: 'HEALTH_CHECK_FAILED' };
      }
      if (body?.ok !== true) return { status: 'critical', code: 'HEALTH_CHECK_FAILED' };
      return { status: 'healthy', code: 'HTTP_OK' };
    } else if (typeof response.json === 'function') {
      let body;
      try {
        body = await response.json();
      } catch {
        return { status: 'critical', code: 'HEALTH_CHECK_FAILED' };
      }
      if (body?.ok !== true) return { status: 'critical', code: 'HEALTH_CHECK_FAILED' };
      return { status: 'healthy', code: 'HTTP_OK' };
    }
    return { status: 'critical', code: 'HEALTH_CHECK_FAILED' };
  } catch {
    // Network exceptions can contain credential-bearing URLs. Never return raw errors.
    return { status: 'critical', code: 'HTTP_CHECK_ERROR' };
  }
}

export async function checkDatabase(client) {
  try {
    const q = await client.query('SELECT 1 AS alive');
    if (Number(q.rows?.[0]?.alive) !== 1) throw Error('NOT_ALIVE');
    return { status: 'healthy', code: 'DB_OK' };
  } catch {
    return { status: 'critical', code: 'DB_UNAVAILABLE' };
  }
}

export async function checkGenerationJobs(client) {
  try {
    const reg = await client.query("SELECT to_regclass('public.vv_generation_jobs') AS table_name");
    if (!reg.rows?.[0]?.table_name) return { status: 'warning', code: 'GENERATION_SCHEMA_NOT_READY' };
    // Counts only; never select user identifiers, prompts, assets or billing identifiers.
    const q = await client.query([
      "SELECT COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS total_24h,",
      "COUNT(*) FILTER (WHERE status='failed' AND created_at >= NOW() - INTERVAL '24 hours')::int AS failed_24h,",
      "COUNT(*) FILTER (WHERE status='unknown' AND created_at >= NOW() - INTERVAL '24 hours')::int AS unknown_24h,",
      "COUNT(*) FILTER (WHERE status IN ('queued','processing') AND created_at < NOW() - INTERVAL '30 minutes')::int AS stale_24h,",
      "COUNT(*) FILTER (WHERE status IN ('unknown','finalizing') AND credits_reserved > 0)::int AS held_review_24h",
      "FROM vv_generation_jobs WHERE deleted=false AND (created_at >= NOW() - INTERVAL '24 hours' OR status IN ('queued','processing','unknown','finalizing'))"
    ].join(' '));
    const row = q.rows?.[0] || {};
    const counts = Object.fromEntries(['total_24h','failed_24h','unknown_24h','stale_24h','held_review_24h'].map(k => [k, Math.max(0, Number(row[k]) || 0)]));
    const problems = counts.failed_24h + counts.unknown_24h + counts.stale_24h + counts.held_review_24h;
    return { status: problems ? 'warning' : 'healthy', code: problems ? 'GENERATION_ATTENTION' : 'GENERATION_OK', counts };
  } catch {
    return { status: 'warning', code: 'GENERATION_CHECK_ERROR' };
  }
}

export function summarizeChecks(checks) {
  const severity = ['healthy', 'warning', 'critical'];
  const status = Object.values(checks).reduce((s, x) => severity[Math.max(severity.indexOf(s), severity.indexOf(x.status))], 'healthy');
  const findings = Object.entries(checks).filter(([, x]) => x.status !== 'healthy').map(([source, x]) => ({ source, severity: x.status, code: x.code }));
  return { status, findings };
}

export async function runProductWatcherOnce({ pool, env = {}, fetchFn = globalThis.fetch, now = () => new Date(), persist = true, minimumIntervalMs = 0 } = {}) {
  const config = watcherConfig(env);
  if (!config.enabled) return { enabled: false, status: 'disabled', findings: [], checks: {} };
  if (!pool || typeof pool.connect !== 'function') throw Error('WATCHER_DATABASE_NOT_CONFIGURED');
  const client = await pool.connect();
  let locked = false;
  try {
    const r = await client.query('SELECT pg_try_advisory_lock($1, $2) AS acquired', ADVISORY_LOCK_KEYS);
    locked = r.rows?.[0]?.acquired === true;
    if (!locked) return { enabled: true, status: 'skipped', code: 'ALREADY_RUNNING', findings: [], checks: {} };
    if (persist) {
      // Schema and owner pause state must exist before any HTTP request or checks.
      const control = await client.query('SELECT paused FROM vv_product_watcher_control WHERE id=1');
      if (!control.rows?.length) throw Error('WATCHER_SCHEMA_NOT_READY');
      if (control.rows[0].paused === true) return { enabled: true, status: 'paused', code: 'OWNER_PAUSED', findings: [], checks: {} };
    }
    if (persist && minimumIntervalMs > 0) {
      // Double-check the durable schedule *under* the same PostgreSQL advisory lock.
      // Two fast workers must not create two reports for one 15-minute interval.
      if (!Number.isSafeInteger(minimumIntervalMs) || minimumIntervalMs < 60000 || minimumIntervalMs > 86400000) {
        throw Error('WATCHER_INVALID_INTERVAL');
      }
      const last = await client.query('SELECT created_at FROM vv_product_watcher_runs ORDER BY id DESC LIMIT 1');
      const lastTime = last.rows?.[0]?.created_at ? new Date(last.rows[0].created_at).getTime() : null;
      if (lastTime != null && (!Number.isFinite(lastTime) || now().getTime() - lastTime < minimumIntervalMs)) {
        return { enabled: true, status: 'not_due', code: 'INTERVAL_NOT_ELAPSED', findings: [], checks: {} };
      }
    }
    const checks = {
      http: await httpHealth({ fetchFn, ...config }),
      database: await checkDatabase(client),
      generations: await checkGenerationJobs(client),
      operations: await checkOperationalSignals(client),
      billing: await checkBillingReconciliation(client,{enabled:billingObserverEnabled(env)}),
      webhookConfig: checkWebhookConfiguration(env)
    };
    const { status, findings } = summarizeChecks(checks);
    const report = { enabled: true, status, checkedAt: now().toISOString(), checks, findings };
    if (persist) {
      // Deliberately no implicit migration; an owner must approve the schema first.
      // Keep report and deduplicated alert observations atomic. No action is auto-applied.
      await client.query('BEGIN');
      try {
        const saved = await client.query('INSERT INTO vv_product_watcher_runs (status, checks, findings) VALUES ($1,$2::jsonb,$3::jsonb) RETURNING id', [status, JSON.stringify(checks), JSON.stringify(findings)]);
        report.runId = Number(saved.rows?.[0]?.id);
        if (!Number.isSafeInteger(report.runId) || report.runId < 1) throw Error('WATCHER_PERSISTENCE_FAILED');
        report.alertObservations = await saveWatcherAlerts(client,checks);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(()=>{});
        throw error;
      }
    }
    return report;
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock($1, $2)', ADVISORY_LOCK_KEYS).catch(() => {});
    client.release();
  }
}
