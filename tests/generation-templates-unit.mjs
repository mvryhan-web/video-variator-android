import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {validateTemplate,installGenerationTemplates} from '../server/generation-templates.js';

test('template validation enforces data-driven schema and safe fields',()=>{
 const t=validateTemplate({title:'Product photo',slug:'product-photo',category:'ecommerce',generationType:'image',promptTemplate:'Create a clean product image of {{product_name}}',defaultModel:'gemini-3.1-flash-image',requiredInputTypes:['image','product_name'],defaultSettings:{ratio:'1:1'},active:true,featured:false,sortOrder:20});
 assert.equal(t.slug,'product-photo');assert.equal(t.generationType,'image');assert.deepEqual(t.requiredInputTypes,['image','product_name']);
 assert.throws(()=>validateTemplate({...t,slug:'Bad slug'}),/INVALID_TEMPLATE/);
 assert.throws(()=>validateTemplate({...t,requiredInputTypes:['image','image']}),/INVALID_TEMPLATE/);
 assert.throws(()=>validateTemplate({...t,thumbnail:'http://unsafe.example/x.png'}),/INVALID_TEMPLATE/);
});

test('public template API exposes active templates and owner can create one',async()=>{
 const rows=[{id:'t-1',title:'Photo ad',slug:'photo-ad',category:'ecommerce',description:'',thumbnail:null,generation_type:'image',prompt_template:'Make an ad',default_model:null,required_input_types:['image'],default_settings:{ratio:'1:1'},active:true,featured:true,sort_order:10,created_at:new Date(),updated_at:new Date()}];
 const pool={async query(sql,args=[]){
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_template'))return {rows:[]};
  if(sql.startsWith('SELECT * FROM vv_ai_template WHERE active=true'))return {rows};
  if(sql.startsWith('INSERT INTO vv_ai_template')){const r={...rows[0],id:args[0],title:args[1],slug:args[2],category:args[3],description:args[4],thumbnail:args[5],generation_type:args[6],prompt_template:args[7],default_model:args[8],required_input_types:JSON.parse(args[9]),default_settings:JSON.parse(args[10]),active:args[11],featured:args[12],sort_order:args[13]};return {rows:[r]};}
  throw new Error(sql);
 }};
 const env={ADMIN_EMAIL:'owner@example.test'};
 const app=express();app.use(express.json());installGenerationTemplates(app,{pool,env,auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  let r=await fetch(base+'/api/templates?featured=true');assert.equal(r.status,200);let d=await r.json();assert.equal(d.items.length,1);assert.equal(d.items[0].slug,'photo-ad');
  r=await fetch(base+'/api/studio/admin/templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Video ad',slug:'video-ad',category:'ads',generationType:'video',promptTemplate:'Create a short product video',requiredInputTypes:['image'],defaultSettings:{ratio:'16:9'},active:false,featured:false,sortOrder:30})});assert.equal(r.status,201);d=await r.json();assert.equal(d.template.slug,'video-ad');assert.equal(d.template.active,false);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('public templates are production-gated while owner preparation can remain separate',async()=>{
 const pool={async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_template'))return {rows:[]};throw new Error(sql);}};
 const app=express();installGenerationTemplates(app,{pool,env:{NODE_ENV:'production',AI_APPS_ENABLED:'false',ADMIN_EMAIL:'owner@example.test'},auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));try{const base=`http://127.0.0.1:${server.address().port}`;const r=await fetch(base+'/api/templates');assert.equal(r.status,503);assert.equal((await r.json()).error,'AI_APPS_NOT_ENABLED');}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
