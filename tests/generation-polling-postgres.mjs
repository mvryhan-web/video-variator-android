import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {claimProviderPoll,pollClaimSeconds} from '../server/generation-polling.js';

const url=process.env.AI_TEST_DATABASE_URL||'';
const safe=()=>{const u=new URL(url);return ['127.0.0.1','localhost'].includes(u.hostname)&&u.pathname==='/vv_ai_test';};

test('provider polling is atomically throttled per job',async t=>{
 assert.equal(pollClaimSeconds(1),3);assert.equal(pollClaimSeconds(999),60);
 if(!url){t.skip('AI_TEST_DATABASE_URL is not configured');return;}
 assert.equal(safe(),true,'refusing to run outside isolated vv_ai_test database');
 const pool=new pg.Pool({connectionString:url});
 const db=await pool.connect();
 await db.query('SELECT pg_advisory_lock(99101426)'); // serialize destructive migration fixtures across Node test files
 try{
  await db.query('DROP TABLE IF EXISTS vv_generation_jobs CASCADE; DROP TABLE IF EXISTS vv_generation_pilot CASCADE;');
  const sql=await readFile(new URL('../server/migrations/20261015-generation-jobs.sql',import.meta.url),'utf8');await db.query(sql);
  await db.query("INSERT INTO vv_generation_jobs(id,user_id,kind,status,operation,prompt) VALUES('poll-1','u1','video','processing','byteplus:task_1','x')");
  assert.equal(await claimProviderPoll(pool,'poll-1',{minSeconds:10}),true);
  assert.equal(await claimProviderPoll(pool,'poll-1',{minSeconds:10}),false);
  await db.query("UPDATE vv_generation_jobs SET last_polled_at=NOW()-INTERVAL '20 seconds' WHERE id='poll-1'");
  assert.equal(await claimProviderPoll(pool,'poll-1',{minSeconds:10}),true);
 }finally{await db.query('DROP TABLE IF EXISTS vv_generation_jobs CASCADE;').catch(()=>{});await db.query('SELECT pg_advisory_unlock(99101426)').catch(()=>{});db.release();await pool.end();}
});
