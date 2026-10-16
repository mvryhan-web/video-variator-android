import test from 'node:test';
import assert from 'node:assert/strict';
import {safeGenerationRecoveryAction,publicExistingJobRetryable} from '../server/generation-retry-policy.js';

test('BASE #33: existing provider operation can only be polled, never resubmitted',()=>{
 assert.equal(safeGenerationRecoveryAction({status:'processing',operation:'byteplus:task-123'}),'poll_existing_operation');
 assert.equal(safeGenerationRecoveryAction({status:'processing',operation:'models/veo/operations/op123'}),'poll_existing_operation');
 assert.equal(safeGenerationRecoveryAction({status:'processing',operation:''}),'hold_for_review');
 assert.equal(safeGenerationRecoveryAction({status:'processing',operation:null}),'hold_for_review');
 assert.equal(safeGenerationRecoveryAction({status:'queued',operation:null}),'hold_for_review');
});

test('BASE #33: completed provider result may only re-settle existing wallet',()=>{
 assert.equal(safeGenerationRecoveryAction({status:'finalizing',operation:null}),'settle_existing_wallet');
 assert.equal(safeGenerationRecoveryAction({status:'finalizing',operation:'byteplus:task'}),'settle_existing_wallet');
 assert.equal(safeGenerationRecoveryAction({status:'finalizing',operation:'models/veo/operations/task'}),'settle_existing_wallet');
 assert.equal(safeGenerationRecoveryAction({status:'finalizing',operation:'byteplus:task',deleted:true}),'hold_for_review');
 assert.equal(safeGenerationRecoveryAction({status:'finalizing',operation:'byteplus:task',providerTerminal:true}),'hold_for_review');
});

test('BASE #33: terminal, deleted, failed and unknown jobs cannot auto-retry',()=>{
 for(const job of [
  undefined,null,{}, {status:'failed',operation:'byteplus:task'}, {status:'ready'},
  {status:'processing',operation:'byteplus:task',deleted:true},
  {status:'processing',operation:'byteplus:task',providerTerminal:true},
  {status:'unknown',operation:'byteplus:task'}
 ])assert.equal(safeGenerationRecoveryAction(job),'hold_for_review');
});

test('BASE #33: public retry hint applies only to the same-job polling action',()=>{
 assert.equal(publicExistingJobRetryable({stage:'provider_submit',retryable:true}),false);
 assert.equal(publicExistingJobRetryable({stage:'generation',retryable:true}),false);
 assert.equal(publicExistingJobRetryable({stage:'provider_poll',retryable:true}),true);
 assert.equal(publicExistingJobRetryable({stage:'recovery_poll',retryable:true}),true);
 assert.equal(publicExistingJobRetryable({stage:'provider_poll',retryable:false}),false);
 assert.equal(publicExistingJobRetryable({stage:'provider_poll',retryable:1}),false);
});
