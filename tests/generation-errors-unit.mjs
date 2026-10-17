import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeGenerationError,publicGenerationError} from '../server/generation-errors.js';

test('generation errors are normalized to stable public-safe codes',()=>{
 assert.deepEqual(publicGenerationError(Error('PROVIDER_BUSY'),{stage:'provider_submit'}),{error:'AI_PROVIDER_BUSY',retryable:true});
 assert.equal(normalizeGenerationError(Error('PROVIDER_TASK_FAILED'),{stage:'provider_poll'}).code,'AI_GENERATION_REJECTED');
 assert.equal(normalizeGenerationError(Error('UNSAFE_PROVIDER_URL')).code,'AI_PROVIDER_RESULT_BLOCKED');
 assert.equal(normalizeGenerationError(Error('private upstream message with token abc123')).sourceCode,'UNKNOWN');
});

test('timeouts and unknown failures never expose raw provider text',()=>{
 const timeout=new Error('request timed out after 120000ms');
 const t=normalizeGenerationError(timeout,{stage:'provider_poll'});assert.equal(t.code,'AI_PROVIDER_TIMEOUT');assert.equal(t.retryable,true);
 const u=normalizeGenerationError(new Error('upstream says secret=xyz'));assert.equal(u.code,'AI_GENERATION_FAILED');assert.equal(u.sourceCode,'UNKNOWN');
});
