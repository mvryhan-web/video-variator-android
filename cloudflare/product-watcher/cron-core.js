/**
 * Cloudflare Cron adapter for the EXISTING F5 Product Watcher.
 * No alternate monitoring engine, database migrations, sends or AI dispatch.
 * Defaults fail closed until the owner configures an isolated TEST deployment.
 */
export const WATCHER_TEST_ORIGIN = 'https://deepsyq.pages.dev/';
export const WATCHER_CRON = '*/2 * * * *';

export function validateIsolatedWatcherEnvironment(env = {}) {
  if (env.PRODUCT_WATCHER_ENABLED !== 'true' || env.PRODUCT_WATCHER_SCHEDULER_ENABLED !== 'true') {
    return { ready: false, code: 'WATCHER_DISABLED' };
  }
  // This flag is an operator assertion, NOT proof of database isolation.
  // An independent Neon project/branch check is required before enabling.
  if (env.PRODUCT_WATCHER_DEPLOY_ENV !== 'test' || env.PRODUCT_WATCHER_TEST_DB_ISOLATED !== 'true') {
    return { ready: false, code: 'WATCHER_TEST_ISOLATION_UNCONFIRMED' };
  }
  if (env.PRODUCT_WATCHER_BASE_URL !== WATCHER_TEST_ORIGIN) {
    return { ready: false, code: 'WATCHER_TEST_ORIGIN_MISMATCH' };
  }
  if (env.PRODUCT_WATCHER_TELEGRAM_ALERTS_ENABLED === 'true' &&
      env.PRODUCT_WATCHER_TEST_DELIVERY_APPROVED !== 'true') {
    return { ready: false, code: 'WATCHER_TEST_DELIVERY_UNAPPROVED' };
  }
  let url;
  try { url = new URL(String(env.DATABASE_URL || '')); }
  catch { return { ready: false, code: 'WATCHER_DATABASE_URL_INVALID' }; }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password || !url.hostname ||
      url.hash || !url.pathname || url.pathname === '/' ||
      !url.hostname.toLowerCase().endsWith('.neon.tech') ||
      /(?:^|\.)[^.]*-pooler(?:\.|$)/i.test(url.hostname)) {
    return { ready: false, code: 'WATCHER_DIRECT_NEON_URL_REQUIRED' };
  }
  // Existing F5 uses session-level pg advisory locks. Neon pooled/pooler URLs
  // can lose the session lock between queries, so reject them fail closed.
  return { ready: true, code: 'WATCHER_TEST_CONFIG_READY' };
}

const safeStatus = value => {
  const raw = typeof value === 'string' ? value : '';
  return /^[a-z_]{2,30}$/i.test(raw) ? raw : 'unknown';
};

export async function runCloudflareProductWatcherTick({
  env = {},
  scheduledCron = WATCHER_CRON,
  createPool,
  operations = {},
  now = () => new Date(),
} = {}) {
  if (scheduledCron !== WATCHER_CRON) return {status: 'blocked', code: 'WATCHER_UNEXPECTED_SCHEDULE'};
  const gate = validateIsolatedWatcherEnvironment(env);
  if (!gate.ready) return {status: 'blocked', code: gate.code};
  if (typeof createPool !== 'function' || typeof operations.tick !== 'function') {
    return {status: 'blocked', code: 'WATCHER_RUNTIME_NOT_WIRED'};
  }
  let pool;
  let failure = false;
  const stages = [];
  try {
    pool = await createPool(env.DATABASE_URL);
    if (!pool || typeof pool.connect !== 'function' || typeof pool.end !== 'function') {
      return {status: 'error', code: 'WATCHER_POOL_INVALID'};
    }
    const run = async (stage, fn) => {
      try {
        const result = await fn({pool, env, now});
        stages.push({stage, status: safeStatus(result?.status)});
        return result;
      } catch {
        failure = true;
        stages.push({stage, status: 'error'});
        return null;
      }
    };
    const main = await run('monitor', operations.tick);
    // Never deliver a stale earlier alert when the current core tick failed.
    if (!main) return {status: 'error', code: 'WATCHER_CORE_TICK_FAILED', stages};
    const optional = [
      ['sources', 'PRODUCT_WATCHER_OFFICIAL_SOURCES_ENABLED', operations.sources],
      ['content', 'PRODUCT_WATCHER_CONTENT_TASKS_ENABLED', operations.content],
      ['briefs', 'PRODUCT_WATCHER_BRIEFS_ENABLED', operations.briefs],
      ['telegram', 'PRODUCT_WATCHER_TELEGRAM_ALERTS_ENABLED', operations.telegram],
    ];
    for (const [stage, flag, fn] of optional) {
      if (env[flag] !== 'true') continue;
      if (typeof fn !== 'function') {
        failure = true;
        stages.push({stage, status: 'error'});
        continue;
      }
      await run(stage, fn);
    }
    return {status: failure ? 'partial' : 'ok', code: failure ? 'WATCHER_OPTIONAL_STAGE_FAILED' : 'WATCHER_TICK_COMPLETE', stages};
  } catch {
    return {status: 'error', code: 'WATCHER_DATABASE_CONNECTION_FAILED', stages};
  } finally {
    try { await pool?.end(); } catch { /* never log a credential-bearing connection exception */ }
  }
}
