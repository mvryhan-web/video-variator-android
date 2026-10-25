import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../app/src/main/assets/',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const publicPages=['ai-apps.html','generate-studio.html','contact.html','cookie.html','refund.html','terms.html','deepsyq-vs-deepseek.html','design-gallery.html','deepsyq.html','pricing.html'];
const publicScripts=['everyday-tools-visual.js','home-credit-store.js'];
test('one public Pricing route, including credits and private wallet anchors',()=>{
 for(const name of [...publicPages,...publicScripts])assert.doesNotMatch(read(name),/ai-pricing\.html(?:#\w+)?/,name+' has obsolete public pricing target');
 const canonical=read('pricing.html');
 for(const id of ['plans','credits','wallet','walletEntry','walletSection','walletSummary','walletHistory','welcomeCredits','authModal'])assert.match(canonical,new RegExp('id="'+id+'"'));
 assert.match(canonical,/id="wallet"/);
 assert.match(canonical,/class="price-wallet-link" href="pricing\.html#wallet"/);
 assert.match(canonical,/Video &amp; Everyday Tools/);
 assert.match(read('ai-apps.html'),/href="pricing\.html#credits"/);
 assert.match(read('home-credit-store.js'),/pricing\.html#credits/);
 assert.match(read('ai-pricing.html'),/location\.replace\(destination\.href\)/);
 assert.doesNotMatch(read('ai-pricing.html'),/src="ai-pricing\.js"/);
});
test('legacy deep links remain compatible but cannot load old second checkout',()=>{
 const redirect=read('ai-pricing.html');
 for(const pair of ["'#toolPlans':'#plans'","'#trialOffer':'#plans'","'#aiCreditSection':'#credits'","'#walletSection':'#wallet'"])assert.ok(redirect.includes(pair),pair);
 assert.doesNotMatch(redirect,/<form|\/api\/billing\/checkout|\/api\/ai-billing\/checkout/);
});
test('new wallet is account-scoped and does not persist private totals',()=>{
 const src=read('pricing-wallet.js');
 for(const pattern of [/AbortController/,/s\.token===currentToken/,/s\.epoch===epoch/,/pagehide/,/pageshow/,/visibilitychange/,/replaceChildren/,/privateJson\('\/api\/ai-wallet\/balance'/,/privateJson\('\/api\/ai-wallet\/history'/])assert.match(src,pattern);
 assert.doesNotMatch(src,/sessionStorage\.setItem|localStorage\.setItem|innerHTML/);
 const js=read('pricing-page.js');
 assert.match(js,/deepsyq:open-pricing-auth/);
 assert.match(js,/\/api\/billing\/checkout/);
 assert.match(js,/\/api\/ai-billing\/checkout/);
 assert.match(js,/annual checkout is not available/);
});
