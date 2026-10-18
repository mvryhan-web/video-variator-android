import test from 'node:test';
import assert from 'node:assert/strict';
import {parisBriefSlots,runBriefsIfDue,briefEnabled,listWatcherBriefs} from '../server/product-watcher/briefs.js';

const env={PRODUCT_WATCHER_ENABLED:'true',PRODUCT_WATCHER_BRIEFS_ENABLED:'true'};
const fake=(opts={})=>{
 const queries=[],briefs=new Map();
 const conn={async query(sql,args=[]){
  queries.push([sql,args]);
  if(sql.includes('pg_try_advisory_lock'))return{rows:[{acquired:!opts.locked}]};
  if(sql.includes('pg_advisory_unlock'))return{rows:[]};
  if(sql==='SELECT paused FROM vv_product_watcher_control WHERE id=1')return{rows:opts.missing?[]:[{paused:!!opts.paused}]};
  if(sql.startsWith('SELECT id FROM vv_product_watcher_briefs'))return{rows:briefs.has(args.join(':'))?[{id:briefs.get(args.join(':')).id}]:[]};
  if(sql.startsWith('SELECT COUNT(*)::int AS total'))return{rows:[{total:4,critical:1,warning:2}]};
  if(sql.startsWith('SELECT code,severity'))return{rows:[{code:'RECORDED_SPEND_SPIKE',severity:'warning',occurrences:2}]};
  if(sql.startsWith('SELECT COUNT(*)::int AS changed'))return{rows:[{changed:3}]};
  if(sql.startsWith('SELECT COUNT(*)::int AS pending'))return{rows:[{pending:2}]};
  if(sql.startsWith('SELECT lower(cost_currency)'))return{rows:[{currency:'usd',recorded_cost:'3.000000',priced_jobs:4}]};
  if(sql.startsWith('SELECT kind,content FROM vv_product_watcher_content_tasks'))return{rows:[{kind:'content',content:{status:'attention',code:'CONTENT_METADATA_GAPS'}},{kind:'opportunities',content:{recommendations:[{code:'NO_APPROVED_VIDEO_EXAMPLE',priority:'medium',text:'Check a real video sample.'}]}}]};
  if(sql.startsWith('INSERT INTO vv_product_watcher_briefs')){
   const id=briefs.size+1;briefs.set(args.slice(0,2).join(':'),{id,kind:args[0],period_key:args[1],content:JSON.parse(args[2]),created_at:new Date()});
   return{rows:[{id}]};
  }
  if(sql.startsWith('SELECT id,kind,period_key,content,created_at'))return{rows:[...briefs.values()]};
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return{rows:[]};
  throw Error('UNKNOWN_SQL:'+sql);
 },release(){queries.push(['RELEASE'])}};
 return{pool:{connect:async()=>conn,query:conn.query},queries,briefs};
};

test('Paris clock controls daily and Monday 09:00; DST does not rely on server timezone',()=>{
 assert.deepEqual(parisBriefSlots(new Date('2026-10-15T05:59:00Z')).due,[]);
 assert.deepEqual(parisBriefSlots(new Date('2026-10-15T06:00:00Z')).due,['daily']);
 assert.equal(parisBriefSlots(new Date('2026-10-15T06:00:00Z')).periodKey,'2026-10-15');
 // Winter Paris UTC+1 (Mon 26 Oct 2026), Monday 09:00 Paris == 08:00 UTC.
 assert.deepEqual(parisBriefSlots(new Date('2026-10-26T07:59:00Z')).due,['daily']);
 assert.deepEqual(parisBriefSlots(new Date('2026-10-26T08:00:00Z')).due,['daily','weekly']);
 // Summer Paris UTC+2 after spring DST.
 assert.deepEqual(parisBriefSlots(new Date('2027-04-05T07:00:00Z')).due,['daily','weekly']);
});

test('brief scheduling defaults off even if parent watcher is configured',async()=>{
 const d=fake();assert.equal(briefEnabled({PRODUCT_WATCHER_ENABLED:'true'}),false);
 const r=await runBriefsIfDue({pool:d.pool,env:{PRODUCT_WATCHER_ENABLED:'true'},
  now:()=>new Date('2026-10-15T11:00:00Z')});
 assert.equal(r.status,'disabled');assert.equal(d.queries.length,0);
});

test('paused or locked schedules cannot write reports',async()=>{
 for(const opts of [{paused:true},{locked:true}]){
  const d=fake(opts),r=await runBriefsIfDue({pool:d.pool,env,now:()=>new Date('2026-10-15T10:00:00Z')});
  assert.equal(r.status,opts.paused?'paused':'skipped');
  assert.equal(d.briefs.size,0);
 }
});

test('daily and weekly generation are durable, deduplicated and carry no invented profit',async()=>{
 const d=fake(),at=()=>new Date('2026-10-26T10:00:00Z');
 const r=await runBriefsIfDue({pool:d.pool,env,now:at});
 assert.equal(r.status,'generated');assert.equal(r.generated.length,2);
 const again=await runBriefsIfDue({pool:d.pool,env,now:at});
 assert.equal(again.status,'not_due');assert.equal(d.briefs.size,2);
 const all=await listWatcherBriefs(d.pool);
 assert.equal(all.length,2);
 for(const report of all){
  const text=JSON.stringify(report);
  assert.equal(report.content.costs.marginVerified,false);
  assert.equal(report.content.costs.revenueVerified,false);
  assert.equal(report.content.pendingApprovals.automaticApplication,false);
  assert.equal(report.content.contentChecks.status,'attention');
  assert.ok(report.content.internalOpportunities.some(x=>x.code==='NO_APPROVED_VIDEO_EXAMPLE'));
  assert.equal(report.content.changed.officialPageChangesUnverified,3);
  assert.ok(!text.includes('private'));
  assert.ok(!text.includes('grossMargin:'));
 }
 assert.equal(all.find(x=>x.kind==='weekly').content.audit.priority,'high');
});

test('missing schema fails closed and no report created',async()=>{
 const d=fake({missing:true});
 await assert.rejects(runBriefsIfDue({pool:d.pool,env,now:()=>new Date('2026-10-15T09:00:00Z')}),/WATCHER_SCHEMA_NOT_READY/);
 assert.equal(d.briefs.size,0);
});
