import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ASSETS = path.resolve('app/src/main/assets');

test('public homepage sources index.html and deepsyq.html allow indexing (no noindex)', () => {
  for (const file of ['index.html', 'deepsyq.html']) {
    const html = fs.readFileSync(path.join(ASSETS, file), 'utf8');
    assert.match(html, /<meta\s+name="robots"\s+content="index,follow"/i, `${file} must allow indexing`);
    assert.doesNotMatch(html, /<meta\s+name="robots"\s+content="[^"]*noindex/i, `${file} must not contain noindex`);
  }
});

test('PWA manifests are valid JSON with canonical start_url "/" and existing icons', () => {
  for (const file of ['deepsyq.webmanifest', 'manifest.webmanifest']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(ASSETS, file), 'utf8'));
    assert.equal(manifest.start_url, '/', `${file} start_url must be /`);
    assert.equal(manifest.scope, '/', `${file} scope must be /`);
    assert.equal(manifest.display, 'standalone', `${file} display must be standalone`);
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, `${file} must declare icons`);
    for (const icon of manifest.icons) {
      assert.ok(fs.existsSync(path.join(ASSETS, icon.src)), `${file} icon missing on disk: ${icon.src}`);
    }
  }
});

test('deepsyq.js, account-settings.html, and sw.js restore PWA registration and install prompt', () => {
  const deepsyqJs = fs.readFileSync(path.join(ASSETS, 'deepsyq.js'), 'utf8');
  assert.match(deepsyqJs, /navigator\.serviceWorker\.register\('\/sw\.js'/);
  assert.match(deepsyqJs, /addEventListener\('beforeinstallprompt'/);

  const accountHtml = fs.readFileSync(path.join(ASSETS, 'account-settings.html'), 'utf8');
  assert.match(accountHtml, /id="installPwaBtn"/);
  assert.match(accountHtml, /navigator\.serviceWorker\.register\('\/sw\.js'/);
  assert.match(accountHtml, /addEventListener\('beforeinstallprompt'/);

  const swJs = fs.readFileSync(path.join(ASSETS, 'sw.js'), 'utf8');
  assert.match(swJs, /'\/deepsyq\.webmanifest'/);
  assert.match(swJs, /Promise\.allSettled/);
});

test('DeepSyQ vs DeepSeek, AI Apps, homepage JSON-LD and www 301 canonicalization are valid', () => {
  for (const file of ['deepsyq.html', 'index.html', 'deepsyq-vs-deepseek.html', 'ai-apps.html']) {
    const html = fs.readFileSync(path.join(ASSETS, file), 'utf8');
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    assert.ok(match, `${file} must include JSON-LD`);
    const parsed = JSON.parse(match[1]);
    assert.equal(parsed['@context'], 'https://schema.org');
  }
  const home = fs.readFileSync(path.join(ASSETS, 'deepsyq.html'), 'utf8');
  assert.match(home, /"alternateName":\s*\[/);
});
