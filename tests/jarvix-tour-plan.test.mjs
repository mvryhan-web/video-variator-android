import {test} from 'node:test';import assert from 'node:assert/strict';import {statSync} from 'node:fs';
import {tourPlan,tourAction} from '../app/src/main/assets/jarvix-tour-plan.js';
test('tour visits each requested real section and returns Home using existing voice assets',()=>{for(const l of ['ru','en','fr','es']){const plan=tourPlan(l);assert.deepEqual(plan.map(s=>s.title),['Home','Image','Video','Audio','AI Apps','Canvas','Tools','Compress photos','Trim video','Trim audio','Video Uniquifier','Inspiration','Pricing','trial','basic','pro','business','lifetime','Home']);for(const step of plan){if(step.audio)assert.ok(statSync('app/src/main/assets/'+step.audio).size>1000);else assert.ok(['plan','section'].includes(step.narration));assert.ok(!step.url.startsWith('http'));}}});
test('pause prevents completion races from advancing; continue resumes and Stop clears',()=>{let state={index:2,phase:'playing',position:1.4};state=tourAction(state,'pause');assert.equal(tourAction(state,'ended').index,2);state=tourAction(state,'continue');assert.equal(tourAction(state,'ended').index,3);assert.equal(tourAction(state,'stop'),null);assert.equal(tourAction({index:tourPlan().length-1,phase:'playing'},'ended'),null);});

test('plan narration preserves visible proposal status, price and limits',async()=>{const {planNarration}=await import('../app/src/main/assets/jarvix-tour-plan.js');assert.equal(planNarration({name:'Trial',price:'$0.99 proposed',features:['Not active'],note:'Terms require approval'}),'Trial. $0.99 proposed. Not active. Terms require approval');});
test('plan speech keeps price, main limits and separate AI billing while chunks retain all spoken words',async()=>{const {planNarration,narrationChunks}=await import('../app/src/main/assets/jarvix-tour-plan.js');const text=planNarration({name:'Pro',price:'$24 per month',summary:'For everyday work',billingNotice:'AI generation is billed separately.',features:['2250 tool credits per month','Up to 15 variants','Explore the model catalog']});assert.match(text,/2250 tool credits/);assert.match(text,/AI generation is billed separately/);assert.match(text,/Up to 15 variants/);assert.equal(narrationChunks(text,30).join(' '),text);});


test('synchronized tour cues match recorded narration position without triggering generation',async()=>{
 const {tourCues,cueAt,tourNavigationClip,sectionNarrationBeats,planNarrationBeats}=await import('../app/src/main/assets/jarvix-tour-plan.js');
 for(const title of ['Home','Image','Video','Audio','AI Apps','Canvas','Tools','Video Uniquifier','Pricing']){
  const cues=tourCues(title);assert.ok(cues.length>=1,title);
  assert.equal(cues[0].at,0);for(let i=1;i<cues.length;i++)assert.ok(cues[i].at>cues[i-1].at&&cues[i].at<1);
  assert.ok(cues.every(c=>typeof c.target==='string'&&c.target.length>1));
  assert.equal(cueAt(cues,0,10),0);
  assert.equal(cueAt(cues,10,10),cues.length-1);
 }
 assert.equal(cueAt(tourCues('Image'),5,10),1);
 assert.equal(cueAt(tourCues('Image'),8,10),2);
 for(const lang of ['ru','en','fr','es']){
  const nav=tourNavigationClip('Image',1,lang);
  assert.ok(statSync('app/src/main/assets/'+nav).size>1000,lang);
  assert.equal(tourNavigationClip('Home',0,lang),null);
  for(const section of ['Compress photos','Trim video','Trim audio','Inspiration']){
   const beats=sectionNarrationBeats(section,lang);
   assert.ok(beats.length>=2,section);
   assert.ok(beats.every(b=>typeof b.text==='string'&&b.text.length>12&&b.target.startsWith('#')));
  }
 }
 const card={name:'Pro',price:'$24 per month',billingNotice:'AI generation is billed separately.',features:['2250 tool credits per month','Up to 15 variants']};
 const beats=planNarrationBeats(card);
 assert.equal(beats.map(b=>b.text).join('. '),(await import('../app/src/main/assets/jarvix-tour-plan.js')).planNarration(card));
 assert.deepEqual(beats.map(b=>b.target),['.price-plan-name','.price-plan-price','.price-plan-facts','.price-features li:nth-child(1)','.price-features li:nth-child(2)']);
 assert.ok(beats.every(b=>!b.target.includes('checkout')&&!b.target.includes('generate')));
});
