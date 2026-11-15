import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const page=fs.readFileSync(path.join(root,"app/src/main/assets/video-sur-mesure.html"),"utf8");
const htmlWithoutScripts=page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"");
const visibleHtml=htmlWithoutScripts.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,"");

test("Preserves all initial promotional samples but without a fixed visible gallery size",()=>{
 const clips=[...page.matchAll(/file:"(https:\/\/[^"]+\/media\/showcase-20261115\/[^"]+\.mp4)"/g)].map(m=>m[1]);
 assert.equal(clips.length,19);assert.equal(new Set(clips).size,19);
 assert.doesNotMatch(visibleHtml,/\b19\s+(styles|vidéos|videos|réalisations)\b/i);
 assert.doesNotMatch(visibleHtml,/\(1 à 19\)/);
 assert.match(visibleHtml,/id="videoGallery"><\/div>/);
});
test("Contains desktop and mobile premium systems and correct order integration selectors",()=>{
 for(const item of ['deepsyq-premium-v1','premiumMenuToggle','premiumMobileMenu','carousel-stage','videoGallery','premium-faq-grid','premium-trust','stripeCheckoutBtn','customStudioConfigurator','csLiveTotal','acceptTerms','mobile-sticky-bar'])assert.ok(page.includes(item),item);
 assert.match(page,/min-width:0/);assert.match(page,/@media\(max-width:530px\)/);
 assert.match(page,/fetch\("\/api\/sales\/orders\/checkout"/);
 assert.match(page,/prefers-reduced-motion/);
 assert.match(page,/<meta name="robots" content="noindex,nofollow">/);
});
test("CSS preserves source aspect ratio for current portrait samples and future landscape content",()=>{
 assert.match(page,/data-video-orientation="portrait"/);
 assert.match(page,/loadedmetadata/);
 assert.match(page,/video\.videoHeight>video\.videoWidth/);
});
test("Inline scripts parse correctly",()=>{
 const scripts=[...page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);assert.ok(scripts.length>=3);
 scripts.forEach((s,i)=>assert.doesNotThrow(()=>new vm.Script(s,{filename:"inline-"+i+".js"})));
});
