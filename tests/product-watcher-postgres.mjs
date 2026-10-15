import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { runProductWatcherOnce } from '../server/product-watcher/monitor.js';
import { productWatcherTick } from '../server/product-watcher/scheduler.js';
import { runOfficialSourcesOnce } from '../server/product-watcher/official-sources.js';
import { runBriefsIfDue } from '../server/product-watcher/briefs.js';
import { runContentTasksIfDue } from '../server/product-watcher/content-tasks.js';
import { deliverCriticalWatcherAlertsOnce } from '../server/product-watcher/telegram-alerts.js';
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

    await pool.query("CREATE TABLE IF NOT EXISTS vv_generation_jobs(id TEXT PRIMARY KEY,status TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL,deleted BOOLEAN NOT NULL DEFAULT false,credits_reserved INTEGER NOT NULL DEFAULT 0,provider TEXT,actual_cost NUMERIC(14,6),cost_currency TEXT)");
    await pool.query('DELETE FROM vv_generation_jobs WHERE id LIKE $1',['watcher-fixture-%']);
    await pool.query("INSERT INTO vv_generation_jobs(id,status,created_at,credits_reserved) VALUES('watcher-fixture-failed','failed',NOW()-INTERVAL '1 hour',0),('watcher-fixture-stale','processing',NOW()-INTERVAL '2 days',0),('watcher-fixture-held','finalizing',NOW()-INTERVAL '3 days',8),('watcher-fixture-ready','ready',NOW()-INTERVAL '5 minutes',0)");

    const paused=await runProductWatcherOnce({pool,env,fetchFn});
    assert.equal(paused.status,'paused');assert.equal(httpCalls,0);
    const schedulerEnv={...env,PRODUCT_WATCHER_SCHEDULER_ENABLED:'true'};
    const pausedTick=await productWatcherTick({pool,env:schedulerEnv,fetchFn});
    assert.equal(pausedTick.status,'paused');assert.equal(httpCalls,0);
    const heartbeat=await pool.query('SELECT heartbeat_at FROM vv_product_watcher_scheduler WHERE id=1');
    assert.ok(heartbeat.rows[0].heartbeat_at);

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
    assert.equal(res.body.checks.operations.status,'warning');
    assert.ok(res.body.checks.operations.alerts.some(x=>x.code==='COST_VISIBILITY_GAP'));
    assert.equal(res.body.checks.operations.currencies.length,0);
    assert.equal(httpCalls,1);
    const notDue=await productWatcherTick({pool,env:schedulerEnv,fetchFn});
    assert.equal(notDue.status,'not_due');assert.equal(httpCalls,1);

    const officialEnv={...env,PRODUCT_WATCHER_OFFICIAL_SOURCES_ENABLED:'true'};
    const officialHtml='<html><body><main><h1>Official product updates</h1><p>'+('Model announcements from official documentation. '.repeat(8))+'</p></main></body></html>';
    const first=await runOfficialSourcesOnce({pool,env:officialEnv,now:()=>new Date('2026-10-15T00:00:00Z'),
      fetchFn:async()=>new Response(officialHtml,{headers:{'content-type':'text/html'}})});
    assert.equal(first.changed,0);assert.equal(first.attempted,3);
    const second=await runOfficialSourcesOnce({pool,env:officialEnv,now:()=>new Date('2026-10-15T07:00:00Z'),
      fetchFn:async()=>new Response(officialHtml+' '+('A visible page revision. '.repeat(10)),{headers:{'content-type':'text/html'}})});
    assert.equal(second.changed,3);
    const listed=await request('GET','/api/product-watcher/admin/official-sources');
    assert.equal(listed.statusCode,200);assert.equal(listed.body.proposals.length,3);
    assert.equal(listed.body.proposals[0].applied,false);
    const proposalId=listed.body.proposals[0].id;
    const unauthorized=await request('POST','/api/product-watcher/admin/proposals/review',{user:{id:'stranger',provider:'email',email:'owner@example.test'},
      body:{proposalId,confirmProposalId:proposalId,decision:'reviewed'}});
    assert.equal(unauthorized.statusCode,403);
    const reviewed=await request('POST','/api/product-watcher/admin/proposals/review',{
      body:{proposalId,confirmProposalId:proposalId,decision:'reviewed'}});
    assert.equal(reviewed.statusCode,200);assert.equal(reviewed.body.applied,false);
    const pending=await pool.query('SELECT review_status,reviewed_by FROM vv_product_watcher_proposals WHERE id=$1',[proposalId]);
    assert.equal(pending.rows[0].review_status,'reviewed');
    assert.equal(pending.rows[0].reviewed_by,'owner-1');

    

    // Minimal isolated fixture matching only the deployed BASE content columns we inspect.
    await pool.query("CREATE TABLE IF NOT EXISTS vv_ai_template(id TEXT PRIMARY KEY,active BOOLEAN NOT NULL DEFAULT false,thumbnail TEXT,prompt_template TEXT NOT NULL DEFAULT '')");
    await pool.query("CREATE TABLE IF NOT EXISTS vv_ai_inspiration(id TEXT PRIMARY KEY,active BOOLEAN NOT NULL DEFAULT false,kind TEXT NOT NULL,rights_note TEXT NOT NULL DEFAULT '',rights_basis TEXT NOT NULL,preview_url TEXT NOT NULL DEFAULT '')");
    await pool.query("INSERT INTO vv_ai_template(id,active,thumbnail,prompt_template) VALUES('watcher-test-template',TRUE,NULL,'A prompt fixture') ON CONFLICT(id) DO NOTHING");
    await pool.query("INSERT INTO vv_ai_inspiration(id,active,kind,rights_note,rights_basis,preview_url) VALUES('watcher-test-inspiration',TRUE,'image','licensed preview','licensed','https://example.test/image.jpg') ON CONFLICT(id) DO NOTHING");
    const contentRun=await runContentTasksIfDue({pool,env:{...env,PRODUCT_WATCHER_CONTENT_TASKS_ENABLED:'true'},now:()=>new Date()});
    assert.equal(contentRun.status,'generated');
    assert.deepEqual(contentRun.generated.map(x=>x.kind),['content','opportunities']);
    const contentList=await request('GET','/api/product-watcher/admin/content-tasks');
    assert.equal(contentList.statusCode,200);
    assert.equal(contentList.body.items.length,2);
    assert.ok(contentList.body.items.some(x=>x.kind==='content'&&x.content.templates.missingThumbnail===1));
    assert.ok(contentList.body.items.some(x=>x.kind==='opportunities'&&x.content.recommendations.some(y=>y.code==='NO_APPROVED_VIDEO_EXAMPLE')));
    const contentAgain=await runContentTasksIfDue({pool,env:{...env,PRODUCT_WATCHER_CONTENT_TASKS_ENABLED:'true'},now:()=>new Date()});
    assert.equal(contentAgain.status,'not_due');

    const report=await runBriefsIfDue({pool,env:{...env,PRODUCT_WATCHER_BRIEFS_ENABLED:'true'},now:()=>new Date()});
    assert.equal(report.status,'generated');
    assert.ok(report.generated.some(x=>x.kind==='daily'));
    const duplicateReport=await runBriefsIfDue({pool,env:{...env,PRODUCT_WATCHER_BRIEFS_ENABLED:'true'},now:()=>new Date()});
    assert.equal(duplicateReport.status,'not_due');
    const briefView=await request('GET','/api/product-watcher/admin/briefs');
    assert.equal(briefView.statusCode,200);
    assert.ok(briefView.body.items.length>=1);
    assert.equal(briefView.body.items[0].content.costs.marginVerified,false);
    assert.ok(briefView.body.items[0].content.internalOpportunities.some(x=>x.code==='NO_APPROVED_VIDEO_EXAMPLE'));
    assert.ok(['ready','attention'].includes(briefView.body.items[0].content.contentChecks.status));
    assert.equal(briefView.body.items[0].content.pendingApprovals.automaticApplication,false);
    assert.equal(JSON.stringify(briefView.body).includes('watcher-fixture-failed'),false);


    // Bot API is mocked: the test runs only against the isolated watcher_test PostgreSQL.
    const critical=await pool.query(
      "INSERT INTO vv_product_watcher_alerts(fingerprint,source,code,severity,details) VALUES($1,'http','HTTP_UNAVAILABLE','critical','{}'::jsonb) RETURNING id",
      ['e'.repeat(64)]
    );
    let sentMessages=0;
    const notificationEnv={...env,PRODUCT_WATCHER_TELEGRAM_ALERTS_ENABLED:'true',
      PRODUCT_WATCHER_OWNER_TELEGRAM_CHAT_ID:'123456789',
      TELEGRAM_BOT_TOKEN:'1234567:EXAMPLE_TEST_TOKEN_NOT_LIVE_ABCDEFG'};
    const notify=await deliverCriticalWatcherAlertsOnce({pool,env:notificationEnv,fetchFn:async(_url,opts)=>{
      sentMessages++;const request=JSON.parse(opts.body);
      assert.equal(request.chat_id,'123456789');
      return{status:200,json:async()=>({ok:true})};
    }});
    assert.equal(notify.sent,1);assert.equal(sentMessages,1);
    const duplicateNotice=await deliverCriticalWatcherAlertsOnce({pool,env:notificationEnv,
      fetchFn:async()=>{throw Error('must not retry')}});
    assert.equal(duplicateNotice.attempted,0);
    const notifications=await request('GET','/api/product-watcher/admin/notifications');
    assert.equal(notifications.statusCode,200);assert.ok(notifications.body.items.some(x=>x.code==='HTTP_UNAVAILABLE'));
    assert.ok(!JSON.stringify(notifications.body).includes('EXAMPLE_TEST_TOKEN'));
    assert.ok(Number(critical.rows[0].id)>0);

    const history=await request('GET','/api/product-watcher/admin/status');
    assert.equal(history.statusCode,200);assert.equal(history.body.runs[0].status,'warning');
    assert.equal(history.body.schedulerActive,false);
    const observed=await pool.query('SELECT id,source,code,observations,acknowledged_at FROM vv_product_watcher_alerts ORDER BY id');
    assert.ok(observed.rows.some(x=>x.source==='operations'&&x.code==='COST_VISIBILITY_GAP'));
    const list=await request('GET','/api/product-watcher/admin/alerts');
    assert.equal(list.statusCode,200);
    assert.ok(list.body.items.some(x=>x.code==='COST_VISIBILITY_GAP'));
    const chosen=list.body.items.find(x=>x.code==='COST_VISIBILITY_GAP');
    const confirm=await request('POST','/api/product-watcher/admin/alerts/ack',{body:{alertId:chosen.id,confirmAlertId:chosen.id}});
    assert.equal(confirm.statusCode,200);
    const acknowledged=await pool.query('SELECT acknowledged_at,acknowledged_by FROM vv_product_watcher_alerts WHERE id=$1',[chosen.id]);
    assert.ok(acknowledged.rows[0].acknowledged_at);
    assert.equal(acknowledged.rows[0].acknowledged_by,'owner-1');
    const duplicate=await request('POST','/api/product-watcher/admin/alerts/ack',{body:{alertId:chosen.id,confirmAlertId:chosen.id}});
    assert.equal(duplicate.statusCode,409);

    assert.ok(!JSON.stringify(history.body).includes('watcher-fixture-'));
    assert.ok(history.body.runs[0].checks.operations.alerts.some(x=>x.code==='COST_VISIBILITY_GAP'));


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
