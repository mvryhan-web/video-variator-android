export const TOOL_TRIAL_LIMIT=5;
export const TOOL_MINIMUM_PLAN=Object.freeze({photo:null,audio:null,prompter:null,photo_batch:'basic',video:'basic',clips:'pro',motion:'pro',tts:'pro',stt:'pro'});
const ranks={trial:0,basic:1,pro:2,business:3,lifetime:4};
export function includedTool(user,tool){
 if(!Object.hasOwn(TOOL_MINIMUM_PLAN,tool))throw Error('INVALID_TOOL');
 const minimum=TOOL_MINIMUM_PLAN[tool];if(!minimum)return true;
 const usage=user?.usage;return !!(user?.isAdmin||usage?.allFeatures||usage?.active&&(ranks[usage.plan]||0)>=ranks[minimum]);
}
export function toolAccess(user,{used=0,pending=0}={}){
 const trialUsed=Math.max(0,Number(used)||0),reserved=Math.max(0,Number(pending)||0);
 return {plan:user?.usage?.active?user.usage.plan:'trial',allFeatures:!!(user?.isAdmin||user?.usage?.allFeatures),trial:{limit:TOOL_TRIAL_LIMIT,used:trialUsed,pending:reserved,remaining:Math.max(0,TOOL_TRIAL_LIMIT-trialUsed-reserved)},tools:Object.fromEntries(Object.entries(TOOL_MINIMUM_PLAN).map(([tool,minimumPlan])=>[tool,{minimumPlan,free:!minimumPlan,included:includedTool(user,tool)}]))};
}
export function validateToolRun(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('INVALID_TOOL_RUN');const {tool,requestId}=body;
 if(!Object.hasOwn(TOOL_MINIMUM_PLAN,tool)||!validRunId(requestId))throw Error('INVALID_TOOL_RUN');
 return {tool,requestId};
}
export function validRunId(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);}
