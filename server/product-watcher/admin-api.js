import { runProductWatcherOnce, watcherConfig } from './monitor.js';
import { initAdminAudit } from '../admin-audit.js';
import { WATCHER_INTERVAL_MS } from './scheduler.js';
import { listWatcherAlerts } from './alerts.js';
import { listOfficialSourceReviews, officialSourceEnabled } from './official-sources.js';
import { listWatcherBriefs, briefEnabled } from './briefs.js';
import { listContentTasks, contentTasksEnabled } from './content-tasks.js';
import {listWatcherNotificationStatus,watcherTelegramConfig} from './telegram-alerts.js';
import {watcherDeploymentReadiness} from './readiness.js';

// Match the existing Deepsyq owner identity policy: only the designated Google account.
// An empty ADMIN_EMAIL must never authorize a user with an empty email.
export function isWatcherOwner(user, env = {}) {
  const adminEmail = String(env.ADMIN_EMAIL || '').trim().toLowerCase();
  return !!(adminEmail && String(user?.id ?? '').trim() && user?.provider === 'google' && String(user.email || '').trim().toLowerCase() === adminEmail);
}

function error(res, status, code) {
  return res.status(status).json({ error: code });
}

export function installProductWatcher(app, { auth, pool, env = process.env, fetchFn = globalThis.fetch } = {}) {
  if (typeof auth !== 'function') throw Error('WATCHER_AUTH_REQUIRED');
  const owner = (req, res, next) => isWatcherOwner(req.user, env) ? next() : error(res, 403, 'WATCHER_OWNER_ONLY');
  const enabled = () => watcherConfig(env).enabled;

  app.get('/api/product-watcher/admin/status', auth, owner, async (_req, res) => {
    if (!enabled()) return res.json({ enabled: false, status: 'disabled', paused: null, schedulerActive: false, lastRun: null, runs: [] });
    if (!pool) return error(res, 503, 'WATCHER_DATABASE_NOT_CONFIGURED');
    try {
      const [state, history, worker] = await Promise.all([
        pool.query('SELECT paused, updated_at FROM vv_product_watcher_control WHERE id=1'),
        pool.query('SELECT id, status, checks, findings, created_at FROM vv_product_watcher_runs ORDER BY id DESC LIMIT 30'),
        pool.query('SELECT heartbeat_at FROM vv_product_watcher_scheduler WHERE id=1')
      ]);
      if (!state.rows?.length) return error(res, 503, 'WATCHER_SCHEMA_NOT_READY');
      const runs = history.rows.map(r => ({
        id: Number(r.id), status: r.status, checks: r.checks, findings: r.findings,
        checkedAt: r.created_at
      }));
      if (!worker.rows?.length) return error(res, 503, 'WATCHER_SCHEMA_NOT_READY');
      const heartbeat = worker.rows[0].heartbeat_at ? new Date(worker.rows[0].heartbeat_at).getTime() : 0;
      // Scheduler runs in a DIFFERENT private service: its feature flag may
      // intentionally differ from the web process environment. Trust only
      // an actually observed, fresh heartbeat, never the web flag alone.
      const observedAt = Date.now();
      const schedulerActive = heartbeat > 0 &&
        heartbeat <= observedAt && observedAt - heartbeat < 180000;
      const recent = runs[0]?.checkedAt ? new Date(runs[0].checkedAt).getTime() : null;
      const dueAt = schedulerActive && !state.rows[0].paused && Number.isFinite(recent)
        ? recent + WATCHER_INTERVAL_MS : null;
      // An overdue timestamp is not a future appointment. The heartbeat only
      // proves a worker tick, not that a health report was persisted on time.
      const scheduleOverdue = dueAt !== null && dueAt <= observedAt;
      const nextRun = dueAt !== null && !scheduleOverdue ? new Date(dueAt).toISOString() : null;
      return res.json({
        enabled: true, status: state.rows[0].paused ? 'paused' : 'ready',
        paused: !!state.rows[0].paused, schedulerActive,
        nextRun, scheduleOverdue, lastRun: runs[0] || null, runs
      });
    } catch {
      return error(res, 503, 'WATCHER_STATUS_UNAVAILABLE');
    }
  });

  app.get('/api/product-watcher/admin/alerts', auth, owner, async (_req,res)=>{
    if(!enabled())return res.json({enabled:false,items:[]});
    if(!pool)return error(res,503,'WATCHER_DATABASE_NOT_CONFIGURED');
    try{return res.json({enabled:true,items:await listWatcherAlerts(pool,{limit:50})});}
    catch{return error(res,503,'WATCHER_ALERTS_UNAVAILABLE');}
  });

  app.post('/api/product-watcher/admin/alerts/ack', auth, owner, async(req,res)=>{
    if(!enabled())return error(res,503,'WATCHER_DISABLED');
    if(!pool)return error(res,503,'WATCHER_DATABASE_NOT_CONFIGURED');
    const id=Number(req.body?.alertId),confirmation=Number(req.body?.confirmAlertId);
    if(!Number.isSafeInteger(id)||id<1||id!==confirmation)return error(res,400,'WATCHER_CONFIRM_ALERT_REQUIRED');
    let client;
    try{
      await initAdminAudit(pool);
      client=await pool.connect();
      await client.query('BEGIN');
      const changed=await client.query('UPDATE vv_product_watcher_alerts SET acknowledged_at=NOW(),acknowledged_by=$2 WHERE id=$1 AND acknowledged_at IS NULL RETURNING id',[id,req.user.id]);
      if(!changed.rows?.length){await client.query('ROLLBACK');return error(res,409,'WATCHER_ALERT_NOT_PENDING');}
      await client.query('INSERT INTO vv_admin_audit(actor_user_id,action,target_type,target_id,details) VALUES($1,$2,$3,$4,$5::jsonb)',
        [req.user.id,'product_watcher.alert_ack','product_watcher_alert',String(id),JSON.stringify({alertId:id})]);
      await client.query('COMMIT');
      return res.json({ok:true,alertId:id,acknowledged:true});
    }catch{
      if(client)await client.query('ROLLBACK').catch(()=>{});
      return error(res,503,'WATCHER_ALERT_ACK_FAILED');
    }finally{client?.release();}
  });


  // Owner review is a decision about whether to investigate; it NEVER applies a
  // pricing, routing, model, secret, deployment, or provider configuration change.
  app.get('/api/product-watcher/admin/official-sources',auth,owner,async(_req,res)=>{
    if(!enabled())return res.json({enabled:false,monitoringEnabled:false,sources:[],proposals:[]});
    if(!pool)return error(res,503,'WATCHER_DATABASE_NOT_CONFIGURED');
    try{
      const data=await listOfficialSourceReviews(pool);
      return res.json({enabled:true,monitoringEnabled:officialSourceEnabled(env),...data});
    }catch{return error(res,503,'WATCHER_OFFICIAL_SOURCES_UNAVAILABLE');}
  });

  app.post('/api/product-watcher/admin/proposals/review',auth,owner,async(req,res)=>{
    if(!enabled())return error(res,503,'WATCHER_DISABLED');
    if(!pool)return error(res,503,'WATCHER_DATABASE_NOT_CONFIGURED');
    const id=Number(req.body?.proposalId),confirm=Number(req.body?.confirmProposalId),
      decision=req.body?.decision;
    if(!Number.isSafeInteger(id)||id<1||id!==confirm||!['reviewed','dismissed'].includes(decision))
      return error(res,400,'WATCHER_EXPLICIT_REVIEW_REQUIRED');
    let client;
    try{
      await initAdminAudit(pool);
      client=await pool.connect();
      await client.query('BEGIN');
      const {rows}=await client.query(
        "UPDATE vv_product_watcher_proposals SET review_status=$2,reviewed_by=$3,reviewed_at=NOW() WHERE id=$1 AND review_status='pending' RETURNING id",
        [id,decision,req.user.id]
      );
      if(!rows?.length){await client.query('ROLLBACK');return error(res,409,'WATCHER_PROPOSAL_NOT_PENDING');}
      await client.query(
        'INSERT INTO vv_admin_audit(actor_user_id,action,target_type,target_id,details) VALUES($1,$2,$3,$4,$5::jsonb)',
        [req.user.id,'product_watcher.proposal_review','product_watcher_proposal',String(id),JSON.stringify({decision,applied:false})]
      );
      await client.query('COMMIT');
      return res.json({ok:true,proposalId:id,decision,applied:false});
    }catch{
      if(client)await client.query('ROLLBACK').catch(()=>{});
      return error(res,503,'WATCHER_PROPOSAL_REVIEW_FAILED');
    }finally{client?.release();}
  });

  app.get('/api/product-watcher/admin/briefs',auth,owner,async(_req,res)=>{
    if(!enabled())return res.json({enabled:false,schedulerEnabled:false,items:[]});
    if(!pool)return error(res,503,'WATCHER_DATABASE_NOT_CONFIGURED');
    try{
      const items=await listWatcherBriefs(pool);
      return res.json({enabled:true,schedulerEnabled:briefEnabled(env),items});
    }catch{return error(res,503,'WATCHER_BRIEFS_UNAVAILABLE');}
  });

  app.get('/api/product-watcher/admin/content-tasks',auth,owner,async(_req,res)=>{
    if(!enabled())return res.json({enabled:false,schedulerEnabled:false,items:[]});
    if(!pool)return error(res,503,'WATCHER_DATABASE_NOT_CONFIGURED');
    try{return res.json({enabled:true,schedulerEnabled:contentTasksEnabled(env),items:await listContentTasks(pool)});}
    catch{return error(res,503,'WATCHER_CONTENT_TASKS_UNAVAILABLE');}
  });

  app.get('/api/product-watcher/admin/notifications',auth,owner,async(_req,res)=>{
    if(!enabled())return res.json({enabled:false,deliveryConfigured:false,items:[]});
    if(!pool)return error(res,503,'WATCHER_DATABASE_NOT_CONFIGURED');
    try{
      let deliveryConfigured=false;
      try{deliveryConfigured=watcherTelegramConfig(env).enabled;}catch{}
      return res.json({enabled:true,deliveryConfigured,items:await listWatcherNotificationStatus(pool)});
    }catch{return error(res,503,'WATCHER_NOTIFICATION_STATUS_UNAVAILABLE');}
  });

  app.get('/api/product-watcher/admin/readiness',auth,owner,async(_req,res)=>{
    // Read-only preflight remains visible to the owner even when disabled.
    // No schema creation, payment activity, worker activation or raw credentials.
    try{
      return res.json(await watcherDeploymentReadiness(pool,{env}));
    }catch{return error(res,503,'WATCHER_PREFLIGHT_UNAVAILABLE');}
  });

  // Pause/resume blocks future runs, not work already in flight. Only one guarded,
  // atomic state change plus its existing owner audit record.
  app.post('/api/product-watcher/admin/control', auth, owner, async (req, res) => {
    if (!enabled()) return error(res, 503, 'WATCHER_DISABLED');
    if (!pool) return error(res, 503, 'WATCHER_DATABASE_NOT_CONFIGURED');
    const action = req.body?.action;
    if (action !== 'pause' && action !== 'resume') return error(res, 400, 'WATCHER_INVALID_CONTROL');
    let client;
    try {
      await initAdminAudit(pool);
      client = await pool.connect();
      await client.query('BEGIN');
      const {rows} = await client.query(
        'UPDATE vv_product_watcher_control SET paused=$1,updated_at=NOW(),updated_by=$2 WHERE id=1 RETURNING paused,updated_at',
        [action === 'pause', req.user.id]
      );
      if (!rows.length) { await client.query('ROLLBACK'); return error(res, 503, 'WATCHER_SCHEMA_NOT_READY'); }
      await client.query(
        'INSERT INTO vv_admin_audit(actor_user_id,action,target_type,target_id,details) VALUES($1,$2,$3,$4,$5::jsonb)',
        [req.user.id, 'product_watcher.' + action, 'product_watcher', 'singleton', JSON.stringify({paused:!!rows[0].paused})]
      );
      await client.query('COMMIT');
      return res.json({ ok: true, paused: !!rows[0].paused, updatedAt: rows[0].updated_at });
    } catch {
      if (client) await client.query('ROLLBACK').catch(() => {});
      return error(res, 503, 'WATCHER_CONTROL_FAILED');
    } finally {
      client?.release();
    }
  });

  app.post('/api/product-watcher/admin/run', auth, owner, async (req, res) => {
    if (!enabled()) return error(res, 503, 'WATCHER_DISABLED');
    if (!pool) return error(res, 503, 'WATCHER_DATABASE_NOT_CONFIGURED');
    try {
      const report = await runProductWatcherOnce({ pool, env, fetchFn, persist: true });
      // Run is owner initiated but only performs non-billable read-only checks.
      // Report itself is append-only; do not claim it is an autonomous repair.
      return res.status(report.status === 'skipped' || report.status === 'paused' ? 202 : 200).json(report);
    } catch {
      return error(res, 503, 'WATCHER_RUN_FAILED');
    }
  });
}
