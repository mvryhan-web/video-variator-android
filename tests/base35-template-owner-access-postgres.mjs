import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import express from 'express';
import pg from 'pg';
import {installGenerationTemplates} from '../server/generation-templates.js';

const connection=process.env.AI_TEST_DATABASE_URL;
test('BASE #35 real PostgreSQL: public template isolation and owner-only access',{skip:!connection},async()=>{
 const dbUrl=new URL(connection);
 assert.equal(process.env.NODE_ENV,'test');
 assert.ok(['127.0.0.1','localhost'].includes(dbUrl.hostname));
 assert.equal(dbUrl.pathname,'/vv_ai_test');
 const pool=new pg.Pool({connectionString:connection,max:1,connectionTimeoutMillis:5000});
 const db=await pool.connect();
 const schema='base35_'+randomUUID().replaceAll('-','').slice(0,20);
 let server=null;
 try{
  await db.query('BEGIN');
  await db.query('CREATE SCHEMA '+schema);
  await db.query('SET LOCAL search_path TO '+schema+', public');
  await db.query(await readFile(new URL('../server/migrations/20261015-ai-templates.sql',import.meta.url),'utf8'));
  await db.query(await readFile(new URL('../server/migrations/20261016-ai-template-rights.sql',import.meta.url),'utf8'));
  await db.query(`INSERT INTO vv_ai_template
   (id,title,slug,category,generation_type,prompt_template,active,featured,rights_basis,rights_note)
   VALUES
   ('p1','Owned approved','owned-approved','catalog','image','Original owner prompt',true,true,'owned','Private owner license evidence'),
   ('p2','Legacy unverified','legacy-unverified','catalog','image','Legacy prompt',true,true,NULL,''),
   ('p3','Private draft','private-draft','catalog','image','Draft prompt',false,false,'licensed','Internal license receipt')`);
  const app=express();app.use(express.json());
  // Synthetic identities are injected exclusively by this isolated test harness.
  // The production authentication middleware and identity verification are not replaced.
  const auth=(req,res,next)=>{
   const id=req.get('x-test-identity');
   if(!id)return res.status(401).json({error:'AUTH_REQUIRED'});
   req.user={id,provider:id==='other-provider'?'email':'google',
    email:id==='owner'||id==='other-provider'?'owner@example.test':'other@example.test'};
   next();
  };
  installGenerationTemplates(app,{auth,pool:db,env:{NODE_ENV:'test',AI_APPS_ENABLED:'true',ADMIN_EMAIL:'owner@example.test'}});
  server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
  const url='http://127.0.0.1:'+server.address().port;

  // Public catalogue and slug API must not expose unverified or inactive records.
  let response=await fetch(url+'/api/templates');
  assert.equal(response.status,200);
  let data=await response.json();
  assert.deepEqual(data.items.map(item=>item.slug),['owned-approved']);
  assert.equal(Object.hasOwn(data.items[0],'rightsNote'),false);
  assert.equal(Object.hasOwn(data.items[0],'rightsBasis'),false);
  for(const slug of ['legacy-unverified','private-draft']){
   response=await fetch(url+'/api/templates/'+slug);
   assert.equal(response.status,404,'private or unverified slug leaked: '+slug);
   assert.equal((await response.json()).error,'TEMPLATE_NOT_FOUND');
  }
  response=await fetch(url+'/api/templates/owned-approved');
  assert.equal(response.status,200);
  assert.equal((await response.json()).template.slug,'owned-approved');

  // Owner admin endpoints must deny missing, different, and wrong-provider identities.
  const admin=url+'/api/studio/admin/templates';
  for(const identity of [null,'other','other-provider']){
   const headers=identity?{'x-test-identity':identity}:{};
   for(const [method,path,body] of [
    ['GET',admin,null],
    ['POST',admin,{title:'Unauthorized attempt',slug:'new-unauthorized',category:'catalog',generationType:'image',promptTemplate:'Prompt',active:false}],
    ['PATCH',admin+'/p1',{title:'Unauthorized mutation'}]
   ]){
    response=await fetch(path,{method,headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    assert.equal(response.status,identity?403:401,method+' must reject identity '+String(identity));
   }
  }
  response=await fetch(admin,{headers:{'x-test-identity':'owner'}});
  assert.equal(response.status,200);
  data=await response.json();
  assert.equal(data.items.length,3);
  const ownerItem=data.items.find(item=>item.id==='p1');
  assert.equal(ownerItem.rightsBasis,'owned');
  assert.equal(ownerItem.rightsNote,'Private owner license evidence');
  const persisted=await db.query('SELECT COUNT(*)::integer AS count FROM vv_ai_template');
  assert.equal(persisted.rows[0].count,3,'unauthorized calls must leave DB unchanged');
 }finally{
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  await db.query('ROLLBACK').catch(()=>{});
  db.release();await pool.end();
 }
});
