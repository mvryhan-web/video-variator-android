import test from 'node:test';
import assert from 'node:assert/strict';
import {runContentTasksIfDue,internalContentRecommendations,contentTasksEnabled,listContentTasks} from '../server/product-watcher/content-tasks.js';

const env={PRODUCT_WATCHER_ENABLED:'true',PRODUCT_WATCHER_CONTENT_TASKS_ENABLED:'true'};
function fake({paused=false,locked=false,schema=true,rightsGaps=0,invalidTemplate=0,invalidPreview=0,invalidPoster=0,invalidTemplateWorkflow=0,invalidTemplateInputs=0,invalidTemplateSettings=0,invalidTarget=0,invalidInspirationInputs=0,invalidInspirationSettings=0}={}){
 const rows=new Map(),queries=[];
 const conn={async query(sql,args=[]){
  queries.push([sql,args]);
  if(sql.includes('pg_try_advisory_lock'))return{rows:[{acquired:!locked}]};
  if(sql.includes('pg_advisory_unlock'))return{rows:[]};
  if(sql==='SELECT paused FROM vv_product_watcher_control WHERE id=1')return{rows:[{paused}]};
  if(sql.includes('to_regclass'))return{rows:[{templates:schema?'vv_ai_template':null,inspiration:schema?'vv_ai_inspiration':null}]};
  if(sql.includes('FROM vv_ai_template'))return{rows:[{active:0,missing_thumbnail:0,missing_prompt:0,invalid_thumbnail_urls:invalidTemplate,invalid_generation_types:invalidTemplateWorkflow,invalid_input_types:invalidTemplateInputs,invalid_default_settings:invalidTemplateSettings}]};
  if(sql.includes('FROM vv_ai_inspiration'))return{rows:[{active:1,images:1,videos:0,rights_gaps:rightsGaps,missing_previews:0,invalid_preview_urls:invalidPreview,invalid_poster_urls:invalidPoster,invalid_action_targets:invalidTarget,invalid_input_types:invalidInspirationInputs,invalid_default_settings:invalidInspirationSettings}]};
  if(sql.startsWith('SELECT id FROM vv_product_watcher_content_tasks'))return{rows:rows.has(args.join(':'))?[{id:rows.get(args.join(':')).id}]:[]};
  if(sql.startsWith('INSERT INTO vv_product_watcher_content_tasks')){
   const id=rows.size+1,content=JSON.parse(args[2]);
   rows.set(args.slice(0,2).join(':'),{id,kind:args[0],period_key:args[1],content,created_at:new Date()});
   return{rows:[{id}]};
  }
  if(sql.startsWith('SELECT id,kind,period_key,content,created_at'))return{rows:[...rows.values()]};
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return{rows:[]};
  throw Error('UNEXPECTED_SQL '+sql);
 },release(){queries.push(['RELEASE'])}};
 return{pool:{connect:async()=>conn,query:conn.query},rows,queries};
}
const instant=t=>()=>new Date(t);

test('06:00 Paris content check and 07:00 internal opportunities, no extra calls before time',async()=>{
 const d=fake();
 let r=await runContentTasksIfDue({pool:d.pool,env,now:instant('2026-10-15T03:59:00Z')});
 assert.equal(r.status,'not_due');assert.equal(d.queries.length,0);
 r=await runContentTasksIfDue({pool:d.pool,env,now:instant('2026-10-15T04:00:00Z')});
 assert.deepEqual(r.generated.map(x=>x.kind),['content']);
 r=await runContentTasksIfDue({pool:d.pool,env,now:instant('2026-10-15T05:00:00Z')});
 assert.deepEqual(r.generated.map(x=>x.kind),['opportunities']);
 assert.equal(d.rows.size,2);
 const again=await runContentTasksIfDue({pool:d.pool,env,now:instant('2026-10-15T10:00:00Z')});
 assert.equal(again.status,'not_due');
});

test('no invented media, rights or market demand: only internal documented gaps',async()=>{
 const d=fake({rightsGaps:1});
 const result=await runContentTasksIfDue({pool:d.pool,env,now:instant('2026-10-15T06:00:00Z')});
 assert.equal(result.generated.length,2);
 const list=await listContentTasks(d.pool);
 const review=list.find(x=>x.kind==='content').content,opp=list.find(x=>x.kind==='opportunities').content;
 assert.equal(review.inspiration.videos,0);
 assert.equal(review.inspiration.rightsGaps,1);
 assert.ok(opp.recommendations.some(x=>x.code==='INSPIRATION_RIGHTS_GAPS'));
 assert.ok(opp.recommendations.some(x=>x.code==='NO_APPROVED_VIDEO_EXAMPLE'));
 assert.ok(!JSON.stringify(opp).includes('trending'));
 assert.ok(!JSON.stringify(opp.recommendations).includes('competitor'));
 assert.match(opp.scope,/No market trend/);
});

test('read-only syntax signals flag suspicious media links but never fetch or store URLs',async()=>{
 const d=fake({invalidTemplate:2,invalidPreview:1,invalidPoster:3});
 const result=await runContentTasksIfDue({pool:d.pool,env,now:instant('2026-10-15T10:00:00Z')});
 assert.equal(result.generated.length,2);
 const list=await listContentTasks(d.pool);
 const audit=list.find(x=>x.kind==='content').content;
 const opportunity=list.find(x=>x.kind==='opportunities').content;
 assert.equal(audit.status,'attention');
 assert.equal(audit.linkCheck,'syntax_only');
 assert.equal(audit.urlReachability,'not_checked');
 assert.equal(audit.mediaPlayback,'not_checked');
 assert.equal(audit.skills,'not_checked');
 assert.equal(audit.workflows,'not_checked');
 assert.equal(audit.templates.invalidThumbnailUrls,2);
 assert.equal(audit.inspiration.invalidPreviewUrls,1);
 assert.equal(audit.inspiration.invalidPosterUrls,3);
 assert.ok(['TEMPLATE_THUMBNAIL_URL_INVALID','INSPIRATION_PREVIEW_URL_INVALID','INSPIRATION_POSTER_URL_INVALID']
   .every(c=>opportunity.recommendations.some(x=>x.code===c)));
 assert.ok(d.queries.some(([q])=>q.includes('invalid_preview_urls')&&q.includes('invalid_poster_urls')));
 assert.ok(d.queries.some(([q])=>q.includes('invalid_thumbnail_urls')));
 assert.ok(!JSON.stringify(list).includes('secret-token'));
});

test('active workflow metadata types are audited without reading prompts or invoking providers',async()=>{
 const data=fake({invalidTemplateWorkflow:1,invalidTemplateInputs:2,invalidTemplateSettings:3,
   invalidTarget:1,invalidInspirationInputs:2,invalidInspirationSettings:1});
 const result=await runContentTasksIfDue({pool:data.pool,env,now:instant('2026-10-15T09:00:00Z')});
 assert.equal(result.status,'generated');
 const reports=await listContentTasks(data.pool);
 const c=reports.find(x=>x.kind==='content').content;
 const recommendations=reports.find(x=>x.kind==='opportunities').content.recommendations;
 assert.equal(c.status,'attention');
 assert.equal(c.workflowMetadata,'schema_shape_only');
 assert.equal(c.workflows,'not_checked');
 assert.equal(c.skills,'not_checked');
 assert.deepEqual([c.templates.invalidGenerationTypes,c.templates.invalidInputTypes,c.templates.invalidDefaultSettings],[1,2,3]);
 assert.deepEqual([c.inspiration.invalidActionTargets,c.inspiration.invalidInputTypes,c.inspiration.invalidDefaultSettings],[1,2,1]);
 const codes=new Set(recommendations.map(x=>x.code));
 for(const code of ['TEMPLATE_GENERATION_TYPE_INVALID','TEMPLATE_INPUT_SCHEMA_INVALID',
   'TEMPLATE_SETTINGS_SCHEMA_INVALID','INSPIRATION_TARGET_INVALID',
   'INSPIRATION_INPUT_SCHEMA_INVALID','INSPIRATION_SETTINGS_SCHEMA_INVALID'])assert.ok(codes.has(code),code);
 assert.ok(data.queries.some(([q])=>q.includes('jsonb_typeof')&&q.includes('invalid_input_types')));
 assert.ok(data.queries.every(([q])=>!q.includes('SELECT * FROM vv_ai_template')&&!q.includes('user_id')));
});

test('missing platform schema is not treated as zero real content',async()=>{
 const d=fake({schema:false}),r=await runContentTasksIfDue({pool:d.pool,env,now:instant('2026-10-15T10:00:00Z')});
 assert.equal(r.generated.length,2);
 const list=await listContentTasks(d.pool),c=list.find(x=>x.kind==='content').content;
 assert.equal(c.status,'not_ready');
 assert.equal(c.code,'CONTENT_SCHEMA_MISSING');
 assert.ok(!('images' in c));
 assert.deepEqual(internalContentRecommendations(c).map(x=>x.code),['CONTENT_SCHEMA_MISSING']);
});

test('disabled, paused and locked checks do not read or mutate live content',async()=>{
 const disabled=fake(),a=await runContentTasksIfDue({pool:disabled.pool,env:{},now:instant('2026-10-15T10:00:00Z')});
 assert.equal(a.status,'disabled');assert.equal(disabled.queries.length,0);
 assert.equal(contentTasksEnabled({PRODUCT_WATCHER_ENABLED:'true'}),false);
 for(const opts of [{paused:true},{locked:true}]){
  const d=fake(opts),r=await runContentTasksIfDue({pool:d.pool,env,now:instant('2026-10-15T10:00:00Z')});
  assert.equal(r.status,opts.paused?'paused':'skipped');assert.equal(d.rows.size,0);
  assert.equal(d.queries.some(([sql])=>sql.includes('FROM vv_ai_template')),false);
 }
});

test('recommendations never automatically publish templates or edit rights records',()=>{
 const result={status:'attention',templates:{active:1,missingThumbnail:2,missingPrompt:1},
  inspiration:{active:1,images:0,videos:0,rightsGaps:1,missingPreviews:1,invalidPreviewUrls:0,invalidPosterUrls:0}};
 const list=internalContentRecommendations(result);
 assert.ok(list.length>=5);assert.ok(list.every(x=>['high','medium','low'].includes(x.priority)));
 assert.ok(list.every(x=>!x.actions&&!x.applied));
});
