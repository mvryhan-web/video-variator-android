import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateOperationalSignals,checkOperationalSignals} from '../server/product-watcher/operational-signals.js';

test('failure warnings require actual observed volume, not guessed provider quality',()=>{
 const low=evaluateOperationalSignals([{provider:'BytePlus',jobs_1h:4,failed_1h:4}],[]);
 assert.equal(low.status,'healthy');
 const high=evaluateOperationalSignals([{provider:'Google',jobs_1h:20,failed_1h:9}],[]);
 assert.equal(high.status,'warning');
 assert.deepEqual(high.alerts.map(x=>x.code),['PROVIDER_HIGH_FAILURE_RATE']);
 assert.equal(high.alerts[0].rate,0.45);
});

test('B5-06 measured generation-job usage burst needs enough prior and current samples',()=>{
 const base={provider:'BytePlus',jobs_1h:50,jobs_prev_23h:69,failed_1h:0};
 const result=evaluateOperationalSignals([base],[]);
 assert.equal(result.status,'warning');
 assert.deepEqual(result.alerts,[{code:'GENERATION_USAGE_SPIKE',provider:'BytePlus',
  jobs:50,previousJobs:69,ratio:16.67}]);
 assert.equal(result.providers[0].jobsPrevious23Hours,69);
 for(const changed of [{jobs_1h:24},{jobs_prev_23h:45},{jobs_prev_23h:400},
   {jobs_prev_23h:0},{jobs_prev_23h:-1}]) {
  const val=evaluateOperationalSignals([{...base,...changed}],[]);
  assert.equal(val.alerts.length,0);
 }
 assert.ok(result.note.includes('No vendor API request volume'));
});

test('completion latency spike requires real sample volume and high absolute slowdown',()=>{
 const provider='BytePlus';
 const enough={provider,jobs_1h:9,failed_1h:0,latency_jobs_1h:7,
   latency_jobs_prev_23h:28,latency_avg_ms_1h:68000,latency_avg_ms_prev_23h:12000};
 const spike=evaluateOperationalSignals([enough],[]);
 assert.equal(spike.status,'warning');
 assert.equal(spike.alerts[0].code,'GENERATION_COMPLETION_LATENCY_SPIKE');
 assert.equal(spike.alerts[0].ratio,5.67);
 assert.equal(spike.alerts[0].recentSamples,7);
 assert.ok(spike.note.includes('No live provider API latency'));
 const tooFew=evaluateOperationalSignals([{...enough,latency_jobs_1h:4}],[]);
 assert.equal(tooFew.status,'healthy');
 const noHistory=evaluateOperationalSignals([{...enough,latency_jobs_prev_23h:2}],[]);
 assert.equal(noHistory.status,'healthy');
 const short=evaluateOperationalSignals([{...enough,latency_avg_ms_1h:18000}],[]);
 assert.equal(short.status,'healthy');
 const badClock=evaluateOperationalSignals([{...enough,latency_avg_ms_1h:-150}],[]);
 assert.equal(badClock.status,'healthy');
 const noTimestamps=evaluateOperationalSignals([{provider,jobs_1h:9,failed_1h:0}],[]);
 assert.equal(noTimestamps.alerts.length,0);
 assert.equal(noTimestamps.providers[0].completionLatencyAverageMsLastHour,null);
});

test('recorded spend is compared within same currency only, no FX, revenue or invented profit',()=>{
 const rows=[
 {currency:'usd',tracked_1h:12,tracked_prev_23h:46,missing_cost_1h:0,cost_1h:'24.000000',cost_prev_23h:'46.000000'},
 {currency:'eur',tracked_1h:10,tracked_prev_23h:25,missing_cost_1h:0,cost_1h:'2.000000',cost_prev_23h:'25.000000'}
 ];
 const r=evaluateOperationalSignals([],rows);
 assert.equal(r.currencies.length,2);
 assert.equal(r.currencies[0].recordedCostLastHour,'24.000000');
 assert.ok(r.alerts.some(x=>x.code==='RECORDED_SPEND_SPIKE'&&x.currency==='usd'));
 assert.ok(!r.alerts.some(x=>x.currency==='eur'));
 assert.equal('grossMargin' in r,false);
 assert.equal('totalSpend' in r,false);
});

test('B5-06 recorded charge missing currency triggers a visibility alert, not invented FX or zero cost',()=>{
 const r=evaluateOperationalSignals([],[{
   currency:'unknown',tracked_1h:1,tracked_prev_23h:0,
   missing_cost_1h:0,missing_currency_cost_1h:1,cost_1h:'2.400000',cost_prev_23h:'0'
 }]);
 assert.equal(r.status,'warning');
 assert.equal(r.currencies.length,0);
 assert.deepEqual(r.alerts,[{code:'COST_CURRENCY_MISSING',jobs:1}]);
 assert.equal('totalSpend' in r,false);
 assert.equal('convertedCost' in r,false);
 const malformed=evaluateOperationalSignals([],[{
   currency:'usd',tracked_1h:1,tracked_prev_23h:0,
   missing_currency_cost_1h:-1,cost_1h:'0',cost_prev_23h:'0'
 }]);
 assert.equal(malformed.alerts.length,0);
});

test('per-job cost spike does not claim official provider price increase',()=>{
 const rows=[{currency:'usd',tracked_1h:10,tracked_prev_23h:30,missing_cost_1h:0,cost_1h:'100',cost_prev_23h:'30'}];
 const r=evaluateOperationalSignals([],rows);
 assert.ok(r.alerts.some(x=>x.code==='RECORDED_UNIT_COST_SPIKE'));
 assert.ok(!JSON.stringify(r).includes('PRICE_INCREASE_CONFIRMED'));
});

test('insufficient baseline prevents cost anomaly, even at extreme amount',()=>{
 const r=evaluateOperationalSignals([],[
 {currency:'usd',tracked_1h:2,tracked_prev_23h:4,cost_1h:'500000',cost_prev_23h:'1',missing_cost_1h:0}
 ]);
 assert.equal(r.status,'healthy');
});

test('missing actual cost is visibility gap, not a fictional zero-cost provider',()=>{
 const r=evaluateOperationalSignals([],[
 {currency:'unknown',tracked_1h:0,tracked_prev_23h:0,cost_1h:'0',cost_prev_23h:'0',missing_cost_1h:3}
 ]);
 assert.equal(r.currencies.length,0);
 assert.deepEqual(r.alerts,[{code:'COST_VISIBILITY_GAP',readyJobsWithoutActualCostLastHour:3}]);
});

test('incomplete, malicious or invalid ledger inputs never generate fake metrics',()=>{
 const r=evaluateOperationalSignals(
 [{provider:'Bad',jobs_1h:-10,failed_1h:10}],
 [{currency:'usd',tracked_1h:50,tracked_prev_23h:100,cost_1h:'NaN',cost_prev_23h:'12',missing_cost_1h:0}]
 );
 assert.equal(r.status,'healthy');
 assert.equal(r.providers.length,0);
 assert.equal(r.currencies.length,0);
});

test('operational checker only performs aggregate read-only SQL without user data',async()=>{
 const statements=[];
 const client={async query(sql){
  statements.push(sql);
  if(sql.includes('to_regclass'))return{rows:[{table_name:'vv_generation_jobs'}]};
  if(sql.includes('AS jobs_1h'))return{rows:[{provider:'BytePlus',jobs_1h:12,failed_1h:8}]};
  return{rows:[{currency:'usd',tracked_1h:0,tracked_prev_23h:0,missing_cost_1h:0,cost_1h:'0',cost_prev_23h:'0'}]};
 }};
 const r=await checkOperationalSignals(client);
 assert.equal(r.status,'warning');
 assert.equal(r.alerts[0].code,'PROVIDER_HIGH_FAILURE_RATE');
 assert.ok(statements.every(s=>/^\s*SELECT/i.test(s)));
 assert.ok(!statements.join('\n').includes('prompt'));
 assert.ok(!statements.join('\n').includes('user_id'));
 assert.ok(!statements.join('\n').includes('stripe'));
 assert.ok(statements.some(s=>s.includes('completed_at-started_at')));
 assert.ok(statements.some(s=>s.includes("INTERVAL '24 hours'")));
 assert.ok(statements.some(s=>s.includes('jobs_prev_23h')));
 assert.ok(statements.some(s=>s.includes('missing_currency_cost_1h')));
 assert.ok(statements.every(s=>!s.includes('SELECT * FROM vv_generation_jobs')));
 assert.ok(statements.every(s=>!s.includes('password_hash')));
});

test('database failure is normalized without secrets',async()=>{
 const client={query:async()=>{throw Error('postgres://user:secret@localhost/hidden')}};
 const r=await checkOperationalSignals(client);
 assert.deepEqual(r,{status:'warning',code:'OPERATIONAL_METRICS_UNAVAILABLE'});
 assert.ok(!JSON.stringify(r).includes('secret'));
});
