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
 assert.match(css,/\.ds-mobile-control-right #dsTakeTour\{/);
 assert.match(css,/position:static!important;inset:auto!important/);
});

test('cross-page language preference: saved choice wins and RU/UK/BE phone locales map to Russian',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {runInNewContext}=await import('node:vm');
 const root=new URL('../app/src/main/assets/',import.meta.url);
 const paths=['deepsyq-site-shell.js','free-tools.js','app-v4.js','deepsyq.js'];
 function extractResolver(code){
  const start=code.indexOf('function getActiveLanguage()');
  assert.ok(start>=0,'Missing shared resolver');
  const open=code.indexOf('{',start);
  let depth=0;
  for(let i=open;i<code.length;i++){
   if(code[i]==='{')depth++;
   else if(code[i]==='}'&&--depth===0)return code.slice(start,i+1);
  }
  throw Error('Unterminated language resolver');
 }
 const cases=[
  {stored:{deepsyq_home_language:'ru'},browser:'en-US',expected:'ru'},
  {stored:{deepsyq_home_language:'en',deepsyq_lang:'ru'},browser:'ru-RU',expected:'en'},
  {stored:{deepsyq_lang:'fr'},browser:'ru-RU',expected:'fr'},
  {stored:{deepsyq_lang:'es'},browser:'en-US',expected:'es'},
  {stored:{deepsyq_home_language:'xx'},browser:'ru-RU',expected:'ru'},
  {stored:{},browser:'ru-RU',expected:'ru'},
  {stored:{},browser:'uk-UA',expected:'ru'},
  {stored:{},browser:'be-BY',expected:'ru'},
  {stored:{},browser:'fr-FR',expected:'fr'},
  {stored:{},browser:'es-MX',expected:'es'},
  {stored:{},browser:'de-DE',expected:'en'},
 ];
 for(const path of paths){
  const source=await readFile(new URL(path,root),'utf8');
  const fn=extractResolver(source);
  for(const {stored,browser,expected} of cases){
   const actual=runInNewContext(fn+'\ngetActiveLanguage()',{
    navigator:{languages:[browser],language:'en-US'},
    localStorage:{getItem:key=>Object.hasOwn(stored,key)?stored[key]:null}
   });
   assert.equal(actual,expected,path+' should resolve '+browser+' with '+JSON.stringify(stored));
  }
  const fallback=runInNewContext(fn+'\ngetActiveLanguage()',{
   navigator:{languages:[],language:'ru-RU'},localStorage:{getItem:()=>{throw Error('Storage blocked');}}
  });
  assert.equal(fallback,'ru',path+' must handle blocked localStorage and use navigator.language');
 }
});

test('language selection updates existing site controls without changing layout or processing',async()=>{
 const {readFile}=await import('node:fs/promises');
 const root=new URL('../app/src/main/assets/',import.meta.url);
 const read=path=>readFile(new URL(path,root),'utf8');
 const [tools,vu,shell,mobile,unified,home]=await Promise.all([
  'free-tools.js','app-v4.js','deepsyq-site-shell.js','deepsyq-mobile-shell.js',
  'deepsyq-unified-platform-header.js','deepsyq.js'
 ].map(read));
 assert.match(tools,/let lang=getActiveLanguage\(\)/);
 assert.match(tools,/window\.addEventListener\('deepsyq:lang',applyLanguage\)/);
 assert.match(tools,/dict\[lang\]/);
 assert.match(vu,/function detectLocale\(\)\{return getActiveLanguage\(\);\}/);
 assert.match(vu,/window\.addEventListener\('deepsyq:lang',applyLocale\)/);
 assert.match(vu,/applyLocale\(\);renderAll\(\)/);
 assert.match(shell,/const l = getActiveLanguage\(\)/);
 assert.match(home,/applyHomeLanguage\(getActiveLanguage\(\)\)/);
 for(const [path,source] of [['Home',home],['VU header',mobile],['unified header',unified]]){
  assert.match(source,/localStorage\.setItem\('deepsyq_home_language'/,path+' primary key');
  assert.match(source,/localStorage\.setItem\('deepsyq_lang'/,path+' legacy key');
  assert.match(source,/deepsyq:lang/,path+' updates UI');
 }
});
