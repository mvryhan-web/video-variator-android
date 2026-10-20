import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

// B11 (source-exact, no-spend): extract and execute the *existing* History
// handler with inert UI controls. No provider, Stripe, auth API or new job POST.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=await readFile(resolve(root,'app/src/main/assets/generate-studio.js'),'utf8');
const first=source.indexOf('function prepareHistoryItem(item,{settings=false}={}){');
const last=source.indexOf('async function editHistoryImage(item){',first);
assert.ok(first>=0&&last>first,'Read real History Regenerate, not a mock implementation');
const actual=source.slice(first,last);

function probe({savedReferenceCount=0,currentReferenceCount=1,accept=true,regenerate=true}={}){
 const fields=new Map(),photos=Array.from({length:currentReferenceCount},(_,i)=>({name:'current-'+i+'.png'}));
 const counts={confirm:0,select:0,renderRefs:0,availability:0,provider:0,api:0};
 function field(id){if(!fields.has(id)){const common={
  prompt:{value:'Current local Video draft',focus(){}},consent:{checked:true},
  status:{textContent:''},ratio:{value:'16:9'},
  videoResolution:{value:'720p'},videoDuration:{value:'8'},
  videoInputMode:{value:'text'},musicMode:{value:'song'}
 };fields.set(id,common[id]||{value:''});}return fields.get(id);}
 const ctx={
  busy:false,kind:'video',refs:photos,drafts:{video:{refs:photos}},
  catalog:[],modelId:'fixture-video',videoDraftNeedsPhotos:false,
  videoDraftExpectedRefs:0,videoDraftPendingMode:'text',
  $:field,say:(en)=>en,confirm:()=>{counts.confirm++;return accept;},
  select:()=>{counts.select++;},renderRefs:()=>{counts.renderRefs++;},
  renderModel:()=>{},currentModel:()=>({capabilities:{}}),
  updateRatioSelection:()=>{},renderVideoSettings:()=>{},availability:()=>{counts.availability++;},
  setHistory:()=>{},api:()=>{counts.api++;throw Error('NO_NETWORK_ALLOWED');},
  dispatchGeneration:()=>{counts.provider++;throw Error('NO_PROVIDER_ALLOWED');}
 };
 const prepare=vm.runInNewContext(actual+'\nprepareHistoryItem;',ctx,
  {timeout:1500,filename:'real-current-Studio-prepareHistoryItem.js'});
 prepare({kind:'video',model:null,prompt:'Historical owner video',settings:{
  referenceCount:savedReferenceCount,videoInputMode:savedReferenceCount===0?'text':'first_frame'
 }},{settings:regenerate});
 return {ctx,counts,fields};
}
test('B11 text-only saved Video always detaches unrelated live photo after explicit confirmation',()=>{
 const {ctx,counts,fields}=probe({savedReferenceCount:0});
 assert.equal(counts.confirm,1,'removing current video photo requires acknowledgement');
 assert.equal(counts.select,1);
 assert.equal(ctx.refs.length,0,'text-only historical Video cannot inherit one current image');
 assert.equal(ctx.drafts.video.refs.length,0,'saved Video draft must also discard stale photos');
 assert.equal(counts.renderRefs,1);
 assert.equal(ctx.videoDraftNeedsPhotos,false);
 assert.equal(fields.get('prompt').value,'Historical owner video');
 assert.equal(fields.get('consent').checked,false);
 assert.equal(counts.api,0);assert.equal(counts.provider,0);
});
test('B11 declining photo detachment preserves original draft and never submits AI work',()=>{
 const {ctx,counts,fields}=probe({savedReferenceCount:0,accept:false});
 assert.equal(counts.confirm,1);assert.equal(counts.select,0);
 assert.equal(ctx.refs.length,1);
 assert.equal(ctx.drafts.video.refs.length,1,'declined action cannot alter draft refs');
 assert.equal(counts.renderRefs,0);
 assert.equal(ctx.$('prompt').value,'Current local Video draft');
 assert.equal(counts.api,0);assert.equal(counts.provider,0);
});
test('B11 historic first-frame Video detaches current photo and requires re-attaching the original',()=>{
 const {ctx,counts}=probe({savedReferenceCount:1,accept:true});
 assert.equal(ctx.refs.length,0);
 assert.equal(ctx.videoDraftNeedsPhotos,true);
 assert.equal(ctx.videoDraftExpectedRefs,1);
 assert.equal(ctx.videoDraftPendingMode,'first_frame');
 assert.equal(ctx.drafts.video.refs.length,0);
 assert.ok(counts.renderRefs>=1);
 assert.equal(counts.api,0);assert.equal(counts.provider,0);
});
test('B11 reuse prompt without Regenerate preserves local reference and makes no AI call',()=>{
 const {ctx,counts}=probe({savedReferenceCount:0,regenerate:false});
 assert.equal(counts.confirm,0);assert.equal(ctx.refs.length,1);
 assert.equal(ctx.drafts.video.refs.length,1);
 assert.equal(counts.api,0);assert.equal(counts.provider,0);
});
test('B11 text-only historical Video with no current references does not ask for pointless confirmation',()=>{
 const {ctx,counts}=probe({savedReferenceCount:0,currentReferenceCount:0});
 assert.equal(counts.confirm,0);assert.equal(ctx.refs.length,0);
 assert.equal(counts.api,0);assert.equal(counts.provider,0);
});
