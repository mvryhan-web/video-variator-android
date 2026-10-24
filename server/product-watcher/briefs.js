// Deterministic owner-only brief. No LLM, external email, inferred profit, or paid provider calls.
const LOCK=[455033,7],ZONE='Europe/Paris';

export function parisBriefSlots(instant=new Date()){
  const date=instant instanceof Date?instant:new Date(instant);
  if(!Number.isFinite(date.getTime()))throw Error('WATCHER_INVALID_CLOCK');
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{
    timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  const key=[parts.year,parts.month,parts.day].join('-'),hour=Number(parts.hour);
  return {periodKey:key,localHour:hour,weekday:parts.weekday,timezone:ZONE,
    due:[...(hour>=8?['daily']:[]),...(parts.weekday==='Mon'&&hour>=9?['weekly']:[])]};
}

export function briefEnabled(env={}){
  return env.PRODUCT_WATCHER_ENABLED==='true'&&env.PRODUCT_WATCHER_BRIEFS_ENABLED==='true';
}

function rowCount(r,key){return Math.max(0,Number(r?.[key]||0)||0);}
async function compileBrief(client,kind,instant){
  // Values are measured snapshots, not verified external announcements or Stripe revenue.
  const window=kind==='weekly'?'7 days':'24 hours';
  const period=parisBriefSlots(new Date(instant));
  const [runs,alerts,sourceChanges,pending,costs,contentTasks]=await Promise.all([
    client.query("SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE status='critical')::int AS critical,COUNT(*) FILTER (WHERE status='warning')::int AS warning FROM vv_product_watcher_runs WHERE created_at >= $1::timestamptz - $2::interval",[instant,window]),
    client.query("SELECT code,severity,COUNT(*)::int AS occurrences FROM vv_product_watcher_alerts WHERE last_seen_at >= $1::timestamptz - $2::interval GROUP BY code,severity ORDER BY occurrences DESC,code LIMIT 30",[instant,window]),
    client.query("SELECT COUNT(*)::int AS changed FROM vv_product_watcher_proposals WHERE created_at >= $1::timestamptz - $2::interval",[instant,window]),
    client.query("SELECT COUNT(*)::int AS pending FROM vv_product_watcher_proposals WHERE review_status='pending'"),
    client.query([
      "SELECT lower(cost_currency) AS currency,COALESCE(SUM(actual_cost),0)::text AS recorded_cost,",
      "COUNT(*)::int AS priced_jobs FROM vv_generation_jobs WHERE deleted=false",
      "AND created_at >= $1::timestamptz - $2::interval AND actual_cost IS NOT NULL",
      "AND cost_currency ~ '^[a-z]{3}$' GROUP BY lower(cost_currency) ORDER BY lower(cost_currency)"
    ].join(' '),[instant,window]),
    client.query('SELECT kind,content FROM vv_product_watcher_content_tasks WHERE period_key=$1 ORDER BY kind',[period.periodKey])
  ]);
  const issues=alerts.rows.slice(0,30).map(x=>({code:String(x.code).slice(0,70),severity:x.severity,count:rowCount(x,'occurrences')}));
  const guidelines={
    PROVIDER_HIGH_FAILURE_RATE:'Investigate affected provider jobs before changing routes.',
    COST_VISIBILITY_GAP:'Check missing actual provider costs before drawing margin conclusions.',
    RECORDED_SPEND_SPIKE:'Compare volume, models and verified costs; do not assume a price increase.',
    RECORDED_UNIT_COST_SPIKE:'Compare resolution and model mix against actual provider rate cards.',
    HTTP_UNAVAILABLE:'Review hosting health and recent deploys.',
    DB_UNAVAILABLE:'Check database health privately without sharing secrets.',
    AI_REFUND_LEDGER_INCONSISTENT:'Review internal AI refund records; do not issue automatic refunds or credits.',
    AI_PAYMENT_RECONCILIATION_REVIEW:'Check Checkout sessions in Stripe dashboard before assuming webhook failure.',
    AI_BILLING_LEDGER_NOT_READY:'Verify optional AI billing schema and approved activation status.'
  };
  const suggestions=[...new Set(issues.map(x=>guidelines[x.code]).filter(Boolean))].slice(0,8);

  const critical=rowCount(runs.rows[0],'critical'),warning=rowCount(runs.rows[0],'warning'),
    changed=rowCount(sourceChanges.rows[0],'changed'),pendingCount=rowCount(pending.rows[0],'pending');
  const risk=critical?'high':warning||issues.length?'medium':'low';
  const readiness=contentTasks.rows.find(x=>x.kind==='content')?.content||null;
  const opportunity=contentTasks.rows.find(x=>x.kind==='opportunities')?.content||null;
  const ownerSuggestions=Array.isArray(opportunity?.recommendations)
    ?opportunity.recommendations.slice(0,12).filter(x=>typeof x?.text==='string'&&x.text.length<=240):[];
  return {
    kind,periodKey:period.periodKey,timezone:ZONE,
    generatedAt:instant,window,
    new:{observedAlertTypes:issues.length},
    changed:{officialPageChangesUnverified:changed},
    problems:{criticalChecks:critical,warningChecks:warning,issues},
    costs:{recordedByCurrency:costs.rows.map(x=>({currency:x.currency,
      recordedCost:String(x.recorded_cost),pricedJobs:rowCount(x,'priced_jobs')})),
      marginVerified:false,revenueVerified:false},
    recommendations:[...new Set([...suggestions,...ownerSuggestions.map(x=>x.text)])].slice(0,12),
    contentChecks:{status:readiness?.status||'not_checked',code:readiness?.code||'NOT_CHECKED',
      templates:readiness?.templates||null,inspiration:readiness?.inspiration||null,
      evidence:'Recorded metadata only, not verified link playback or media licenses.'},
    internalOpportunities:ownerSuggestions.map(x=>({code:String(x.code).slice(0,80),
      priority:String(x.priority).slice(0,20),text:x.text})),
    pendingApprovals:{officialSourceReviews:pendingCount,automaticApplication:false},
    audit:kind==='weekly'?{priority:risk,high:critical,medium:warning,low:issues.length}:null,
    limitations:'Recorded events only. No official model/pricing claims, real revenue or live provider smoke test inferred.'
  };
}

export async function runBriefsIfDue({pool,env={},now=()=>new Date()}={}){
  if(!briefEnabled(env))return {status:'disabled',generated:[]};
  if(!pool?.connect)throw Error('WATCHER_DATABASE_NOT_CONFIGURED');
  const snapshot=now();const {due,periodKey}=parisBriefSlots(snapshot);
  if(!due.length)return {status:'not_due',generated:[]};
  const client=await pool.connect();let locked=false;
  try{
    const advisory=await client.query('SELECT pg_try_advisory_lock($1,$2) AS acquired',LOCK);
    locked=advisory.rows?.[0]?.acquired===true;
    if(!locked)return{status:'skipped',generated:[]};
    const control=await client.query('SELECT paused FROM vv_product_watcher_control WHERE id=1');
    if(control.rows?.length!==1)throw Error('WATCHER_SCHEMA_NOT_READY');
    if(control.rows[0].paused)return {status:'paused',generated:[]};
    const generated=[];
    for(const kind of due){
      const prior=await client.query('SELECT id FROM vv_product_watcher_briefs WHERE kind=$1 AND period_key=$2',[kind,periodKey]);
      if(prior.rows?.length)continue;
      const payload=await compileBrief(client,kind,snapshot.toISOString());
      await client.query('BEGIN');
      try{
        const inserted=await client.query(
          'INSERT INTO vv_product_watcher_briefs(kind,period_key,content) VALUES($1,$2,$3::jsonb) ON CONFLICT(kind,period_key) DO NOTHING RETURNING id',
          [kind,periodKey,JSON.stringify(payload)]);
        await client.query('COMMIT');
        if(inserted.rows?.length)generated.push({kind,periodKey,id:Number(inserted.rows[0].id)});
      }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
    }
    return {status:generated.length?'generated':'not_due',generated};
  }finally{
    if(locked)await client.query('SELECT pg_advisory_unlock($1,$2)',LOCK).catch(()=>{});
    client.release();
  }
}

export async function listWatcherBriefs(pool,{limit=15}={}){
  const n=Math.max(1,Math.min(30,Number(limit)||15));
  const {rows}=await pool.query('SELECT id,kind,period_key,content,created_at FROM vv_product_watcher_briefs ORDER BY created_at DESC,id DESC LIMIT $1',[n]);
  return rows.map(x=>({id:Number(x.id),kind:x.kind,periodKey:x.period_key,createdAt:x.created_at,
    content:x.content}));
}
