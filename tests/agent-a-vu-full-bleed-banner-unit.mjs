import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../app/src/main/assets/video-uniquifier-reference.css',import.meta.url),'utf8');
test('owner 2048x682 banner covers entire Video Uniquifier hero rather than stopping at 2/3',()=>{
  const fix=css.split('/* Owner fix 2026-10-25: fill the FULL hero width')[1];
  assert.ok(fix,'owner photo full-width rule must be present');
  assert.match(fix,/body\.vu-reference #dashboardView \.hero\.card/);
  assert.match(fix,/1998c564-8f28-4fd2-aaad-b19240a66d14\.png/);
  assert.match(fix,/background-size:100% 100%,cover,cover !important/);
  assert.match(fix,/background-position:center center,center center,center center !important/);
  assert.match(fix,/\.hero>\.vu-hero-image,\s*body\.vu-reference #dashboardView \.hero>\.vu-hero-films/);
  assert.match(fix,/display:none !important/);
  assert.doesNotMatch(fix,/\.sidebar|\.vu-side-nav|\.vu-appbar/);
});
