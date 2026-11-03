import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const read=p=>readFileSync(p);
const repo=path.resolve('.');
const lock=JSON.parse(read('docs/PRICING_OWNER_ART_LOCK.json'));
const sha1=data=>createHash('sha1').update('blob '+data.length+'\\0'.replace('\\0','\0')).update(data).digest('hex');
const kept=['credit1000','credit10000','credit100000','credit1000000','credit10000000','creditHero'];
test('Only the six AI Credits images are retained at exact, previously locked bytes',()=>{
 assert.deepEqual(Object.keys(lock.assets),kept);
 for(const key of kept){
  const x=lock.assets[key];const p='app/src/main/assets/media/pricing/'+x.filename;
  assert.ok(existsSync(p),'missing protected AI Credits image: '+key);
  const bytes=read(p);assert.equal(bytes.length,x.bytes,key);
  assert.equal(sha1(bytes),x.gitBlobSha1,'AI Credits image changed: '+key);
 }
});
test('Owner-rejected Pricing images are deleted and never referenced in live page files',()=>{
 const js=read('app/src/main/assets/pricing-page.js').toString();
 const css=read('app/src/main/assets/pricing-page.css').toString();
 const html=read('app/src/main/assets/pricing.html').toString();
 assert.equal(lock.blockedAssetNames.length,6);
 for(const file of lock.blockedAssetNames){
  assert.ok(!existsSync('app/src/main/assets/media/pricing/'+file),'rejected photo remains: '+file);
  assert.ok(!js.includes(file),'rejected photo in JS: '+file);
  assert.ok(!css.includes(file),'rejected photo in CSS: '+file);
 }
 assert.match(js,/const picture=node\('div','price-plan-picture'\);/);
 assert.doesNotMatch(js,/picture\.append\(img\(p\.key\)\)/);
 assert.ok(html.includes('id="planCards"'));assert.ok(html.includes('id="creditCards"'));
});
test('AI Credits mapping and safe fallback are preserved',()=>{
 const js=read('app/src/main/assets/pricing-page.js').toString();
 assert.match(js,/const cdn='media\/pricing\/'/);
 assert.match(js,/Object\.freeze\(art\)/);
 assert.match(js,/fallbackTried=true/);
 assert.match(js,/const originalOwnerCdn='https:\/\/d2ol7oe51mr4n9\.cloudfront\.net\/user_3DohHzQ92OwE6TBQr5M2fYm2CwS\/'/);
 for(const k of kept)assert.ok(js.includes(k+":'"+lock.assets[k].filename+"'"));
 assert.match(js,/card\.append\(img\(p\.image\)\)/);
});
test('Pricing AI Credits static banner and approved HTML remain locked',()=>{
 const html=read('app/src/main/assets/pricing.html');
 const css=read('app/src/main/assets/pricing-page.css');
 const cssText=css.toString();
 assert.equal(sha1(html),lock.layout.htmlGitBlobSha1);
 assert.equal(sha1(css),lock.layout.cssGitBlobSha1);
 assert.ok(cssText.includes('--price-hero-art:none'));
 assert.ok(cssText.includes('--price-credit-hero-art:url("media/pricing/'+lock.assets.creditHero.filename+'?v=owner-20261103-restore-24-25-v4")'));
 assert.match(cssText,/var\(--price-credit-hero-art\)/);
});
