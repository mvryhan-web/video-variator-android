import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const path=new URL('../app/src/main/assets/',import.meta.url);
const css=await readFile(new URL('jarvix-chat.css',path),'utf8');
const home=await readFile(new URL('deepsyq.html',path),'utf8');
const chat=await readFile(new URL('jarvix-chat.html',path),'utf8');
const navigation=await readFile(new URL('jarvix-composer-design.js',path),'utf8');

test('owner correction: existing shared LOWER navigation untouched, no invented waveform',()=>{
 assert.doesNotMatch(css,/\.j-neon-dock\s*>\s*\.j-mode-rail/);
 assert.doesNotMatch(css,/\.j-mode-rail::after|\.j-mode-rail\s*\{/);
 assert.doesNotMatch(css,/clip-path:polygon/);
 assert.doesNotMatch(css,/:where\(#homeQuickBar,\.j-chat-bottom\)\.j-neon-dock/);
 assert.doesNotMatch(css,/bottom:clamp\(18px,7vh,72px\)/);
 assert.match(navigation,/dock\.classList\.add\('j-neon-dock'\);dock\.append\(rail\)/);
 for(const label of ['JARVIX','Image','Video','Audio','Tools','Video Uniquifier'])assert.ok(navigation.includes("'"+label+"'"),label);
});
test('owner correction: UPPER plus/send circles, SVG and mic stop preserved on both Home and Chat',()=>{
 for(const page of [home,chat]){
  assert.match(page,/id="jPlus"/);
  assert.match(page,/id="jMic"/);
  assert.match(page,/<svg class="j-send-plane"/);
 }
 assert.match(css,/:is\(#jPlus,\.j-send\)/);
 assert.match(css,/border-radius:50%!important/);
 assert.match(css,/\.j-voice-waves/);
 assert.match(css,/@media\(max-width:760px\)/);
});
