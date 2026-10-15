import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {validateInspiration,installInspiration} from '../server/generation-inspiration.js';

test('inspiration validation requires owned/licensed media and safe preview URLs',()=>{
 const item=validateInspiration({title:'Owned editorial image',slug:'owned-editorial-image',kind:'image',category:'editorial',previewUrl:'/owned/inspiration/editorial.webp',prompt:'Editorial portrait with soft natural light',aspectRatio:'2:3',rightsBasis:'owned',active:true,featured:true});
 assert.equal(item.kind,'image');assert.equal(item.rightsBasis,'owned');assert.equal(item.aspectRatio,'2:3');
 assert.throws(()=>validateInspiration({...item,rightsBasis:'unknown'}),/INVALID_INSPIRATION/);
 assert.throws(()=>validateInspiration({...item,previewUrl:'javascript:alert(1)'}),/INVALID_INSPIRATION/);
 assert.throws(()=>validateInspiration({...item,aspectRatio:'10:1'}),/INVALID_INSPIRATION/);
});

test('public inspiration is active-only and agent-target content stays hidden by default',async()=>{
 const rows=[{id:'i1',title:'Owned image',slug:'owned-image',kind:'image',category:'fashion',description:'Owned',preview_url:'/owned.webp',preview_poster_url:null,prompt:'Fashion prompt',default_model:null,aspect_ratio:'1:1',required_input_types:[],default_settings:{},action_target:'studio',rights_basis:'owned',rights_note:'created in house',active:true,featured:true,sort_order:10,created_at:new Date(),updated_at:new Date()}];
 const queries=[];const pool={async query(sql,args=[]){queries.push({sql,args});if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_inspiration'))return {rows:[]};if(sql.startsWith('SELECT DISTINCT category'))return {rows:[{category:'fashion'}]};if(sql.startsWith('SELECT * FROM vv_ai_inspiration WHERE active=true'))return {rows};throw new Error(sql);}};
 const app=express();app.use(express.json());installInspiration(app,{pool,env:{NODE_ENV:'test',AI_INSPIRATION_ENABLED:'true',ADMIN_EMAIL:'owner@example.test'},auth:(req,_res,next)=>{req.user={id:'owner',provider:'google',email:'owner@example.test'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 try{let r=await fetch(base+'/api/inspiration?kind=image');assert.equal(r.status,200);let d=await r.json();assert.equal(d.items.length,1);assert.equal(d.items[0].rightsBasis,undefined);assert.ok(queries.some(q=>q.sql.includes("action_target='studio'")));r=await fetch(base+'/api/inspiration?target=agent');assert.equal(r.status,200);d=await r.json();assert.deepEqual(d.items,[]);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
