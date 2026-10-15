/**
 * Read-only commercial operational signals from Deepsyq's EXISTING job ledger.
 * This is NOT provider price monitoring and it never computes margin, FX or revenue.
 * All amounts are recorded job costs only, separated by currency.
 */
const MIN_PROVIDER_JOBS=10, MIN_PROVIDER_FAILURES=5;
const MIN_RECENT_COST_JOBS=5, MIN_BASELINE_COST_JOBS=20;
const MIN_SPEND_RATIO=3, MIN_UNIT_COST_RATIO=2.5;

export function evaluateOperationalSignals(providerRows=[],costRows=[]) {
  const alerts=[];
  const providers=[];
  for(const row of providerRows.slice(0,100)) {
    const provider=String(row.provider||'unknown').slice(0,100);
    const jobs=Math.max(0,Number(row.jobs_1h)||0);
    const failed=Math.max(0,Number(row.failed_1h)||0);
    if(!Number.isSafeInteger(jobs)||!Number.isSafeInteger(failed)||failed>jobs)continue;
    const rate=jobs?failed/jobs:0;
    providers.push({provider,jobsLastHour:jobs,failedLastHour:failed,failureRate:Math.round(rate*1000)/1000});
    if(jobs>=MIN_PROVIDER_JOBS&&failed>=MIN_PROVIDER_FAILURES&&rate>=0.4){
      alerts.push({code:'PROVIDER_HIGH_FAILURE_RATE',provider,jobs,failed,rate:Math.round(rate*1000)/1000});
    }
  }
  const currencies=[];
  let untrackedJobs=0;
  for(const row of costRows.slice(0,100)){
    const currency=String(row.currency||'unknown').toLowerCase();
    const tracked1h=Number(row.tracked_1h)||0,trackedPrevious=Number(row.tracked_prev_23h)||0;
    const missing=Number(row.missing_cost_1h)||0;
    if(Number.isSafeInteger(missing)&&missing>0)untrackedJobs+=missing;
    if(!/^[a-z]{3}$/.test(currency)||[tracked1h,trackedPrevious].some(x=>!Number.isSafeInteger(x)||x<0))continue;
    const amount1h=Number(row.cost_1h),amountPrevious=Number(row.cost_prev_23h);
    if(!Number.isFinite(amount1h)||!Number.isFinite(amountPrevious)||amount1h<0||amountPrevious<0)continue;
    const recorded={currency,trackedJobsLastHour:tracked1h,trackedJobsPrevious23h:trackedPrevious,recordedCostLastHour:String(row.cost_1h),recordedCostPrevious23h:String(row.cost_prev_23h)};
    currencies.push(recorded);
    if(tracked1h<MIN_RECENT_COST_JOBS||trackedPrevious<MIN_BASELINE_COST_JOBS||amountPrevious<=0)continue;
    const hourlyBaseline=amountPrevious/23;
    const spendRatio=amount1h/hourlyBaseline;
    const unitRatio=(amount1h/tracked1h)/(amountPrevious/trackedPrevious);
    if(Number.isFinite(spendRatio)&&spendRatio>=MIN_SPEND_RATIO){
      alerts.push({code:'RECORDED_SPEND_SPIKE',currency,ratio:Math.round(spendRatio*100)/100,trackedJobsLastHour:tracked1h});
    }
    if(Number.isFinite(unitRatio)&&unitRatio>=MIN_UNIT_COST_RATIO){
      alerts.push({code:'RECORDED_UNIT_COST_SPIKE',currency,ratio:Math.round(unitRatio*100)/100,trackedJobsLastHour:tracked1h});
    }
  }
  if(untrackedJobs>0)alerts.push({code:'COST_VISIBILITY_GAP',readyJobsWithoutActualCostLastHour:untrackedJobs});
  return {
    status:alerts.length?'warning':'healthy',
    code:alerts.length?'OPERATIONAL_ATTENTION':'OPERATIONAL_OK',
    observationWindow:'last 1 hour vs preceding 23 hours',
    currencies,providers,
    alerts:alerts.slice(0,50),
    // Deliberately no single summed "total spend" across currencies.
    note:'Recorded costs only; models/provider mix can change averages. No live pricing, revenue or margin verified.'
  };
}

export async function checkOperationalSignals(client){
  try{
    const schema=await client.query("SELECT to_regclass('public.vv_generation_jobs') AS table_name");
    if(!schema.rows?.[0]?.table_name)return{status:'warning',code:'GENERATION_SCHEMA_NOT_READY'};
    const [provider,cost]=await Promise.all([
      client.query([
        "SELECT COALESCE(NULLIF(provider,''),'unknown') AS provider,",
        "COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '1 hour')::int AS jobs_1h,",
        "COUNT(*) FILTER (WHERE status='failed' AND created_at >= NOW()-INTERVAL '1 hour')::int AS failed_1h",
        "FROM vv_generation_jobs WHERE deleted=false AND created_at>=NOW()-INTERVAL '1 hour'",
        "GROUP BY COALESCE(NULLIF(provider,''),'unknown') ORDER BY jobs_1h DESC,provider LIMIT 100"
      ].join(' ')),
      client.query([
        "SELECT COALESCE(NULLIF(lower(cost_currency),''),'unknown') AS currency,",
        "COUNT(*) FILTER (WHERE actual_cost IS NOT NULL AND created_at >= NOW()-INTERVAL '1 hour')::int AS tracked_1h,",
        "COUNT(*) FILTER (WHERE actual_cost IS NOT NULL AND created_at < NOW()-INTERVAL '1 hour')::int AS tracked_prev_23h,",
        "COUNT(*) FILTER (WHERE status='ready' AND actual_cost IS NULL AND created_at >= NOW()-INTERVAL '1 hour')::int AS missing_cost_1h,",
        "COALESCE(SUM(actual_cost) FILTER (WHERE created_at >= NOW()-INTERVAL '1 hour'),0)::text AS cost_1h,",
        "COALESCE(SUM(actual_cost) FILTER (WHERE created_at < NOW()-INTERVAL '1 hour'),0)::text AS cost_prev_23h",
        "FROM vv_generation_jobs WHERE deleted=false AND created_at>=NOW()-INTERVAL '24 hours'",
        "GROUP BY COALESCE(NULLIF(lower(cost_currency),''),'unknown') ORDER BY currency LIMIT 100"
      ].join(' '))
    ]);
    return evaluateOperationalSignals(provider.rows,cost.rows);
  }catch{
    // No raw Postgres errors, SQL, passwords, users or media in reports.
    return{status:'warning',code:'OPERATIONAL_METRICS_UNAVAILABLE'};
  }
}
