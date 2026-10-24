import test from 'node:test';
import assert from 'node:assert/strict';
import { watcherConfig, runProductWatcherOnce, checkGenerationJobs, summarizeChecks } from '../server/product-watcher/monitor.js';

function mockPool({counts={}, schema=true, failDb=false, lock=true}={}) {
  const seen=[];
  const client={
    async query(sql,params){
      seen.push([sql,params]);
      if(sql.includes('pg_try_advisory_lock'))return {rows:[{acquired:lock}]};
      if(sql.includes('pg_advisory_unlock'))return {rows:[{pg_advisory_unlock:true}]};
      if(sql==='SELECT paused FROM vv_product_watcher_control WHERE id=1')return {rows:[{paused:false}]};
      if(sql==='SELECT created_at FROM vv_product_watcher_runs ORDER BY id DESC LIMIT 1')return{rows:[]};
      if(sql==='SELECT 1 AS alive'){if(failDb)throw Error('password=secret');return{rows:[{alive:1}]};}
      if(sql.includes('to_regclass'))return {rows:[{table_name:schema?'vv_generation_jobs':null}]};
      if(sql.includes('FROM vv_generation_jobs'))return {rows:[counts]};
      if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return{rows:[]};
      if(sql.includes('INSERT INTO vv_product_watcher_alerts'))return{rows:[]};
      if(sql.includes('INSERT INTO vv_product_watcher_runs'))return {rows:[{id:'14'}]};
      throw Error('UNEXPECTED_SQL:'+sql);
    },
    release(){seen.push(['RELEASE']);}
  };
  return{ seen, connect:async()=>client };
}
const env={PRODUCT_WATCHER_ENABLED:'true',NODE_ENV:'production',APP_URL:'https://deepsyq.example/'};
const fetchFn=async()=>({ok:true,status:200,headers:{get:()=>null},json:async()=>({ok:true})});

test('disabled by default: no DB or network touched', async()=>{
 const r=await runProductWatcherOnce({env:{},fetchFn:()=>{throw Error('must not fetch')}});
 assert.equal(r.status,'disabled');
});

test('requires HTTPS in production and rejects embedded credentials or path',()=>{
 assert.throws(()=>watcherConfig({...env,APP_URL:'http://example.com/'}),/WATCHER_INVALID_BASE_URL/);
 assert.throws(()=>watcherConfig({...env,APP_URL:'https://user:pass@example.com/'}),/WATCHER_INVALID_BASE_URL/);
 assert.throws(()=>watcherConfig({...env,APP_URL:'https://example.com/secret'}),/WATCHER_INVALID_BASE_URL/);
 assert.deepEqual(watcherConfig({}).enabled,false);
 assert.equal(watcherConfig(env).healthUrl,'https://deepsyq.example/api/health');
});

test('healthy run writes only safe aggregate data and releases advisory lock',async()=>{
 const pool=mockPool();const r=await runProductWatcherOnce({pool,env,fetchFn,now:()=>new Date('2026-10-15T00:00:00Z')});
 assert.equal(r.status,'healthy');assert.equal(r.runId,14);
 assert.equal(r.checkedAt,'2026-10-15T00:00:00.000Z');
 assert.equal(r.checks.generations.counts.total_24h,0);
 assert.ok(pool.seen.some(([sql])=>sql.includes('INSERT INTO vv_product_watcher_runs')));
 assert.ok(pool.seen.some(([sql])=>sql.includes('pg_advisory_unlock')));
 assert.equal(pool.seen.at(-1)[0],'RELEASE');
 assert.ok(!JSON.stringify(r).includes('secret'));
});

test('unhealthy health endpoint and generation failures are recorded as issues',async()=>{
 const pool=mockPool({counts:{total_24h:5,failed_24h:2,unknown_24h:1,stale_24h:1,held_review_24h:1}});
 const r=await runProductWatcherOnce({pool,env,fetchFn:async()=>({ok:false,status:503})});
 assert.equal(r.status,'critical');assert.deepEqual(r.findings.map(x=>x.source),['http','generations']);
 assert.equal(r.checks.generations.counts.failed_24h,2);
});

test('provider/internal database errors never expose exception secrets',async()=>{
 const pool=mockPool({failDb:true,schema:false});
 const r=await runProductWatcherOnce({pool,env,fetchFn:async()=>{throw Error('https://user:password@server/private')}});
 assert.equal(r.status,'critical');assert.equal(r.checks.database.code,'DB_UNAVAILABLE');
 assert.equal(r.checks.generations.code,'GENERATION_SCHEMA_NOT_READY');
 assert.equal(JSON.stringify(r).includes('password'),false);
});

test('overlap is skipped without writes; dry-run has no persistence writes',async()=>{
 const overlap=mockPool({lock:false});
 const a=await runProductWatcherOnce({pool:overlap,env,fetchFn});
 assert.equal(a.status,'skipped');assert.equal(overlap.seen.filter(([s])=>s.includes('INSERT')).length,0);
 const pool=mockPool();const b=await runProductWatcherOnce({pool,env,fetchFn,persist:false});
 assert.equal(b.status,'healthy');assert.equal(b.runId,undefined);
 assert.equal(pool.seen.filter(([s])=>s.includes('INSERT')).length,0);
});

test('unknown missing schema reported without throwing; severity picks worst',async()=>{
 const pool=mockPool({schema:false});const client=await pool.connect();
 assert.equal((await checkGenerationJobs(client)).status,'warning');
 assert.equal(summarizeChecks({a:{status:'healthy'},b:{status:'critical'}}).status,'critical');
});


test('persisted checks do not call external service if owner paused',async()=>{
 const pool=mockPool();const original=pool.connect;pool.connect=async()=>{
   const c=await original(),query=c.query;
   c.query=async(sql,params)=>sql==='SELECT paused FROM vv_product_watcher_control WHERE id=1'?{rows:[{paused:true}]}:query(sql,params);
   return c;
 };
 let calls=0;
 const r=await runProductWatcherOnce({pool,env,fetchFn:async()=>{calls++;throw Error('NOT_EXPECTED')}});
 assert.equal(r.status,'paused');assert.equal(calls,0);
 assert.equal(pool.seen.filter(([sql])=>sql.includes('INSERT INTO vv_product_watcher_runs')).length,0);
 assert.ok(pool.seen.some(([sql])=>sql.includes('pg_advisory_unlock')));
});

test('very old stuck and held credit jobs are still included in aggregate SQL',async()=>{
 const pool=mockPool();await runProductWatcherOnce({pool,env,fetchFn});
 const sql=pool.seen.find(([s])=>s.includes('FROM vv_generation_jobs'))?.[0]||'';
 assert.match(sql,/created_at >= NOW\(\) - INTERVAL '24 hours' OR status IN/);
 assert.match(sql,/deleted=false/);
 assert.match(sql,/stale_24h/);
 assert.match(sql,/held_review_24h/);
});


test('minimum interval is rechecked inside lock before HTTP or insertion',async()=>{
 const pool=mockPool();
 const original=pool.connect;pool.connect=async()=>{const c=await original(),base=c.query;
  c.query=async(sql,params)=>sql.startsWith('SELECT created_at FROM vv_product_watcher_runs')
    ?{rows:[{created_at:new Date('2026-10-15T11:50:00Z')}]}:base(sql,params);
  return c;
 };
 let calls=0;const report=await runProductWatcherOnce({
  pool,env,persist:true,now:()=>new Date('2026-10-15T12:00:00Z'),minimumIntervalMs:900000,
  fetchFn:async()=>{calls++;throw Error('unexpected')}
 });
 assert.equal(report.status,'not_due');assert.equal(calls,0);
 assert.ok(pool.seen.some(([s])=>s.includes('pg_advisory_unlock')));
});

function makeStreamResponse({ chunks = [], contentLength = null, ok = true, status = 200 }) {
  let cancelled = false;
  let chunkIdx = 0;
  const stream = {
    getReader() {
      return {
        async read() {
          if (cancelled || chunkIdx >= chunks.length) {
            return { done: true, value: undefined };
          }
          const value = chunks[chunkIdx++];
          return { done: false, value };
        },
        async cancel() {
          cancelled = true;
        }
      };
    }
  };
  return {
    ok,
    status,
    headers: {
      get: (h) => (h.toLowerCase() === 'content-length' ? contentLength : null)
    },
    body: stream,
    get isCancelled() {
      return cancelled;
    }
  };
}

test('httpHealth handles valid small {ok:true} streamed JSON', async () => {
  const pool = mockPool();
  const resp = makeStreamResponse({
    chunks: [new TextEncoder().encode('{"ok":true}')]
  });
  const r = await runProductWatcherOnce({ pool, env, fetchFn: async () => resp });
  assert.equal(r.checks.http.status, 'healthy');
  assert.equal(r.checks.http.code, 'HTTP_OK');
});

test('httpHealth caps streamed body to 16KiB and cancels reader if body exceeds limit (lying small Content-Length header)', async () => {
  const pool = mockPool();
  const bigChunk = new Uint8Array(17000);
  const resp = makeStreamResponse({
    contentLength: '100',
    chunks: [bigChunk]
  });
  const r = await runProductWatcherOnce({ pool, env, fetchFn: async () => resp });
  assert.equal(r.checks.http.status, 'critical');
  assert.equal(r.checks.http.code, 'HEALTH_RESPONSE_TOO_LARGE');
  assert.equal(resp.isCancelled, true);
});

test('httpHealth caps chunked 17KiB stream across multiple chunks and cancels reader', async () => {
  const pool = mockPool();
  const chunk1 = new Uint8Array(8192);
  const chunk2 = new Uint8Array(8192);
  const chunk3 = new Uint8Array(1024);
  const resp = makeStreamResponse({
    contentLength: null,
    chunks: [chunk1, chunk2, chunk3]
  });
  const r = await runProductWatcherOnce({ pool, env, fetchFn: async () => resp });
  assert.equal(r.checks.http.status, 'critical');
  assert.equal(r.checks.http.code, 'HEALTH_RESPONSE_TOO_LARGE');
  assert.equal(resp.isCancelled, true);
});

test('httpHealth returns HEALTH_CHECK_FAILED for malformed/truncated JSON body', async () => {
  const pool = mockPool();
  const resp = makeStreamResponse({
    chunks: [new TextEncoder().encode('{"ok": tr')]
  });
  const r = await runProductWatcherOnce({ pool, env, fetchFn: async () => resp });
  assert.equal(r.checks.http.status, 'critical');
  assert.equal(r.checks.http.code, 'HEALTH_CHECK_FAILED');
});

test('httpHealth redacts exception details and returns safe error code on reader throw', async () => {
  const pool = mockPool();
  const resp = {
    ok: true,
    status: 200,
    headers: { get: () => null },
    body: {
      getReader() {
        return {
          async read() {
            throw Error('https://secret:api_key_12345@private.internal/stream_failure');
          },
          async cancel() {}
        };
      }
    }
  };
  const r = await runProductWatcherOnce({ pool, env, fetchFn: async () => resp });
  assert.equal(r.checks.http.status, 'critical');
  assert.equal(r.checks.http.code, 'HTTP_CHECK_ERROR');
  assert.equal(JSON.stringify(r).includes('api_key_12345'), false);
  assert.equal(JSON.stringify(r).includes('secret'), false);
});
