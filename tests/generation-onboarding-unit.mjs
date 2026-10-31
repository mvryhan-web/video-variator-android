import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {onboardingTarget,installOnboarding} from '../server/generation-onboarding.js';

test('onboarding only accepts real first-stage workflows',()=>{
 assert.equal(onboardingTarget('image'),'/generate-studio.html?studio=image');
 assert.equal(onboardingTarget('video'),'/generate-studio.html?studio=video');
 assert.throws(()=>onboardingTarget('avatar'),/INVALID_ONBOARDING_GOAL/);
});

test('onboarding persists the selected starting workflow for the authenticated user',async()=>{
 let saved=null;
 const pool={async query(sql,args=[]){
  if(sql.includes('CREATE TABLE IF NOT EXISTS vv_ai_onboarding'))return {rows:[]};
  if(sql.startsWith('SELECT goal,completed_at'))return {rows:saved?[{goal:saved.goal,completed_at:new Date()}]:[]};
  if(sql.startsWith('INSERT INTO vv_ai_onboarding')){saved={userId:args[0],goal:args[1]};return {rows:[]};}
  throw new Error(sql);
 }};
 const app=express();app.use(express.json());installOnboarding(app,{pool,auth:(req,_res,next)=>{req.user={id:'user-1'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  let r=await fetch(base+'/api/onboarding');assert.equal(r.status,200);let d=await r.json();assert.equal(d.completed,false);assert.deepEqual(d.options.map(x=>x.id),['image','video']);
  r=await fetch(base+'/api/onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({goal:'avatar'})});assert.equal(r.status,400);
  r=await fetch(base+'/api/onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({goal:'image'})});assert.equal(r.status,200);d=await r.json();assert.equal(d.target,'/generate-studio.html?studio=image');assert.deepEqual(saved,{userId:'user-1',goal:'image'});
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('onboarding is production-gated by default',async()=>{
 const app=express();app.use(express.json());installOnboarding(app,{pool:{},env:{NODE_ENV:'production',AI_ONBOARDING_ENABLED:'false'},auth:(req,_res,next)=>{req.user={id:'u1'};next();}});
 const server=app.listen(0);await new Promise(r=>server.once('listening',r));try{const base=`http://127.0.0.1:${server.address().port}`;const r=await fetch(base+'/api/onboarding');assert.equal(r.status,503);assert.equal((await r.json()).error,'ONBOARDING_NOT_ENABLED');}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
