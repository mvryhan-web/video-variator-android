import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Public SEO and isolated DEV-preview privacy only. No production requests,
// Stripe, paid providers, migrations or real account sessions.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const assets=resolve(root,'app/src/main/assets');
const file=path=>readFile(resolve(assets,path),'utf8');
const origin='https://video-variator-android.onrender.com';
const links=xml=>[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const canonicalTags=html=>[...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi)].map(m=>m[0]);

test('only canonical public routes are in sitemap: no redirect, no noindex or private URLs',async()=>{
 const [sitemap,pricing,apps,legacy,robots]=await Promise.all([
  file('sitemap.xml'),file('pricing.html'),file('ai-apps.html'),file('ai-pricing.html'),file('robots.txt')
 ]);
 const urls=links(sitemap);
 assert.deepEqual(urls,[
  origin+'/',origin+'/deepsyq-vs-deepseek.html',
  origin+'/free-tools.html',origin+'/pricing.html'
 ]);
 assert.equal(new Set(urls).size,urls.length);
 for(const url of urls)assert.equal(new URL(url).origin,origin);
 assert.doesNotMatch(sitemap,/ai-apps\.html|ai-pricing\.html|product-video|deepsyq-admin|\/api\//i);
 assert.match(apps,/<meta name="robots" content="noindex,follow">/);
 assert.match(legacy,/<meta name="robots" content="noindex,follow">/);
 assert.match(legacy,/<link rel="canonical" href="pricing\.html">/);
 assert.match(legacy,/pricing-legacy-redirect\.js/);
 assert.equal(canonicalTags(pricing).length,1,'one public Pricing canonical only');
 assert.equal(canonicalTags(pricing)[0],'<link rel="canonical" href="'+origin+'/pricing.html">');
 assert.match(robots,/^Disallow: \/api\/\s*$/m);
 assert.match(robots,/^Disallow: \/deepsyq-admin\.html\s*$/m);
 assert.match(robots,new RegExp('^Sitemap: '+origin.replace(/\./g,'\\.')+'/sitemap\\.xml\\s*$','m'));
});

async function unusedLocalPort(){
 const socket=createServer();
 socket.listen(0,'127.0.0.1');
 await once(socket,'listening');
 const port=socket.address().port;
 await new Promise((ok,bad)=>socket.close(e=>e?bad(e):ok()));
 return port;
}
async function ready(base,child){
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw Error('PREVIEW_BOOT_FAILED');
  try{const response=await fetch(base+'/api/health');if(response.ok)return;}
  catch(_){/* local read-only preview may still be starting */}
  await new Promise(ok=>setTimeout(ok,90));
 }
 throw Error('LOCAL_PREVIEW_START_TIMEOUT');
}
test('real isolated preview HTTP stays noindex plus robots Disallow:/ for every static SEO route', {timeout:20000},async()=>{
 const port=await unusedLocalPort(),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,[resolve(root,'server/deepsyq-preview.js')],{
  cwd:root,env:{...process.env,PORT:String(port),NODE_ENV:'test',
   DATABASE_URL:'',STRIPE_SECRET_KEY:'',OPENAI_API_KEY:'',GEMINI_API_KEY:'',BYTEPLUS_API_KEY:''},
  stdio:'ignore'
 });
 try{
  await ready(base,child);
  for(const route of ['/','/sitemap.xml','/pricing.html','/ai-apps.html']){
   const response=await fetch(base+route,{redirect:'error'});
   assert.equal(response.status,200,route);
   assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow, noarchive',route);
   if(route==='/sitemap.xml')assert.ok((await response.text()).includes(origin+'/pricing.html'));
   if(route==='/pricing.html')assert.ok((await response.text()).includes('<link rel="canonical" href="'+origin+'/pricing.html">'));
  }
  const robots=await fetch(base+'/robots.txt');
  assert.equal(robots.status,200);
  assert.equal(robots.headers.get('x-robots-tag'),'noindex, nofollow, noarchive');
  assert.equal((await robots.text()).trim(),'User-agent: *\nDisallow: /');
 }finally{
  child.kill('SIGTERM');
  if(child.exitCode===null)await Promise.race([
   once(child,'exit').catch(()=>{}),new Promise(ok=>setTimeout(ok,1000))
  ]);
 }
});
