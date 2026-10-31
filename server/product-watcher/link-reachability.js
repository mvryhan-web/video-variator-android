/**
 * Block 5: opt-in, read-only reachability checks for public SAME-ORIGIN content assets.
 * This is deliberately NOT a crawler, media-playback test, external-link scanner,
 * or workflow executor. No URL, credential, response body or customer data is saved.
 */
import { watcherConfig } from './monitor.js';

const MAX_TEMPLATE_ROWS = 4;
const MAX_INSPIRATION_ROWS = 4;
const MAX_CHECKS = 12;
const TIMEOUT_MS = 3000;
const PUBLIC_ASSET_EXTENSION = /\.(?:png|jpe?g|webp|gif|svg|mp4|webm)$/i;

export function linkChecksEnabled(env = {}) {
  return env.PRODUCT_WATCHER_ENABLED === 'true'
    && env.PRODUCT_WATCHER_CONTENT_TASKS_ENABLED === 'true'
    && env.PRODUCT_WATCHER_LINK_CHECKS_ENABLED === 'true';
}

/** Never resolve untrusted absolute, protocol-relative, signed or dynamic URLs. */
export function safeSameOriginAsset(raw, origin) {
  if (typeof raw !== 'string' || raw.length < 2 || raw.length > 500
      || !raw.startsWith('/') || raw.startsWith('//')
      || /[\\%?#\s\u0000-\u001f]/.test(raw)
      || /^\/(?:api|admin|account|billing|logout)(?:\/|$)/i.test(raw)
      || !PUBLIC_ASSET_EXTENSION.test(raw)) return null;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin || !['https:', 'http:'].includes(url.protocol)
        || /^\/(?:api|admin|account|billing|logout)(?:\/|$)/i.test(url.pathname)) return null;
    return url.toString();
  } catch { return null; }
}

const asId = value => {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

export async function checkContentAssetReachability({
  client, env = {}, fetchFn = globalThis.fetch
} = {}) {
  if (!linkChecksEnabled(env)) {
    return { status: 'disabled', code: 'CONTENT_LINK_CHECK_DISABLED' };
  }
  if (!client?.query || typeof fetchFn !== 'function') {
    return { status: 'unavailable', code: 'CONTENT_LINK_CHECK_UNAVAILABLE' };
  }

  let origin;
  try {
    origin = new URL(watcherConfig(env).healthUrl).origin;
  } catch {
    return { status: 'unavailable', code: 'CONTENT_LINK_CHECK_CONFIG_INVALID' };
  }

  let templates, inspiration;
  try {
    // Read only approved, active public content. No prompt, user data or secrets.
    [templates, inspiration] = await Promise.all([
      client.query(
        'SELECT id,thumbnail FROM vv_ai_template WHERE active=true ORDER BY id LIMIT $1',
        [MAX_TEMPLATE_ROWS]
      ),
      client.query(
        'SELECT id,preview_url,preview_poster_url FROM vv_ai_inspiration WHERE active=true ORDER BY id LIMIT $1',
        [MAX_INSPIRATION_ROWS]
      )
    ]);
  } catch {
    return { status: 'unavailable', code: 'CONTENT_LINK_CHECK_SCHEMA_UNAVAILABLE' };
  }

  const candidates = [];
  for (const row of templates.rows || []) {
    candidates.push({ source: 'template', recordId: asId(row.id), field: 'thumbnail', value: row.thumbnail });
  }
  for (const row of inspiration.rows || []) {
    candidates.push({ source: 'inspiration', recordId: asId(row.id), field: 'preview', value: row.preview_url });
    if (row.preview_poster_url) {
      candidates.push({ source: 'inspiration', recordId: asId(row.id), field: 'poster', value: row.preview_poster_url });
    }
  }

  const counts = { checked: 0, available: 0, broken: 0, unverified: 0, skipped: 0 };
  const findings = [];
  const limited = candidates.slice(0, MAX_CHECKS);
  // Two bounded HEAD requests at a time. No cookies, auth, redirects or body download.
  for (let start = 0; start < limited.length; start += 2) {
    await Promise.all(limited.slice(start, start + 2).map(async item => {
      const target = safeSameOriginAsset(item.value, origin);
      if (!target) { counts.skipped++; return; }
      counts.checked++;
      let status;
      try {
        const response = await fetchFn(target, {
          method: 'HEAD', redirect: 'error', credentials: 'omit',
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { Accept: '*/*' }
        });
        status = Number(response.status);
        // A broken/misconfigured endpoint must never cause a large body download.
        try { await response.body?.cancel?.(); } catch {}
      } catch {
        counts.unverified++;
        return;
      }
      if (!Number.isInteger(status) || status < 100 || status > 599) {
        counts.unverified++;
      } else if (status >= 200 && status < 300) {
        counts.available++;
      } else if (status === 404 || status === 410) {
        counts.broken++;
        findings.push({ source: item.source, recordId: item.recordId, field: item.field, httpStatus: status });
      } else {
        // HEAD can be unsupported or assets private; 403/405/5xx do not prove a broken link.
        counts.unverified++;
      }
    }));
  }
  return {
    status: counts.checked === 0 ? 'not_applicable' : counts.broken ? 'attention' : counts.unverified ? 'inconclusive' : 'checked',
    code: counts.checked === 0 ? 'NO_SAFE_PUBLIC_ASSETS' : counts.broken ? 'CONTENT_ASSET_BROKEN' : counts.unverified ? 'CONTENT_ASSET_UNVERIFIED' : 'CONTENT_ASSET_CHECKED',
    ...counts,
    findings: findings.slice(0, 10),
    scope: 'Active template/inspiration same-origin public static assets (HEAD only; max 12).',
    notChecked: 'External/signed/private/dynamic URLs, link redirects, playable media and live workflow execution.',
    // Only content IDs and HTTP status codes are kept. Never persist original URLs.
  };
}
