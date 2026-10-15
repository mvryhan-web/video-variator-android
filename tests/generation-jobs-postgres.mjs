import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import pg from 'pg';

const url=process.env.AI_TEST_DATABASE_URL||'';
const safe=()=>{const u=new URL(url);return ['127.0.0.1','localhost'].includes(u.hostname)&&u.pathname==='/vv_ai_test';};

test('generation job migration is additive, repeatable and copies legacy pilot rows',async t=>{
 if(!url){t.skip('AI_TEST_DATABASE_URL is not configured');return;}
 assert.equal(safe(),true,'refusing to run migration test outside isolated vv_ai_test database');
 const pool=new pg.Pool({connectionString:url});
 const db=await pool.connect();
 await db.query('SELECT pg_advisory_lock(99101426)'); // serialize destructive migration fixtures across Node test files
 try{
  await db.query('DROP TABLE IF EXISTS vv_generation_jobs CASCADE; DROP TABLE IF EXISTS vv_generation_pilot CASCADE;');
  await db.query(`CREATE TABLE vv_generation_pilot(
    id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,operation TEXT,mime TEXT,media BYTEA,result_text TEXT,error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),deleted BOOLEAN NOT NULL DEFAULT false
  )`);
  await db.query("INSERT INTO vv_generation_pilot(id,user_id,kind,status,operation,result_text) VALUES('legacy-1','user-1','video','processing','byteplus:task_abc','')");
  const sql=await readFile(new URL('../server/migrations/20261015-generation-jobs.sql',import.meta.url),'utf8');
  await db.query(sql);await db.query(sql);
  const {rows}=await db.query("SELECT id,user_id,kind,type,status,provider_task_id,prompt,settings,input_assets,output_assets,metadata FROM vv_generation_jobs WHERE id='legacy-1'");
  assert.equal(rows.length,1);assert.equal(rows[0].type,'video');assert.equal(rows[0].provider_task_id,'task_abc');assert.equal(rows[0].prompt,'');assert.deepEqual(rows[0].settings,{});assert.deepEqual(rows[0].input_assets,[]);assert.deepEqual(rows[0].output_assets,[]);assert.equal(rows[0].metadata.migratedFrom,'vv_generation_pilot');
  const count=await db.query("SELECT count(*)::int AS n FROM vv_generation_jobs WHERE id='legacy-1'");assert.equal(count.rows[0].n,1);
 }finally{await db.query('DROP TABLE IF EXISTS vv_generation_jobs CASCADE; DROP TABLE IF EXISTS vv_generation_pilot CASCADE;').catch(()=>{});await db.query('SELECT pg_advisory_unlock(99101426)').catch(()=>{});db.release();await pool.end();}
});
