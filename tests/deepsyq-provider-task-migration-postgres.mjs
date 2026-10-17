// Run only against the temporary localhost PostgreSQL service in the focused
// GitHub Action. Never point this at production, staging, or any remote DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const urlString=process.env.DEEPSYQ_TEST_DATABASE_URL;
if(urlString){
  const u=new URL(urlString);
  if(u.protocol!=='postgresql:'&&u.protocol!=='postgres:')throw Error('TEST_DB_MUST_BE_LOCAL_DISPOSABLE');
  if(!['127.0.0.1','localhost','::1'].includes(u.hostname)||u.pathname!=='/deepsyq_migration_test')
    throw Error('TEST_DB_MUST_BE_LOCAL_DISPOSABLE');
}
const migration=readFileSync(new URL('../server/migrations/20261015-generation-jobs.sql',import.meta.url),'utf8');
const schema=()=> 'p0_migration_'+randomUUID().replaceAll('-','');
const legacyTable=`CREATE TABLE vv_generation_jobs (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,
  status TEXT NOT NULL,operation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),deleted BOOLEAN NOT NULL DEFAULT false
)`;

test('existing generation jobs: migration applied twice preserves data and task IDs', {skip:!urlString}, async()=>{
  const c=new pg.Client({connectionString:urlString});
  await c.connect();const name=schema();
  try {
    await c.query('CREATE SCHEMA '+name);
    await c.query('SET search_path TO '+name);
    await c.query(legacyTable);
    await c.query("INSERT INTO vv_generation_jobs(id,user_id,kind,status,operation) VALUES ('a','u','video','processing','byteplus:task_42'),('b','u','video','processing','google:job_9'),('c','u','video','processing',NULL)");
    await c.query(migration);
    await c.query(migration);
    const {rows}=await c.query('SELECT id,operation,provider_task_id FROM vv_generation_jobs ORDER BY id');
    assert.deepEqual(rows.map(x=>[x.id,x.operation,x.provider_task_id]),[
      ['a','byteplus:task_42','task_42'],
      ['b','google:job_9','google:job_9'],
      ['c',null,null]
    ]);
    const indexes=await c.query("SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname=$1 AND indexname='vv_generation_jobs_provider_task_idx'",[name]);
    assert.equal(indexes.rows[0].n,1);
  } finally {
    await c.query('RESET search_path').catch(()=>{});
    await c.query('DROP SCHEMA IF EXISTS '+name+' CASCADE').catch(()=>{});
    await c.end();
  }
});

test('fresh generation jobs schema remains valid and reapplicable', {skip:!urlString}, async()=>{
  const c=new pg.Client({connectionString:urlString});
  await c.connect();const name=schema();
  try {
    await c.query('CREATE SCHEMA '+name);
    await c.query('SET search_path TO '+name);
    await c.query(migration);
    await c.query(migration);
    await c.query("INSERT INTO vv_generation_jobs(id,user_id,kind,status,operation) VALUES ('fresh','u','video','queued','byteplus:task_fresh')");
    const {rows}=await c.query("SELECT provider_task_id FROM vv_generation_jobs WHERE id='fresh'");
    assert.equal(rows[0].provider_task_id,'task_fresh');
  } finally {
    await c.query('RESET search_path').catch(()=>{});
    await c.query('DROP SCHEMA IF EXISTS '+name+' CASCADE').catch(()=>{});
    await c.end();
  }
});
