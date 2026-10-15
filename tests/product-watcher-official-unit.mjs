import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFICIAL_SOURCES,fetchOfficialFingerprint,normalizeOfficialText,runOfficialSourcesOnce,listOfficialSourceReviews } from '../server/product-watcher/official-sources.js';

const env={PRODUCT_WATCHER_ENABLED:'true',PRODUCT_WATCHER_OFFICIAL_SOURCES_ENABLED:'true'};
const html='<html><body><main><article><h1>Documented API release notes</h1><p>'+('Official source text about API changes and model announcements. '.repeat(8))+'</p></article></main></body></html>';
function response(text=html,opts={}) {return new Response(text,{status:opts.status||200,headers:{'content-type':opts.type||'text/html'}});}
function store({paused=false,locked=false}={}){
 const history=new Map(),proposals=[],queries=[];
 const client={async query(sql,args=[]){
  queries.push({sql,args});
  if(sql.includes('pg_try_advisory_lock'))return{rows:[{acquired:!locked}]};
  if(sql.includes('pg_advisory_unlock'))return{rows:[]};
  if(sql==='SELECT paused FROM vv_product_watcher_control WHERE id=1')return{rows:[{paused}]};
  if(sql.startsWith('SELECT content_hash,last_checked_at'))return{rows:history.has(args[0])?[history.get(args[0])]:[]};
  if(sql.startsWith('INSERT INTO vv_product_watcher_official_sources')){
   const [key,provider,url,hash,date,error]=args;
   const prev=history.get(key)||{};
   history.set(key,{source_key:key,provider,source_url:url,content_hash:hash||prev.content_hash||null,
     last_checked_at:new Date(date),last_success_at:hash?new Date(date):prev.last_success_at||null,last_error_code:error||null});
   return{rows:[]};
  }
  if(sql.startsWith('INSERT INTO vv_product_watcher_proposals')){
   const [key,provider,url,previous_hash,current_hash]=args;
   if(!proposals.some(x=>x.source_key===key&&x.current_hash===current_hash))
      proposals.push({id:proposals.length+1,source_key:key,provider,source_url:url,
        previous_hash,current_hash,review_status:'pending',created_at:new Date(),reviewed_at:null});
   return{rows:[]};
  }
  if(sql.startsWith('SELECT source_key,provider,source_url,last_checked_at'))return{rows:[...history.values()]};
  if(sql.startsWith('SELECT id,source_key,provider,source_url,review_status'))return{rows:proposals};
  if(['BEGIN','ROLLBACK','COMMIT'].includes(sql))return{rows:[]};
  throw Error('UNEXPECTED_SQL:'+sql);
 },release(){queries.push({sql:'RELEASE'});}};
 return {pool:{connect:async()=>client,query:client.query},history,proposals,queries};
}
const at=(h=12)=>()=>new Date('2026-10-15T'+String(h).padStart(2,'0')+':00:00Z');

test('only exact allowlisted official docs URLs allowed, with no redirect following',async()=>{
 assert.equal(OFFICIAL_SOURCES.length,3);
 await assert.rejects(fetchOfficialFingerprint({key:'google-gemini-api',provider:'Google',url:'https://evil.example/private'},
  {fetchFn:async()=>{throw Error('MUST_NOT_CALL')}}),/SOURCE_NOT_ALLOWLISTED/);
 let count=0;
 const result=await fetchOfficialFingerprint(OFFICIAL_SOURCES[0],{fetchFn:async(url,init)=>{
  count++;assert.equal(url,OFFICIAL_SOURCES[0].url);
  assert.equal(init.redirect,'error');assert.equal(init.method,'GET');
  return response();
 }});
 assert.equal(result.contentHash.length,64);assert.equal(count,1);
});

test('a small, deterministic visible text extraction ignores scripts and markup',()=>{
 const a=normalizeOfficialText('<h1>Hello</h1><script>window.secret="password"</script>'+html);
 assert.ok(a.includes('Documented API release notes'));
 assert.equal(a.includes('window.secret'),false);
 assert.throws(()=>normalizeOfficialText('<p>empty</p>'),/SOURCE_NOT_READABLE/);
});

test('HTML size/content-type/status/network errors fail safely without exposing content',async()=>{
 for(const stub of [
  async()=>response(html,{status:503}),
  async()=>response(html,{type:'application/json'}),
  async()=>new Response('x'.repeat(1024*1024+1),{headers:{'content-type':'text/html'}}),
  async()=>{throw Error('https://user:private@evil.example')}
 ]){
  await assert.rejects(fetchOfficialFingerprint(OFFICIAL_SOURCES[0],{fetchFn:stub}),
    x=>x.message.startsWith('SOURCE_')&&!x.message.includes('private'));
 }
});

test('disabled never touches network or database',async()=>{
 const r=await runOfficialSourcesOnce({env:{},fetchFn:()=>{throw Error('should not fetch')}});
 assert.equal(r.status,'disabled');assert.equal(r.attempted,0);
});

test('owner pause and overlapping lock prevent all outside network calls',async()=>{
 for(const opts of [{paused:true},{locked:true}]){
  const d=store(opts);let calls=0;
  const r=await runOfficialSourcesOnce({pool:d.pool,env,fetchFn:async()=>{calls++;return response()}});
  assert.equal(r.status,opts.paused?'paused':'skipped');assert.equal(calls,0);
  assert.equal(d.proposals.length,0);
 }
});

test('first check creates baselines only, changes require review, unchanged not duplicated',async()=>{
 const d=store();
 let requests=0;
 const fetchFn=async()=>{requests++;return response();};
 const first=await runOfficialSourcesOnce({pool:d.pool,env,fetchFn,now:at(0)});
 assert.equal(first.attempted,3);assert.equal(first.changed,0);
 assert.ok(first.items.every(x=>x.code==='BASELINE_CREATED'&&x.verifiedFact===false));
 assert.equal(d.proposals.length,0);
 const repeat=await runOfficialSourcesOnce({pool:d.pool,env,fetchFn,now:at(1)});
 assert.equal(repeat.attempted,0);assert.equal(requests,3);
 const change=await runOfficialSourcesOnce({pool:d.pool,env,fetchFn:async()=>response(html+' Official update follows '+('different '.repeat(20))),now:at(7)});
 assert.equal(change.changed,3);assert.equal(d.proposals.length,3);
 assert.ok(change.items.every(x=>x.code==='PAGE_CHANGED_REVIEW_REQUIRED'));
 const unchanged=await runOfficialSourcesOnce({pool:d.pool,env,fetchFn:async()=>response(html+' Official update follows '+('different '.repeat(20))),now:at(14)});
 assert.equal(unchanged.changed,0);assert.equal(d.proposals.length,3);
 const review=await listOfficialSourceReviews(d.pool);
 assert.equal(review.proposals.length,3);assert.ok(review.proposals.every(x=>x.applied===false&&x.verifiedFact===false));
 assert.ok(!JSON.stringify(review).includes('Official update follows'));
});

test('one official source fails without blocking others or inventing a change',async()=>{
 const d=store();let n=0;
 const r=await runOfficialSourcesOnce({pool:d.pool,env,now:at(10),fetchFn:async()=>{
  n++;if(n===1)throw Error('token private');
  return response();
 }});
 assert.equal(r.status,'partial');assert.equal(r.attempted,3);assert.equal(r.changed,0);
 assert.equal(r.items[0].code,'SOURCE_FETCH_FAILED');assert.equal(d.history.get(OFFICIAL_SOURCES[0].key).last_error_code,'SOURCE_FETCH_FAILED');
 assert.ok(!JSON.stringify(r).includes('token private'));
});
