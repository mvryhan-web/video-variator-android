import {readFile} from 'node:fs/promises';
let ready;
const ACTION=/^[a-z0-9_.:-]{3,80}$/;
const TYPE=/^[a-z0-9_.:-]{2,60}$/;
export async function initAdminAudit(pool){
 if(!pool)throw Error('DATABASE_NOT_CONFIGURED');
 if(!ready)ready=readFile(new URL('./migrations/20261015-admin-audit.sql',import.meta.url),'utf8').then(sql=>pool.query(sql)).catch(e=>{ready=null;throw e;});
 await ready;
}
function details(v){if(v==null)return{};if(typeof v!=='object'||Array.isArray(v))throw Error('INVALID_AUDIT_DETAILS');const raw=JSON.stringify(v);if(raw.length>4000)throw Error('INVALID_AUDIT_DETAILS');return v;}
export async function recordAdminAudit(pool,{actorUserId,action,targetType,targetId=null,details:meta={}}){
 if(!actorUserId||!ACTION.test(String(action))||!TYPE.test(String(targetType))||String(targetId||'').length>200)throw Error('INVALID_AUDIT_EVENT');
 await initAdminAudit(pool);await pool.query('INSERT INTO vv_admin_audit(actor_user_id,action,target_type,target_id,details) VALUES($1,$2,$3,$4,$5::jsonb)',[actorUserId,String(action),String(targetType),targetId?String(targetId):null,JSON.stringify(details(meta))]);
}
export async function listAdminAudit(pool,{limit=100}={}){
 await initAdminAudit(pool);const n=Math.max(1,Math.min(200,Number(limit)||100));const {rows}=await pool.query('SELECT id,actor_user_id,action,target_type,target_id,details,created_at FROM vv_admin_audit ORDER BY created_at DESC LIMIT $1',[n]);return rows.map(r=>({id:Number(r.id),actorUserId:r.actor_user_id,action:r.action,targetType:r.target_type,targetId:r.target_id||null,details:r.details||{},createdAt:r.created_at}));
}
