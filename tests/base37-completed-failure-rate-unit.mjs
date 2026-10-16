import test from 'node:test';
import assert from 'node:assert/strict';
import {completedGenerationSummary} from '../server/generation-business-rates.js';

test('BASE #37 pending jobs cannot dilute completed generation failures',()=>{
 const completed=completedGenerationSummary({ready:9,failed:1});
 assert.deepEqual(completed,{completedJobs:10,completedFailureRate:0.1});
 // An additional 900 queued jobs does not change this completed cohort.
 const pending=900,allJobFailureRate=1/(10+pending);
 assert.ok(allJobFailureRate<0.002);
 assert.equal(completed.completedFailureRate,0.1);
});

test('BASE #37 empty cohort is unavailable rather than a fake 0% failure rate',()=>{
 assert.deepEqual(completedGenerationSummary({ready:0,failed:0}),{
  completedJobs:0,completedFailureRate:null});
});

test('BASE #37 all successful/all failed and Postgres count strings are supported',()=>{
 assert.deepEqual(completedGenerationSummary({ready:'30',failed:'0'}),{
  completedJobs:30,completedFailureRate:0});
 assert.deepEqual(completedGenerationSummary({ready:'0',failed:'4'}),{
  completedJobs:4,completedFailureRate:1});
});

test('BASE #37 malformed, negative or overflowing counters never fake business metrics',()=>{
 for(const bad of [null,undefined,-1,0.5,NaN,Infinity,'1.5','-1','',{},Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>completedGenerationSummary({ready:bad,failed:0}),/INVALID_GENERATION_COUNT/);
 }
 assert.throws(()=>completedGenerationSummary({ready:Number.MAX_SAFE_INTEGER,failed:1}),/INVALID_GENERATION_COUNT/);
});
