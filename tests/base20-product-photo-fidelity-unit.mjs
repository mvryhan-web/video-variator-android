import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildProductVideoPrompt} from '../app/src/main/assets/product-video-prompt.mjs';

test('BASE20: exact product/photo-only guardrails and realistic Etsy story are present',()=>{
 const prompt=buildProductVideoPrompt({productName:'Gift sweater',style:'lifestyle',ratio:'1:1',duration:'about 8 seconds',photoCount:2});
 for(const marker of ['EXACT product','ONLY source of truth','print/graphic','PRINT ON FABRIC','OMIT any unseen back','waterproofing','ACTUAL visible print','natural movement','realistic anatomy','No stock substitute','Etsy/e-commerce','Frame: 1:1','Duration preference: about 8 seconds','2 uploaded product-photo references']){
  assert.ok(prompt.includes(marker),'Missing safeguard: '+marker);
 }
 assert.ok(prompt.length<=2000);
});
test('BASE20: no invention of owner logo and safe optional-logo overlay boundary',()=>{
 const noLogo=buildProductVideoPrompt();
 const logo=buildProductVideoPrompt({hasLogo:true});
 assert.match(noLogo,/No logos or brand names may be invented/);
 assert.match(logo,/never add it to the garment/);
 assert.ok(!noLogo.includes('distinct ad overlay'));
});
test('BASE20: name treated as user-provided description, sanitized and bounded',()=>{
 const payload='A\nBrand\tClaim'+ 'Q'.repeat(400);
 const brief=buildProductVideoPrompt({productName:payload});
 assert.ok(brief.includes('Customer-entered product name:'));
 assert.ok(brief.includes('This name does not prove a visible label or brand'));
 assert.ok(!brief.includes('A\nBrand'));
 assert.ok(!brief.includes('Q'.repeat(200)));
 assert.ok(brief.length<=2000);
});
test('BASE20: unsupported editor settings fail back to known local options without new claims',()=>{
 const brief=buildProductVideoPrompt({style:'inject fake logos',ratio:'9:39',duration:'2 hours',photoCount:90});
 assert.match(brief,/Art direction: clean studio/);
 assert.match(brief,/Frame: 9:16/);
 assert.match(brief,/Duration preference: selected model duration/);
 assert.match(brief,/same exact product consistent across all 3 uploaded product-photo references/); // Explicitly clamp bad external counts to the local three-photo limit.
});
