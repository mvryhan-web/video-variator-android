const PLAN=/^[a-z0-9_-]{1,40}$/;
const positive=(v,max)=>Number.isInteger(v)&&v>0&&v<=max;
export function generationEntitlements(env={}){
 try{
  const rows=JSON.parse(env.AI_PLAN_ENTITLEMENTS_JSON||'[]');
  if(!Array.isArray(rows)||rows.length>30)throw Error();
  const plans=rows.map(r=>{
   if(!r||!PLAN.test(r.plan)||r.plan==='lifetime'||!positive(r.maxConcurrent,100)||!positive(r.maxPerHour,10000))throw Error();
   return {plan:r.plan,maxConcurrent:r.maxConcurrent,maxPerHour:r.maxPerHour};
  });
  if(new Set(plans.map(x=>x.plan)).size!==plans.length)throw Error();
  return {configured:plans.length>0,plans};
 }catch(_){return {configured:false,plans:[]};}
}
// Free AI is separate from legacy Video Uniquifier trial usage. No default
// allowance, subscription bypass, provider call or automatic credit grant.
export function freeGenerationConfig(env={}){
 const c=Number(env.AI_WELCOME_CREDITS||0);
 const plan=generationEntitlements(env).plans.find(p=>p.plan==='trial');
 // Internal abuse-safety ceilings, NOT product offers. The actual quantity and
 // cadence must be explicitly approved in server environment configuration.
 const safe=Number.isSafeInteger(c)&&c>=1&&c<=1000&&
   !!plan&&plan.maxConcurrent===1&&plan.maxPerHour<=10;
 return {
  enabled:env.AI_FREE_GENERATION_ENABLED==='true'&&
    env.AI_WELCOME_CREDITS_ENABLED==='true'&&safe,
  maxConcurrent:safe?plan.maxConcurrent:null,maxPerHour:safe?plan.maxPerHour:null
 };
}
export function generationEntitlementForUser(user,env={}){
 if(env.AI_PUBLIC_GENERATION_ENABLED!=='true')return {allowed:false,reason:'PUBLIC_AI_DISABLED'};
 const catalog=generationEntitlements(env);if(!catalog.configured)return {allowed:false,reason:'AI_ENTITLEMENTS_NOT_CONFIGURED'};
 if(!user||user.plan==='lifetime')return {allowed:false,reason:'AI_PLAN_NOT_ENTITLED'};
 // New, never-subscribed legacy 'trial' accounts have no paid subscription.
 // Allow only a separately opted-in, pre-funded, strictly bounded acquisition
 // plan. Existing wallet reserve/pricing checks still govern every job.
 if(user.plan==='trial'&&user.subscription_status==='inactive'&&user.has_subscribed===false){
  const free=freeGenerationConfig(env);
  if(env.AI_FREE_GENERATION_ENABLED==='true'&&!free.enabled)
    return {allowed:false,reason:'AI_FREE_PLAN_NOT_CONFIGURED'};
  if(free.enabled)return {allowed:true,scope:'public',plan:'trial',
    maxConcurrent:free.maxConcurrent,maxPerHour:free.maxPerHour};
 }
 // The legacy trial plan is not a paid subscription tier. A changed or
 // inconsistent subscription status must never bypass the Free opt-in.
 if(user.plan==='trial')return {allowed:false,reason:'AI_PLAN_NOT_ENTITLED'};
 if(!['active','trialing'].includes(String(user.subscription_status||'')))return {allowed:false,reason:'AI_PLAN_INACTIVE'};
 const plan=catalog.plans.find(p=>p.plan===user.plan);if(!plan)return {allowed:false,reason:'AI_PLAN_NOT_ENTITLED'};
 return {allowed:true,scope:'public',plan:plan.plan,maxConcurrent:plan.maxConcurrent,maxPerHour:plan.maxPerHour};
}
