/**
 * Read-only commercial operational signals from Deepsyq's EXISTING job ledger.
 * This is NOT provider price monitoring and it never computes margin, FX or revenue.
 * All amounts are recorded job costs only, separated by currency.
 */
const MIN_PROVIDER_JOBS=10, MIN_PROVIDER_FAILURES=5;
const MIN_RECENT_COST_JOBS=5, MIN_BASELINE_COST_JOBS=20;
const MIN_SPEND_RATIO=3, MIN_UNIT_COST_RATIO=2.5;
const MIN_LATENCY_RECENT=5, MIN_LATENCY_BASELINE=20, MIN_LATENCY_RATIO=2.5, MIN_LATENCY_MS=30000;
// Usage is observable GENERATION JOB arrivals, not vendor API request traffic.
// Require a meaningful prior 23-hour sample; zero-history launches are not spikes.
const MIN_USAGE_RECENT=25, MIN_USAGE_BASELINE=46, MIN_USAGE_RATIO=4;

export function evaluateOperationalSignals(providerRows=[],costRows=[]) {
  const alerts=[];
  const providers=[];
  for(const row of providerRows.slice(0,100)) {
    const provider=String(row.provider||'unknown').slice(0,100);
    const jobs=Math.max(0,Number(row.jobs_1h)||0);
    const failed=Math.max(0,Number(row.failed_1h)||0);
    if(!Number.isSafeInteger(jobs)||!Number.isSafeInteger(failed)||failed>jobs)continue;
    const rate=jobs?failed/jobs:0;
    const previousJobs=Number(row.jobs_prev_23h??0);
    if(!Number.isSafeInteger(previousJobs)||previousJobs<0)continue;
    // Server-recorded completion interval (started_at -> completed_at), not
    // direct vendor API latency. Insufficient/no valid timestamps stay unknown.
    const recentSamples=Number(row.latency_jobs_1h??0);
    const baselineSamples=Number(row.latency_jobs_prev_23h??0);
    const recentMs=Number(row.latency_avg_ms_1h);
    const baselineMs=Number(row.latency_avg_ms_prev_23h);
    const enoughRecent=Number.isSafeInteger(recentSamples)&&recentSamples>=MIN_LATENCY_RECENT;
    const enoughBaseline=Number.isSafeInteger(baselineSamples)&&baselineSamples>=MIN_LATENCY_BASELINE;
    const validLatency=enoughRecent&&enoughBaseline&&Number.isFinite(recentMs)&&Number.isFinite(baselineMs)
      &&recentMs>=0&&baselineMs>=1000;
    providers.push({provider,jobsLastHour:jobs,jobsPrevious23Hours:previousJobs,
      failedLastHour:failed,failureRate:Math.round(rate*1000)/1000,
      completionLatencySamplesLastHour:Number.isSafeInteger(recentSamples)?recentSamples:0,
      completionLatencyAverageMsLastHour:recentSamples>0&&row.latency_avg_ms_1h!=null&&Number.isFinite(recentMs)&&recentMs>=0?Math.round(recentMs):null});
    if(jobs>=MIN_USAGE_RECENT&&previousJobs>=MIN_USAGE_BASELINE){
      const ratio=jobs/(previousJobs/23);
      if(Number.isFinite(ratio)&&ratio>=MIN_USAGE_RATIO)
        alerts.push({code:'GENERATION_USAGE_SPIKE',provider,
          jobs,previousJobs,ratio:Math.round(ratio*100)/100});
    }
    if(validLatency&&recentMs>=MIN_LATENCY_MS&&recentMs/baselineMs>=MIN_LATENCY_RATIO){
      alerts.push({code:'GENERATION_COMPLETION_LATENCY_SPIKE',provider,
        recentSamples,baselineSamples,averageMsLastHour:Math.round(recentMs),
        baselineAverageMs:Math.round(baselineMs),
        ratio:Math.round(recentMs/baselineMs*100)/100});
    }
    if(jobs>=MIN_PROVIDER_JOBS&&failed>=MIN_PROVIDER_FAILURES&&rate>=0.4){
      alerts.push({code:'PROVIDER_HIGH_FAILURE_RATE',provider,jobs,failed,rate:Math.round(rate*1000)/1000});
    }
  }
  const currencies=[];
  let untrackedJobs=0,missingCurrencyCosts=0;
  for(const row of costRows.slice(0,100)){
    const currency=String(row.currency||'unknown').toLowerCase();
    const tracked1h=Number(row.tracked_1h)||0,trackedPrevious=Number(row.tracked_prev_23h)||0;
    const missing=Number(row.missing_cost_1h)||0;
    const missingCurrency=Number(row.missing_currency_cost_1h??0);
    if(Number.isSafeInteger(missingCurrency)&&missingCurrency>0)missingCurrencyCosts+=missingCurrency;
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
  if(missingCurrencyCosts>0)alerts.push({code:'COST_CURRENCY_MISSING',jobs:missingCurrencyCosts});
  return {
    status:alerts.length?'warning':'healthy',
    code:alerts.length?'OPERATIONAL_ATTENTION':'OPERATIONAL_OK',
    observationWindow:'last 1 hour vs preceding 23 hours',
    currencies,providers,
    alerts:alerts.slice(0,50),
    // Deliberately no single summed "total spend" across currencies.
    note:'Recorded job arrivals, recorded costs and completed-job elapsed time only; currency must be explicit. No vendor API request volume. No live provider API latency, provider uptime, revenue or margin verified; model mix and workloads can affect averages.'
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
        "COUNT(*) FILTER (WHERE created_at < NOW()-INTERVAL '1 hour')::int AS jobs_prev_23h,",
        "COUNT(*) FILTER (WHERE status='failed' AND created_at >= NOW()-INTERVAL '1 hour')::int AS failed_1h,",
        "COUNT(*) FILTER (WHERE status='ready' AND started_at IS NOT NULL AND completed_at >= started_at AND created_at >= NOW()-INTERVAL '1 hour')::int AS latency_jobs_1h,",
        "COUNT(*) FILTER (WHERE status='ready' AND started_at IS NOT NULL AND completed_at >= started_at AND created_at < NOW()-INTERVAL '1 hour')::int AS latency_jobs_prev_23h,",
        "ROUND(AVG(EXTRACT(EPOCH FROM (completed_at-started_at))*1000) FILTER (WHERE status='ready' AND started_at IS NOT NULL AND completed_at >= started_at AND created_at >= NOW()-INTERVAL '1 hour'))::bigint AS latency_avg_ms_1h,",
        "ROUND(AVG(EXTRACT(EPOCH FROM (completed_at-started_at))*1000) FILTER (WHERE status='ready' AND started_at IS NOT NULL AND completed_at >= started_at AND created_at < NOW()-INTERVAL '1 hour'))::bigint AS latency_avg_ms_prev_23h",
        "FROM vv_generation_jobs WHERE deleted=false AND created_at>=NOW()-INTERVAL '24 hours'",
        "GROUP BY COALESCE(NULLIF(provider,''),'unknown') ORDER BY jobs_1h DESC,provider LIMIT 100"
      ].join(' ')),
      client.query([
        "SELECT COALESCE(NULLIF(lower(cost_currency),''),'unknown') AS currency,",
        "COUNT(*) FILTER (WHERE actual_cost IS NOT NULL AND created_at >= NOW()-INTERVAL '1 hour')::int AS tracked_1h,",
        "COUNT(*) FILTER (WHERE actual_cost IS NOT NULL AND created_at < NOW()-INTERVAL '1 hour')::int AS tracked_prev_23h,",
        "COUNT(*) FILTER (WHERE status='ready' AND actual_cost IS NULL AND created_at >= NOW()-INTERVAL '1 hour')::int AS missing_cost_1h,",
        "COUNT(*) FILTER (WHERE actual_cost IS NOT NULL AND created_at >= NOW()-INTERVAL '1 hour' AND (cost_currency IS NULL OR btrim(cost_currency)='' OR lower(btrim(cost_currency)) !~ '^[a-z]{3}$'))::int AS missing_currency_cost_1h,",
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
