/**
 * Dedicated TEST-only Cron Trigger entrypoint for the existing F5 Product Watcher.
 * This Worker is not the DEEPSYQ Pages _worker.js and does not serve public APIs.
 * Never deploy to production or configure a shared/production Neon database.
 */
import { Pool } from 'pg';
import { productWatcherTick } from '../../server/product-watcher/scheduler.js';
import { runOfficialSourcesOnce } from '../../server/product-watcher/official-sources.js';
import { runContentTasksIfDue } from '../../server/product-watcher/content-tasks.js';
import { runBriefsIfDue } from '../../server/product-watcher/briefs.js';
import { deliverCriticalWatcherAlertsOnce } from '../../server/product-watcher/telegram-alerts.js';
import { runCloudflareProductWatcherTick } from './cron-core.js';

export default {
  async fetch() {
    // There is deliberately no publicly invokable monitor, email or Telegram endpoint.
    return new Response('Not found', {status: 404, headers: {'Cache-Control': 'no-store'}});
  },
  async scheduled(controller, env) {
    const result = await runCloudflareProductWatcherTick({
      env,
      scheduledCron: controller.cron,
      createPool: connectionString => new Pool({
        connectionString,
        ssl: { rejectUnauthorized: true },
        max: 1,
        connectionTimeoutMillis: 7000,
        idleTimeoutMillis: 1000,
      }),
      operations: {
        tick: productWatcherTick,
        sources: runOfficialSourcesOnce,
        content: runContentTasksIfDue,
        briefs: runBriefsIfDue,
        telegram: deliverCriticalWatcherAlertsOnce,
      },
    });
    console.log('[F5 cron] ' + JSON.stringify(result)); // safe status codes only, no credentials or users
    if (result.status === 'error' || result.status === 'partial') throw Error('WATCHER_CRON_TICK_FAILED');
  },
};
