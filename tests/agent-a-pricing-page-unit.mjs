import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const root=new URL('../app/src/main/assets/',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const html=read('pricing.html'),js=read('pricing-page.js'),css=read('pricing-page.css');
const home=read('deepsyq.html');
test('dedicated scrollable pricing page has 5 subscription plans and separate 5 AI credit proposals',()=>{
 assert.match(html,/id="planCards"/);assert.match(html,/id="creditCards"/);
 assert.match(html,/Power Your Creativity/);assert.match(html,/AI Credits/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(css,/\.price-credit-card:nth-child\(4\),\.price-credit-card:nth-child\(5\)\{grid-column:span 3/);
 assert.match(js,/trial:'d72f2da8/);
 for(const key of ['trial','basic','pro','business','lifetime','credit1000','credit10000','credit100000','credit1000000','credit10000000','hero','creditHero'])assert.match(js,new RegExp(key+":'[a-z0-9-]+\\.png'"),'Missing asset '+key);
 assert.equal((js.match(/\.png'/g)||[]).length,12,'All twelve owner-generated images assigned exactly once');
});
test('server config, original checkout endpoints and no false wallet credit claims',()=>{
 assert.match(js,/await api\('\/api\/config'\)/);
 assert.match(js,/await api\('\/api\/ai-billing\/config'\)/);
 assert.match(js,/validPlanPrice/);assert.match(js,/validAiPack/);assert.match(js,/aiCheckoutMode/);
 assert.match(js,/\/api\/billing\/checkout/);assert.match(js,/\/api\/ai-billing\/checkout/);
 assert.match(js,/body:JSON\.stringify\(\{sku:pack\.sku,requestId:/);
 assert.match(js,/if\(!isValidCheckoutURL\(d\.url\)\)/);
 assert.match(js,/button\.disabled=p\.proposed\|\|!config\?\.billingConfigured\|\|!verified/);
 assert.match(js,/button\.type='button';button\.disabled=!valid/);
 assert.match(js,/bonus is not included/i);
});
test('no fake credit allocation for Trial and Lifetime; lifecycle guards retain account isolation',()=>{
 assert.match(js,/Included credits: to be confirmed/);
 assert.match(js,/Tool credits: see current terms/);
 assert.match(js,/AI generation credits sold separately/);
 assert.match(js,/accountEpoch\+\+/);
 assert.match(js,/if\(!current\(scope\)\)return/);
 assert.match(js,/creditRequestIds\.clear\(\)/);
});
test('original Home remains in place while explicit standalone Pricing entry is added',()=>{
 assert.match(html,/script defer src="deepsyq-site-shell\.js"/);
 assert.match(html,/deepsyq-logo\.png/);
 assert.ok(home.includes('id="pricing"')||home.includes('id="homeMonthlyPlans"'));
});
