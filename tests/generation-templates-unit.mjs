import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {validateTemplate,installGenerationTemplates} from '../server/generation-templates.js';

test('template validation enforces data-driven schema and safe fields',()=>{
 const t=validateTemplate({title:'Product photo',slug:'product-photo',category:'ecommerce',generationType:'image',promptTemplate:'Create a clean product image of {{product_name}}',defaultModel:'gemini-3.1-flash-image',requiredInputTypes:['image','product_name'],defaultSettings:{ratio:'1:1'},rightsBasis:'owned',rightsNote:'Original Deepsyq-created prompt, no third-party media',active:true,featured:false,sortOrder:20});
 assert.equal(t.slug,'product-photo');assert.equal(t.generationType,'image');assert.deepEqual(t.requiredInputTypes,['image','product_name']);
 // A JSON owner request must not publish an implicit '[object Object]', array, number or boolean.
 for(const promptTemplate of [{instruction:'Create product image'},['Create product image'],42,true]){
  assert.throws(()=>validateTemplate({...t,promptTemplate}),/INVALID_TEMPLATE/);
  assert.throws(()=>validateTemplate({...t,active:false,featured:false,promptTemplate}),/INVALID_TEMPLATE/);
 }
 assert.throws(()=>validateTemplate({...t,slug:'Bad slug'}),/INVALID_TEMPLATE/);
 assert.throws(()=>validateTemplate({...t,requiredInputTypes:['image','image']}),/INVALID_TEMPLATE/);
 assert.throws(()=>validateTemplate({...t,thumbnail:'http://unsafe.example/x.png'}),/INVALID_TEMPLATE/);
 assert.throws(()=>validateTemplate({...t,thumbnail:'//tracker.example/a.png'}),/INVALID_TEMPLATE/);
 assert.throws(()=>validateTemplate({...t,rightsBasis:null}),/TEMPLATE_RIGHTS_REQUIRED/);
 assert.throws(()=>validateTemplate({...t,rightsNote:''}),/TEMPLATE_RIGHTS_REQUIRED/);
 assert.throws(()=>validateTemplate({...t,rightsBasis:'unknown'}),/INVALID_TEMPLATE/);
 assert.throws(()=>validateTemplate({...t,active:false,featured:true}),/INVALID_TEMPLATE/);
 assert.throws(()=>validateTemplate({...t,promptTemplate:'Product photo without name field'}),/TEMPLATE_PRODUCT_NAME_PLACEHOLDER_REQUIRED/);
 assert.throws(()=>validateTemplate({...t,promptTemplate:'Product photo {product_name}'}),/TEMPLATE_PRODUCT_NAME_PLACEHOLDER_REQUIRED/);
 assert.equal(validateTemplate({...t,active:false,featured:false,promptTemplate:'Incomplete draft'}).active,false);
 // Admin may save a longer inactive draft, but cannot publish it with silent Studio truncation.
 const longPlain='Y'.repeat(2001);
 assert.equal(validateTemplate({...t,active:false,featured:false,promptTemplate:longPlain}).active,false);
 assert.throws(()=>validateTemplate({...t,active:true,featured:false,requiredInputTypes:['image'],promptTemplate:longPlain}),/TEMPLATE_STUDIO_PROMPT_TOO_LONG/);
 assert.equal(validateTemplate({...t,active:true,featured:false,requiredInputTypes:['image'],promptTemplate:'Z'.repeat(2000)}).active,true);
 // Product-name substitutions may shorten placeholders; actual final-length gate stays in Studio.
 assert.equal(validateTemplate({...t,active:true,featured:false,requiredInputTypes:['image','product_name'],promptTemplate:'Z'.repeat(1988)+' {{product_name}}'}).active,true);
 // An active personalized template must fit Studio even with the shortest allowed product name.
 assert.throws(()=>validateTemplate({...t,active:true,featured:false,requiredInputTypes:['product_name'],promptTemplate:'Z'.repeat(2000)+'{{product_name}}'}),/TEMPLATE_STUDIO_PROMPT_TOO_LONG/);
 // Long owner drafts remain editable until ready for publication.
 assert.equal(validateTemplate({...t,active:false,featured:false,requiredInputTypes:['product_name'],promptTemplate:'Z'.repeat(2000)+'{{product_name}}'}).active,false);
 // Replacing the placeholder with one character fits the exact boundary.
 assert.equal(validateTemplate({...t,active:true,featured:false,requiredInputTypes:['product_name'],promptTemplate:'Z'.repeat(1999)+'{{product_name}}'}).active,true);
 // Never skip the shortest-name check if a template uses a token without declaring the product_name input.
 assert.throws(()=>validateTemplate({...t,active:true,featured:false,requiredInputTypes:['image'],promptTemplate:'Z'.repeat(2000)+'{{ product_name }}'}),/TEMPLATE_STUDIO_PROMPT_TOO_LONG/);
 assert.throws(()=>validateTemplate({...t,active:true,featured:false,requiredInputTypes:['product_name'],promptTemplate:'Z'.repeat(2001)+'{{product_name}}'}),/TEMPLATE_STUDIO_PROMPT_TOO_LONG/);
 assert.equal(validateTemplate({...t,active:true,featured:false,requiredInputTypes:['product_name'],promptTemplate:'Z'.repeat(1999)+'{{product_name}}'}).active,true);
 assert.ok(validateTemplate({...t,promptTemplate:'Photo for {{ PRODUCT_NAME }}'}).promptTemplate.includes('PRODUCT_NAME'));
 const draft=validateTemplate({...t,active:false,featured:false,rightsBasis:null,rightsNote:''});
 assert.equal(draft.rightsBasis,null);
});

test('public template API exposes active templates and owner can create one',async()=>{
 const rows=[{id:'t-1',title:'Photo ad',slug:'photo-ad',category:'ecommerce',description:'',thumbnail:null,generation_type:'image',prompt_template:'Make an ad',default_model:null,required_input_types:['image'],default_settings:{ratio:'1:1'},active:true,featured:true,rights_basis:'owned',rights_note:'Original item owned by Deepsyq',sort_order:10,created_at:new Date(),updated_at:new Date()}];
 const pool={async query(sql,args=[]){
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_template'))return {rows:[]};
  if(sql.includes('ALTER TABLE vv_ai_template ADD COLUMN IF NOT EXISTS rights_basis'))return {rows:[]};
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_admin_audit'))return {rows:[]};
  if(sql.startsWith('INSERT INTO vv_admin_audit('))return {rows:[]};
  if(sql.startsWith('SELECT * FROM vv_ai_template WHERE active=true')){assert.match(sql,/rights_basis IN/);assert.match(sql,/length\(trim\(rights_note\)\)/);return {rows};}
  if(sql.includes('SELECT * FROM vv_ai_template WHERE slug=$1')){assert.match(sql,/rights_basis IN/);return {rows};}
  if(sql.startsWith('SELECT * FROM vv_ai_template WHERE id=$1'))return {rows};
  if(sql.startsWith('UPDATE vv_ai_template SET')){const result={...rows[0],title:args[1],slug:args[2],category:args[3],description:args[4],thumbnail:args[5],generation_type:args[6],prompt_template:args[7],default_model:args[8],required_input_types:JSON.parse(args[9]),default_settings:JSON.parse(args[10]),active:args[11],featured:args[12],sort_order:args[13],rights_basis:args[14],rights_note:args[15]};return {rows:[result]};}
  if(sql.startsWith('INSERT INTO vv_ai_template')){const r={...rows[0],id:args[0],title:args[1],slug:args[2],category:args[3],description:args[4],thumbnail:args[5],generation_type:args[6],prompt_template:args[7],default_model:args[8],required_input_types:JSON.parse(args[9]),default_settings:JSON.parse(args[10]),active:args[11],featured:args[12],sort_order:args[13],rights_basis:args[15],rights_note:args[16]};return {rows:[r]};}
  throw new Error(sql);
 }};
 const env={ADMIN_EMAIL:'owner@example.test'};
 const app=express();app.use(express.json());installGenerationTemplates(app,{pool,env,auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  let r=await fetch(base+'/api/templates?featured=true');assert.equal(r.status,200);let d=await r.json();assert.equal(d.items.length,1);assert.equal(d.items[0].slug,'photo-ad');assert.equal(Object.hasOwn(d.items[0],'rightsNote'),false);
  r=await fetch(base+'/api/templates/photo-ad');assert.equal(r.status,200);d=await r.json();assert.equal(d.template.slug,'photo-ad');assert.equal(Object.hasOwn(d.template,'rightsNote'),false);
  r=await fetch(base+'/api/studio/admin/templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Unverified offer',slug:'unverified-offer',category:'ads',generationType:'image',promptTemplate:'An original design',active:true,featured:false})});
  assert.equal(r.status,400);assert.equal((await r.json()).error,'TEMPLATE_RIGHTS_REQUIRED');
  r=await fetch(base+'/api/studio/admin/templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Missing Name',slug:'missing-name',category:'ads',generationType:'image',promptTemplate:'Original photo without a name variable',requiredInputTypes:['product_name'],rightsBasis:'owned',rightsNote:'Original prompt evidence',active:true})});
  assert.equal(r.status,400);assert.equal((await r.json()).error,'TEMPLATE_PRODUCT_NAME_PLACEHOLDER_REQUIRED');
  // Reject malformed JSON prompt types through both owner HTTP API paths as well.
  r=await fetch(base+'/api/studio/admin/templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Malformed prompt',slug:'malformed-prompt',category:'ads',generationType:'image',promptTemplate:{instruction:'Create an ad'},rightsBasis:'owned',rightsNote:'Original owned text rights',active:true})});
  assert.equal(r.status,400);assert.equal((await r.json()).error,'INVALID_TEMPLATE');
  r=await fetch(base+'/api/studio/admin/templates/t-1',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({promptTemplate:['Not a text field']})});
  assert.equal(r.status,400);assert.equal((await r.json()).error,'INVALID_TEMPLATE');
  // HTTP submission of an overlong active prompt must return the documented validation error,
  // never an insert/update or a generic 503 (no provider or payment is involved).
  r=await fetch(base+'/api/studio/admin/templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Oversized prompt',slug:'oversized-prompt',category:'ads',generationType:'image',promptTemplate:'X'.repeat(2001),rightsBasis:'owned',rightsNote:'Original owned text rights',active:true})});
  assert.equal(r.status,400);assert.equal((await r.json()).error,'TEMPLATE_STUDIO_PROMPT_TOO_LONG');
  r=await fetch(base+'/api/studio/admin/templates/t-1',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({promptTemplate:'X'.repeat(2001)})});
  assert.equal(r.status,400);assert.equal((await r.json()).error,'TEMPLATE_STUDIO_PROMPT_TOO_LONG');
  r=await fetch(base+'/api/studio/admin/templates/t-1',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({rightsBasis:'licensed',rightsNote:'License receipt kept in internal archive',active:true,featured:true})});
  assert.equal(r.status,200);d=await r.json();assert.equal(d.template.rightsBasis,'licensed');assert.equal(d.template.rightsNote,'License receipt kept in internal archive');
  r=await fetch(base+'/api/studio/admin/templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Video ad',slug:'video-ad',category:'ads',generationType:'video',promptTemplate:'Create a short product video',requiredInputTypes:['image'],defaultSettings:{ratio:'16:9'},active:false,featured:false,sortOrder:30})});assert.equal(r.status,201);d=await r.json();assert.equal(d.template.slug,'video-ad');assert.equal(d.template.active,false);assert.equal(d.template.rightsBasis,null);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('public templates are production-gated while owner preparation can remain separate',async()=>{
 const pool={async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_template'))return {rows:[]};throw new Error(sql);}};
 const app=express();installGenerationTemplates(app,{pool,env:{NODE_ENV:'production',AI_APPS_ENABLED:'false',ADMIN_EMAIL:'owner@example.test'},auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));try{const base=`http://127.0.0.1:${server.address().port}`;const r=await fetch(base+'/api/templates');assert.equal(r.status,503);assert.equal((await r.json()).error,'AI_APPS_NOT_ENABLED');}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('template publication requires owner-recorded rights, including when activating an existing draft',async()=>{
 const valid={title:'Owned image workflow',slug:'owned-image-workflow',category:'images',generationType:'image',promptTemplate:'Create an original illustration',active:true,featured:true};
 assert.throws(()=>validateTemplate(valid),/TEMPLATE_RIGHTS_REQUIRED/);
 const approved=validateTemplate({...valid,rightsBasis:'licensed',rightsNote:'License receipt stored in owner asset register'});
 assert.equal(approved.rightsBasis,'licensed');
 assert.equal(approved.rightsNote,'License receipt stored in owner asset register');
 const legacy={...valid,active:true,rightsBasis:null,rightsNote:''};
 assert.throws(()=>validateTemplate({...legacy,title:'Updated title'},legacy),/TEMPLATE_RIGHTS_REQUIRED/);
 const unpublished=validateTemplate({...legacy,active:false,featured:false},legacy);
 assert.equal(unpublished.active,false);
});
