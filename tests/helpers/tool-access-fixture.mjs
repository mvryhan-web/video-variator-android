import {randomUUID} from 'node:crypto';
import {toolAccess,TOOL_MINIMUM_PLAN} from '../../server/tool-policy.js';
export async function mockToolAccess(page,{plan='pro',used=0,authenticated=true}={}){
 const user=authenticated?{usage:{plan,active:plan!=='trial',allFeatures:plan==='lifetime'}}:null;
 if(authenticated)await page.addInitScript(()=>localStorage.setItem('vv_token','tool-ui-fixture-only'));
 const runs=new Map(),calls=[];let completed=used;
 const snapshot=()=>toolAccess(user,{used:completed,pending:[...runs.values()].filter(r=>r.trialReserved&&r.state==='pending').length});
 await page.route('**/api/tools/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;calls.push({path,method:request.method(),body:request.postDataJSON()});
  if(path==='/api/tools/config')return route.fulfill({json:{enabled:true,trialLimit:5,minimumPlans:TOOL_MINIMUM_PLAN}});
  if(!authenticated||!request.headers().authorization)return route.fulfill({status:401,json:{error:'AUTH_REQUIRED'}});
  if(path==='/api/tools/access')return route.fulfill({json:snapshot()});
  if(path==='/api/tools/runs'){
   const body=request.postDataJSON(),trialReserved=!snapshot().tools[body.tool].included;
   if(trialReserved&&snapshot().trial.remaining<=0)return route.fulfill({status:402,json:{error:'TOOL_TRIAL_EXHAUSTED'}});
   const run={id:body.requestId||randomUUID(),tool:body.tool,trialReserved,state:'pending',expiresAt:new Date(Date.now()+3600000).toISOString()};runs.set(run.id,run);return route.fulfill({json:{run,access:snapshot()}});
  }
  const run=runs.get(path.split('/').at(-1));if(!run)return route.fulfill({status:404,json:{error:'RUN_NOT_FOUND'}});
  if(run.state==='pending'){run.state=request.postDataJSON().outcome;if(run.trialReserved&&run.state==='completed')completed++;}
  return route.fulfill({json:{run,access:snapshot()}});
 });
 return {calls,runs,snapshot,setPlan(plan){user.usage={plan,active:plan!=='trial',allFeatures:plan==='lifetime'};}};
}
