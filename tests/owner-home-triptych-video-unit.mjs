import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page=readFileSync(new URL('../app/src/main/assets/deepsyq.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/src/main/assets/home-triptych-video.css',import.meta.url),'utf8');
const links=[
  ['canvas','#canvasFeature','media/home/neon-20261018/canvas.webp','9d600e7b-c4df-4243-8fd4-4aa7481727de.mp4','Open Canvas →'],
  ['agent','#agentFeature','media/home/neon-20261018/agent.webp','e664fa80-1392-4c01-8a12-b4362ab97c2a.mp4','Explore Agent →'],
  ['apps','ai-apps.html','media/home/neon-20261018/apps.webp','036cbcc3-b677-4182-8e7a-e2ad50baec52.mp4','Explore AI Apps →'],
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
