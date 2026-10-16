import {createHash} from 'node:crypto';

/** An alert represents an observed issue, not a proposed automatic action. */
export function observedWatcherAlerts(checks){
  const rows=[];
  for(const [source,check] of Object.entries(checks||{})){
    if(check?.status!=='warning'&&check?.status!=='critical')continue;
    if(source==='operations'&&Array.isArray(check.alerts)&&check.alerts.length){
      for(const finding of check.alerts.slice(0,50)){
        const code=String(finding.code||'').slice(0,70);
        if(!/^[A-Z_]{5,70}$/.test(code))continue;
        const provider=typeof finding.provider==='string'?finding.provider.slice(0,100):null;
        const currency=/^[a-z]{3}$/.test(finding.currency||'')?finding.currency:null;
        rows.push({source,code,severity:'warning',provider,currency,
          // Whitelist only counters/ratios, never secrets or raw provider responses.
          details:Object.fromEntries(['jobs','previousJobs','failed','rate','ratio','trackedJobsLastHour','readyJobsWithoutActualCostLastHour',
            'recentSamples','baselineSamples','averageMsLastHour','baselineAverageMs']
            .filter(k=>Number.isFinite(finding[k])&&finding[k]>=0).map(k=>[k,finding[k]]))});
      }
    }else{
      rows.push({source:String(source).slice(0,40),code:String(check.code||'CHECK_WARNING').slice(0,70),
        severity:check.status,provider:null,currency:null,details:{}});
    }
  }
  return rows.slice(0,80).map(x=>({
    ...x,
    fingerprint:createHash('sha256').update(JSON.stringify([x.source,x.code,x.provider,x.currency])).digest('hex')
  }));
}

export async function saveWatcherAlerts(client,checks){
  const alerts=observedWatcherAlerts(checks);
  for(const a of alerts){
    await client.query([
      'INSERT INTO vv_product_watcher_alerts(fingerprint,source,code,severity,provider,currency,details)',
      'VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',
      'ON CONFLICT(fingerprint) DO UPDATE SET last_seen_at=NOW(),observations=vv_product_watcher_alerts.observations+1,',
      'severity=EXCLUDED.severity,details=EXCLUDED.details'
    ].join(' '),[a.fingerprint,a.source,a.code,a.severity,a.provider,a.currency,JSON.stringify(a.details)]);
  }
  return alerts.length;
}

export async function listWatcherAlerts(pool,{limit=50}={}){
  const n=Math.max(1,Math.min(100,Number(limit)||50));
  const {rows}=await pool.query([
    'SELECT id,source,code,severity,provider,currency,details,',
    'first_seen_at,last_seen_at,observations,acknowledged_at',
    'FROM vv_product_watcher_alerts ORDER BY last_seen_at DESC,id DESC LIMIT $1'
  ].join(' '),[n]);
  return rows.map(r=>({
    id:Number(r.id),source:r.source,code:r.code,severity:r.severity,provider:r.provider||null,
    currency:r.currency||null,details:r.details||{},firstSeenAt:r.first_seen_at,
    lastSeenAt:r.last_seen_at,observations:Number(r.observations||0),
    acknowledged:!!r.acknowledged_at
  }));
}
