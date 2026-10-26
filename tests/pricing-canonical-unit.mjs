import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
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
 assert.ok(canonical.includes('class="price-wallet-link" href="pricing.html#wallet"'));
 assert.match(canonical,/Video &amp; Everyday Tools/);
 assert.match(read('ai-apps.html'),/href="pricing\.html#credits"/);
 assert.match(read('home-credit-store.js'),/pricing\.html#credits/);
 assert.ok(read('ai-pricing.html').includes('<script src="pricing-legacy-redirect.js"></script>'));
 assert.ok(!read('ai-pricing.html').includes('<script>'),'Production CSP disallows inline JavaScript');
 assert.ok(read('pricing-legacy-redirect.js').includes('location.replace(destination.href)'));
 assert.doesNotMatch(read('ai-pricing.html'),/src="ai-pricing\.js"/);
});
test('legacy deep links remain compatible but cannot load old second checkout',()=>{
 const redirect=read('ai-pricing.html');
 const redirectSource=read('pricing-legacy-redirect.js');
 for(const pair of ["'#toolPlans':'#plans'","'#trialOffer':'#plans'","'#aiCreditSection':'#credits'","'#walletSection':'#wallet'"])assert.ok(redirectSource.includes(pair),pair);
 assert.doesNotMatch(redirect,/<form|\/api\/billing\/checkout|\/api\/ai-billing\/checkout/);
});
test('new wallet is account-scoped and does not persist private totals',()=>{
 const src=read('pricing-wallet.js');
 for(const pattern of [/AbortController/,/s\.token===currentToken/,/s\.epoch===epoch/,/pagehide/,/pageshow/,/visibilitychange/,/replaceChildren/,/privateJson\('\/api\/ai-wallet\/balance'/,/privateJson\('\/api\/ai-wallet\/history'/])assert.match(src,pattern);
 assert.doesNotMatch(src,/sessionStorage\.setItem|localStorage\.setItem|innerHTML/);
 assert.doesNotMatch(src,/\/api\/ai-wallet\/welcome/,'Free AI welcome claims remain disallowed by owner');
 assert.match(src,/Owner decision D01\/D04/);
 const js=read('pricing-page.js');
 assert.match(js,/deepsyq:open-pricing-auth/);
 assert.match(js,/\/api\/billing\/checkout/);
 assert.match(js,/\/api\/ai-billing\/checkout/);
 assert.match(js,/annual checkout is not available/);
});

test('legacy Pricing redirect executes under strict same-origin script CSP and preserves bookmarks',()=>{
 const source=read('pricing-legacy-redirect.js');
 const cases=[
  ['#trialOffer','https://deepsyq.example/pricing.html?utm_source=old-link#plans'],
  ['#toolPlans','https://deepsyq.example/pricing.html?utm_source=old-link#plans'],
  ['#aiCreditSection','https://deepsyq.example/pricing.html?utm_source=old-link#credits'],
  ['#aiPacks','https://deepsyq.example/pricing.html?utm_source=old-link#credits'],
  ['#walletSection','https://deepsyq.example/pricing.html?utm_source=old-link#wallet'],
  ['#welcomeCredits','https://deepsyq.example/pricing.html?utm_source=old-link#wallet'],
  ['#pricing','https://deepsyq.example/pricing.html?utm_source=old-link#plans'],
  ['#unrecognized','https://deepsyq.example/pricing.html?utm_source=old-link']
 ];
 for(const [hash,expected] of cases){
  let actual='';
  const location={
   href:'https://deepsyq.example/ai-pricing.html?utm_source=old-link'+hash,
   search:'?utm_source=old-link',hash,
   replace:url=>{actual=url;}
  };
  runInNewContext(source,{URL,location});
  assert.equal(actual,expected,'legacy hash '+hash);
 }
});
