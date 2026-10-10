import {pool,publicUser} from './db.js';
import {TOOL_TRIAL_LIMIT,TOOL_MINIMUM_PLAN,includedTool,toolAccess,validateToolRun,validRunId} from './tool-policy.js';
const TTL_HOURS=6;
export async function initToolAccess(){
 if(!pool)return;
 await pool.query(`ALTER TABLE vv_users ADD COLUMN IF NOT EXISTS tools_trial_used INTEGER NOT NULL DEFAULT 0 CHECK (tools_trial_used >= 0);
 CREATE TABLE IF NOT EXISTS vv_tool_runs (
 id UUID PRIMARY KEY,user_id TEXT NOT NULL REFERENCES vv_users(id) ON DELETE CASCADE,tool TEXT NOT NULL,
 trial_reserved BOOLEAN NOT NULL,state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','completed','canceled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),expires_at TIMESTAMPTZ NOT NULL,finished_at TIMESTAMPTZ);
 CREATE INDEX IF NOT EXISTS vv_tool_runs_user_state_idx ON vv_tool_runs(user_id,state,expires_at);`);
}
async function locked(userId,fn){
 if(!pool)throw Error('DATABASE_NOT_CONFIGURED');const client=await pool.connect();
 try{await client.query('BEGIN');const {rows}=await client.query('SELECT * FROM vv_users WHERE id=$1 FOR UPDATE',[userId]);if(!rows[0])throw Error('USER_NOT_FOUND');
 await client.query("UPDATE vv_tool_runs SET state='canceled',finished_at=NOW() WHERE user_id=$1 AND state='pending' AND expires_at<=NOW()",[userId]);
 const result=await fn(client,rows[0]);await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
async function snapshot(client,user){const {rows}=await client.query("SELECT COUNT(*)::int AS pending FROM vv_tool_runs WHERE user_id=$1 AND state='pending' AND trial_reserved",[user.id]);return toolAccess(publicUser(user),{used:user.tools_trial_used,pending:rows[0].pending});}
export async function getToolAccess(userId){return locked(userId,snapshot);}
export async function beginToolRun(userId,body){
 const {tool,requestId}=validateToolRun(body);
 return locked(userId,async(client,user)=>{
  const found=await client.query('SELECT * FROM vv_tool_runs WHERE id=$1',[requestId]);
  if(found.rows[0]){const run=found.rows[0];if(run.user_id!==userId||run.tool!==tool)throw Error('RUN_CONFLICT');return {run:publicRun(run),access:await snapshot(client,user)};}
  const access=await snapshot(client,user),trial=!includedTool(publicUser(user),tool);
  if(trial&&access.trial.remaining<=0)throw Error('TOOL_TRIAL_EXHAUSTED');
  const {rows}=await client.query(`INSERT INTO vv_tool_runs(id,user_id,tool,trial_reserved,expires_at) VALUES($1,$2,$3,$4,NOW()+INTERVAL '${TTL_HOURS} hours') RETURNING *`,[requestId,userId,tool,trial]);
  return {run:publicRun(rows[0]),access:await snapshot(client,user)};
 });
}
export async function finishToolRun(userId,id,outcome){
 if(!validRunId(id)||!['completed','canceled'].includes(outcome))throw Error('INVALID_TOOL_RUN');
 return locked(userId,async(client,user)=>{
  const {rows}=await client.query('SELECT * FROM vv_tool_runs WHERE id=$1 AND user_id=$2 FOR UPDATE',[id,userId]),run=rows[0];if(!run)throw Error('RUN_NOT_FOUND');
  if(run.state!=='pending'){if(run.state!==outcome)throw Error('RUN_ALREADY_FINISHED');return {run:publicRun(run),access:await snapshot(client,user)};}
  await client.query('UPDATE vv_tool_runs SET state=$2,finished_at=NOW() WHERE id=$1',[id,outcome]);
  if(outcome==='completed'&&run.trial_reserved){const update=await client.query('UPDATE vv_users SET tools_trial_used=tools_trial_used+1,updated_at=NOW() WHERE id=$1 AND tools_trial_used<$2 RETURNING tools_trial_used',[userId,TOOL_TRIAL_LIMIT]);if(!update.rows[0])throw Error('TOOL_TRIAL_EXHAUSTED');user.tools_trial_used=update.rows[0].tools_trial_used;}
  return {run:publicRun({...run,state:outcome}),access:await snapshot(client,user)};
 });
}
function publicRun(run){return {id:run.id,tool:run.tool,trialReserved:run.trial_reserved,state:run.state,expiresAt:run.expires_at};}
export function installToolAccess(app,{auth}){
 app.get('/api/tools/config',(_req,res)=>res.json({enabled:!!pool,trialLimit:TOOL_TRIAL_LIMIT,minimumPlans:TOOL_MINIMUM_PLAN}));
 const handler=fn=>async(req,res)=>{try{res.json(await fn(req));}catch(error){const code=error.message,status={INVALID_TOOL_RUN:400,RUN_CONFLICT:409,RUN_NOT_FOUND:404,RUN_ALREADY_FINISHED:409,TOOL_TRIAL_EXHAUSTED:402}[code]||503;if(status===503)console.error('[tool access]',error);res.status(status).json({error:status===503?'TOOLS_UNAVAILABLE':code});}};
 app.get('/api/tools/access',auth,handler(req=>getToolAccess(req.user.id)));
 app.post('/api/tools/runs',auth,handler(req=>beginToolRun(req.user.id,req.body)));
 app.post('/api/tools/runs/:id',auth,handler(req=>finishToolRun(req.user.id,req.params.id,req.body?.outcome)));
}
