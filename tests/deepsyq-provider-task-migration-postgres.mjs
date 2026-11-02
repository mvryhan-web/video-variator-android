// Run only against the temporary localhost PostgreSQL service in the focused
// GitHub Action. Never point this at production, staging, or any remote DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {aiMigrationStatus,migrationChecksum} from '../server/ai-migrations.js';
const urlString=process.env.DEEPSYQ_TEST_DATABASE_URL;
if(urlString){
  const u=new URL(urlString);
  if(u.protocol!=='postgresql:'&&u.protocol!=='postgres:')throw Error('TEST_DB_MUST_BE_LOCAL_DISPOSABLE');
  if(!['127.0.0.1','localhost','::1'].includes(u.hostname)||u.pathname!=='/deepsyq_migration_test')
    throw Error('TEST_DB_MUST_BE_LOCAL_DISPOSABLE');
}
const historical=readFileSync(new URL('../server/migrations/20261015-generation-jobs.sql',import.meta.url),'utf8');
const migration=readFileSync(new URL('../server/migrations/20261017-provider-task-id-legacy.sql',import.meta.url),'utf8');
const schema=()=> 'p0_migration_'+randomUUID().replaceAll('-','');
const legacyTable=`CREATE TABLE vv_generation_jobs (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,
  status TEXT NOT NULL,provider TEXT,operation TEXT,
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
    await c.query(historical);
    await c.query(historical);
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

test('historical migration ledger in disposable PG preserves checksum and marks new file pending', {skip:!urlString}, async()=>{
  const c=new pg.Client({connectionString:urlString});
  await c.connect();
  try {
    // The CI service is a fresh disposable DB; never connect a real database.
    await c.query('CREATE TABLE IF NOT EXISTS public.vv_schema_migration (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    await c.query('INSERT INTO public.vv_schema_migration(name,checksum) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING',[
      '20261015-generation-jobs.sql',migrationChecksum(historical)
    ]);
    const rows=await aiMigrationStatus(c);
    const orig=rows.find(x=>x.name==='20261015-generation-jobs.sql');
    const upgrade=rows.find(x=>x.name==='20261017-provider-task-id-legacy.sql');
    assert.equal(orig.applied,true);
    assert.equal(orig.checksumMatches,true);
    assert.equal(upgrade.applied,false);
    assert.equal(upgrade.checksumMatches,true);
  } finally {
    await c.query("DELETE FROM public.vv_schema_migration WHERE name='20261015-generation-jobs.sql'").catch(()=>{});
    await c.query('DROP TABLE IF EXISTS public.vv_schema_migration').catch(()=>{});
    await c.end();
  }
});

test('preexisting incompatible plain-text task column fails closed without data loss', {skip:!urlString}, async()=>{
  const c=new pg.Client({connectionString:urlString});
  await c.connect();const name=schema();
  try {
    await c.query('CREATE SCHEMA '+name);
    await c.query('SET search_path TO '+name);
    await c.query(legacyTable);
    await c.query('ALTER TABLE vv_generation_jobs ADD COLUMN provider_task_id TEXT');
    await c.query("INSERT INTO vv_generation_jobs(id,user_id,kind,status,operation,provider_task_id) VALUES ('old','u','video','processing','byteplus:task_old','FORGED')");
    await assert.rejects(c.query(migration),/GENERATION_PROVIDER_TASK_COLUMN_CONFLICT/);
    const {rows}=await c.query("SELECT id,provider_task_id FROM vv_generation_jobs WHERE id='old'");
    assert.deepEqual(rows,[{id:'old',provider_task_id:'FORGED'}]);
  } finally {
    await c.query('RESET search_path').catch(()=>{});
    await c.query('DROP SCHEMA IF EXISTS '+name+' CASCADE').catch(()=>{});
    await c.end();
  }
});
