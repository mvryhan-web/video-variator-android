import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';

const connect=process.env.AI_TEST_DATABASE_URL;
test('template rights migration is additive and fail-closed on isolated PostgreSQL',{skip:!connect},async()=>{
 const url=new URL(connect);
 assert.equal(process.env.NODE_ENV,'test');
 assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
 assert.equal(url.pathname,'/vv_ai_test');
 const pool=new pg.Pool({connectionString:connect,max:1,connectionTimeoutMillis:5000});
 const db=await pool.connect();
 const schema='ai_rights_'+randomUUID().replaceAll('-','').slice(0,20);
 try{
  await db.query('BEGIN');
  await db.query('CREATE SCHEMA '+schema);
  await db.query('SET LOCAL search_path TO '+schema+', public');
  const creation=await readFile(new URL('../server/migrations/20261015-ai-templates.sql',import.meta.url),'utf8');
  const migration=await readFile(new URL('../server/migrations/20261016-ai-template-rights.sql',import.meta.url),'utf8');
  await db.query(creation);
  await db.query(`INSERT INTO vv_ai_template(id,title,slug,category,generation_type,prompt_template,active,featured)
   VALUES('legacy-1','Legacy','legacy','Photography','image','Original prompt',true,true)`);
  await db.query(migration);
  await db.query(migration);
  const initial=await db.query(`SELECT id FROM vv_ai_template WHERE active=true
   AND rights_basis IN ('owned','licensed') AND length(trim(rights_note))>=3`);
  assert.equal(initial.rows.length,0,'legacy item must not become publicly approved automatically');
  const old=await db.query("SELECT active,featured,rights_basis,rights_note FROM vv_ai_template WHERE id='legacy-1'");
  assert.equal(old.rows[0].active,true);
  assert.equal(old.rows[0].featured,true);
  assert.equal(old.rows[0].rights_basis,null);
  assert.equal(old.rows[0].rights_note,'');
  await db.query(`UPDATE vv_ai_template SET rights_basis='licensed',rights_note='License evidence kept privately by owner'
   WHERE id='legacy-1'`);
  const approved=await db.query(`SELECT id FROM vv_ai_template WHERE active=true
   AND rights_basis IN ('owned','licensed') AND length(trim(rights_note))>=3`);
  assert.deepEqual(approved.rows.map(row=>row.id),['legacy-1']);
  await assert.rejects(()=>db.query("UPDATE vv_ai_template SET rights_basis='unknown' WHERE id='legacy-1'"),error=>error?.code==='23514');
 }finally{
  await db.query('ROLLBACK').catch(()=>{});
  db.release();
  await pool.end();
 }
});
