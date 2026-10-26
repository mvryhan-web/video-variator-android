import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root = new URL('../app/src/main/assets/', import.meta.url);
const html = readFileSync(new URL('deepsyq.html', root), 'utf8');
const css = readFileSync(new URL('home-everyday-art.css', root), 'utf8');
const names = ['compress-photos','audio-text','compress-video','avatar-studio','video-uniquifier'];

test('real generated WebP artwork exists and CSS references each exactly once', () => {
  for (const name of names) {
    const path = new URL('media/home-everyday-tools-owner-20261024/' + name + '.webp', root);
    const data = readFileSync(path);
    assert.ok(statSync(fileURLToPath(path)).size > 500, name + ': missing or empty asset');
    assert.equal(data.toString('ascii', 0, 4), 'RIFF', name + ': RIFF magic');
    assert.equal(data.toString('ascii', 8, 12), 'WEBP', name + ': WebP magic');
    const suffix = 'media/home-everyday-tools-owner-20261024/' + name + '.webp';
    assert.equal(css.split(suffix).length - 1, 1, name + ': CSS reference');
  }
});

test('illustration CSS only targets the owner-approved Home section', () => {
  assert.ok(html.includes('<link rel="stylesheet" href="home-everyday-art.css">'));
  for (const rule of css.matchAll(/(^|\n)([^\n{}]+)\s*\{/g)) {
    if (rule[2].trim().startsWith('@')) continue;
    assert.ok(rule[2].trim().startsWith('body.home-neon #everydayTools'), rule[2]);
  }
  assert.ok(!css.includes('home-triptych-video'));
});

test('existing four tool links and Video Uniquifier link remain unchanged', () => {
  const section = html.split('<section id="everydayTools"')[1]?.split('<section id="history"')[0];
  assert.ok(section, 'Everyday Tools section');
  const anchors = section.split('<div class="tool-grid">')[1]?.split('</div>')[0]?.match(/<a href="[^"]+"/g) ?? [];
  assert.deepEqual(anchors, ['<a href="free-tools.html"', '<a href="audio-studio.html"', '<a href="free-tools.html"', '<a href="avatar-studio.html"']);
  assert.match(section, /class="unique-tool" href="index\.html"/);
  assert.match(section, /See all tools →/);
  assert.equal(section.includes('Product Video'), false);
});
