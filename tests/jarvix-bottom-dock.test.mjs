import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../app/src/main/assets/',import.meta.url);
const get=async path=>readFile(new URL(path,root),'utf8');
const home=await get('deepsyq.html');
const chat=await get('jarvix-chat.html');
const css=await get('jarvix-chat.css');
const decorator=await get('jarvix-composer-design.js');
const js=await get('jarvix-composer.js');

test('both canonical JARVIX composers use the same real SVG plane and round send action',()=>{
 for(const [page,id] of [[home,'homeQuickSubmit'],[chat,'jSend']]){
  const start=page.indexOf('id="'+id+'"');
  assert.ok(start>0,id);
  const near=page.slice(start,start+490);
  assert.match(near,/type="submit"/);
  assert.match(near,/class="j-send"/);
  assert.match(near,/<svg class="j-send-plane"/);
  assert.match(near,/m22 2-7 20-4-9-9-4Z/);
  assert.doesNotMatch(near,/➤/);
 }
});
test('the approved plus and paper-plane are equal-sized circles in the dock and cannot drift out',()=>{
 assert.match(css,/OWNER-LOCK 2026-11-07/);
 assert.match(css,/:is\(#jPlus,\.j-send\)\{/);
 assert.match(css,/aspect-ratio:1!important/);
 assert.match(css,/border-radius:50%!important/);
 assert.match(css,/align-self:center!important/);
 assert.match(css,/transform:none!important/);
 assert.match(css,/#homeQuickBar:has\(#homeQuickForm\[data-jarvix-chat\]\)/);
 assert.match(css,/position:fixed!important/);
});
test('shared lower panel remains two rows on desktop and portrait mobile with same six tools',()=>{
 const links=['JARVIX','Image','Video','Audio','Tools','Video Uniquifier'];
 for(const label of links)assert.ok(decorator.includes("'"+label+"'"),label);
 assert.match(decorator,/dock\.classList\.add\('j-neon-dock'\);dock\.append\(rail\)/);
 assert.match(css,/\.j-neon-dock > \.j-mode-rail\{/);
 assert.match(css,/flex-direction:row!important/);
 assert.match(css,/flex-wrap:nowrap!important/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/width:calc\(100vw - 20px\)!important/);
 assert.match(css,/\.j-neon-dock > \.j-mode-rail::after\{display:none\}/);
});
test('same accessible icon controls keep all existing behavior without unrelated model or settings changes',()=>{
 for(const [source,id] of [[home,'homeQuickForm'],[chat,'jChatForm']]){
  assert.ok(source.includes('id="'+id+'"'));
  for(const control of ['jPlus','jMic'])assert.ok(source.includes('id="'+control+'"'));
 }
 for(const marker of ['j-image-shortcut','j-attach-shortcut','j-settings-shortcut','j-mode-rail'])assert.ok(decorator.includes(marker));
 assert.ok(js.includes('bindVoiceInput({mic,input,form,onError})'));
 assert.ok(js.includes('await voice.stop()'));
 assert.ok(!css.includes('body{display:none}'));
});
