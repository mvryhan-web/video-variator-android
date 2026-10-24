import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {
 assessReferenceS3CloudAcceptance,executeReferenceS3CloudAcceptance,
 REFERENCE_S3_TEST_CONSENT
} from '../server/generation-reference-cloud-acceptance.js';
const exec=promisify(execFile);
const makeEnv=()=>({
 NODE_ENV:'test',AI_REFERENCE_S3_TEST_CONSENT:REFERENCE_S3_TEST_CONSENT,
 AI_REFERENCE_S3_TEST_ENDPOINT:'https://media.example.com',
 AI_REFERENCE_S3_TEST_APPROVED_HOST:'media.example.com',
 AI_REFERENCE_S3_TEST_BUCKET:'deepsyq-ref-accept-123456789',
 AI_REFERENCE_S3_TEST_REGION:'us-east-1',
 AI_REFERENCE_S3_TEST_ACCESS_KEY_ID:'DEDICATEDCIACCESS1234',
 AI_REFERENCE_S3_TEST_SECRET_ACCESS_KEY:'dedicated-fixture-credentials-not-live-abc',
 AI_OBJECT_STORAGE_BUCKET:'production-media-bucket',
 AI_OBJECT_STORAGE_ACCESS_KEY_ID:'PRODUCTIONKEYDOESNOTMATCH',
 AI_OBJECT_STORAGE_SECRET_ACCESS_KEY:'PRODUCTIONSECRETDOESNOTMATCH',
 AI_PUBLIC_GENERATION_ENABLED:'false',AI_BILLING_ENABLED:'false'
});
function box(type,data=Buffer.alloc(0)){
 const x=Buffer.alloc(8);x.writeUInt32BE(data.length+8);x.write(type,4);
 return Buffer.concat([x,data]);
}
function fixture(){
 const ftyp=Buffer.alloc(8);ftyp.write('isom');
 const mvhd=Buffer.alloc(20);mvhd.writeUInt32BE(1000,12);mvhd.writeUInt32BE(2000,16);
 const hdlr=Buffer.alloc(12);hdlr.write('vide',8);
 return Buffer.concat([box('ftyp',ftyp),box('moov',Buffer.concat([
  box('mvhd',mvhd),box('trak',box('mdia',box('hdlr',hdlr)))
 ])),box('mdat',Buffer.from([0,1,2,3]))]);
}
test('cloud reference acceptance is OFF by default: no network, no secrets or URLs',()=>{
 const result=assessReferenceS3CloudAcceptance({});
 assert.equal(result.readyForManualExecution,false);
 assert.equal(result.mode,'offline-readiness');
 assert.equal(result.networkRequests,0);
 assert.equal(result.providerRequests,0);
 assert.ok(result.blockerCodes.length>=4);
 const txt=JSON.stringify(result);
 assert.ok(!txt.includes('undefined'));
 assert.ok(!txt.includes('http'));
});
test('isolated named bucket, separate fixture credentials and explicit acknowledgement yield only offline readiness',()=>{
 const result=assessReferenceS3CloudAcceptance(makeEnv());
 assert.deepEqual(result,{mode:'offline-readiness',readyForManualExecution:true,
  blockerCodes:[],networkRequests:0,providerRequests:0});
 assert.equal(JSON.stringify(result).includes(makeEnv().AI_REFERENCE_S3_TEST_SECRET_ACCESS_KEY),false);
});
test('production, shared secrets, wrong bucket/endpoint and unapproved hosts all deny manual execution',()=>{
 const variants=[
  {NODE_ENV:'production'},{RENDER:'true'},
  {RENDER_SERVICE_ID:'srv-production'},
  {AI_PUBLIC_GENERATION_ENABLED:'true'},{AI_BILLING_ENABLED:'true'},
  {AI_REFERENCE_S3_TEST_CONSENT:'not-approved'},
  {AI_REFERENCE_S3_TEST_BUCKET:'production-media-bucket'},
  {AI_REFERENCE_S3_TEST_BUCKET:'deepsyq-ref-accept-too-short'},
  {AI_REFERENCE_S3_TEST_ACCESS_KEY_ID:'PRODUCTIONKEYDOESNOTMATCH'},
  {AI_REFERENCE_S3_TEST_SECRET_ACCESS_KEY:'PRODUCTIONSECRETDOESNOTMATCH'},
  {AI_REFERENCE_S3_TEST_ENDPOINT:'http://media.example.com'},
  {AI_REFERENCE_S3_TEST_ENDPOINT:'https://127.0.0.1'},
  {AI_REFERENCE_S3_TEST_ENDPOINT:'https://media.example.com:9443'},
  {AI_REFERENCE_S3_TEST_ENDPOINT:'https://media.example.com/other-bucket'},
  {AI_REFERENCE_S3_TEST_APPROVED_HOST:'unapproved.example.com'},
  {AI_REFERENCE_S3_TEST_ENDPOINT:'https://media.example.local',
   AI_REFERENCE_S3_TEST_APPROVED_HOST:'media.example.local'}
 ];
 for(const variant of variants){
  const verdict=assessReferenceS3CloudAcceptance({...makeEnv(),...variant});
  assert.equal(verdict.readyForManualExecution,false,JSON.stringify(variant));
  assert.ok(verdict.blockerCodes.length>0);
  assert.equal(verdict.networkRequests,0);
 }
});
test('blocked execution never constructs storage, uploads, probes or calls a provider',async()=>{
 let calls=0;
 await assert.rejects(()=>executeReferenceS3CloudAcceptance({
  env:{...makeEnv(),AI_REFERENCE_S3_TEST_CONSENT:''},
  fixture:async()=>{calls++;return fixture();},
  storageFactory:()=>{calls++;throw Error('NO_STORAGE');},
  httpFetch:async()=>{calls++;throw Error('NO_NETWORK');}
 }),/REFERENCE_S3_ACCEPTANCE_BLOCKED/);
 assert.equal(calls,0);
});
function harness({tamperAccepted=false,failPrivateGet=false}={}){
 let deleted=false,putCount=0,getCount=0,deleteCount=0,fetchCount=0;
 const input=fixture(),start=new Date('2026-10-15T18:55:00Z');
 const storageFactory=({env,now})=>({
  configured:true,
  stagedReferenceKey:({assetId})=>env.AI_OBJECT_STORAGE_PREFIX+'/references/users/fixture/'+assetId+'.mp4',
  async putStagedReference({userId,mime,bytes,assetId}){
   putCount++;assert.equal(mime,'video/mp4');assert.deepEqual(bytes,input);
   return {key:this.stagedReferenceKey({assetId})};
  },
  async getStagedReference(){getCount++;if(failPrivateGet)throw Error('PRIVATE_READ_DOWN');return input;},
  presignStagedReferenceRead({seconds=30,key}){
   return {url:'https://media.example.com/deepsyq-ref-accept-123456789/'+key+
    '?X-Amz-Date='+now().getTime()+'&X-Amz-Expires='+seconds+'&X-Amz-Signature=fixture',
    expiresAt:new Date(now().getTime()+seconds*1000).toISOString()};
  },
  async deleteStagedReference(){deleted=true;deleteCount++;return true;}
 });
 const httpFetch=async(url,opts)=>{
  fetchCount++;assert.equal(opts.redirect,'error');
  const u=new URL(url),stamp=Number(u.searchParams.get('X-Amz-Date'));
  if(deleted)return new Response('gone',{status:404});
  if(stamp<start.getTime()-30000)return new Response('expired',{status:403});
  if(u.searchParams.get('X-Amz-Expires')==='60')return tamperAccepted?new Response(input):new Response('forged',{status:403});
  if(!u.searchParams.has('X-Amz-Signature'))return new Response('unsigned',{status:400});
  return new Response(input,{status:200});
 };
 return {storageFactory,httpFetch,fixture:async()=>input,now:()=>start,
  counters:()=>({putCount,getCount,deleteCount,fetchCount,deleted})};
}
test('manual fixture test exercises signed S3 lifecycle and returns only non-sensitive result codes',async()=>{
 const mocks=harness();
 const result=await executeReferenceS3CloudAcceptance({env:makeEnv(),...mocks});
 assert.equal(result.status,'isolated-fixture-verified');
 assert.equal(result.modelArkFetchVerified,false);
 assert.equal(result.providerRequests,0);
 assert.equal(result.commercialReady,false);
 assert.equal(result.checks.length,8);
 assert.deepEqual(mocks.counters(),{putCount:1,getCount:1,deleteCount:1,fetchCount:5,deleted:true});
 const output=JSON.stringify(result);
 assert.ok(!output.includes('https:'));
 assert.ok(!output.includes(makeEnv().AI_REFERENCE_S3_TEST_SECRET_ACCESS_KEY));
});
test('provider fetch guard failure fails closed and deletes test fixture',async()=>{
 const mocks=harness({tamperAccepted:true});
 await assert.rejects(()=>executeReferenceS3CloudAcceptance({env:makeEnv(),...mocks}),
  /REFERENCE_S3_ACCEPTANCE_TAMPER_ACCEPTED/);
 assert.equal(mocks.counters().deleteCount,1,'finally must delete private media after validation failure');
});
test('private read failure also deletes potentially uploaded object',async()=>{
 const mocks=harness({failPrivateGet:true});
 await assert.rejects(()=>executeReferenceS3CloudAcceptance({env:makeEnv(),...mocks}),/PRIVATE_READ_DOWN/);
 assert.equal(mocks.counters().deleteCount,1);
});
test('CLI defaults to network-free --plan and never prints credentials',async()=>{
 const e=makeEnv();
 const {stdout}=await exec(process.execPath,['scripts/verify-reference-s3-cloud.mjs','--plan'],
  {env:{...process.env,...e},timeout:5000});
 const result=JSON.parse(stdout);
 assert.equal(result.readyForManualExecution,true);
 assert.equal(result.networkRequests,0);
 assert.ok(!stdout.includes(e.AI_REFERENCE_S3_TEST_SECRET_ACCESS_KEY));
 assert.ok(!stdout.includes(e.AI_REFERENCE_S3_TEST_ENDPOINT));
 assert.ok(!stdout.includes(e.AI_REFERENCE_S3_TEST_BUCKET));
});
