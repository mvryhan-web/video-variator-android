import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>readFileSync(path);
const lock=JSON.parse(read('docs/PRICING_OWNER_ART_LOCK.json'));
const gitBlobSha=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const keys=['trial','basic','pro','business','lifetime','credit1000','credit10000','credit100000','credit1000000','credit10000000','hero','creditHero'];
test('owner D23 restored 12 ORIGINAL image blobs with matching Git byte hashes',()=>{
 assert.deepEqual(Object.keys(lock.assets),keys);assert.deepEqual(lock.blockedAssetNames,[]);
 for(const key of keys){
  const meta=lock.assets[key],path='app/src/main/assets/media/pricing/'+meta.filename;
  assert.ok(existsSync(path),'missing '+key);const bytes=read(path);
  assert.equal(bytes.length,meta.bytes,key+' size');assert.equal(gitBlobSha(bytes),meta.gitBlobSha1,key+' Git blob hash');
 }
});
test('owner image mapping covers 5 plans, 2 heroes and 5 AI-credit packs',()=>{
 const js=read('app/src/main/assets/pricing-page.js').toString();
 const css=read('app/src/main/assets/pricing-page.css').toString();
 const html=read('app/src/main/assets/pricing.html').toString();
 for(const key of keys)assert.ok(js.includes(key+":'"+lock.assets[key].filename+"'"),key+' mapping');
 for(const phrase of ['picture.append(img(p.key))','card.append(img(p.image))',"['hero','--price-hero-art']","['creditHero','--price-credit-hero-art']",'fallbackTried=true'])assert.ok(js.includes(phrase),phrase);
 for(const key of ['hero','creditHero'])assert.ok(css.includes(lock.assets[key].filename),key+' CSS image');
 for(const id of ['planCards','creditCards','wallet'])assert.ok(html.includes('id="'+id+'"'));
 for(const api of ['/api/billing/checkout','/api/ai-billing/checkout','No payment was taken'])assert.ok(js.includes(api));
});
test('approved Pricing HTML and CSS immutable in owner lock',()=>{
 assert.equal(gitBlobSha(read('app/src/main/assets/pricing.html')),lock.layout.htmlGitBlobSha1);
 assert.equal(gitBlobSha(read('app/src/main/assets/pricing-page.css')),lock.layout.cssGitBlobSha1);
});
test('Everyday Tools original October 23 image and right crop are preserved',()=>{
 const js=read('app/src/main/assets/everyday-tools-visual.js').toString();
 const css=read('app/src/main/assets/everyday-tools-visual.css').toString();
 assert.ok(js.includes('media/approved-design-20261023/09_Everyday_Tools.png'));
 assert.ok(js.includes("crop([695,61,703,242],'et-hero-art')"));
 assert.ok(css.includes('.et-hero-art{right:0;left:auto;top:0;width:min(58%,703px);height:100%;object-fit:contain;opacity:1;image-rendering:auto}'));
 assert.ok(!css.includes('.et-hero-art{left:0;width:100%;height:100%'));
});
