import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {AI_MIGRATION_FILES,runAiMigrations,aiMigrationStatus} from '../server/ai-migrations.js';

const dsn=process.env.AI_TEST_DATABASE_URL;
test('BASE #49: two simultaneous runners serialize on disposable PostgreSQL; --check remains read-only',
 {skip:!dsn},async()=>{
  // No production/staging DB can be used by this integration test.
  const url=new URL(dsn);
  if(process.env.NODE_ENV!=='test'||!['127.0.0.1','localhost'].includes(url.hostname)||
     url.pathname!=='/vv_ai_migration_ci'){
   throw Error('UNSAFE_MIGRATION_TEST_DATABASE');
  }
  const pool=new pg.Pool({connectionString:dsn,max:4});
  try{
   // Only an ephemeral local fixture is used. The real app's users remain intact.
   await pool.query('CREATE TABLE vv_users(id TEXT PRIMARY KEY)');
   const pre=await runAiMigrations(pool,{checkOnly:true});
   assert.equal(pre.applied.length,0);
   assert.deepEqual(pre.pending,AI_MIGRATION_FILES);
   const before=await pool.query("SELECT to_regclass('public.vv_schema_migration') AS reg");
   assert.equal(before.rows[0].reg,null,'check-only must never create the migration table');

   const [one,two]=await Promise.all([runAiMigrations(pool),runAiMigrations(pool)]);
   assert.equal(one.applied.length+two.applied.length,AI_MIGRATION_FILES.length);
   assert.ok([one.applied.length,two.applied.length].includes(0),'second runner should skip committed work');
   assert.ok([one.applied.length,two.applied.length].includes(AI_MIGRATION_FILES.length));
   const history=await pool.query('SELECT name,checksum FROM vv_schema_migration ORDER BY name');
   assert.equal(history.rows.length,AI_MIGRATION_FILES.length);
   assert.deepEqual(history.rows.map(row=>row.name),AI_MIGRATION_FILES);
   assert.equal(new Set(history.rows.map(row=>row.name)).size,history.rows.length);

   const after=await runAiMigrations(pool,{checkOnly:true});
   assert.deepEqual(after.pending,[]);
   assert.ok(after.status.every(m=>m.applied&&m.checksumMatches));
   assert.deepEqual((await runAiMigrations(pool)).applied,[]);
   assert.ok((await aiMigrationStatus(pool)).every(m=>m.applied&&m.checksumMatches));
  }finally{await pool.end();}
});
