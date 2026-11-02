// Read-only observed provider metrics. Pending generation jobs have neither
// succeeded nor failed and must NOT depress historical terminal-outcome rates.
// This is reporting only: never a source of unapproved paid model rerouting.
const count=v=>{const n=Number(v);return Number.isSafeInteger(n)&&n>=0?n:0;};
export function publicProviderPerformanceRow(r={}){
 const jobs=count(r.jobs),succeeded=count(r.succeeded),failed=count(r.failed);
 const processing=count(r.processing),terminalJobs=succeeded+failed;
 return {
  provider:r.provider||null,model:r.model||null,kind:r.kind,
  jobs,succeeded,failed,processing,terminalJobs,
  // Preserve numeric contract for existing admin clients. An explicit
  // terminalJobs=0 disambiguates "no evidence" from 0% success.
  successRate:terminalJobs?succeeded/terminalJobs:0,
  failureRate:terminalJobs?failed/terminalJobs:0,
  averageSeconds:r.avg_seconds==null?null:Number(r.avg_seconds),
  actualCost:Number(r.actual_cost||0),
  costCurrency:r.cost_currency,
  creditsCharged:Number(r.credits_charged||0)
 };
}
