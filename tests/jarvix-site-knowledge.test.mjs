import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {buildJarvixSiteKnowledge,executeSafeAction,getOrCreateSession,processTurnWithMockBrain,processTurnWithOpenAI,clearSession} from '../server/jarvix-brain.js';

test('Jarvix page index covers every user-facing HTML screen and excludes executable markup',async()=>{
 const pages=buildJarvixSiteKnowledge();
 const htmlFiles=(await readdir(new URL('../app/src/main/assets/',import.meta.url)))
  .filter(file=>file.endsWith('.html')&&!['deepsyq-admin.html','product-watcher-admin.html'].includes(file)).sort();
 assert.deepEqual(pages.map(page=>page.path.slice(1)).sort(),htmlFiles);
 assert.equal(pages.length,29);
 assert.ok(pages.some(page=>page.path==='/generate-studio.html'));
 assert.ok(pages.some(page=>page.path==='/jarvix-studio.html'));
 const studio=pages.find(page=>page.path==='/generate-studio.html');
 assert.ok(studio.controls.some(control=>control.includes('prompt')));
 assert.ok(studio.controls.some(control=>control.includes('Select options')),'form controls include visible select choices');
 assert.ok(pages.every(page=>page.controls.every(control=>!/<script|javascript:/i.test(control))));
 const tools=pages.find(page=>page.path==='/free-tools.html');
 assert.ok(tools.links.some(link=>link.label==='Photo to PDF'&&link.href==='mobile-utility.html?tool=scan-pdf'));
 assert.ok(pages.every(page=>page.links.every(link=>! /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(link.href))));
});

test('offline Jarvix answers tool-finding questions from real local site routes in four languages',()=>{
 for (const [language,question,expected] of [
  ['en','Where can I find the photo to PDF tool?','mobile-utility.html?tool=scan-pdf'],
  ['ru','Где найти фото в PDF?','mobile-utility.html?tool=scan-pdf'],
  ['es','¿Dónde puedo encontrar la herramienta PDF?','mobile-utility.html?tool=scan-pdf'],
  ['fr','Où trouver l’outil PDF ?','mobile-utility.html?tool=scan-pdf']
 ]) {
  const session=getOrCreateSession(`site-route-${language}`);
  const result=processTurnWithMockBrain(question,session,language);
  assert.equal(result.provider,'jarvix-site-index');
  assert.match(result.reply,new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  clearSession(session.id);
 }
});

test('Jarvix safe navigation constructs a local route and ignores a model supplied URL',()=>{
 const result=executeSafeAction({type:'open_studio',studio:'image',url:'https://evil.example/'});
 assert.equal(result.success,true);
 assert.equal(result.url,'generate-studio.html?studio=image&from=jarvix&auto=1');
});

test('Jarvix keeps bounded multi-turn memory and clears it on reset',()=>{
 const id='bounded-test-session';
 const session=getOrCreateSession(id);
 processTurnWithMockBrain('Хочу создать изображение Порше',session,'ru');
 const refined=processTurnWithMockBrain('Сделай его черным',session,'ru');
 assert.match(refined.compiledPrompt,/Porsche/);
 assert.match(refined.compiledPrompt,/obsidian black finish/);
 clearSession(id);
 assert.equal(getOrCreateSession(id).accumulatedPrompt.subject,'');
 clearSession(id);
});

test('a stored API key cannot enable OpenAI spend without the explicit opt-in flag',async()=>{
 const session=getOrCreateSession('no-spend-test');
 let calls=0;
 const result=await processTurnWithOpenAI('Что ты умеешь?',session,'ru',{
  env:{OPENAI_API_KEY:'test-key',JARVIX_AI_ENABLED:'false'},
  fetcher:async()=>{calls+=1;throw new Error('network must not be called in this test');}
 });
 assert.equal(calls,0);
 assert.equal(result.provider,'jarvix-mock-brain');
 clearSession('no-spend-test');
});
