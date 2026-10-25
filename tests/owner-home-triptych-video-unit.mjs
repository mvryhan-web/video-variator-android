import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const page=readFileSync(new URL('../app/src/main/assets/deepsyq.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/src/main/assets/home-triptych-video.css',import.meta.url),'utf8');
const links=[
  ['canvas','canvas.html','media/home/neon-20261018/canvas.webp','media/home/neon-20261018/canvas-card.mp4','Open Canvas →'],
  ['agent','#agentFeature','media/home/neon-20261018/agent.webp','media/home/neon-20261018/agent-card.mp4','Explore Agent →'],
  ['apps','ai-apps.html','media/home/neon-20261018/apps.webp','media/home/neon-20261018/apps-card.mp4','Explore AI Apps →'],
];
test('only the three approved Home spotlight cards receive real videos with native fallback',()=>{
  const html=page.slice(page.indexOf('<section class="home-feature-triptych"'),page.indexOf('</section>',page.indexOf('<section class="home-feature-triptych"'))+10);
  assert.match(page,/href="home-triptych-video.css"/);
  assert.equal((html.match(/<video /g)||[]).length,3);
  assert.equal((html.match(/<img /g)||[]).length,3);
  for (const [kind,href,poster,file,label] of links){
    const a=html.match(new RegExp('<a class="home-feature-spotlight home-spotlight-'+kind+'"[^>]*>[\\s\\S]*?<\\/a>'));
    assert.ok(a,'missing '+kind+' spotlight');
    assert.ok(a[0].includes('href="'+href+'"'));
    assert.ok(a[0].includes('<img src="'+poster+'"'));
    assert.ok(a[0].includes('poster="'+poster+'"'));
    assert.ok(a[0].includes(file));
    assert.ok(a[0].includes(label));
    assert.match(a[0],/<video[^>]*autoplay[^>]*muted[^>]*loop[^>]*playsinline/);
    assert.match(a[0],/aria-hidden="true"/);
  }
});
test('video never blocks card links or owner gradients and respects reduced motion',()=>{
  assert.match(css,/pointer-events:\s*none/);
  assert.match(css,/object-fit:\s*cover/);
  assert.match(css,/z-index:\s*-2/);
  assert.match(css,/prefers-reduced-motion:\s*reduce/);
  assert.match(css,/display:\s*none/);
});

test('all three owner-uploaded original full-HD videos are actually bundled on the same origin',()=>{
  const assets=[
    ['canvas-card.mp4',5476640,'e6a4659e52ec7fe3569d7113f8601f32b44cc5f60f32396ea0dd2921ee7d438b'],
    ['agent-card.mp4',4688470,'9e25f6958ec201a632835701f76c182639db134abc78266f8a4029b72cf4ed08'],
    ['apps-card.mp4',3114875,'e94f31b4864da28e3bd355532bf5b0ac53db3150ae281cff881bcf8d8810048c'],
  ];
  for(const [file,size,sha] of assets){
    const url=new URL('../app/src/main/assets/media/home/neon-20261018/'+file,import.meta.url);
    assert.equal(statSync(url).size,size,file+' must contain the complete original video');
    assert.equal(createHash('sha256').update(readFileSync(url)).digest('hex'),sha,file+' must match owner uploaded bytes');
  }
  assert.ok(!page.includes('cloudfront.net'),'live Home must not depend on third-party media origin');
});
