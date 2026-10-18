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
export function generationEntitlementForUser(user,env={}){
 if(env.AI_PUBLIC_GENERATION_ENABLED!=='true')return {allowed:false,reason:'PUBLIC_AI_DISABLED'};
 const catalog=generationEntitlements(env);if(!catalog.configured)return {allowed:false,reason:'AI_ENTITLEMENTS_NOT_CONFIGURED'};
 if(!user||user.plan==='lifetime')return {allowed:false,reason:'AI_PLAN_NOT_ENTITLED'};
 if(!['active','trialing'].includes(String(user.subscription_status||'')))return {allowed:false,reason:'AI_PLAN_INACTIVE'};
 const plan=catalog.plans.find(p=>p.plan===user.plan);if(!plan)return {allowed:false,reason:'AI_PLAN_NOT_ENTITLED'};
 return {allowed:true,scope:'public',plan:plan.plan,maxConcurrent:plan.maxConcurrent,maxPerHour:plan.maxPerHour};
}
