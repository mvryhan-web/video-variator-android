import { runProductWatcherOnce, watcherConfig } from './monitor.js';

// Private background-worker tick. No web endpoint and no paid provider calls.
// Four ticks are not the same as four runs: one result is due every 15 minutes.
// A persistent DB timestamp survives process restarts.
export const WATCHER_INTERVAL_MS = 15 * 60 * 1000;

export async function productWatcherTick({
  pool, env = process.env, fetchFn = globalThis.fetch, now = () => new Date()
} = {}) {
  if (env.PRODUCT_WATCHER_SCHEDULER_ENABLED !== 'true' || !watcherConfig(env).enabled) {
    return { status: 'disabled', checked: false };
  }
  if (!pool) throw Error('WATCHER_DATABASE_NOT_CONFIGURED');
  const client = await pool.connect();
  let paused, lastRun;
  try {
    // The heartbeat is real evidence a worker is alive, not a configured flag.
    const state = await client.query('SELECT c.paused FROM vv_product_watcher_control c JOIN vv_product_watcher_scheduler s ON s.id=c.id WHERE c.id=1');
    if (!state.rows?.length) throw Error('WATCHER_SCHEMA_NOT_READY');
    paused = state.rows[0].paused === true;
    await client.query('UPDATE vv_product_watcher_scheduler SET heartbeat_at=NOW() WHERE id=1');
    const runs = await client.query('SELECT created_at FROM vv_product_watcher_runs ORDER BY id DESC LIMIT 1');
    lastRun = runs.rows?.[0]?.created_at || null;
  } finally {
    client.release();
  }
  if (paused) return { status: 'paused', checked: false };
  const lastMillis = lastRun ? new Date(lastRun).getTime() : null;
  if (lastMillis != null && (!Number.isFinite(lastMillis) || now().getTime() - lastMillis < WATCHER_INTERVAL_MS)) {
    return { status: 'not_due', checked: false };
  }
  const report = await runProductWatcherOnce({pool,env,fetchFn,now,persist:true,minimumIntervalMs:WATCHER_INTERVAL_MS});
  return { status: report.status, checked: !!report.runId, runId: report.runId || null };
}
