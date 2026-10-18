import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFICIAL_SOURCES,fetchOfficialFingerprint,normalizeOfficialText,normalizeOfficialDocument,officialTopicDigests,compareOfficialTopicDigests,runOfficialSourcesOnce,listOfficialSourceReviews } from '../server/product-watcher/official-sources.js';

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
   const [key,provider,url,hash,date,error,digests]=args;
   const prev=history.get(key)||{};
   history.set(key,{source_key:key,provider,source_url:url,content_hash:hash||prev.content_hash||null,
     last_checked_at:new Date(date),last_success_at:hash?new Date(date):prev.last_success_at||null,
     last_error_code:error||null,topic_digests:digests?JSON.parse(digests):prev.topic_digests??null});
   return{rows:[]};
  }
  if(sql.startsWith('INSERT INTO vv_product_watcher_proposals')){
   const [key,provider,url,previous_hash,current_hash,possible_topics,topics_compared]=args;
   if(!proposals.some(x=>x.source_key===key&&x.current_hash===current_hash))
      proposals.push({id:proposals.length+1,source_key:key,provider,source_url:url,
        previous_hash,current_hash,possible_topics,topics_compared,review_status:'pending',created_at:new Date(),reviewed_at:null});
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

test('topic hashes identify possible changes without inventing factual price/model releases',()=>{
 const prior=officialTopicDigests('Model API description. The pricing page says 2 tokens per call. '.repeat(4));
 const next=officialTopicDigests('Model API description. The pricing page says 3 tokens per call. '.repeat(4));
 const comparison=compareOfficialTopicDigests(prior,next);
 assert.equal(comparison.compared,true);
 assert.ok(comparison.possibleTopics.includes('pricing'));
 assert.ok(comparison.possibleTopics.every(x=>['models','deprecations','pricing','limits','api'].includes(x)));
 assert.deepEqual(compareOfficialTopicDigests(null,next),{compared:false,possibleTopics:[]});
 assert.deepEqual(compareOfficialTopicDigests(prior,prior),{compared:true,possibleTopics:[]});
 assert.ok(!JSON.stringify(next).includes('2 tokens'));
 assert.ok(!JSON.stringify(next).includes('3 tokens'));
});

test('late pricing and limit changes are visible past the first 24 keyword occurrences',()=>{
 const prefix='Pricing and rate limits remain unchanged for the first model. '.repeat(40);
 const prior=officialTopicDigests(prefix+' Pricing for a late model: 2 USD. Rate limit for that model: 20 RPM.');
 const next=officialTopicDigests(prefix+' Pricing for a late model: 3 USD. Rate limit for that model: 25 RPM.');
 const difference=compareOfficialTopicDigests(prior,next);
 assert.equal(difference.compared,true);
 assert.ok(difference.possibleTopics.includes('pricing'));
 assert.ok(difference.possibleTopics.includes('limits'));
 assert.ok(!JSON.stringify(prior).includes('20 RPM'));
});

test('only exact allowlisted official docs URLs allowed, with no redirect following',async()=>{
 assert.equal(OFFICIAL_SOURCES.length,7);
 assert.deepEqual(OFFICIAL_SOURCES.filter(s=>/pricing|limits/.test(s.key)).map(s=>s.url),[
  'https://ai.google.dev/gemini-api/docs/pricing',
  'https://ai.google.dev/gemini-api/docs/rate-limits',
  'https://developers.openai.com/api/docs/pricing',
  'https://developers.openai.com/api/docs/guides/rate-limits'
 ]);
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

test('official page fingerprint excludes vendor navigation, sidebars and footers',async()=>{
 const article='<main><article><h1>Pricing and API limits</h1><p>'+
   ('Model limits and API pricing are documented for developer review. '.repeat(7))+
   '</p></article></main>';
 const navA='<nav>'+('Old menu navigation links '.repeat(20))+'</nav>';
 const navB='<nav>'+('New menu navigation links '.repeat(20))+'</nav>';
 const a='<html><body>'+navA+article+'<footer>Original legal footer</footer></body></html>';
 const b='<html><body>'+navB+article+'<footer>Revised legal footer</footer></body></html>';
 const p=OFFICIAL_SOURCES.find(x=>x.key==='openai-api-pricing');
 const one=await fetchOfficialFingerprint(p,{fetchFn:async()=>response(a)});
 const two=await fetchOfficialFingerprint(p,{fetchFn:async()=>response(b)});
 assert.equal(one.contentHash,two.contentHash);
 assert.deepEqual(one.topicDigests,two.topicDigests);
 const changed=b.replace('developer review','developer review at a new price');
 const three=await fetchOfficialFingerprint(p,{fetchFn:async()=>response(changed)});
 assert.notEqual(three.contentHash,one.contentHash);
 assert.ok(compareOfficialTopicDigests(one.topicDigests,three.topicDigests).possibleTopics.includes('pricing'));
});

test('HTML without real documentation body fails closed instead of hashing site chrome',async()=>{
 const shell='<html><body><header>'+('Vendor navigation items '.repeat(20))+'</header>'+
   '<footer>'+('Pricing support links '.repeat(20))+'</footer></body></html>';
 await assert.rejects(fetchOfficialFingerprint(OFFICIAL_SOURCES[1],{
   fetchFn:async()=>response(shell)
 }),/SOURCE_MAIN_CONTENT_MISSING/);
 const hidden='<main><nav>'+('Pricing link to vendor docs '.repeat(20))+'</nav></main>';
 assert.throws(()=>normalizeOfficialDocument(hidden),/SOURCE_NOT_READABLE/);
 const fallback='<article><h1>API notes</h1><p>'+('Model changes announced here. '.repeat(9))+
   '</p></article>';
 assert.ok(normalizeOfficialDocument(fallback).includes('API notes'));
 assert.equal(normalizeOfficialDocument('Pricing and API changes. '.repeat(9),
  {contentType:'text/plain'}).includes('API changes'),true);
});

test('JS-only release page is not mistaken for a real monitored announcement feed',async()=>{
 const shell='<html><body><noscript>You need to enable JavaScript to run this app.</noscript>'+
   '<header>'+('Product updates navigation. '.repeat(20))+'</header></body></html>';
 await assert.rejects(fetchOfficialFingerprint(OFFICIAL_SOURCES[0],{
  fetchFn:async()=>response(shell)
 }),/SOURCE_RENDER_REQUIRED/);
 const s=store();
 const report=await runOfficialSourcesOnce({pool:s.pool,env,now:at(9),
  fetchFn:async(url)=>url===OFFICIAL_SOURCES[0].url?response(shell):response()});
 assert.equal(report.status,'partial');
 assert.equal(report.items[0].code,'SOURCE_RENDER_REQUIRED');
 assert.equal(s.proposals.length,0);
 assert.equal(s.history.get(OFFICIAL_SOURCES[0].key).content_hash,null);
 assert.equal(s.history.get(OFFICIAL_SOURCES[0].key).last_error_code,'SOURCE_RENDER_REQUIRED');
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
 assert.equal(first.attempted,OFFICIAL_SOURCES.length);assert.equal(first.changed,0);
 assert.ok(first.items.every(x=>x.code==='BASELINE_CREATED'&&x.verifiedFact===false));
 assert.equal(d.proposals.length,0);
 const repeat=await runOfficialSourcesOnce({pool:d.pool,env,fetchFn,now:at(1)});
 assert.equal(repeat.attempted,0);assert.equal(requests,OFFICIAL_SOURCES.length);
 const updatedHtml=html.replace('</article>','<p>Official update follows '+('different '.repeat(20))+'</p></article>');
 const change=await runOfficialSourcesOnce({pool:d.pool,env,fetchFn:async()=>response(updatedHtml),now:at(7)});
 assert.equal(change.changed,OFFICIAL_SOURCES.length);assert.equal(d.proposals.length,OFFICIAL_SOURCES.length);
 assert.ok(change.items.every(x=>x.code==='PAGE_CHANGED_REVIEW_REQUIRED'));
 assert.ok(change.items.every(x=>x.topicsCompared===true&&Array.isArray(x.possibleTopics)));
 const unchanged=await runOfficialSourcesOnce({pool:d.pool,env,fetchFn:async()=>response(updatedHtml),now:at(14)});
 assert.equal(unchanged.changed,0);assert.equal(d.proposals.length,OFFICIAL_SOURCES.length);
 const review=await listOfficialSourceReviews(d.pool);
 assert.equal(review.proposals.length,OFFICIAL_SOURCES.length);
 assert.ok(review.proposals.every(x=>x.applied===false&&x.verifiedFact===false&&x.topicsCompared===true));
 assert.ok(review.proposals.every(x=>Array.isArray(x.possibleTopics)));
 assert.ok(!JSON.stringify(review).includes('Official update follows'));
});

test('one official source fails without blocking others or inventing a change',async()=>{
 const d=store();let n=0;
 const r=await runOfficialSourcesOnce({pool:d.pool,env,now:at(10),fetchFn:async()=>{
  n++;if(n===1)throw Error('token private');
  return response();
 }});
 assert.equal(r.status,'partial');assert.equal(r.attempted,OFFICIAL_SOURCES.length);assert.equal(r.changed,0);
 assert.equal(r.items[0].code,'SOURCE_FETCH_FAILED');assert.equal(d.history.get(OFFICIAL_SOURCES[0].key).last_error_code,'SOURCE_FETCH_FAILED');
 assert.ok(!JSON.stringify(r).includes('token private'));
});
