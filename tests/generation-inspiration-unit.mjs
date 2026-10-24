import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {validateInspiration,installInspiration} from '../server/generation-inspiration.js';

test('inspiration validation requires owned/licensed media and safe preview URLs',()=>{
 const item=validateInspiration({title:'Owned editorial image',slug:'owned-editorial-image',kind:'image',category:'editorial',previewUrl:'/owned/inspiration/editorial.webp',prompt:'Editorial portrait with soft natural light',aspectRatio:'2:3',rightsBasis:'owned',rightsNote:'Created in house',active:true,featured:true});
 assert.equal(item.kind,'image');assert.equal(item.rightsBasis,'owned');assert.equal(item.aspectRatio,'2:3');
 assert.throws(()=>validateInspiration({...item,rightsBasis:'unknown'}),/INVALID_INSPIRATION/);
 assert.throws(()=>validateInspiration({...item,previewUrl:'javascript:alert(1)'}),/INVALID_INSPIRATION/);
 assert.throws(()=>validateInspiration({...item,aspectRatio:'10:1'}),/INVALID_INSPIRATION/);
});

test('public inspiration is active-only, ratio-filtered and agent-target content stays hidden by default',async()=>{
 const rows=[{id:'i1',title:'Owned image',slug:'owned-image',kind:'image',category:'fashion',description:'Owned',preview_url:'/owned.webp',preview_poster_url:null,prompt:'Fashion prompt',default_model:null,aspect_ratio:'1:1',required_input_types:[],default_settings:{},action_target:'studio',rights_basis:'owned',rights_note:'created in house',active:true,featured:true,sort_order:10,created_at:new Date(),updated_at:new Date()}];
 const queries=[];const pool={async query(sql,args=[]){
  queries.push({sql,args});
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_inspiration'))return {rows:[]};
  if(sql.startsWith('SELECT DISTINCT category'))return {rows:[{category:'fashion'}]};
  if(sql.startsWith('SELECT DISTINCT aspect_ratio'))return {rows:[{aspect_ratio:'1:1'}]};
  if(sql.startsWith('SELECT * FROM vv_ai_inspiration WHERE active=true'))return {rows};
  throw new Error(sql);
 }};
 const app=express();app.use(express.json());installInspiration(app,{pool,env:{NODE_ENV:'test',AI_INSPIRATION_ENABLED:'true',ADMIN_EMAIL:'owner@example.test'},auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{
  let r=await fetch(base+'/api/inspiration?kind=image&ratio=1%3A1');assert.equal(r.status,200);let d=await r.json();
  assert.equal(d.items.length,1);assert.equal(d.items[0].rightsBasis,undefined);assert.deepEqual(d.ratios,['1:1']);
  assert.ok(queries.some(q=>q.sql.includes("action_target='studio'")));
  assert.ok(queries.some(q=>q.sql.includes('aspect_ratio=$')));
  assert.ok(queries.some(q=>q.sql.includes('length(trim(rights_note))>=3')));
  r=await fetch(base+'/api/inspiration?target=agent');assert.equal(r.status,200);d=await r.json();assert.deepEqual(d.items,[]);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('active inspiration requires recorded rights evidence',()=>{
 const base={title:'Licensed example',slug:'licensed-example',kind:'video',category:'ads',previewUrl:'https://media.example.test/example.mp4',prompt:'Product ad prompt',aspectRatio:'9:16',rightsBasis:'licensed'};
 assert.equal(validateInspiration({...base,active:false}).active,false);
 assert.throws(()=>validateInspiration({...base,active:true,rightsNote:''}),/INSPIRATION_RIGHTS_NOTE_REQUIRED/);
 assert.equal(validateInspiration({...base,active:true,rightsNote:'License contract #42'}).active,true);
});


test('owner Inspiration readiness reports concrete content blockers',async()=>{
 const rows=[
  {kind:'image',category:'Fashion',aspect_ratio:'2:3',action_target:'studio',rights_basis:'owned',rights_note:'Created in house',active:true,featured:true},
  {kind:'video',category:'Cinematic',aspect_ratio:'16:9',action_target:'studio',rights_basis:'licensed',rights_note:'License #7',active:true,featured:false},
  {kind:'image',category:'Draft',aspect_ratio:'1:1',action_target:'studio',rights_basis:'owned',rights_note:'',active:true,featured:false},
  {kind:'video',category:'Agent',aspect_ratio:'9:16',action_target:'agent',rights_basis:'owned',rights_note:'Created in house',active:true,featured:true}
 ];
 const pool={async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_inspiration'))return {rows:[]};if(sql.startsWith('SELECT kind,category,aspect_ratio'))return {rows};throw new Error(sql);}};
 const app=express();installInspiration(app,{pool,env:{NODE_ENV:'test',AI_INSPIRATION_ENABLED:'true',AI_INSPIRATION_AGENT_TARGETS_ENABLED:'false',ADMIN_EMAIL:'owner@example.test'},auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/studio/admin/inspiration-readiness');assert.equal(r.status,200);const d=await r.json();assert.equal(d.ready,false);assert.equal(d.counts.images,1);assert.equal(d.counts.videos,1);assert.equal(d.counts.featured,1);assert.equal(d.counts.rightsBlocked,1);assert.equal(d.counts.agentGated,1);assert.ok(d.blockers.includes('ACTIVE_ITEMS_MISSING_RIGHTS_EVIDENCE'));assert.deepEqual(d.ratios,['16:9','2:3']);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('agent inspiration requires both explicit flag and a real same-origin action path',async()=>{
 const rows=[{id:'a1',title:'Agent example',slug:'agent-example',kind:'video',category:'Campaign',description:'Agent workflow example',preview_url:'/agent.webp',preview_poster_url:null,prompt:'Build a campaign',default_model:null,aspect_ratio:'9:16',required_input_types:['image'],default_settings:{ratio:'9:16'},action_target:'agent',rights_basis:'owned',rights_note:'Created in house',active:true,featured:true,sort_order:1,created_at:new Date(),updated_at:new Date()}];
 const makePool=()=>({async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_inspiration'))return {rows:[]};if(sql.startsWith('SELECT DISTINCT category'))return {rows:[{category:'Campaign'}]};if(sql.startsWith('SELECT DISTINCT aspect_ratio'))return {rows:[{aspect_ratio:'9:16'}]};if(sql.startsWith('SELECT * FROM vv_ai_inspiration WHERE active=true'))return {rows};throw new Error(sql);}});
 async function request(env){const app=express();installInspiration(app,{pool:makePool(),env:{NODE_ENV:'test',AI_INSPIRATION_ENABLED:'true',ADMIN_EMAIL:'owner@example.test',...env},auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});const server=app.listen(0);await new Promise(r=>server.once('listening',r));try{return await (await fetch('http://127.0.0.1:'+server.address().port+'/api/inspiration?target=agent')).json();}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}}
 let d=await request({AI_INSPIRATION_AGENT_TARGETS_ENABLED:'true'});assert.deepEqual(d.items,[]);
 d=await request({AI_INSPIRATION_AGENT_TARGETS_ENABLED:'true',AI_INSPIRATION_AGENT_PATH:'/agent.html'});assert.equal(d.items.length,1);assert.equal(d.items[0].actionPath,'/agent.html');
 d=await request({AI_INSPIRATION_AGENT_TARGETS_ENABLED:'true',AI_INSPIRATION_AGENT_PATH:'https://evil.example/agent'});assert.deepEqual(d.items,[]);
});


test('public inspiration pagination is bounded and exposes a next offset',async()=>{
 const rows=Array.from({length:25},(_,i)=>({id:'p'+i,title:'Item '+i,slug:'item-'+i,kind:'image',category:'Editorial',description:'',preview_url:'/p'+i+'.webp',preview_poster_url:null,prompt:'Prompt '+i,default_model:null,aspect_ratio:'1:1',required_input_types:[],default_settings:{},action_target:'studio',rights_basis:'owned',rights_note:'Created in house',active:true,featured:false,sort_order:i,created_at:new Date(),updated_at:new Date()}));
 const pool={async query(sql){if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_inspiration'))return {rows:[]};if(sql.startsWith('SELECT DISTINCT category'))return {rows:[{category:'Editorial'}]};if(sql.startsWith('SELECT DISTINCT aspect_ratio'))return {rows:[{aspect_ratio:'1:1'}]};if(sql.startsWith('SELECT * FROM vv_ai_inspiration WHERE active=true'))return {rows};throw new Error(sql);}};
 const app=express();installInspiration(app,{pool,env:{NODE_ENV:'test',AI_INSPIRATION_ENABLED:'true',ADMIN_EMAIL:'owner@example.test'},auth:(req,_res,next)=>next()});const server=app.listen(0);await new Promise(r=>server.once('listening',r));
 try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/inspiration?limit=24&offset=0');assert.equal(r.status,200);const d=await r.json();assert.equal(d.items.length,24);assert.equal(d.pagination.hasMore,true);assert.equal(d.pagination.nextOffset,24);assert.equal(d.pagination.limit,24);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('production Inspiration never auto-creates its database table',async()=>{
 const statements=[];
 const pool={async query(sql){statements.push(sql);if(sql.includes("to_regclass('public.vv_ai_inspiration')"))return {rows:[{table_name:null}]};throw Error('UNEXPECTED_SQL');}};
 const app=express();app.use(express.json());installInspiration(app,{pool,env:{NODE_ENV:'production',AI_INSPIRATION_ENABLED:'true',ADMIN_EMAIL:'owner@example.test'},auth:(_req,_res,next)=>next()});
 const listener=app.listen(0);await new Promise(r=>listener.once('listening',r));
 try{
  const r=await fetch('http://127.0.0.1:'+listener.address().port+'/api/inspiration');
  assert.equal(r.status,503);
  assert.equal((await r.json()).error,'INSPIRATION_UNAVAILABLE');
  assert.ok(statements.some(sql=>sql.includes("to_regclass('public.vv_ai_inspiration')")));
  assert.ok(statements.every(sql=>!sql.includes('CREATE TABLE')&&!sql.includes('ALTER TABLE')));
 }finally{listener.closeAllConnections();await new Promise(r=>listener.close(r));}
});
