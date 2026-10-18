import test from 'node:test';
import assert from 'node:assert/strict';
import {publicProviderPerformanceRow} from '../server/generation-provider-performance.js';

test('BASE #39: pending jobs must not count as failed provider outcomes',()=>{
 const row=publicProviderPerformanceRow({
  provider:'BytePlus',model:'seedance',kind:'video',jobs:8,
  succeeded:2,failed:1,processing:5,avg_seconds:'41.50',
  actual_cost:'1.75',cost_currency:'usd',credits_charged:'60'
 });
 assert.equal(row.jobs,8);assert.equal(row.processing,5);assert.equal(row.terminalJobs,3);
 assert.equal(row.successRate,2/3);assert.equal(row.failureRate,1/3);
 assert.equal(row.averageSeconds,41.5);assert.equal(row.actualCost,1.75);
 assert.equal(row.costCurrency,'usd');assert.equal(row.creditsCharged,60);
});

test('BASE #39: no completed jobs expose zero evidence, not misleading provider failure count',()=>{
 const row=publicProviderPerformanceRow({provider:'Google',kind:'video',jobs:5,succeeded:0,failed:0,processing:5,avg_seconds:null});
 assert.equal(row.terminalJobs,0);assert.equal(row.failed,0);
 assert.equal(row.successRate,0);assert.equal(row.failureRate,0);
 assert.equal(row.averageSeconds,null);
});

test('BASE #39: fully terminal samples preserve historical ratios',()=>{
 let r=publicProviderPerformanceRow({jobs:4,succeeded:3,failed:1,processing:0});
 assert.equal(r.successRate,.75);assert.equal(r.failureRate,.25);
 assert.equal(r.terminalJobs,4);
 r=publicProviderPerformanceRow({jobs:2,succeeded:0,failed:2,processing:0});
 assert.equal(r.successRate,0);assert.equal(r.failureRate,1);
});

test('BASE #39: malformed counts never manufacture negative or fractional outcomes',()=>{
 const r=publicProviderPerformanceRow({jobs:-4,succeeded:'bad',failed:1.5,processing:4,credits_charged:0});
 assert.equal(r.jobs,0);assert.equal(r.succeeded,0);assert.equal(r.failed,0);
 assert.equal(r.terminalJobs,0);
});
