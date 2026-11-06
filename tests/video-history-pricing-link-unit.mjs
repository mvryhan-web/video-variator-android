import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../app/src/main/assets/'+name,import.meta.url),'utf8');
const creator=read('creator-pages.js');
const pricing=read('pricing.html');
const video=read('index.html');

test('Video History Compare Plans opens canonical Pricing, not old in-app Plans',()=>{
 assert.ok(video.includes('id="historyView"'),'Existing History page remains');
 assert.ok(video.includes('src="creator-pages.js"'),'Video Uniquifier loads the CTA builder');
 assert.ok(creator.includes("callout($('#historyView'),c.nextTitle,c.nextText)"),'History retains CTA');
 assert.ok(creator.includes("function plansLink(parent){return link(parent,c.plans,'pricing.html#plans');}"),'Compare Plans uses canonical Pricing');
 assert.ok(!creator.includes('index.html#plans')&&!creator.includes('data-creator-destination="plans"')&&!creator.includes("creatorDestination='plans'"),'Legacy links and intercepted navigation are gone');
 assert.ok(pricing.includes('<section class="price-plans-area" id="plans"'),'Current plans anchor exists');
 assert.ok(pricing.includes('id="priceBillingMonthly"')&&pricing.includes('id="priceBillingYearly"'),'Current billing toggles remain');
});
