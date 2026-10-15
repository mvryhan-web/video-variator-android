import { runProductWatcherOnce, watcherConfig } from './monitor.js';
import { initAdminAudit } from '../admin-audit.js';

// Match the existing Deepsyq owner identity policy: only the designated Google account.
// An empty ADMIN_EMAIL must never authorize a user with an empty email.
export function isWatcherOwner(user, env = {}) {
  const adminEmail = String(env.ADMIN_EMAIL || '').trim().toLowerCase();
  return !!(adminEmail && user?.provider === 'google' && String(user.email || '').trim().toLowerCase() === adminEmail);
}

function error(res, status, code) {
  return res.status(status).json({ error: code });
}

export function installProductWatcher(app, { auth, pool, env = process.env, fetchFn = globalThis.fetch } = {}) {
  if (typeof auth !== 'function') throw Error('WATCHER_AUTH_REQUIRED');
  const owner = (req, res, next) => isWatcherOwner(req.user, env) ? next() : error(res, 403, 'WATCHER_OWNER_ONLY');
  const enabled = () => watcherConfig(env).enabled;

  app.get('/api/product-watcher/admin/status', auth, owner, async (_req, res) => {
    if (!enabled()) return res.json({ enabled: false, status: 'disabled', paused: null, schedulerActive: false, lastRun: null, runs: [] });
    if (!pool) return error(res, 503, 'WATCHER_DATABASE_NOT_CONFIGURED');
    try {
      const [state, history] = await Promise.all([
        pool.query('SELECT paused, updated_at FROM vv_product_watcher_control WHERE id=1'),
        pool.query('SELECT id, status, checks, findings, created_at FROM vv_product_watcher_runs ORDER BY id DESC LIMIT 30')
      ]);
      if (!state.rows?.length) return error(res, 503, 'WATCHER_SCHEMA_NOT_READY');
      const runs = history.rows.map(r => ({
        id: Number(r.id), status: r.status, checks: r.checks, findings: r.findings,
        checkedAt: r.created_at
      }));
      return res.json({
        enabled: true, status: state.rows[0].paused ? 'paused' : 'ready',
        paused: !!state.rows[0].paused, schedulerActive: false,
        nextRun: null, lastRun: runs[0] || null, runs
      });
    } catch {
      return error(res, 503, 'WATCHER_STATUS_UNAVAILABLE');
    }
  });

  // Pause/resume blocks future runs, not work already in flight. Only one guarded,
  // atomic state change plus its existing owner audit record.
  app.post('/api/product-watcher/admin/control', auth, owner, async (req, res) => {
    if (!enabled()) return error(res, 503, 'WATCHER_DISABLED');
    if (!pool) return error(res, 503, 'WATCHER_DATABASE_NOT_CONFIGURED');
    const action = req.body?.action;
    if (action !== 'pause' && action !== 'resume') return error(res, 400, 'WATCHER_INVALID_CONTROL');
    let client;
    try {
      await initAdminAudit(pool);
      client = await pool.connect();
      await client.query('BEGIN');
      const {rows} = await client.query(
        'UPDATE vv_product_watcher_control SET paused=$1,updated_at=NOW(),updated_by=$2 WHERE id=1 RETURNING paused,updated_at',
        [action === 'pause', req.user.id]
      );
      if (!rows.length) { await client.query('ROLLBACK'); return error(res, 503, 'WATCHER_SCHEMA_NOT_READY'); }
      await client.query(
        'INSERT INTO vv_admin_audit(actor_user_id,action,target_type,target_id,details) VALUES($1,$2,$3,$4,$5::jsonb)',
        [req.user.id, 'product_watcher.' + action, 'product_watcher', 'singleton', JSON.stringify({paused:!!rows[0].paused})]
      );
      await client.query('COMMIT');
      return res.json({ ok: true, paused: !!rows[0].paused, updatedAt: rows[0].updated_at });
    } catch {
      if (client) await client.query('ROLLBACK').catch(() => {});
      return error(res, 503, 'WATCHER_CONTROL_FAILED');
    } finally {
      client?.release();
    }
  });

  app.post('/api/product-watcher/admin/run', auth, owner, async (req, res) => {
    if (!enabled()) return error(res, 503, 'WATCHER_DISABLED');
    if (!pool) return error(res, 503, 'WATCHER_DATABASE_NOT_CONFIGURED');
    try {
      const report = await runProductWatcherOnce({ pool, env, fetchFn, persist: true });
      // Run is owner initiated but only performs non-billable read-only checks.
      // Report itself is append-only; do not claim it is an autonomous repair.
      return res.status(report.status === 'skipped' || report.status === 'paused' ? 202 : 200).json(report);
    } catch {
      return error(res, 503, 'WATCHER_RUN_FAILED');
    }
  });
}
