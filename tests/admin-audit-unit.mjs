import test from 'node:test';
import assert from 'node:assert/strict';
import {recordAdminAudit,listAdminAudit} from '../server/admin-audit.js';

test('admin audit stores bounded structured events without accepting arbitrary action names',async()=>{
 const calls=[];
 const pool={async query(sql,args=[]){
  calls.push({sql,args});
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_admin_audit'))return {rows:[]};
  if(sql.startsWith('INSERT INTO vv_admin_audit'))return {rows:[]};
  if(sql.startsWith('SELECT id,actor_user_id'))return {rows:[{id:1,actor_user_id:'owner',action:'template.update',target_type:'template',target_id:'t1',details:{active:true},created_at:new Date('2026-10-15T10:00:00Z')}]};
  throw new Error(sql);
 }};
 await recordAdminAudit(pool,{actorUserId:'owner',action:'template.update',targetType:'template',targetId:'t1',details:{active:true}});
 await assert.rejects(()=>recordAdminAudit(pool,{actorUserId:'owner',action:'bad action with spaces',targetType:'template'}),/INVALID_AUDIT_EVENT/);
 const items=await listAdminAudit(pool);assert.equal(items.length,1);assert.equal(items[0].action,'template.update');assert.deepEqual(items[0].details,{active:true});
 const insert=calls.find(x=>x.sql.startsWith('INSERT INTO vv_admin_audit'));assert.ok(insert);assert.equal(insert.args[1],'template.update');
});
