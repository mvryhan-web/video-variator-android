import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const path = file => new URL('../app/src/main/'+file, import.meta.url);
const text = file => readFileSync(path(file), 'utf8');
test('owner-approved exact Deepsyq logo is preserved',()=>{
  const b=readFileSync(path('assets/deepsyq-logo.png'));
  assert.equal(createHash('sha256').update(b).digest('hex'), 'c1d11ed2acdd509209557af6fc8224a3ef5c2325491be19cee0c6cf511dba710');
});
test('site uses approved logo and official install links',()=>{
  const html=text('assets/deepsyq.html');
  assert.equal((html.match(/src="deepsyq-logo.png"/g)||[]).length,2);
  assert.match(html,/href="deepsyq.webmanifest"/);
  assert.match(html,/href="favicon.ico"/);
  assert.match(html,/href="deepsyq-install-192.png"/);
  assert.doesNotMatch(html,/<span class="mark">d\.<\/span>/);
});
test('separate PWA preserves installed legacy Video Uniquifier identity',()=>{
  const pwa=JSON.parse(text('assets/deepsyq.webmanifest'));
  const old=JSON.parse(text('assets/manifest.webmanifest'));
  assert.equal(pwa.short_name,'Deepsyq');
  assert.equal(pwa.start_url,'/deepsyq.html');
  assert.equal(pwa.id,'/deepsyq');
  assert(pwa.icons.some(i=>i.purpose==='maskable'&&i.src==='deepsyq-install-512.png'));
  assert.equal(old.short_name,'Uniquifier');
});
test('Android adaptive launcher uses owner mark without renaming package',()=>{
  for(const x of ['ic_launcher.xml','ic_launcher_round.xml'])
    assert.match(text('res/mipmap-anydpi-v26/'+x), /@drawable\/deepsyq_adaptive_foreground/);
  assert.match(text('AndroidManifest.xml'),/android:label="Video Uniquifier"/);
  assert(readFileSync(path('res/drawable/deepsyq_adaptive_foreground.png')).length>10000);
});
