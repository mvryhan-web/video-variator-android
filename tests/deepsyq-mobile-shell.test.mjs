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
 assert.match(unified,/left\.append\(credit\)/);
 assert.match(unified,/right\.append\(tour,pricing,languageWrap,login\)/);
 assert.doesNotMatch(unified,/AI Credits: —|credits\+': —'/);
 assert.match(css,/\.ds-mobile-control-left \.ds-header-credit/);
 assert.match(css,/white-space:nowrap!important/);
});
