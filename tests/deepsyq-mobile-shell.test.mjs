import test from 'node:test';
import assert from 'node:assert/strict';
import {drawerSwipe} from '../app/src/main/assets/deepsyq-mobile-shell.js';

test('only a deliberate horizontal edge swipe opens the menu',()=>{
  const start={x:10,y:100,time:0};
  assert.equal(drawerSwipe(start,{x:110,y:115,time:250},false,300),'open');
  assert.equal(drawerSwipe({...start,x:100},{x:210,y:115,time:250},false,300),null);
  assert.equal(drawerSwipe(start,{x:110,y:220,time:250},false,300),null);
  assert.equal(drawerSwipe(start,{x:110,y:115,time:1500},false,300),null);
  assert.equal(drawerSwipe(null,{x:110,y:115,time:250},false,300),null);
});
test('left swipe closes only from inside the drawer; taps and scrolling do not',()=>{
  assert.equal(drawerSwipe({x:200,y:100,time:0},{x:100,y:110,time:250},true,300),'close');
  assert.equal(drawerSwipe({x:350,y:100,time:0},{x:100,y:110,time:250},true,300),null);
  assert.equal(drawerSwipe({x:200,y:100,time:0},{x:190,y:110,time:250},true,300),null);
  assert.equal(drawerSwipe({x:200,y:100,time:0},{x:100,y:200,time:250},true,300),null);
});

test('existing session switches account control to the profile in all supported languages', async()=>{
 const {headerAccount}=await import('../app/src/main/assets/deepsyq-mobile-shell.js');
 assert.deepEqual(headerAccount('','en'),{label:'Log in',href:'deepsyq.html?panel=login'});
 for(const [lang,label]of Object.entries({en:'Account',ru:'Аккаунт',fr:'Compte',es:'Cuenta'}))assert.deepEqual(headerAccount('session-present',lang),{label,href:'index.html?view=profile'});
});

test('Owner header swap: Credit replaces only upper AI Apps and Tour moves right, no dash',async()=>{
 const {readFile}=await import('node:fs/promises');
 const src=new URL('../app/src/main/assets/',import.meta.url);
 const mobile=await readFile(new URL('deepsyq-mobile-shell.js',src),'utf8');
 const unified=await readFile(new URL('deepsyq-unified-platform-header.js',src),'utf8');
 const css=await readFile(new URL('deepsyq-mobile-shell.css',src),'utf8');
 assert.doesNotMatch(mobile,/link\('✦ AI Apps'/);
 assert.match(mobile,/link\('AI Credit','pricing.html#credits','ds-header-credit'\)/);
 assert.doesNotMatch(mobile,/AI credits: —|right\.prepend\(balance\)|left\.append\(apps\)/);
 assert.match(mobile,/left\.append\(balance\)/);
 assert.match(mobile,/move\(tools, left\); move\(tour, right\); move\(pricing, right\)/);
 assert.match(mobile,/guide\.startJarvixGuidedTour\(\)/);
 assert.match(unified,/left\.append/);
 assert.match(unified,/right\.append/);
 assert.doesNotMatch(unified,/AI Credits: —|credits\+': —'/);
 assert.match(css,/\.ds-mobile-control-left \.ds-header-credit/);
 assert.match(css,/white-space:nowrap!important/);
 assert.match(css,/\.ds-mobile-control-right #dsTakeTour\{/);
 assert.match(css,/position:static!important;inset:auto!important/);
});

test('owner web header swap and single-line Russian Tour remain style-only',async()=>{
 const {readFile}=await import('node:fs/promises');
 const src=new URL('../app/src/main/assets/',import.meta.url);
 const mobile=await readFile(new URL('deepsyq-mobile-shell.css',src),'utf8');
 const home=await readFile(new URL('jarvix-action-design.css',src),'utf8');
 const vu=await readFile(new URL('deepsyq-platform-embedded.css',src),'utf8');
 assert.match(mobile,/\.ds-mobile-control-right #dsTakeTour\{/);
 assert.match(mobile,/white-space:nowrap!important/);
 assert.match(mobile,/word-break:keep-all!important/);
 assert.match(mobile,/Owner 2026-11-07: one mobile wordmark centered on its TEXT/);
 assert.match(home,/body\.home-neon\.j-action-workspace header\.top\.ds-stable-header #topJarvisBtn/);
 assert.match(home,/\.ds-desktop-actions \.ds-header-credit\{/);
 assert.match(home,/\.ds-desktop-actions #dsTakeTour\{/);
 assert.match(vu,/\.ds-platform-header \.ds-header-credit\{/);
 assert.match(vu,/\.ds-platform-header #dsTakeTour\{/);
});


test('Owner mobile compact header centers the Deepsyq WORD at the Login row on all shared pages',async()=>{
 const {readFile}=await import('node:fs/promises');
 const src=new URL('../app/src/main/assets/',import.meta.url);
 const mobile=await readFile(new URL('deepsyq-mobile-shell.css',src),'utf8');
 const js=await readFile(new URL('deepsyq-mobile-shell.js',src),'utf8');
 const scoped=mobile.slice(mobile.indexOf('/* Owner 2026-11-07: one mobile wordmark centered'));
 assert.ok(scoped.startsWith('/* Owner 2026-11-07'));
 assert.match(scoped,/@media \(max-width:760px\)/);
 assert.match(scoped,/scroll-padding-top:calc\(130px \+ var\(--ds-mobile-safe-top\)\)!important/);
 assert.match(scoped,/html body\.j-action-workspace\.ds-mobile-layout header\.ds-mobile-header/);
 assert.match(scoped,/html body\.j-action-workspace\.ds-mobile-layout \.ds-mobile-header-spacer/);
 assert.equal((scoped.match(/126px \+ var\(--ds-mobile-safe-top\)/g)||[]).length,4);
 assert.match(scoped,/transform:translateX\(calc\(-50% - 19px\)\)!important/);
 assert.match(scoped,/top:calc\(20px \+ var\(--ds-mobile-safe-top\)\)!important/);
 assert.match(scoped,/\.ds-mobile-controls #topLogin/);
 assert.match(scoped,/top:calc\(21px \+ var\(--ds-mobile-safe-top\)\)!important/);
 assert.match(scoped,/\.ds-mobile-controls \{/);
 assert.match(scoped,/top:calc\(65px \+ var\(--ds-mobile-safe-top\)\)!important/);
 assert.match(scoped,/\.jarvix-chat \{/);
 assert.match(js,/brand\.innerHTML = '<img src="deepsyq-logo\.png" width="30" height="30" alt=""><span>Deepsyq<\/span>'/);
 assert.match(js,/move\(tools, left\); move\(tour, right\); move\(pricing, right\); move\(login, right\)/);
 assert.doesNotMatch(scoped,/url\(|display:none|pointer-events:none|z-index:/);
});
