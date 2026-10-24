import test from 'node:test';
import assert from 'node:assert/strict';
import {generationRequestId,findGenerationRequest} from '../server/generation-idempotency.js';

test('public generation request IDs are strict UUIDs',()=>{
 assert.equal(generationRequestId('11111111-1111-4111-8111-111111111111',{required:true}),'11111111-1111-4111-8111-111111111111');
 assert.throws(()=>generationRequestId('',{required:true}),/GENERATION_REQUEST_ID_REQUIRED/);
 assert.throws(()=>generationRequestId('same-request'),/INVALID_GENERATION_REQUEST_ID/);
});

test('same request ID reuses only the exact same generation fingerprint',async()=>{
 const client={async query(_sql,args){return {rows:[{id:'job-1',status:'processing',request_fingerprint:'fp-a',credits_reserved:9,user_id:args[0]}]};}};
 assert.deepEqual(await findGenerationRequest(client,{userId:'u1',requestId:'11111111-1111-4111-8111-111111111111',fingerprint:'fp-a'}),{id:'job-1',status:'processing',creditsReserved:9});
 await assert.rejects(()=>findGenerationRequest(client,{userId:'u1',requestId:'11111111-1111-4111-8111-111111111111',fingerprint:'fp-b'}),/GENERATION_REQUEST_CONFLICT/);
});
