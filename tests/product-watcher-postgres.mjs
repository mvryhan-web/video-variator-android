import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { runProductWatcherOnce } from '../server/product-watcher/monitor.js';
import { productWatcherTick } from '../server/product-watcher/scheduler.js';
import { OFFICIAL_SOURCES, runOfficialSourcesOnce } from '../server/product-watcher/official-sources.js';
import { runBriefsIfDue } from '../server/product-watcher/briefs.js';
import { runContentTasksIfDue } from '../server/product-watcher/content-tasks.js';
import { deliverCriticalWatcherAlertsOnce } from '../server/product-watcher/telegram-alerts.js';
import {watcherDeploymentReadiness} from '../server/product-watcher/readiness.js';
import {checkBillingReconciliation} from '../server/product-watcher/billing-signals.js';
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
    const preflight=await watcherDeploymentReadiness(pool,{
      env:{...env,PRODUCT_WATCHER_SCHEDULER_ENABLED:'true',DATABASE_URL:'postgres://placeholder:placeholder@localhost/watcher_test'},
      now:()=>new Date()
    });
    assert.equal(preflight.requiredTables.every(t=>t.present),true);
    assert.equal(preflight.productionVerified,false);
    assert.equal(preflight.backupVerified,false);
    assert.ok(preflight.blockers.includes('WATCHER_OWNER_PAUSED'));
    assert.ok(preflight.blockers.includes('WATCHER_WORKER_NOT_SEEN'));
    assert.ok(!JSON.stringify(preflight).includes('placeholder'));

    const state=await pool.query('SELECT id,paused FROM vv_product_watcher_control');
    assert.deepEqual(state.rows,[{id:1,paused:true}]);

    await pool.query("CREATE TABLE IF NOT EXISTS vv_generation_jobs(id TEXT PRIMARY KEY,status TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL,deleted BOOLEAN NOT NULL DEFAULT false,credits_reserved INTEGER NOT NULL DEFAULT 0,provider TEXT,actual_cost NUMERIC(14,6),cost_currency TEXT,started_at TIMESTAMPTZ,completed_at TIMESTAMPTZ)");
    await pool.query('DELETE FROM vv_generation_jobs WHERE id LIKE $1',['watcher-fixture-%']);
    await pool.query("INSERT INTO vv_generation_jobs(id,status,created_at,credits_reserved) VALUES('watcher-fixture-failed','failed',NOW()-INTERVAL '1 hour',0),('watcher-fixture-stale','processing',NOW()-INTERVAL '2 days',0),('watcher-fixture-held','finalizing',NOW()-INTERVAL '3 days',8),('watcher-fixture-ready','ready',NOW()-INTERVAL '5 minutes',0)");

    // Isolated synthetic job durations validate the real aggregate SQL.
    await pool.query("INSERT INTO vv_generation_jobs(id,status,created_at,started_at,completed_at) SELECT 'watcher-fixture-latency-old-'||n,'ready',NOW()-INTERVAL '2 hours',NOW()-INTERVAL '2 hours',NOW()-INTERVAL '2 hours'+INTERVAL '10 seconds' FROM generate_series(1,25) AS n");
    await pool.query("INSERT INTO vv_generation_jobs(id,status,created_at,started_at,completed_at) SELECT 'watcher-fixture-latency-new-'||n,'ready',NOW()-INTERVAL '5 minutes',NOW()-INTERVAL '5 minutes',NOW()-INTERVAL '5 minutes'+INTERVAL '65 seconds' FROM generate_series(1,6) AS n");
    // B5-06: real PostgreSQL aggregates for 23-hour baseline vs hourly
    // generation volume and a recorded cost without a known currency.
    await pool.query("INSERT INTO vv_generation_jobs(id,status,created_at,provider) SELECT 'watcher-fixture-usage-old-'||n,'ready',NOW()-INTERVAL '3 hours','BytePlus' FROM generate_series(1,69) AS n");
    await pool.query("INSERT INTO vv_generation_jobs(id,status,created_at,provider) SELECT 'watcher-fixture-usage-new-'||n,'ready',NOW()-INTERVAL '10 minutes','BytePlus' FROM generate_series(1,50) AS n");
    await pool.query("INSERT INTO vv_generation_jobs(id,status,created_at,actual_cost,cost_currency) VALUES('watcher-fixture-no-currency','ready',NOW()-INTERVAL '8 minutes',2.400000,NULL)");
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
    assert.ok(res.body.checks.operations.alerts.some(x=>x.code==='GENERATION_COMPLETION_LATENCY_SPIKE'));
    assert.ok(res.body.checks.operations.alerts.some(x=>x.code==='GENERATION_USAGE_SPIKE'));
    assert.ok(res.body.checks.operations.alerts.some(x=>x.code==='COST_CURRENCY_MISSING'));
    assert.equal(res.body.checks.operations.providers.find(x=>x.provider==='unknown').completionLatencySamplesLastHour,6);
    assert.equal(res.body.checks.operations.currencies.length,0);
    assert.equal(res.body.checks.operations.providers.find(x=>x.provider==='BytePlus').jobsPrevious23Hours,69);
    assert.ok(!JSON.stringify(res.body.checks.operations).includes('watcher-fixture-'));
    assert.equal(httpCalls,1);
    const notDue=await productWatcherTick({pool,env:schedulerEnv,fetchFn});
    assert.equal(notDue.status,'not_due');assert.equal(httpCalls,1);

    const officialEnv={...env,PRODUCT_WATCHER_OFFICIAL_SOURCES_ENABLED:'true'};
    const officialHtml='<html><body><main><h1>Official product updates</h1><p>'+('Model announcements from official documentation. '.repeat(8))+'</p></main></body></html>';
    const first=await runOfficialSourcesOnce({pool,env:officialEnv,now:()=>new Date('2026-10-15T00:00:00Z'),
      fetchFn:async()=>new Response(officialHtml,{headers:{'content-type':'text/html'}})});
    assert.equal(first.changed,0);assert.equal(first.attempted,OFFICIAL_SOURCES.length);
    const second=await runOfficialSourcesOnce({pool,env:officialEnv,now:()=>new Date('2026-10-15T07:00:00Z'),
      fetchFn:async()=>new Response(officialHtml.replace('</main>', '<p>'+('A visible page revision. '.repeat(10))+'</p></main>'),{headers:{'content-type':'text/html'}})});
    assert.equal(second.changed,OFFICIAL_SOURCES.length);
    const listed=await request('GET','/api/product-watcher/admin/official-sources');
    assert.equal(listed.statusCode,200);assert.equal(listed.body.proposals.length,OFFICIAL_SOURCES.length);
    assert.equal(listed.body.proposals.every(x=>x.topicsCompared===true),true);
    assert.equal(listed.body.proposals.every(x=>Array.isArray(x.possibleTopics)),true);
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
    await pool.query("CREATE TABLE IF NOT EXISTS vv_ai_template(id TEXT PRIMARY KEY,active BOOLEAN NOT NULL DEFAULT false,thumbnail TEXT,prompt_template TEXT NOT NULL DEFAULT '',generation_type TEXT NOT NULL DEFAULT 'image',required_input_types JSONB DEFAULT '[]'::jsonb,default_settings JSONB DEFAULT '{}'::jsonb)");
    await pool.query("CREATE TABLE IF NOT EXISTS vv_ai_inspiration(id TEXT PRIMARY KEY,active BOOLEAN NOT NULL DEFAULT false,kind TEXT NOT NULL,rights_note TEXT NOT NULL DEFAULT '',rights_basis TEXT NOT NULL,preview_url TEXT NOT NULL DEFAULT '',preview_poster_url TEXT,action_target TEXT NOT NULL DEFAULT 'studio',required_input_types JSONB DEFAULT '[]'::jsonb,default_settings JSONB DEFAULT '{}'::jsonb)");
    await pool.query("INSERT INTO vv_ai_template(id,active,thumbnail,prompt_template) VALUES('watcher-test-template',TRUE,NULL,'A prompt fixture') ON CONFLICT(id) DO NOTHING");
    await pool.query("INSERT INTO vv_ai_inspiration(id,active,kind,rights_note,rights_basis,preview_url) VALUES('watcher-test-inspiration',TRUE,'image','licensed preview','licensed','https://example.test/image.jpg') ON CONFLICT(id) DO NOTHING");
    await pool.query("UPDATE vv_ai_template SET generation_type='bad_mode',required_input_types='{\"bad\":true}'::jsonb,default_settings='[]'::jsonb WHERE id='watcher-test-template'");
    await pool.query("UPDATE vv_ai_inspiration SET action_target='broken',required_input_types='[\"unapproved\"]'::jsonb,default_settings='[]'::jsonb WHERE id='watcher-test-inspiration'");
    const contentRun=await runContentTasksIfDue({pool,env:{...env,PRODUCT_WATCHER_CONTENT_TASKS_ENABLED:'true'},now:()=>new Date()});
    assert.equal(contentRun.status,'generated');
    assert.deepEqual(contentRun.generated.map(x=>x.kind),['content','opportunities']);
    const contentList=await request('GET','/api/product-watcher/admin/content-tasks');
    assert.equal(contentList.statusCode,200);
    assert.equal(contentList.body.items.length,2);
    assert.ok(contentList.body.items.some(x=>x.kind==='content'&&x.content.templates.missingThumbnail===1));
    assert.ok(contentList.body.items.some(x=>x.kind==='content'&&x.content.linkCheck==='syntax_only'));
    assert.ok(contentList.body.items.some(x=>x.kind==='content'&&x.content.mediaPlayback==='not_checked'));
    assert.ok(contentList.body.items.some(x=>x.kind==='content'&&x.content.templates.invalidInputTypes===1));
    assert.ok(contentList.body.items.some(x=>x.kind==='content'&&x.content.inspiration.invalidActionTargets===1));
    assert.ok(contentList.body.items.some(x=>x.kind==='opportunities'&&x.content.recommendations.some(r=>r.code==='TEMPLATE_INPUT_SCHEMA_INVALID')));
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
    // SQL-level regression: LIMIT 3 must count unclaimed critical notifications,
    // not repeatedly return the newest three that already have delivery records.
    for(let i=0;i<4;i++){
      await pool.query(
        "INSERT INTO vv_product_watcher_alerts(fingerprint,source,code,severity,details) VALUES($1,'db','DB_UNAVAILABLE','critical','{}'::jsonb)",
        [String(i+1).repeat(64)]
      );
    }
    let backlogMessages=0;
    const sendBacklog=async()=>{backlogMessages++;return{status:200,json:async()=>({ok:true})};};
    const firstBatch=await deliverCriticalWatcherAlertsOnce({pool,env:notificationEnv,fetchFn:sendBacklog});
    assert.deepEqual([firstBatch.attempted,firstBatch.sent],[3,3]);
    const lastBatch=await deliverCriticalWatcherAlertsOnce({pool,env:notificationEnv,fetchFn:sendBacklog});
    assert.deepEqual([lastBatch.attempted,lastBatch.sent],[1,1]);
    const drained=await deliverCriticalWatcherAlertsOnce({pool,env:notificationEnv,
      fetchFn:async()=>{throw Error('must not send any duplicate');}});
    assert.equal(drained.attempted,0);
    assert.equal(backlogMessages,4);
    const allNotifications=await pool.query("SELECT status,COUNT(*)::int AS count FROM vv_product_watcher_notifications GROUP BY status");
    assert.deepEqual(allNotifications.rows,[{status:'sent',count:5}]);
    const notifications=await request('GET','/api/product-watcher/admin/notifications');
    assert.equal(notifications.statusCode,200);assert.ok(notifications.body.items.some(x=>x.code==='HTTP_UNAVAILABLE'));
    assert.ok(!JSON.stringify(notifications.body).includes('EXAMPLE_TEST_TOKEN'));
    assert.ok(Number(critical.rows[0].id)>0);

    const history=await request('GET','/api/product-watcher/admin/status');
    assert.equal(history.statusCode,200);assert.equal(history.body.runs[0].status,'warning');
    // A previous private-worker tick wrote a real fresh heartbeat. The WEB
    // process's absent scheduler flag must not mask that observed signal.
    assert.equal(history.body.schedulerActive,true);
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

    // Independent, NON-PRODUCTION local-only AI billing reconciliation fixture.
    // Tables mirror the existing generation-billing / generation-wallet structures.
    await pool.query("CREATE TABLE IF NOT EXISTS vv_ai_order(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,sku TEXT NOT NULL,snapshot JSONB NOT NULL,session_id TEXT UNIQUE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    await pool.query("CREATE TABLE IF NOT EXISTS vv_ai_purchase(session_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,payment_intent TEXT UNIQUE NOT NULL,credits INTEGER NOT NULL,amount INTEGER NOT NULL,currency TEXT NOT NULL,refunded_amount INTEGER NOT NULL DEFAULT 0)");
    for(let i=0;i<3;i++) {
      await pool.query(
        "INSERT INTO vv_ai_order(id,user_id,sku,snapshot,session_id,created_at) VALUES($1,'fixture-user','test','{}'::jsonb,$2,NOW()-INTERVAL '3 days')",
        ['watcher-billing-order-'+i,'cs_watcher_test_'+i]
      );
    }
    await pool.query(
      "INSERT INTO vv_ai_purchase(session_id,user_id,payment_intent,credits,amount,currency,refunded_amount) VALUES('cs_watcher_orphan','fixture-user','pi_watcher_orphan',5,100,'usd',110)"
    );
    // Synthetic invalid purchase mirrors corrupt ledger metadata, NOT a real payment.
    // The matching order keeps the orphan-purchase count unchanged.
    await pool.query("INSERT INTO vv_ai_order(id,user_id,sku,snapshot,session_id) VALUES('watcher-billing-invalid-order','fixture-user','test','{}'::jsonb,'cs_watcher_invalid')");
    await pool.query("INSERT INTO vv_ai_purchase(session_id,user_id,payment_intent,credits,amount,currency,refunded_amount) VALUES('cs_watcher_invalid','fixture-user','pi_watcher_invalid',-5,100,'US D',-1)");
    const bill=await checkBillingReconciliation(pool,{enabled:true});
    assert.equal(bill.code,'AI_REFUND_LEDGER_INCONSISTENT');
    assert.equal(bill.status,'critical');
    assert.equal(bill.counters.oldUnmatchedCheckoutSessions7d,3);
    assert.equal(bill.counters.orphanCreditPurchases,1);
    assert.equal(bill.counters.overRefundedPurchases,1);
    assert.equal(bill.counters.invalidCreditPurchases,1);
    assert.equal(bill.stripeWebhookVerified,false);
    assert.ok(!JSON.stringify(bill).includes('fixture-user'));
    assert.ok(!JSON.stringify(bill).includes('pi_watcher_orphan'));

    res=await request('POST','/api/product-watcher/admin/control',{body:{action:'pause'}});
    assert.equal(res.body.paused,true);
    const noRun=await request('POST','/api/product-watcher/admin/run');
    assert.equal(noRun.body.status,'paused');
    assert.equal(httpCalls,1);

    // Exercise the real Watcher run/alert persistence with the billing observer ON.
    // This cannot send/refund anything to Stripe: the entire test uses watcher_test.
    const resumeBilling=await request('POST','/api/product-watcher/admin/control',{body:{action:'resume'}});
    assert.equal(resumeBilling.statusCode,200);
    const configCheck=await runProductWatcherOnce({
      pool,env:{...env,PRODUCT_WATCHER_WEBHOOK_CONFIG_ENABLED:'true',
        AI_BILLING_ENABLED:'true',AI_BILLING_MODE:'test',
        STRIPE_SECRET_KEY:'sk_test_FAKENOTREAL',STRIPE_WEBHOOK_SECRET:'',
        DATABASE_URL:'postgres://fixture:fake@localhost/watcher_test'},fetchFn
    });
    assert.equal(configCheck.checks.webhookConfig.status,'critical');
    assert.equal(configCheck.checks.webhookConfig.code,'AI_STRIPE_CONFIG_BLOCKED');
    assert.equal(configCheck.checks.webhookConfig.webhookDeliveryVerified,false);
    assert.ok(!JSON.stringify(configCheck).includes('sk_test_FAKENOTREAL'));
    assert.ok(configCheck.findings.some(x=>x.source==='webhookConfig'));
    assert.ok(!JSON.stringify(configCheck).includes('fixture:fake'));
    const configLog=await pool.query(
      "SELECT COUNT(*)::int AS count FROM vv_product_watcher_alerts WHERE source='webhookConfig' AND code='AI_STRIPE_CONFIG_BLOCKED' AND severity='critical'"
    );
    assert.equal(configLog.rows[0].count,1);

    const withBilling=await runProductWatcherOnce({
      pool,env:{...env,PRODUCT_WATCHER_BILLING_SIGNALS_ENABLED:'true'},fetchFn
    });
    assert.equal(withBilling.status,'critical');
    assert.equal(withBilling.checks.billing.code,'AI_REFUND_LEDGER_INCONSISTENT');
    assert.equal(withBilling.checks.billing.stripeWebhookVerified,false);
    assert.equal(withBilling.checks.billing.counters.oldUnmatchedCheckoutSessions7d,3);
    assert.equal(withBilling.checks.billing.counters.invalidCreditPurchases,1);
    assert.ok(withBilling.findings.some(x=>x.source==='billing'&&x.severity==='critical'));
    assert.ok(!JSON.stringify(withBilling).includes('fixture-user'));
    const persistedCritical=await pool.query(
      "SELECT COUNT(*)::int AS count FROM vv_product_watcher_alerts WHERE source='billing' AND code='AI_REFUND_LEDGER_INCONSISTENT' AND severity='critical'"
    );
    assert.equal(persistedCritical.rows[0].count,1);
  } finally {await pool.end();}
});
