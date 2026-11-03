import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets=path.join(repo,'app/src/main/assets');
const approved=JSON.parse(readFileSync(path.join(repo,'docs/PRICING_OWNER_ART_LOCK.json'),'utf8'));
const read=p=>readFileSync(path.join(repo,p));
const gitBlobSha1=data=>createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
const exact=['trial','basic','pro','business','lifetime','credit1000','credit10000',
 'credit100000','credit1000000','credit10000000','hero','creditHero'];

test('12 ORIGINAL owner-approved Pricing photos are locked by exact filename and BYTES (not decorative substitutes)',()=>{
 assert.equal(approved.schema,'deepsyq-pricing-owner-art-lock/v1');
 assert.deepEqual(Object.keys(approved.assets),exact);
 const seen=new Set();
 for(const key of exact){
  const {filename,gitBlobSha1:sha,bytes}=approved.assets[key];
  assert.match(filename,/^[a-f0-9-]{36}\.png$/,'Unexpected Pricing image for '+key);
  assert.ok(!seen.has(filename),'One original image must be used only once');
  seen.add(filename);
  const relative='app/src/main/assets/media/pricing/'+filename;
  assert.ok(existsSync(path.join(repo,relative)),'Original PNG missing: '+relative);
  const png=read(relative);
  assert.equal(png.length,bytes,'Owner artwork size unexpectedly changed: '+key);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Not a PNG: '+key);
  assert.equal(gitBlobSha1(png),sha,'PROTECTED OWNER ARTWORK ALTERED: '+key+'. Restore exact original bytes, do not generate another.');
 }
});

test('approved HTML/CSS layout is frozen; no agent may redesign Pricing without new owner instruction',()=>{
 const html=read('app/src/main/assets/pricing.html');
 const css=read('app/src/main/assets/pricing-page.css');
 assert.equal(gitBlobSha1(html),approved.layout.htmlGitBlobSha1,'OWNER-LOCKED Pricing HTML was changed');
 assert.equal(gitBlobSha1(css),approved.layout.cssGitBlobSha1,'OWNER-LOCKED Pricing layout CSS was changed');
 assert.match(html.toString('utf8'),/id="planCards"/);
 assert.match(html.toString('utf8'),/id="creditCards"/);
 assert.match(css.toString('utf8'),/var\(--price-hero-art\)/);
 assert.match(css.toString('utf8'),/var\(--price-credit-hero-art\)/);
});

test('Pricing renders exactly the approved image-to-plan mapping with same-origin primary and original CDN failover',()=>{
 const js=read('app/src/main/assets/pricing-page.js').toString('utf8');
 assert.match(js,/const cdn='media\/pricing\/'/);
 assert.match(js,/Object\.freeze\(art\)/);
 assert.match(js,/const approvedPath=key=>cdn\+art\[key\]/);
 assert.match(js,/fallbackTried=true/);
 assert.match(js,/const originalOwnerCdn='https:\/\/d2ol7oe51mr4n9\.cloudfront\.net\/user_3DohHzQ92OwE6TBQr5M2fYm2CwS\/'/);
 for(const key of exact){
  assert.ok(js.includes(key+":'"+approved.assets[key].filename+"'"),'Original '+key+' artwork mapping was changed');
 }
 assert.equal((js.match(/\.png'/g)||[]).length,12,'Expected all 12 original photos (no invented extra images)');
 assert.match(js,/root\.style\.setProperty\(cssVar/);
 assert.match(js,/i\.src=approvedPath\(key\)/);
 assert.match(js,/i\.src=originalOwnerCdn\+art\[key\]/);
 assert.doesNotMatch(js,/Math\.random\(\).*price|source\.unsplash|picsum\.photos/i);
});

test('Pricing owner-original four-portal hero survives slow JS and stale browser caches',()=>{
 const html=read('app/src/main/assets/pricing.html').toString('utf8');
 const css=read('app/src/main/assets/pricing-page.css').toString('utf8');
 const js=read('app/src/main/assets/pricing-page.js').toString('utf8');
 const version='owner-20261103-original-4-portals';
 assert.ok(html.includes('href="pricing-page.css?v='+version+'"'),'browser must fetch the approved latest CSS');
 assert.ok(html.includes('src="pricing-page.js?v='+version+'"'),'browser must fetch the latest approved image mapping');
 assert.ok(js.includes("const approvedArtVersion='"+version+"';"),'all 12 original images must refresh, not substitute');
 for(const [cssVar,key] of [['--price-hero-art','hero'],['--price-credit-hero-art','creditHero']]){
  assert.ok(css.includes(cssVar+':url("media/pricing/'+approved.assets[key].filename+'?v='+version+'")'),'static CSS must show exact owner '+key+' before JavaScript');
 }
 assert.match(css,/var\(--price-hero-art\)/,'original four-portal banner still uses owner image variable');
 assert.match(css,/var\(--price-credit-hero-art\)/,'original credit banner still uses owner image variable');
 assert.match(html,/Four glowing magical portals above a celestial staircase/);
 assert.equal((html.match(/<span>[^<]+<\/span>/g)||[]).filter(x=>/Professional AI Tools|Studio|Quality|Press Release/.test(x)).length,4,'keep four original hero frames/chips');
});
