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
 const clips=[...page.matchAll(/file:"(https:\/\/[^"]+\/media\/showcase-20261115(?:\/|-)[^"]+\.mp4)"/g)].map(m=>m[1]);
 assert.equal(clips.length,19);assert.equal(new Set(clips).size,19);
 assert.doesNotMatch(visibleHtml,/\b19\s+(styles|vidéos|videos|réalisations)\b/i);
 assert.doesNotMatch(visibleHtml,/\(1 à 19\)/);
 assert.match(visibleHtml,/id="videoGallery"><\/div>/);
});
test("Contains desktop and mobile premium systems and correct order integration selectors",()=>{
 for(const item of ['deepsyq-premium-v1','premiumMenuToggle','premiumMobileMenu','carousel-stage','videoGallery','premium-faq-grid','premium-trust','stripeCheckoutBtn','customStudioConfigurator','csLiveTotal','acceptTerms'])assert.ok(page.includes(item),item);
 assert.match(page,/min-width:0/);assert.match(page,/@media\(max-width:530px\)/);
 assert.match(page,/fetch\("\/api\/sales\/orders\/checkout"/);
 assert.match(page,/prefers-reduced-motion/);
 assert.match(page,/<meta name="robots" content="noindex,nofollow">/);
});
test("Landscape preview plays the villa hero video automatically",()=>{
 const hero=visibleHtml.slice(visibleHtml.indexOf('id="landscapePreview"'),visibleHtml.indexOf('<hr class="rule">'));
 assert.match(hero,/16:9/);
 assert.doesNotMatch(hero,/poster=/);
 assert.match(hero,/<video\b[^>]*class="villa-hero"[^>]*autoplay[^>]*muted[^>]*loop[^>]*>[\s\S]*sales-villa-hero\.mp4/);
 assert.equal((visibleHtml.match(/<video\b/g)||[]).length,2);
 assert.match(visibleHtml,/<video id="spotlightVideo"[^>]*sales-studio-intro\.mp4/);
 assert.match(visibleHtml,/id="spotlightPoster"/);
});
test("Inline scripts parse correctly",()=>{
 const scripts=[...page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);assert.ok(scripts.length>=3);
 scripts.forEach((s,i)=>assert.doesNotThrow(()=>new vm.Script(s,{filename:"inline-"+i+".js"})));
});

test("Wide showcase, vertical Shorts and packages are distinct and ordered",()=>{
 const wide=page.indexOf('id="spotlightPoster"');
 const shorts=page.indexOf('id="shorts"');
 const pricing=page.indexOf('id="tarifs"');
 const landscape=page.indexOf('id="landscapePreview"');
 assert.ok(landscape>0&&landscape<wide&&wide<shorts&&shorts<pricing);
 assert.match(page,/\.shorts \.poster\{aspect-ratio:9\/16!important/);
 assert.match(page,/setOrderFormat\("9:16"\)/);
 assert.match(page,/setOrderFormat\("16:9"\)/);
 assert.equal((visibleHtml.match(/id="stripeCheckoutBtn"/g)||[]).length,1);
 assert.doesNotMatch(visibleHtml,/class="mobile-sticky-bar"/);
});

test("The existing checkout gets the selected style and format without duplicate requests",async()=>{
 const start=page.indexOf("// Stripe Checkout Button Handler");
 const end=page.indexOf("// Honest mailto submission fallback",start);
 assert.ok(start>0&&end>start);
 const nodes=new Map();
 const get=id=>{
   if(!nodes.has(id))nodes.set(id,{value:"",textContent:"",checked:true,reportValidity:()=>true});
   return nodes.get(id);
 };
 const button=get("stripeCheckoutBtn");
 let click;
 button.addEventListener=(type,fn)=>{assert.equal(type,"click");click=fn;};
 get("videoFormat").value="9:16";
 get("company").value="Test Hotel";
 get("email").value="owner@example.invalid";
 get("packageSelect").value="medium";
 const location={href:""};
 let respond, calls=0;
 vm.runInNewContext(page.slice(start,end),{
   document:{getElementById:id=>id==="trackOrderInput"?null:get(id)},
   state:{selectedSlot:19,lang:"fr",currency:"EUR",selectedAddons:new Set()},
   selectedServices:()=>new Set(),
   checkoutPackage:pkg=>pkg,
   window:{location},
   fetch:(route,options)=>{
     calls++;
     assert.equal(route,"/api/sales/orders/checkout");
     const body=JSON.parse(options.body);
     assert.equal(body.showcaseSlot,19);
     assert.equal(body.videoFormat,"9:16");
     assert.equal(body.packageCode,"medium");
     return new Promise(resolve=>{respond=resolve;});
   }
 });
 const submitting=click({currentTarget:button});
 await click({currentTarget:button});
 assert.equal(calls,1);
 respond({ok:true,json:async()=>({ok:true,orderNumber:"TEST",checkoutUrl:"https://checkout.stripe.com/example"})});
 await submitting;
 assert.equal(location.href,"https://checkout.stripe.com/example");
});
