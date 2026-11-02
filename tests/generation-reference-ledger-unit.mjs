import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationReferenceLedger,referenceRetentionMinutes} from '../server/generation-reference-ledger.js';

const ID='123e4567-e89b-42d3-a456-426614174000';
const env={AI_STUDIO_REFERENCE_STAGING_ENABLED:'true',AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true',AI_STUDIO_REFERENCE_TTL_MINUTES:'5'};
function wav(){
 const payload=Buffer.alloc(16000),fmt=Buffer.alloc(16);
 fmt.writeUInt16LE(1,0);fmt.writeUInt16LE(1,2);fmt.writeUInt32LE(8000,4);
 fmt.writeUInt32LE(16000,8);fmt.writeUInt16LE(2,12);fmt.writeUInt16LE(16,14);
 const head=Buffer.alloc(8);head.write('RIFF',0);head.writeUInt32LE(36+payload.length,4);
 const sub=Buffer.alloc(8);sub.write('data',0);sub.writeUInt32LE(payload.length,4);
 return Buffer.concat([head,Buffer.from('WAVEfmt '),Buffer.from([16,0,0,0]),fmt,sub,payload]);
}
function fixture(){
 const rows=new Map(),objects=new Map();
 let clock=new Date('2026-10-15T13:00:00.000Z'),deletedCalls=0,failDelete=false,failPut=false;
 const pool={async query(sql,args=[]){
  if(sql.includes('INSERT INTO vv_generation_reference_assets')){
   const [id,user_id,storage_key,mime,byte_size,duration_seconds,expires_at]=args;
   rows.set(id,{id,user_id,storage_key,mime,byte_size,duration_seconds,expires_at,status:'uploading'});
   return {rows:[]};
  }
  if(sql.includes("SET status='ready'")){
   const row=rows.get(args[0]);
   if(!row||row.user_id!==args[1]||row.status!=='uploading'||row.expires_at<=clock)return {rows:[]};
   row.status='ready';return {rows:[row]};
  }
  if(sql.includes("SET status='failed',last_error='REFERENCE_UPLOAD_REVIEW'")){
   const row=rows.get(args[0]);if(row?.status==='uploading')row.status='failed';return {rows:[]};
  }
  if(sql.includes('SELECT storage_key,mime FROM')){
   const row=rows.get(args[0]);
   return {rows:row&&row.user_id===args[1]&&row.status==='ready'&&row.expires_at>clock?[row]:[]};
  }
  if(sql.includes('WITH selected AS')){
   const claimed=[...rows.values()].filter(row=>
    (['ready','failed','uploading'].includes(row.status)&&row.expires_at<=clock)||
    (row.status==='deleting'&&row.cleanup_claimed_at<=new Date(clock.getTime()-900000))
   ).slice(0,args[0]);
   for(const row of claimed){row.status='deleting';row.cleanup_claimed_at=clock;}
   return {rows:claimed};
  }
  if(sql.includes('DELETE FROM vv_generation_reference_assets')){
   const row=rows.get(args[0]);if(row?.status==='deleting')rows.delete(args[0]);return {rows:[]};
  }
  if(sql.includes("last_error='REFERENCE_DELETE_FAILED'")){
   const row=rows.get(args[0]);if(row){row.status='failed';row.cleanup_claimed_at=null;}return {rows:[]};
  }
  throw Error('Unexpected reference-ledger SQL: '+sql.slice(0,90));
 }};
 const storage={
  configured:true,
  stagedReferenceKey:({userId,mime,assetId})=>`private/${userId}/${assetId}.${mime==='audio/wav'?'wav':'mp4'}`,
  async putStagedReference({userId,mime,bytes,assetId}){
   const key=this.stagedReferenceKey({userId,mime,assetId});
   if(failPut)throw Error('fixture ambiguous PUT');
   objects.set(key,Buffer.from(bytes));return {key};
  },
  async getStagedReference({userId,key}){if(!key.startsWith(`private/${userId}/`))throw Error('ACCESS_DENIED');return objects.get(key);},
  async deleteStagedReference({userId,key}){
   deletedCalls++;if(!key.startsWith(`private/${userId}/`))throw Error('ACCESS_DENIED');
   if(failDelete)throw Error('fixture object storage unavailable');
   objects.delete(key);return true;
  }
 };
 const ledger=createGenerationReferenceLedger({pool,storage,env,uuid:()=>ID,now:()=>clock});
 return {ledger,pool,storage,rows,objects,get clock(){return clock;},advance:minutes=>{clock=new Date(clock.getTime()+minutes*60000);},
  failDeletion:state=>{failDelete=state;},failUpload:state=>{failPut=state;},get deletedCalls(){return deletedCalls;}};
}
test('reference ledger requires explicit TTL and stays disabled by default',async()=>{
 assert.equal(referenceRetentionMinutes({}),null);
 assert.equal(referenceRetentionMinutes({AI_STUDIO_REFERENCE_TTL_MINUTES:'0'}),null);
 assert.equal(referenceRetentionMinutes({AI_STUDIO_REFERENCE_TTL_MINUTES:'1441'}),null);
 assert.equal(referenceRetentionMinutes(env),5);
 const x=fixture();
 const disabled=createGenerationReferenceLedger({pool:{},storage:{configured:true},env:{},uuid:()=>ID});
 await assert.rejects(()=>disabled.stage({userId:'alice',mime:'audio/wav',bytes:wav()}),/REFERENCE_STAGING_DISABLED/);
});
test('staging persists the asset before upload; read requires owner and a live TTL',async()=>{
 const x=fixture(),b=wav();
 const item=await x.ledger.stage({userId:'alice',mime:'audio/wav',bytes:b});
 assert.equal(item.id,ID);assert.equal(item.durationSeconds,1);assert.equal(x.rows.get(ID).status,'ready');
 assert.deepEqual(await x.ledger.get({userId:'alice',id:ID}),b);
 await assert.rejects(()=>x.ledger.get({userId:'mallory',id:ID}),/REFERENCE_MEDIA_ACCESS_DENIED/);
 x.advance(6);
 await assert.rejects(()=>x.ledger.get({userId:'alice',id:ID}),/REFERENCE_MEDIA_ACCESS_DENIED/);
});
test('expired reference cleanup reclaims failed deletes and never repeats upload',async()=>{
 const x=fixture();await x.ledger.stage({userId:'alice',mime:'audio/wav',bytes:wav()});
 x.advance(6);x.failDeletion(true);
 assert.deepEqual(await x.ledger.cleanupExpired(),{claimed:1,deleted:0,failed:1});
 assert.equal(x.rows.get(ID).status,'failed');assert.equal(x.objects.size,1);
 x.failDeletion(false);
 assert.deepEqual(await x.ledger.cleanupExpired(),{claimed:1,deleted:1,failed:0});
 assert.equal(x.rows.size,0);assert.equal(x.objects.size,0);
 assert.equal(x.deletedCalls,2);
});
test('ambiguous upload failure is recorded for later sweeping; no provider task starts',async()=>{
 const x=fixture();x.failUpload(true);
 await assert.rejects(()=>x.ledger.stage({userId:'alice',mime:'audio/wav',bytes:wav()}),/REFERENCE_STAGING_FAILED/);
 assert.equal(x.rows.get(ID).status,'failed');
 x.advance(6);
 assert.deepEqual(await x.ledger.cleanupExpired(),{claimed:1,deleted:1,failed:0});
});

test('turning off reference intake does not strand old S3 assets or reenable staging',async()=>{
 const x=fixture();await x.ledger.stage({userId:'alice',mime:'audio/wav',bytes:wav()});
 x.advance(6);
 const cleanupOnly=createGenerationReferenceLedger({
  pool:x.pool,storage:x.storage,uuid:()=>ID,
  env:{AI_STUDIO_REFERENCE_CLEANUP_ENABLED:'true'}
 });
 await assert.rejects(()=>cleanupOnly.stage({userId:'alice',mime:'audio/wav',bytes:wav()}),/REFERENCE_STAGING_DISABLED/);
 assert.deepEqual(await cleanupOnly.cleanupExpired(),{claimed:1,deleted:1,failed:0});
 assert.equal(x.objects.size,0);assert.equal(x.rows.size,0);
});
