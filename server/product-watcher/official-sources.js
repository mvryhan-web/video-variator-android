import { createHash } from 'node:crypto';

export const OFFICIAL_SOURCE_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const OFFICIAL_SOURCE_MAX_BYTES = 1024 * 1024;
const LOCK_KEYS = [455033, 6];
const TIMEOUT_MS = 9000;
// Fixed approved hosts and exact paths. No user-provided URLs, redirects, credentials or proxies.
export const OFFICIAL_SOURCES = Object.freeze([
  Object.freeze({key:'byteplus-modelark',provider:'BytePlus',url:'https://docs.byteplus.com/en/docs/modelark/product-update-announcements'}),
  Object.freeze({key:'google-gemini-api',provider:'Google',url:'https://ai.google.dev/gemini-api/docs/changelog'}),
  Object.freeze({key:'google-gemini-pricing',provider:'Google',url:'https://ai.google.dev/gemini-api/docs/pricing'}),
  Object.freeze({key:'google-gemini-limits',provider:'Google',url:'https://ai.google.dev/gemini-api/docs/rate-limits'}),
  Object.freeze({key:'openai-api',provider:'OpenAI',url:'https://developers.openai.com/api/docs/changelog'}),
  Object.freeze({key:'openai-api-pricing',provider:'OpenAI',url:'https://developers.openai.com/api/docs/pricing'}),
  Object.freeze({key:'openai-api-limits',provider:'OpenAI',url:'https://developers.openai.com/api/docs/guides/rate-limits'})
]);

export function officialSourceEnabled(env={}){
  return env.PRODUCT_WATCHER_ENABLED==='true' &&
    env.PRODUCT_WATCHER_OFFICIAL_SOURCES_ENABLED==='true';
}

// Non-factual owner review hints. Only bounded, normalized keyword-context
// SHA256 digests are retained; no page text, secrets or paid AI inference.
const OFFICIAL_TOPIC_RULES = Object.freeze({
  models: /\b(?:models?|seedance|seedream|gemini|gpt[-\d]?\w*)\b/gi,
  deprecations: /\b(?:deprecat\w*|sunset|retir\w*|end.of.life|discontinu\w*)\b/gi,
  pricing: /\b(?:pric(?:e|es|ing)|costs?|billing|per million tokens?)\b/gi,
  limits: /\b(?:rate limits?|quotas?|throughput|context windows?|token limits?|qps|rpm|tpm)\b/gi,
  api: /\b(?:api|endpoint|endpoints|sdks?|parameters?|schemas?)\b/gi
});
export const OFFICIAL_TOPIC_CATEGORIES = Object.freeze(Object.keys(OFFICIAL_TOPIC_RULES));
export function officialTopicDigests(visibleText) {
  if(typeof visibleText!=='string'||visibleText.length>OFFICIAL_SOURCE_MAX_BYTES) throw Error('SOURCE_TOO_LARGE');
  const out={};
  for(const [topic,regexp] of Object.entries(OFFICIAL_TOPIC_RULES)){
    // Stream every relevant context rather than only the first 24. Pricing and
    // deprecation entries often appear late in long, reverse-chronological docs.
    // The 1 MiB page cap bounds scanning; only the final digest is retained.
    const hash=createHash('sha256');
    let count=0;
    regexp.lastIndex=0;
    for(const match of visibleText.matchAll(regexp)){
      const start=Math.max(0,match.index-90),end=Math.min(visibleText.length,match.index+match[0].length+90);
      const context=visibleText.slice(start,end);
      hash.update(String(context.length)).update(':').update(context);
      count++;
    }
    if(count)out[topic]=hash.digest('hex');
  }
  return out;
}
export function compareOfficialTopicDigests(previous,current){
  if(!previous||typeof previous!=='object'||Array.isArray(previous))
    return {compared:false,possibleTopics:[]};
  return {compared:true,possibleTopics:OFFICIAL_TOPIC_CATEGORIES.filter(k=>previous[k]!==current?.[k])};
}

export function normalizeOfficialText(html){
  // Extract conservative visible text; unstable markup is not stored or treated as a verified fact.
  const content=String(html).replace(/<!--[\s\S]*?-->/g,' ')
    .replace(/<(?:script|style|svg|noscript|template)\b[^>]*>[\s\S]*?<\/(?:script|style|svg|noscript|template)\s*>/gi,' ')
    .replace(/<[^>]*>/g,' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi,' ')
    .replace(/\s+/g,' ').trim();
  if(content.length<100)throw Error('SOURCE_NOT_READABLE');
  return content;
}

/**
 * Fingerprint only the actual documentation content, not the vendor's global
 * navigation, cookie prompts, sidebar or footer. Never treat a navigation-only
 * HTML shell as a successfully scanned release/price/limits document.
 * This is deliberately fail-closed: sites with different semantic markup need
 * a reviewed adapter rather than a misleading 'no change' baseline.
 */
export function normalizeOfficialDocument(raw,{contentType='text/html'}={}){
  if(/^text\/plain(?:\s*;|$)/i.test(contentType))return normalizeOfficialText(raw);
  const withoutScripts=String(raw)
    .replace(/<!--[\s\S]*?-->/g,' ')
    .replace(/<(?:script|style|svg|noscript|template)\b[^>]*>[\s\S]*?<\/(?:script|style|svg|noscript|template)\s*>/gi,' ');
  const main=withoutScripts.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i)
    ||withoutScripts.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i);
  if(!main)throw Error('SOURCE_MAIN_CONTENT_MISSING');
  const content=main[1].replace(
    /<(nav|header|footer|aside|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ');
  return normalizeOfficialText(content);
}

export async function fetchOfficialFingerprint(source,{fetchFn=globalThis.fetch}={}){
  if(!OFFICIAL_SOURCES.some(x=>x.key===source?.key && x.url===source?.url && x.provider===source?.provider))
    throw Error('SOURCE_NOT_ALLOWLISTED');
  const url=new URL(source.url);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('SOURCE_NOT_ALLOWLISTED');
  let response;
  try{
    response=await fetchFn(source.url,{
      method:'GET',redirect:'error',signal:AbortSignal.timeout(TIMEOUT_MS),
      headers:{Accept:'text/html,text/plain;q=0.9','User-Agent':'Deepsyq-Product-Watcher/0.1 (read-only)'}
    });
    if(response?.status!==200)throw Error('SOURCE_HTTP_UNAVAILABLE');
    const type=String(response.headers?.get('content-type')||'').toLowerCase();
    if(!/^(text\/html|text\/plain|application\/xhtml\+xml)(?:\s*;|$)/.test(type))throw Error('SOURCE_CONTENT_TYPE');
    const announced=Number(response.headers?.get('content-length')||0);
    if(announced>OFFICIAL_SOURCE_MAX_BYTES)throw Error('SOURCE_TOO_LARGE');
    const reader=response.body?.getReader?.();
    if(!reader)throw Error('SOURCE_BODY_UNAVAILABLE');
    const chunks=[];let count=0;
    try{
      while(true){
        const {value,done}=await reader.read();
        if(done)break;
        count+=value?.byteLength||0;
        if(count>OFFICIAL_SOURCE_MAX_BYTES)throw Error('SOURCE_TOO_LARGE');
        chunks.push(value);
      }
    } finally {reader.releaseLock();}
    if(count===0)throw Error('SOURCE_EMPTY');
    const data=new Uint8Array(count);let offset=0;
    for(const part of chunks){data.set(part,offset);offset+=part.byteLength;}
    const rawHtml=new TextDecoder('utf-8',{fatal:true}).decode(data);
    // A JavaScript-only shell is NOT evidence that the vendor's release notes
    // have been scanned. The notice is commonly inside <noscript>, which the
    // visible-text normalizer intentionally removes. Fail closed before it.
    if(/you need to enable javascript to run this app/i.test(rawHtml))
      throw Error('SOURCE_RENDER_REQUIRED');
    const visible=normalizeOfficialDocument(rawHtml,{contentType:type});
    return {contentHash:createHash('sha256').update(visible).digest('hex'),
      topicDigests:officialTopicDigests(visible),byteLength:count};
  } catch(error){
    // Throw only bounded, fixed error codes: never surface external HTML or credentials.
    if(/^(SOURCE_[A-Z_]+)$/.test(error?.message||''))throw error;
    throw Error('SOURCE_FETCH_FAILED');
  } finally {
    await response?.body?.cancel?.().catch(()=>{});
  }
}

export async function runOfficialSourcesOnce({pool,env={},fetchFn=globalThis.fetch,now=()=>new Date()}={}){
  if(!officialSourceEnabled(env))return{status:'disabled',attempted:0,changed:0,items:[]};
  if(!pool?.connect)throw Error('WATCHER_DATABASE_NOT_CONFIGURED');
  const client=await pool.connect();
  let locked=false;
  try{
    const lock=await client.query('SELECT pg_try_advisory_lock($1,$2) AS acquired',LOCK_KEYS);
    locked=lock.rows?.[0]?.acquired===true;
    if(!locked)return{status:'skipped',attempted:0,changed:0,items:[]};
    const control=await client.query('SELECT paused FROM vv_product_watcher_control WHERE id=1');
    if(control.rows?.length!==1)throw Error('WATCHER_SCHEMA_NOT_READY');
    if(control.rows[0].paused)return{status:'paused',attempted:0,changed:0,items:[]};
    const result={status:'ok',attempted:0,changed:0,items:[]};
    for(const source of OFFICIAL_SOURCES){
      const existing=await client.query('SELECT content_hash,last_checked_at,topic_digests FROM vv_product_watcher_official_sources WHERE source_key=$1',[source.key]);
      const prev=existing.rows?.[0];
      const last=prev?.last_checked_at?new Date(prev.last_checked_at).getTime():null;
      const tick=now().getTime();
      if(!Number.isFinite(tick))throw Error('WATCHER_INVALID_CLOCK');
      if(last!==null&&Number.isFinite(last)&&tick-last<OFFICIAL_SOURCE_INTERVAL_MS)continue;
      result.attempted++;
      const checkedAt=now().toISOString();
      let hash=null,error=null,bytes=null,topicDigests=null;
      let topicComparison={compared:false,possibleTopics:[]};
      try{
        const fetched=await fetchOfficialFingerprint(source,{fetchFn});
        hash=fetched.contentHash;bytes=fetched.byteLength;topicDigests=fetched.topicDigests;
      }catch(e){error=/^SOURCE_[A-Z_]+$/.test(e?.message||'')?e.message:'SOURCE_FETCH_FAILED';}
      await client.query('BEGIN');
      try{
        await client.query([
          'INSERT INTO vv_product_watcher_official_sources(source_key,provider,source_url,content_hash,last_checked_at,last_success_at,last_error_code,topic_digests)',
          'VALUES ($1,$2,$3,$4::char(64),$5::timestamptz,CASE WHEN $4::char(64) IS NULL THEN NULL ELSE $5::timestamptz END,$6,$7::jsonb)',
          'ON CONFLICT(source_key) DO UPDATE SET provider=EXCLUDED.provider,source_url=EXCLUDED.source_url,',
          'content_hash=COALESCE(EXCLUDED.content_hash,vv_product_watcher_official_sources.content_hash),',
          'last_checked_at=EXCLUDED.last_checked_at,',
          'last_success_at=COALESCE(EXCLUDED.last_success_at,vv_product_watcher_official_sources.last_success_at),',
          'last_error_code=EXCLUDED.last_error_code,',
          'topic_digests=COALESCE(EXCLUDED.topic_digests,vv_product_watcher_official_sources.topic_digests)'
        ].join(' '),[source.key,source.provider,source.url,hash,checkedAt,error,
          topicDigests===null?null:JSON.stringify(topicDigests)]);
        topicComparison=compareOfficialTopicDigests(prev?.topic_digests,topicDigests);
        if(hash&&prev?.content_hash&&prev.content_hash!==hash){
          await client.query([
            'INSERT INTO vv_product_watcher_proposals(source_key,provider,source_url,previous_hash,current_hash,review_status,possible_topics,topics_compared)',
            "VALUES($1,$2,$3,$4,$5,'pending',$6::text[],$7) ON CONFLICT(source_key,current_hash) DO NOTHING"
          ].join(' '),[source.key,source.provider,source.url,prev.content_hash,hash,
            topicComparison.possibleTopics,topicComparison.compared]);
          result.changed++;
        }
        await client.query('COMMIT');
      }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
      result.items.push({sourceKey:source.key,provider:source.provider,sourceUrl:source.url,
        code:error||(!prev?.content_hash?'BASELINE_CREATED':prev.content_hash===hash?'UNCHANGED':'PAGE_CHANGED_REVIEW_REQUIRED'),
        // No raw announcements or unverified model/pricing claims.
        verifiedFact:false,possibleTopics:hash&&prev?.content_hash&&prev.content_hash!==hash?topicComparison.possibleTopics:[],
        topicsCompared:!!(hash&&prev?.content_hash&&prev.content_hash!==hash&&topicComparison.compared),
        bytes:bytes??null});
    }
    if(result.items.some(x=>x.code.startsWith('SOURCE_')))result.status='partial';
    return result;
  }finally{
    if(locked)await client.query('SELECT pg_advisory_unlock($1,$2)',LOCK_KEYS).catch(()=>{});
    client.release();
  }
}

export async function listOfficialSourceReviews(pool){
  const [sources,proposals]=await Promise.all([
    pool.query('SELECT source_key,provider,source_url,last_checked_at,last_success_at,last_error_code FROM vv_product_watcher_official_sources ORDER BY source_key'),
    pool.query('SELECT id,source_key,provider,source_url,review_status,created_at,reviewed_at,possible_topics,topics_compared FROM vv_product_watcher_proposals ORDER BY created_at DESC,id DESC LIMIT 50')
  ]);
  return{
    sources:sources.rows.map(x=>({key:x.source_key,provider:x.provider,url:x.source_url,
      lastCheckedAt:x.last_checked_at,lastSuccessAt:x.last_success_at,lastErrorCode:x.last_error_code})),
    proposals:proposals.rows.map(x=>({id:Number(x.id),sourceKey:x.source_key,provider:x.provider,url:x.source_url,
      status:x.review_status,detectedAt:x.created_at,reviewedAt:x.reviewed_at,
      possibleTopics:Array.isArray(x.possible_topics)?x.possible_topics.filter(t=>OFFICIAL_TOPIC_CATEGORIES.includes(t)):[],
      topicsCompared:x.topics_compared===true,
      verifiedFact:false,applied:false}))
  };
}
