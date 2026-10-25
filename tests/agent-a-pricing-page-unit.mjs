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
 assert.match(js,/button\.disabled=!p\.proposed&&\!verified/);
 assert.match(js,/Check Trial availability/);
 assert.match(js,/Trial is not available yet/);
 assert.match(js,/if\(!scope\.token\)\{openAuth\(\);return;\}/);
 assert.match(js,/if\(!toolBillingConfigured\)/);
 assert.match(js,/price-credit-purchase/);
 assert.match(js,/if\(!token\(\)\)\{openAuth\(\);return;\}/);
 assert.match(js,/if\(!valid\)\{/);
 assert.match(js,/No payment was taken/);
 assert.doesNotMatch(js,/button\.disabled=!valid/);
 assert.doesNotMatch(js,/bonus is not included/i);
});
test('no fake credit allocation for Trial and Lifetime; lifecycle guards retain account isolation',()=>{
 assert.match(js,/Credits and included access: to be confirmed/);
 assert.match(js,/Tool credits: see current terms/);
 assert.match(js,/Lifetime does not include unlimited paid AI generation/);
 assert.match(js,/accountEpoch\+\+/);
 assert.match(js,/if\(!current\(scope\)\)return/);
 assert.match(js,/creditRequestIds\.clear\(\)/);
});
test('original Home remains in place while explicit standalone Pricing entry is added',()=>{
 assert.match(html,/script defer src="deepsyq-site-shell\.js"/);
 assert.match(html,/deepsyq-logo\.png/);
 assert.ok(home.includes('id="pricing"')||home.includes('id="homeMonthlyPlans"'));
});

test('original account modal and wider Pricing feature matrix are present without imaginary entitlements',()=>{
 assert.match(html,/id="authModal"/);assert.match(html,/script defer src="auth-email\.js"/);
 assert.match(html,/accounts\.google\.com\/gsi\/client/);
 assert.match(js,/api\('\/api\/auth\/google'/);
 assert.match(js,/One account for your plan, credits and history/);
 assert.match(js,/Watermark removal: check the relevant tool terms/);
 assert.match(js,/Canvas workspace; AI generation requires paid credits/);
 assert.doesNotMatch(js,/Access to all models/);
 assert.match(css,/max-width:none;margin-inline:0/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});

test('annual quote toggle remains presentation-only, protects original billing and credit accounting',()=>{
 assert.match(html,/id="priceBillingMonthly"/);
 assert.match(html,/id="priceBillingYearly"/);
 assert.match(html,/80% Credit Bonus/);
 assert.match(js,/const annualPlanKeys=new Set\(\['basic','pro','business'\]\)/);
 assert.match(js,/Math\.round\(monthlyCents\*0\.8\)/);
 assert.match(js,/if\(billingPeriod==='yearly'&&annualPlanKeys\.has\(plan\)\)/);
 assert.match(js,/annual checkout is not available/);
 assert.match(js,/body:JSON\.stringify\(\{plan\}\)/);
 assert.match(js,/body:JSON\.stringify\(\{sku:pack\.sku,requestId:/);
 assert.doesNotMatch(js,/Design preview: tool checkout is not activated/);
 assert.match(css,/price-billing-switch/);
});

test('permanent owner ban on passive AI Credits fine print and unsupported bonus claims',()=>{
 const credits=html.slice(html.indexOf('<section class="price-credits-area"'),html.indexOf('</section>',html.indexOf('<section class="price-credits-area"')));
 for(const denied of ['price-credits-tagline','price-wallet-link','price-disclosure','Checking available AI credit packages','No AI credits are awarded'])assert.ok(!credits.includes(denied),'Forbidden credit-area copy: '+denied);
 for(const denied of ['price-credit-note','price-bonus-status','price-bonus-desc','price-bonus-count','p.bonus','bonus:200','bonus:3333','bonus:20000','bonus:200000','bonus:2000000'])assert.ok(!js.includes(denied),'Forbidden permanent credit-card microcopy/claim: '+denied);
 assert.match(js,/message\('creditStatus',''\)/);
 assert.match(js,/message\('creditStatus',checkoutErrorMessage\(e\.message\)\)/);
 assert.match(js,/\/api\/ai-billing\/checkout/);
 assert.match(css,/#creditStatus:empty\{display:none\}/);
 assert.match(css,/transform:scale\(1\.10\)/);
 assert.match(css,/transform-origin:50% 100%/);
});
