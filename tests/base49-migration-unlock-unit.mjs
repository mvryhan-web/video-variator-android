import test from 'node:test';
import assert from 'node:assert/strict';
import {runAiMigrations} from '../server/ai-migrations.js';

function fixture(unlock){
 let released,queries=[];
 const client={
  async query(sql){
   queries.push(String(sql));
   if(String(sql).includes('pg_advisory_lock(')){
    if(unlock==='acquire-throws')throw Error('advisory acquisition uncertain');
    return {rows:[{pg_advisory_lock:null}]};
   }
   if(String(sql).includes('pg_advisory_unlock(')){
    if(unlock==='throws')throw Error('connection was lost');
    return {rows:[{pg_advisory_unlock:unlock}]};
   }
   if(String(sql).includes('CREATE TABLE IF NOT EXISTS vv_schema_migration'))throw Error('synthetic apply failure');
   throw Error('unexpected statement: '+sql);
  },
  release(v){released=v===true;}
 };
 return {pool:{connect:async()=>client},result:()=>({released,queries})};
}
for(const [name,unlock,discard] of [
 ['unlock succeeds',true,false],
 ['unlock returns false',false,true],
 ['unlock throws','throws',true],
 ['unlock result missing',undefined,true]
]){
 test('BASE #49: '+name+' — pool client discard='+discard,async()=>{
  const x=fixture(unlock);
  await assert.rejects(()=>runAiMigrations(x.pool),/synthetic apply failure/);
  const state=x.result();
  assert.equal(state.released,discard);
  assert.equal(state.queries.filter(q=>q.includes('pg_advisory_unlock')).length,1);
 });
}

test('BASE #49: uncertain advisory-lock acquisition destroys the pool client',async()=>{
 const x=fixture('acquire-throws');
 await assert.rejects(()=>runAiMigrations(x.pool),/advisory acquisition uncertain/);
 const state=x.result();
 assert.equal(state.released,true);
 assert.equal(state.queries.filter(q=>q.includes('pg_advisory_lock(')).length,1);
 assert.equal(state.queries.filter(q=>q.includes('pg_advisory_unlock(')).length,0);
});
