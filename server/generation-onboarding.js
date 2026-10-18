import {readFile} from 'node:fs/promises';

let initPromise;
function featureEnabled(env){const value=env.AI_ONBOARDING_ENABLED;return value==='true'||(env.NODE_ENV!=='production'&&value!=='false');}
export async function initOnboarding(pool){
 if(!pool)throw Error('DATABASE_NOT_CONFIGURED');
 if(!initPromise)initPromise=readFile(new URL('./migrations/20261015-ai-onboarding.sql',import.meta.url),'utf8').then(sql=>pool.query(sql)).catch(e=>{initPromise=null;throw e;});
 await initPromise;
}
const TARGETS={image:'/generate-studio.html?studio=image',video:'/generate-studio.html?studio=video'};
export function onboardingTarget(goal){if(!TARGETS[goal])throw Error('INVALID_ONBOARDING_GOAL');return TARGETS[goal];}
export function installOnboarding(app,{auth,pool,env=process.env}){
 app.get('/api/onboarding',auth,async(req,res)=>{if(!featureEnabled(env))return res.status(503).json({error:'ONBOARDING_NOT_ENABLED'});try{await initOnboarding(pool);const {rows}=await pool.query('SELECT goal,completed_at FROM vv_ai_onboarding WHERE user_id=$1',[req.user.id]);res.json({completed:!!rows.length,goal:rows[0]?.goal||null,completedAt:rows[0]?.completed_at||null,options:[{id:'image',label:'Image',target:TARGETS.image},{id:'video',label:'Video',target:TARGETS.video}]});}catch(_){res.status(503).json({error:'ONBOARDING_UNAVAILABLE'});}});
 app.post('/api/onboarding',auth,async(req,res)=>{if(!featureEnabled(env))return res.status(503).json({error:'ONBOARDING_NOT_ENABLED'});try{const goal=String(req.body?.goal||'');const target=onboardingTarget(goal);await initOnboarding(pool);await pool.query(`INSERT INTO vv_ai_onboarding(user_id,goal,completed_at,updated_at) VALUES($1,$2,NOW(),NOW()) ON CONFLICT(user_id) DO UPDATE SET goal=EXCLUDED.goal,completed_at=NOW(),updated_at=NOW()`,[req.user.id,goal]);res.json({ok:true,goal,target});}catch(e){res.status(e.message==='INVALID_ONBOARDING_GOAL'?400:503).json({error:e.message==='INVALID_ONBOARDING_GOAL'?'INVALID_ONBOARDING_GOAL':'ONBOARDING_UNAVAILABLE'});}});
}
