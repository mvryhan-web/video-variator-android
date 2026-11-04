import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {SITE_TOOLS,resolveToolCommand,parseVariationSettings,applyVariationSettings,pricingReply} from '../app/src/main/assets/jarvix-site-controls.js';
import {buildJarvixPricingKnowledge,buildJarvixSiteKnowledge} from '../server/jarvix-brain.js';
test('every registered tool names a shipped page and every mobile workflow is indexed',()=>{
 for(const tool of SITE_TOOLS){assert.ok(existsSync('app/src/main/assets/'+tool.url.split(/[?#]/)[0]),tool.id);for(const alias of tool.aliases)assert.ok(resolveToolCommand('open '+alias),alias);}
 const source=readFileSync('app/src/main/assets/mobile-utility.js','utf8');
 const ids=[...source.matchAll(/^ '(.*?)':\[/gm)].map(m=>m[1]);
 for(const id of ids)assert.ok(SITE_TOOLS.some(t=>t.url.includes('tool='+id)||id==='photo-compress'&&t.id==='compress-photo'||id==='video-compress'&&t.id==='compress-video'),id);
 assert.ok(buildJarvixSiteKnowledge().find(p=>p.path==='/free-tools.html').links.some(l=>l.href==='mobile-utility.html?tool=pdf-sign'));
});
test('specific tool navigation beats generic photo/video pages in all four languages',()=>{
 for(const [command,id] of [['открой комплекс фото','compress-photo'],['открой сжать фото','compress-photo'],['ouvre compresser les photos','compress-photo'],['open compress photo','compress-photo'],['abre comprimir foto','compress-photo'],['открой объединить пдф','pdf-merge'],['открой фото в видео','photo-motion']])assert.equal(resolveToolCommand(command)?.id,id);
 assert.equal(resolveToolCommand('что такое фото'),null);
});
test('compound VU settings and ambiguous ratios never invent a supported ratio',()=>{
 assert.deepEqual(parseVariationSettings('настрой баланс 1080 и 16 на 9, 10 вариантов'),{settings:{mode:'balanced',aspectRatio:'16:9',quality:'1080',variantCount:'10'}});
 assert.equal(parseVariationSettings('баланс 10 на 18 и 16 на 9').error,'ratio');
 assert.equal(parseVariationSettings('не меняй баланс'),null);
 assert.equal(parseVariationSettings('16 на 9 и 9 на 16').error,'ratio');
});
test('voice settings preserve plan-disabled options and report partial success honestly',()=>{
 const make=(value,options)=>({value,options:options.map(([value,disabled])=>({value,disabled})),dispatchEvent(){}});
 const fields={mode:make('gentle',[['gentle',false],['balanced',true]]),aspectRatio:make('9:16',[['9:16',false],['16:9',false]])};
 const reply=applyVariationSettings({getElementById:id=>fields[id]},{mode:'balanced',aspectRatio:'16:9'},'ru');
 assert.equal(fields.mode.value,'gentle');assert.equal(fields.aspectRatio.value,'16:9');assert.match(reply,/Недоступно/);assert.match(reply,/Настроено/);
});
test('plan answers use live prices and shipped benefit copy, without claiming checkout enabled',()=>{
 const knowledge={pricing:buildJarvixPricingKnowledge()};assert.ok(knowledge.pricing.pro.includes('Up to 10 variants'));
 const config={billingConfigured:false,plans:{pro:{price:31,limit:2250},lifetime:{price:2999,currency:'eur'}}};
 const reply=pricingReply(config,'что входит в pro','ru',knowledge);
 assert.match(reply,/31/);assert.match(reply,/1080p/);assert.match(reply,/покупка отключена/);assert.doesNotMatch(reply,/24\s/);
 assert.match(pricingReply(config,'lifetime','en',knowledge),/€|EUR/);
});
