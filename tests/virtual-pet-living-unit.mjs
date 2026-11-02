import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require('../app/src/main/assets/virtual-pet-living.js');
const living = globalThis.DeepsyqLivingPet; // this project treats browser .js as ESM without explicit exports
const event=(overrides={})=>({source:'mock-preview',verified:true,userRequested:true,
 quantity:2,quoteVerified:true,signature:'quantity=2',...overrides});
const settings=(overrides={})=>({enabled:true,mode:'calm',tipsEnabled:true,...overrides});

test('F8 registers exactly 16 owner-approved scenarios, five mocked and eleven gated',()=>{
 assert.deepEqual(living.SCENARIOS.map(s=>s.id),Array.from({length:16},(_,i)=>'S'+String(i+1).padStart(2,'0')));
 assert.deepEqual(living.DEMO_IDS,['S01','S02','S04','S08','S10']);
 assert.equal(living.SCENARIOS.filter(s=>s.stage==='gated').length,11);
 assert.equal(living.SCENARIOS.every(s=>s.title&&s.group),true);
 const prefs=living.normalizeSettings();
 assert.equal(prefs.voiceEnabled,false,'voice must be explicit and future-gated');
 assert.equal(prefs.enabledByScenario.S16,true);
 assert.equal(living.normalizeSettings({movement:'dance',side:'center',size:8}).movement,'gentle');
 assert.equal(living.normalizeSettings({movement:'dance',side:'center',size:8}).side,'auto');
 assert.equal(living.normalizeSettings({movement:'dance',side:'center',size:8}).size,'medium');
});
test('F8 never shows unknown, fabricated, unowned or non-opted-in tip',()=>{
 const c=living.createController();
 assert.equal(c.offer({id:'S99',event:event(),settings:settings()}).reason,'UNKNOWN');
 assert.equal(c.offer({id:'S01',event:event({verified:false}),settings:settings(),userInitiated:true}).reason,'UNVERIFIED');
 assert.equal(c.offer({id:'S01',event:event({quantity:5}),settings:settings(),userInitiated:true}).reason,'UNVERIFIED');
 assert.equal(c.offer({id:'S01',event:event(),settings:settings({mode:'off'}),userInitiated:true}).reason,'OFF');
 assert.equal(c.offer({id:'S01',event:event(),settings:settings({tipsEnabled:false}),userInitiated:true}).reason,'OFF');
 assert.equal(c.offer({id:'S01',event:event(),settings:settings({enabledByScenario:{S01:false}}),userInitiated:true}).reason,'DISMISSED');
 assert.equal(c.offer({id:'S03',event:event(),settings:settings(),userInitiated:true}).reason,'NOT_IMPLEMENTED');
 assert.equal(c.offer({id:'S10',event:event({jobId:'x',status:'READY',owned:false}),settings:settings(),userInitiated:true}).reason,'UNVERIFIED');
 assert.equal(c.offer({id:'S10',event:event({jobId:'x',status:'READY',owned:true}),settings:settings(),userInitiated:true}).show,true);
});
test('F8 prevents demo automation, duplicate tips and supports no-repeat preference',()=>{
 const c=living.createController();
 assert.equal(c.offer({id:'S01',event:event(),settings:settings(),now:1000}).reason,'MOCK_MANUAL_ONLY');
 assert.equal(c.offer({id:'S01',event:event(),settings:settings(),now:1000,userInitiated:true}).show,true);
 assert.equal(c.offer({id:'S01',event:event(),settings:settings(),now:1001,userInitiated:true}).reason,'DUPLICATE');
 c.ignoreType('S01');
 assert.equal(c.offer({id:'S01',event:event({signature:'different'}),settings:settings(),userInitiated:true}).reason,'DISMISSED');
 assert.equal(c.snapshot().seenCount,1);
 c.resetSession();assert.equal(c.snapshot().seenCount,0);
 assert.equal(c.offer({id:'S01',event:event(),settings:settings(),userInitiated:true}).show,true);
});
test('F8 auto suggestions require owned verified source and throttle optional alerts',()=>{
 const c=living.createController();
 const trusted={source:'server-verified',verified:true,ownerVerified:true,
  platform:'short-video',ratio:'16:9',signature:'first'};
 assert.equal(c.offer({id:'S04',event:{...trusted,ownerVerified:false},settings:settings(),now:1000}).reason,'UNVERIFIED');
 assert.equal(c.offer({id:'S04',event:trusted,settings:settings(),now:1000}).show,true);
 assert.equal(c.offer({id:'S04',event:{...trusted,signature:'second'},settings:settings(),now:2000}).reason,'QUIET');
 assert.equal(c.offer({id:'S04',event:{...trusted,signature:'second'},settings:settings(),now:601001}).show,true);
 assert.equal(c.offer({id:'S04',event:{...trusted,signature:'third'},settings:settings(),now:1202000}).show,true);
 assert.equal(c.offer({id:'S04',event:{...trusted,signature:'fourth'},settings:settings(),now:1803000}).reason,'QUIET');
});
test('F8 never interrupts typing, modal or checkout, and blocks fake prices',()=>{
 const c=living.createController();
 for(const k of ['inputFocused','dialogOpen','checkoutOpen','overlayOpen','hidden','busy','bubbleVisible']){
  assert.equal(c.offer({id:'S01',event:event(),settings:settings(),state:{[k]:true},userInitiated:true}).reason,
  k==='bubbleVisible'?'ONE_AT_A_TIME':'BUSY',k);
 }
 assert.equal(c.offer({id:'S01',event:{...event(),source:'server-verified',ownerVerified:true,quoteVerified:false},settings:settings(),userInitiated:true}).reason,'UNVERIFIED');
 assert.equal(c.offer({id:'S02',event:event({jobId:'',queued:true}),settings:settings(),userInitiated:true}).reason,'UNVERIFIED');
});
test('F8 ambient motion stops on phone, input, overlay, hidden or reduced-motion',()=>{
 const base={settings:{movement:'gentle',mode:'calm',enabled:true},width:1024};
 assert.equal(living.canAmbientWalk(base),true);
 for(const options of [{width:390},{hidden:true},{inputFocused:true},{dialogOpen:true},
  {reducedMotion:true},{busy:true},{settings:{mode:'off'}},{settings:{movement:'still'}}]){
  assert.equal(living.canAmbientWalk({...base,...options}),false,JSON.stringify(options));
 }
});
