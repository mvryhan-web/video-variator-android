/**
 * Product Watcher deployment preflight.
 * Read-only; no schema creation, no secrets returned, no external network.
 * An owner must explicitly authorize backup, migration and real worker deployment.
 */
export const WATCHER_REQUIRED_TABLES=Object.freeze([
  'vv_product_watcher_runs',
  'vv_product_watcher_control',
  'vv_product_watcher_scheduler',
  'vv_product_watcher_alerts',
  'vv_product_watcher_official_sources',
  'vv_product_watcher_proposals',
  'vv_product_watcher_briefs',
  'vv_product_watcher_content_tasks',
  'vv_product_watcher_notifications'
]);
const BASE_REQUIRED_TABLES=Object.freeze(['vv_generation_jobs']);
const FLAG_NAMES=Object.freeze({
  watcher:'PRODUCT_WATCHER_ENABLED',
  backgroundWorker:'PRODUCT_WATCHER_SCHEDULER_ENABLED',
  officialSources:'PRODUCT_WATCHER_OFFICIAL_SOURCES_ENABLED',
  briefs:'PRODUCT_WATCHER_BRIEFS_ENABLED',
  contentChecks:'PRODUCT_WATCHER_CONTENT_TASKS_ENABLED',
  telegramCriticalAlerts:'PRODUCT_WATCHER_TELEGRAM_ALERTS_ENABLED'
});

export function watcherDeploymentConfiguration(env={}){
  // Never return raw env vars, credentials, addresses or chat IDs.
  const flags=Object.fromEntries(Object.entries(FLAG_NAMES).map(([name,key])=>[name,env[key]==='true']));
  const telegramReady=!!String(env.TELEGRAM_BOT_TOKEN||'').trim() &&
    /^[1-9][0-9]{0,18}$/.test(String(env.PRODUCT_WATCHER_OWNER_TELEGRAM_CHAT_ID||'').trim());
  const healthUrlString=String(env.PRODUCT_WATCHER_BASE_URL||env.APP_URL||'').trim();
  let healthUrlValid=false;
  try{
    const u=new URL(healthUrlString);
    healthUrlValid=(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/');
  }catch{}
  const hardBlockers=[];
  if(!flags.watcher)hardBlockers.push('WATCHER_FEATURE_DISABLED');
  if(!flags.backgroundWorker)hardBlockers.push('WORKER_FEATURE_DISABLED');
  if(!healthUrlValid)hardBlockers.push('HTTPS_HEALTH_ORIGIN_NOT_CONFIGURED');
  if(!String(env.DATABASE_URL||'').trim())hardBlockers.push('WATCHER_DATABASE_NOT_CONFIGURED');
  if(flags.telegramCriticalAlerts&&!telegramReady)hardBlockers.push('OWNER_TELEGRAM_NOT_CONFIGURED');
  return{flags,healthUrlValid,telegramReady:flags.telegramCriticalAlerts?telegramReady:null,
    blockers:hardBlockers};
}

export async function watcherDeploymentReadiness(pool,{env={},now=()=>new Date()}={}){
  const config=watcherDeploymentConfiguration(env);
  const status={...config,requiredTables:[],baseTables:[],paused:null,
    schedulerHeartbeatFresh:false,checkedAt:now().toISOString(),readyForOwnerReview:false,
    productionVerified:false,backupVerified:false,workerDeployedVerified:false,
    notes:['No production deployment is performed by this check.',
      'Database backup, approved additive migration, manual owner resume and private worker deployment are separate gates.',
      'A valid HTTPS health origin does not establish that Stripe, OAuth or AI providers work.']};
  if(!pool?.query){
    status.blockers=[...new Set([...status.blockers,'WATCHER_DATABASE_NOT_CONFIGURED'])];
    return status;
  }
  try{
    // Fixed SQL identifiers only; no user-supplied relation names or credentials.
    const tables=[...WATCHER_REQUIRED_TABLES,...BASE_REQUIRED_TABLES];
    const query="SELECT x.name, to_regclass('public.' || x.name) AS relation FROM unnest($1::text[]) AS x(name)";
    const q=await pool.query(query,[tables]);
    const availability=new Map((q.rows||[]).map(x=>[x.name,!!x.relation]));
    status.requiredTables=WATCHER_REQUIRED_TABLES.map(name=>({name,present:availability.get(name)===true}));
    status.baseTables=BASE_REQUIRED_TABLES.map(name=>({name,present:availability.get(name)===true}));
    const missing=status.requiredTables.filter(x=>!x.present).map(x=>x.name);
    const missingBase=status.baseTables.filter(x=>!x.present).map(x=>x.name);
    if(missing.length)status.blockers.push('WATCHER_MIGRATION_REQUIRED');
    if(missingBase.length)status.blockers.push('BASE_GENERATION_SCHEMA_NOT_READY');
    if(!missing.length){
      const [control,scheduler]=await Promise.all([
        pool.query('SELECT paused FROM vv_product_watcher_control WHERE id=1'),
        pool.query('SELECT heartbeat_at FROM vv_product_watcher_scheduler WHERE id=1')
      ]);
      if(control.rows?.length!==1)status.blockers.push('WATCHER_CONTROL_NOT_INITIALIZED');
      else{
        status.paused=control.rows[0].paused===true;
        if(status.paused)status.blockers.push('WATCHER_OWNER_PAUSED');
      }
      const latest=scheduler.rows?.[0]?.heartbeat_at?new Date(scheduler.rows[0].heartbeat_at).getTime():null;
      const instant=now().getTime();
      status.schedulerHeartbeatFresh=Number.isFinite(latest)&&Number.isFinite(instant)&&
        latest<=instant&&(instant-latest)<180000;
      if(!status.schedulerHeartbeatFresh)status.blockers.push('WATCHER_WORKER_NOT_SEEN');
    }
  }catch{
    status.blockers.push('WATCHER_PREFLIGHT_DB_UNAVAILABLE');
  }
  status.blockers=[...new Set(status.blockers)];
  // Observations alone cannot authorize a production release.
  status.readyForOwnerReview=status.blockers.length===0;
  return status;
}
