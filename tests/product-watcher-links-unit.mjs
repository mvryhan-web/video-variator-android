import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkContentAssetReachability, linkChecksEnabled, safeSameOriginAsset
} from '../server/product-watcher/link-reachability.js';

const env = {
  NODE_ENV: 'production',
  APP_URL: 'https://deepsyq.example/',
  PRODUCT_WATCHER_ENABLED: 'true',
  PRODUCT_WATCHER_CONTENT_TASKS_ENABLED: 'true',
  PRODUCT_WATCHER_LINK_CHECKS_ENABLED: 'true'
};

function contentClient({ templates = [], inspiration = [] } = {}) {
  const queries = [];
  return {
    queries,
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('FROM vv_ai_template')) return { rows: templates };
      if (sql.includes('FROM vv_ai_inspiration')) return { rows: inspiration };
      throw Error('Unexpected query');
    }
  };
}

test('opt-in disabled makes zero SQL requests or HTTP calls', async () => {
  const client = contentClient();
  assert.equal(linkChecksEnabled({ PRODUCT_WATCHER_ENABLED: 'true' }), false);
  const result = await checkContentAssetReachability({
    client, env: { ...env, PRODUCT_WATCHER_LINK_CHECKS_ENABLED: 'false' },
    fetchFn: () => { throw Error('Unexpected request'); }
  });
  assert.equal(result.status, 'disabled');
  assert.equal(client.queries.length, 0);
});

test('refuses remote, signed, encoded, private and unsafe targets', () => {
  const root = 'https://deepsyq.example';
  for (const value of [
    'https://evil.example/p.jpg', '//evil.example/p.jpg', '/%2f%2fevil.example/a.png',
    '/a\\b.png', '/images/preview.jpg?signature=private', '/images/x.png#fragment',
    '/api/payments.png', '/images/no-extension', '/images/image.pdf', '/a\n.png'
  ]) assert.equal(safeSameOriginAsset(value, root), null, value);
  assert.equal(safeSameOriginAsset('/images/demo.webp', root),
    'https://deepsyq.example/images/demo.webp');
});

test('checks only approved active same-origin static assets with HEAD; reports broken IDs, never URLs', async () => {
  const client = contentClient({
    templates: [
      { id: 3, thumbnail: '/media/ready.jpg' },
      { id: 4, thumbnail: '/media/broken.webp' },
      { id: 5, thumbnail: 'https://remote.example/hidden.png' }
    ],
    inspiration: [
      { id: 8, preview_url: '/media/clip.mp4', preview_poster_url: '/media/head-unsupported.png' }
    ]
  });
  const requests = [], cancelled = [];
  const outcomes = { '/media/ready.jpg': 200, '/media/broken.webp': 404,
    '/media/clip.mp4': 410, '/media/head-unsupported.png': 405 };
  const result = await checkContentAssetReachability({ client, env, fetchFn: async (url, options) => {
    requests.push({ url, options });
    assert.equal(options.method, 'HEAD');
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit');
    assert.equal(new URL(url).origin, 'https://deepsyq.example');
    return {
      status: outcomes[new URL(url).pathname],
      body: { cancel: async () => { cancelled.push(url); } }
    };
  } });
  assert.equal(result.status, 'attention');
  assert.equal(result.available, 1);
  assert.equal(result.broken, 2);
  assert.equal(result.unverified, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.checked, 4);
  assert.deepEqual(result.findings, [
    { source: 'template', recordId: 4, field: 'thumbnail', httpStatus: 404 },
    { source: 'inspiration', recordId: 8, field: 'preview', httpStatus: 410 }
  ]);
  assert.equal(requests.length, 4);
  assert.equal(cancelled.length, 4);
  assert.ok(client.queries.every(({ sql, params }) => sql.includes('WHERE active=true') && params[0] === 4));
  assert.ok(!JSON.stringify(result).includes('http://'));
  assert.ok(!JSON.stringify(result).includes('https://'));
});

test('network, redirect and authorization ambiguity is explicitly inconclusive, not broken', async () => {
  const client = contentClient({ templates: [
    { id: 1, thumbnail: '/assets/auth.jpg' },
    { id: 2, thumbnail: '/assets/redirect.jpg' },
    { id: 3, thumbnail: '/assets/error.png' }
  ] });
  const r = await checkContentAssetReachability({ client, env, fetchFn: async url => {
    if (url.endsWith('redirect.jpg')) throw Error('https://secret:password@private.example');
    return { status: url.endsWith('error.png') ? 503 : 403 };
  } });
  assert.equal(r.status, 'inconclusive');
  assert.equal(r.unverified, 3);
  assert.equal(r.broken, 0);
  assert.equal(JSON.stringify(r).includes('password'), false);
});

test('missing DB or invalid HTTPS configuration is reported safely without any network', async () => {
  const result = await checkContentAssetReachability({
    client: contentClient(), env: { ...env, APP_URL: 'http://169.254.169.254/' },
    fetchFn: () => { throw Error('Network must not be called'); }
  });
  assert.equal(result.code, 'CONTENT_LINK_CHECK_CONFIG_INVALID');
  assert.equal((await checkContentAssetReachability({
    client: { query: async () => { throw Error('DB password!'); } }, env,
    fetchFn: () => { throw Error('No HTTP'); }
  })).code, 'CONTENT_LINK_CHECK_SCHEMA_UNAVAILABLE');
});
