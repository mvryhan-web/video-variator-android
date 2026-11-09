import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'app/src/main/assets');
const file = name => readFileSync(path.join(assets, name), 'utf8');
const routes = file('_redirects').split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
const map = new Map(routes.map(line => {
  const parts = line.split(/\s+/);
  assert.equal(parts.length, 3, 'Malformed Cloudflare Pages _redirects line: ' + line);
  return [parts[0], { destination: parts[1], code: Number(parts[2]) }];
}));

test('TEST entry points are unambiguous', () => {
  assert.deepEqual(map.get('/'), { destination: '/deepsyq.html', code: 200 });
  assert.deepEqual(map.get('/index.html'), { destination: '/', code: 301 });
  assert.deepEqual(map.get('/ai-agents'), { destination: '/jarvix-chat.html', code: 302 });
  assert.deepEqual(map.get('/dashboard'), { destination: '/deepsyq.html', code: 302 });
  assert.ok(!map.has('/jarvix-chat.'), 'Unknown dotted route must not redirect to another tool');
  assert.ok(routes.every(line => !/^\/\*/.test(line)), 'Do not add an index.html wildcard fallback');
  assert.match(file('404.html'), /<title>Page not found/i);
  assert.match(file('deepsyq.html'), /<title>Deepsyq/);
  assert.equal(file('index.html'), file('deepsyq.html'), 'The physical index must serve DEEPSYQ Home, not Video Uniquifier');
  assert.match(file('jarvix-chat.html'), /<title>JARVIS Chat/);
  assert.match(file('video-uniquifier.html'), /<title>Video Uniquifier/);
});

test('approved home navigation links directly to the right pages', () => {
  const home = file('deepsyq.html');
  assert.match(home, /href="jarvix-chat.html"[^>]*aria-label="JARVIX"/);
  assert.doesNotMatch(home, /href="ai-agents.html"[^>]*aria-label="JARVIX"/);
  assert.match(home, /href="video-uniquifier.html"[^>]*aria-label="Video Uniquifier"/);
  assert.match(home, /class="unique-tool" href="video-uniquifier.html"/);
  const shell = file('deepsyq-site-shell.js');
  assert.match(shell, /url:'video-uniquifier.html', key: 'legacy'/);
  for (const mode of ['image', 'video', 'audio']) {
    assert.ok(home.includes('jarvix-chat.html?mode=' + mode), 'Missing JARVIX mode ' + mode);
  }
});

test('all 33 HTML documents refer only to existing local files', () => {
  const pages = readdirSync(assets).filter(name => name.endsWith('.html') && name !== '404.html');
  assert.equal(pages.length, 33);
  for (const page of pages) {
    const source = file(page);
    assert.match(source, /<title[^>]*>[^<]+<\/title>/i, 'Missing title for ' + page);
    assert.doesNotMatch(source, /href=["']index\.html(?:["'#?])/i, 'Old video tool index link in ' + page);
    const links = source.matchAll(/(?:href|action)\s*=\s*(["'])(.*?)\1/gi);
    for (const [, , href] of links) {
      if (!href || /^(?:#|https?:|mailto:|tel:|javascript:|data:|blob:|\/\/)/i.test(href)) continue;
      const clean = href.split(/[?#]/)[0].replace(/^\//, '').replace(/^\.\//, '');
      if (!clean || clean.includes('${') || clean.includes('{') || /^(?:api|vendor)\//.test(clean)) continue;
      assert.ok(
        existsSync(path.join(assets, clean)) || existsSync(path.join(assets, clean + '.html')),
        'Broken local href on ' + page + ': ' + href
      );
    }
  }
});
