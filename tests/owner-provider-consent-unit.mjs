import test from 'node:test';
import assert from 'node:assert/strict';
import {hasStoredGenerationConsent,installGenerationConsent} from '../server/generation-consent.js';

test('explicit user-scoped acceptance is never inferred from registration or client boolean',async()=>{
 const accepted=new Map(),routes=new Map();
 const pool={async query(sql,args=[]){
  if(/^-- Additive|^CREATE TABLE/.test(sql.trim()))return {rows:[]};
  if(sql.includes('SELECT provider_data_accepted,provider_data_version')){
   const rec=accepted.get(args[0]);return {rows:rec?[{provider_data_accepted:rec.accepted,provider_data_version:rec.version}]:[]};
  }
  if(sql.includes('SELECT terms_version,privacy_version')){
   const rec=accepted.get(args[0]);return {rows:rec?[{terms_version:'2026-10-20',privacy_version:'2026-10-20',provider_data_version:rec.version,provider_data_accepted:rec.accepted}]:[]};
  }
  if(sql.includes('INSERT INTO vv_ai_user_consents')){
   accepted.set(args[0],{version:args[2],accepted:args[3]});return {rows:[]};
  }
  throw new Error('Unexpected SQL');
 }};
 const app={
  get(path,...handlers){routes.set('GET '+path,handlers.at(-1));},
  post(path,...handlers){routes.set('POST '+path,handlers.at(-1));}
 };
 installGenerationConsent(app,{auth:()=>{},pool});
 function response(){return {statusCode:200,data:null,set(){return this;},status(code){this.statusCode=code;return this;},json(value){this.data=value;return this;}};}
 async function post(userId,body){const r=response();await routes.get('POST /api/studio/consent')({user:{id:userId},body},r);return r;}
 async function get(userId){const r=response();await routes.get('GET /api/studio/consent')({user:{id:userId}},r);return r;}
 assert.equal(await hasStoredGenerationConsent(pool,'user-a'),false);
 const bad=await post('user-a',{version:'2026-10-20',termsAccepted:true,privacyAcknowledged:true,providerAccepted:'true'});
 assert.equal(bad.statusCode,400);
 assert.equal(await hasStoredGenerationConsent(pool,'user-a'),false);
 const optedOut=await post('user-a',{version:'2026-10-20',termsAccepted:true,privacyAcknowledged:true,providerAccepted:false});
 assert.equal(optedOut.statusCode,200);
 assert.equal((await get('user-a')).data.providerAccepted,false);
 assert.equal(await hasStoredGenerationConsent(pool,'user-a'),false);
 const optedIn=await post('user-a',{version:'2026-10-20',termsAccepted:true,privacyAcknowledged:true,providerAccepted:true});
 assert.equal(optedIn.statusCode,200);
 assert.equal(await hasStoredGenerationConsent(pool,'user-a'),true);
 assert.equal(await hasStoredGenerationConsent(pool,'user-b'),false);
 const revoke=await post('user-a',{version:'2026-10-20',termsAccepted:true,privacyAcknowledged:true,providerAccepted:false});
 assert.equal(revoke.statusCode,200);
 assert.equal(await hasStoredGenerationConsent(pool,'user-a'),false);
});
