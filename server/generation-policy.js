const int=(v,min,max,def=0)=>{const n=Number(v);return Number.isInteger(n)&&n>=min&&n<=max?n:def;};

export function generationPolicy(env={}){
 return {
  enabled:env.AI_STUDIO_PUBLIC_POLICY_ENABLED==='true',
  maxConcurrentPerUser:int(env.AI_STUDIO_MAX_CONCURRENT_PER_USER,1,100,0),
  maxJobsPerHourPerUser:int(env.AI_STUDIO_MAX_JOBS_PER_HOUR,1,10000,0)
 };
}

export async function enforceGenerationPolicy(client,{userId,env=process.env,policyOverride=null}){
 const p=policyOverride||generationPolicy(env);if(!p.enabled)return {ok:true,policy:p};
 // An enabled-but-incomplete policy is NOT unlimited paid generation.
 // Quotas must be explicit and bounded before the first DB/advisory-lock query.
 if(!Number.isSafeInteger(p.maxConcurrentPerUser)||p.maxConcurrentPerUser<1||p.maxConcurrentPerUser>100||
    !Number.isSafeInteger(p.maxJobsPerHourPerUser)||p.maxJobsPerHourPerUser<1||p.maxJobsPerHourPerUser>10000){
  const e=Error('AI_POLICY_LIMITS_NOT_CONFIGURED');e.status=503;throw e;
 }
 await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['ai-user:'+userId]);
 if(p.maxConcurrentPerUser){
  const {rows}=await client.query("SELECT count(*)::int AS n FROM vv_generation_jobs WHERE user_id=$1 AND deleted=false AND status IN ('queued','processing','finalizing')",[userId]);
  if(Number(rows[0]?.n||0)>=p.maxConcurrentPerUser){const e=Error('AI_CONCURRENCY_LIMIT');e.status=429;throw e;}
 }
 if(p.maxJobsPerHourPerUser){
  const {rows}=await client.query("SELECT count(*)::int AS n FROM vv_generation_jobs WHERE user_id=$1 AND created_at>NOW()-INTERVAL '1 hour'",[userId]);
  if(Number(rows[0]?.n||0)>=p.maxJobsPerHourPerUser){const e=Error('AI_RATE_LIMIT');e.status=429;throw e;}
 }
 return {ok:true,policy:p};
}
