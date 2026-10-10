import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../app/src/main/assets/wow-montage.js';
import {captureLegacy} from './helpers/legacy-video-harness.mjs';
const wow=globalThis.VUWowMontage;
export function sampleFrames(kind='calm',count=32){
  const bytes=new Uint8Array(160*90*count);
  for(let f=0;f<count;f++)for(let p=0;p<160*90;p++){
    bytes[f*160*90+p]=kind==='moving'?(Math.floor(p/4+f)%2?80:140):kind==='cut'?(f<count/2?30:220):kind==='flash'?(f%2?0:255):100;
  }
  return bytes;
}
const recipe={trimStart:.1,usable:7.8,speed:1,zoom:1.005,motionX:0,useCut:false,cutAt:0,cutLen:0};

test('measured motion chooses calm/moving; flashes and short samples stay uncertain',()=>{
  assert.equal(wow.analyzeFrames(sampleFrames('calm'),8).profile,'calm');
  const moving=wow.analyzeFrames(sampleFrames('moving'),8);
  assert.equal(moving.profile,'moving');assert.equal(moving.speech,'unknown');assert.equal(moving.rhythm,'unknown');
  assert.equal(wow.analyzeFrames(sampleFrames('flash'),8).confidence,0);
  assert.equal(wow.analyzeFrames(sampleFrames('calm',4),1).confidence,0);
});

test('shot boundaries, trim, cut and speed are respected; no safe interval means no effect',()=>{
  const analysis=wow.analyzeFrames(sampleFrames('cut'),8);
  assert.equal(analysis.scenes.length,2);
  const plan=wow.plan(analysis,recipe),effect=plan.effects[0];
  assert.ok(effect.start>=.3&&effect.end<=3.6);
  const cut=wow.plan(wow.analyzeFrames(sampleFrames(),8),{...recipe,useCut:true,cutAt:1,cutLen:.2,speed:1.02});
  assert.ok(cut.effects[0].start>1.3/1.02);
  assert.equal(wow.plan({...analysis,confidence:0},recipe).effects.length,0);
  assert.equal(wow.plan(analysis,{...recipe,trimStart:7,usable:1}).effects.length,0);
});

test('strong existing framing reduces/disables WOW and extra filter cannot change audio/timing',()=>{
  const moving=wow.analyzeFrames(sampleFrames('moving'),8);
  assert.equal(wow.plan(moving,{...recipe,zoom:1.04,motionX:.04}).effects.length,0);
  const plan=wow.plan(moving,recipe);
  const command=['-i','source.mp4','-vf','fps=30,setpts=PTS/1,format=yuv420p','-af','volume=1','-c:a','aac','out.mp4'];
  const enhanced=wow.appendFilters(command,plan);
  assert.deepEqual(enhanced.filter((_,i)=>i!==3),command.filter((_,i)=>i!==3));
  assert.match(enhanced[3],/perspective=/);assert.doesNotMatch(enhanced[3].slice(command[3].length),/setpts|fps=|trim|select=/);
  assert.equal(command[3],'fps=30,setpts=PTS/1,format=yuv420p');
  assert.throws(()=>wow.appendFilters(command,{effects:[{...plan.effects[0],zoom:.5}]}),/Unsafe/);
});

test('analysis runs once per source, no source re-upload, five results have actual montage status',async()=>{
  const run=await captureLegacy({mode:'gentle',variants:5,duration:8,wowMontage:true,wowRuntime:wow,sampleBytes:sampleFrames()});
  assert.equal(run.commands.filter(c=>c.includes('rawvideo')).length,1);
  assert.deepEqual(run.writes,['source_0.mp4']);assert.equal(run.callbacks.length,5);
  assert.ok(run.result.results.every(r=>r.wowMontage.status==='applied'));
  assert.equal(run.deletes.filter(n=>n==='wow_samples.gray').length,1);
  assert.deepEqual(run.sessions,['begin','end']);
});

test('uncertain analysis produces exactly the old encode command and an honest skipped status',async()=>{
  for(const mode of ['gentle','balanced','dynamic']){
    const base=await captureLegacy({mode});
    const enhanced=await captureLegacy({mode,wowMontage:true,wowRuntime:wow});
    assert.deepEqual(enhanced.commands.slice(1),base.commands);
    assert.equal(enhanced.result.results[0].wowMontage.status,'skipped');
  }
});

test('visual render failure retries the identical standard recipe with audio first',async()=>{
  const base=await captureLegacy({mode:'balanced',duration:8});
  const run=await captureLegacy({mode:'balanced',duration:8,wowMontage:true,wowRuntime:wow,sampleBytes:sampleFrames(),execOverride:args=>args.some(a=>a.includes('perspective='))?1:0});
  assert.deepEqual(run.commands.at(-1),base.commands[0]);
  assert.ok(run.commands.at(-1).includes('-af'));
  assert.equal(run.result.results[0].audio,true);assert.equal(run.result.results[0].wowMontage.status,'fallback');
});

test('cancel during analysis stops encoding; missing module cannot silently enable WOW',async()=>{
  await assert.rejects(captureLegacy({mode:'gentle',wowMontage:true,wowRuntime:wow,execOverride:(_args,core)=>{core.cancel();return 0;}}),/canceled/);
  await assert.rejects(captureLegacy({mode:'gentle',wowMontage:true}),/could not load/);
});
