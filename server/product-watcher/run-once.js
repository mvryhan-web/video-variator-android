import 'dotenv/config';
import { pool } from '../db.js';
import { runProductWatcherOnce } from './monitor.js';

const dryRun = process.argv.slice(2).includes('--dry-run');
try {
  const report = await runProductWatcherOnce({ pool, env: process.env, persist: !dryRun });
  console.log(JSON.stringify({ ...report, persisted: !!report.runId }));
  if (report.status === 'critical') process.exitCode = 2;
  else if (report.status === 'skipped') process.exitCode = 3;
} catch (error) {
  // Do not leak pg connection strings, health URLs, provider or Stripe secrets.
  const code = String(error?.message || '').startsWith('WATCHER_') ? error.message : 'WATCHER_RUN_FAILED';
  console.error(JSON.stringify({ status: 'error', code }));
  process.exitCode = 1;
} finally {
  await pool?.end().catch(() => {});
}
