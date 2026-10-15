import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { runProductWatcherOnce } from '../server/product-watcher/monitor.js';
import { installProductWatcher } from '../server/product-watcher/admin-api.js';

const url = process.env.PRODUCT_WATCHER_TEST_DB_URL || '';
const expected = 'watcher_test';
let safe = false;
try {
  const parsed = new URL(url);
  safe = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) &&
    parsed.pathname === '/' + expected && ['postgres:', 'postgresql:'].includes(parsed.protocol);
} catch {}

test('isolated PostgreSQL acceptance: migration, pause, findings, history, owner audit and overlap', {skip:!safe}, async()=>{
  const {Pool} = pg;
  const pool = new Pool({connectionString:url,ssl:false,connectionTimeoutMillis:3000});
  const env = {
    PRODUCT_WATCHER_ENABLED:'true',ADMIN_EMAIL:'owner@example.test',
    NODE_ENV:'production',APP_URL:'https://deepsyq.example/'
  };
  let httpCalls=0;
  const fetchFn=async()=>{httpCalls++;return{ok:true,headers:{get:()=>null},json:async()=>({ok:true})};};
  try {
    const sql=await readFile(new URL('../server/migrations/20261015-product-watcher.sql',import.meta.url),'utf8');
    // Runs only against the explicitly named localhost watcher_test database.
    await pool.query(sql);
    await pool.query(sql);
    const state=await pool.query('SELECT id,paused FROM vv_product_watcher_control');
    assert.deepEqual(state.rows,[{id:1,paused:true}]);

    await pool.query("CREATE TABLE IF NOT EXISTS vv_generation_jobs(id TEXT PRIMARY KEY,status TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL,deleted BOOLEAN NOT NULL DEFAULT false,credits_reserved INTEGER NOT NULL DEFAULT 0)");
    await pool.query('DELETE FROM vv_generation_jobs WHERE id LIKE $1',['watcher-fixture-%']);
    await pool.query("INSERT INTO vv_generation_jobs(id,status,created_at,credits_reserved) VALUES('watcher-fixture-failed','failed',NOW()-INTERVAL '1 hour',0),('watcher-fixture-stale','processing',NOW()-INTERVAL '2 days',0),('watcher-fixture-held','finalizing',NOW()-INTERVAL '3 days',8),('watcher-fixture-ready','ready',NOW()-INTERVAL '5 minutes',0)");

    const paused=await runProductWatcherOnce({pool,env,fetchFn});
    assert.equal(paused.status,'paused');assert.equal(httpCalls,0);

    const app={routes:new Map(),get(path,...fns){this.routes.set('GET '+path,fns);},post(path,...fns){this.routes.set('POST '+path,fns);}};
    installProductWatcher(app,{auth:(req,_res,next)=>next(),pool,env,fetchFn});
    async function request(method,path,{user={id:'owner-1',provider:'google',email:'owner@example.test'},body={}}={}){
      const fns=app.routes.get(method+' '+path);assert.ok(fns);
      const req={user,body},res={statusCode:200,body:null,status(n){this.statusCode=n;return this;},json(x){this.body=x;return x;}};
      async function dispatch(i=0){if(i>=fns.length)return;return fns[i](req,res,()=>dispatch(i+1));}
      await dispatch();return res;
    }
    const denied=await request('GET','/api/product-watcher/admin/status',{user:{id:'x',provider:'email',email:'owner@example.test'}});
    assert.equal(denied.statusCode,403);

    let res=await request('POST','/api/product-watcher/admin/control',{body:{action:'resume'}});
    assert.equal(res.statusCode,200);assert.equal(res.body.paused,false);
    const audit=await pool.query("SELECT action,actor_user_id FROM vv_admin_audit WHERE action='product_watcher.resume'");
    assert.ok(audit.rows.some(x=>x.actor_user_id==='owner-1'));

    res=await request('POST','/api/product-watcher/admin/run');
    assert.equal(res.statusCode,200);assert.equal(res.body.status,'warning');
    assert.equal(res.body.checks.generations.counts.failed_24h,1);
    assert.equal(res.body.checks.generations.counts.stale_24h,1);
    assert.equal(res.body.checks.generations.counts.held_review_24h,1);
    assert.equal(httpCalls,1);

    const history=await request('GET','/api/product-watcher/admin/status');
    assert.equal(history.statusCode,200);assert.equal(history.body.runs[0].status,'warning');
    assert.equal(history.body.schedulerActive,false);
    assert.ok(!JSON.stringify(history.body).includes('watcher-fixture-'));

    // A second Postgres session owns the lock; the contender neither contacts HTTP
    // nor inserts a report and must return an explicitly skipped state.
    const locker=await pool.connect();
    try {
      await locker.query('SELECT pg_advisory_lock($1,$2)',[455033,5]);
      const blocked=await runProductWatcherOnce({pool,env,fetchFn});
      assert.equal(blocked.status,'skipped');assert.equal(httpCalls,1);
    } finally {
      await locker.query('SELECT pg_advisory_unlock($1,$2)',[455033,5]);
      locker.release();
    }

    res=await request('POST','/api/product-watcher/admin/control',{body:{action:'pause'}});
    assert.equal(res.body.paused,true);
    const noRun=await request('POST','/api/product-watcher/admin/run');
    assert.equal(noRun.body.status,'paused');
    assert.equal(httpCalls,1);
  } finally {await pool.end();}
});
