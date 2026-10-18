// Offline integrity and legacy-migration manifest checks; no production DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AI_MIGRATION_FILES,aiMigrationStatus,migrationChecksum} from '../server/ai-migrations.js';

const historical=readFileSync(new URL('../server/migrations/20261015-generation-jobs.sql', import.meta.url),'utf8');
const sql=readFileSync(new URL('../server/migrations/20261017-provider-task-id-legacy.sql', import.meta.url),'utf8');
const legacyName='20261015-generation-jobs.sql',newName='20261017-provider-task-id-legacy.sql';
const gitBlobSha=text=>createHash('sha1').update('blob '+Buffer.byteLength(text)+'\0').update(text).digest('hex');

test('original applied generation SQL is byte-for-byte immutable (Git blob SHA)',()=>{
  assert.equal(gitBlobSha(historical),'8445816e16a3590139100eeb9e2d7f55d5ddfbe5');
  assert.match(historical,/provider_task_id TEXT GENERATED ALWAYS AS/);
  assert.doesNotMatch(historical,/ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS provider_task_id/);
});

test('only a NEW append-only file repairs the legacy generated column and index',()=>{
  assert.ok(AI_MIGRATION_FILES.includes(legacyName));
  assert.equal(AI_MIGRATION_FILES.filter(x=>x===newName).length,1);
  assert.ok(AI_MIGRATION_FILES.indexOf(legacyName)<AI_MIGRATION_FILES.indexOf(newName));
  assert.deepEqual(AI_MIGRATION_FILES,[...AI_MIGRATION_FILES].sort());
  assert.match(sql,/ALTER TABLE vv_generation_jobs ADD COLUMN IF NOT EXISTS provider_task_id TEXT GENERATED ALWAYS AS \(\s*CASE\s+WHEN operation LIKE 'byteplus:%' THEN substring\(operation FROM 10\)\s+ELSE operation\s+END\s*\) STORED;/);
  assert.match(sql,/CREATE INDEX IF NOT EXISTS vv_generation_jobs_provider_task_idx\s+ON vv_generation_jobs\(provider,provider_task_id\)/);
  assert.doesNotMatch(sql,/DROP TABLE|DROP COLUMN|UPDATE vv_generation_jobs\s+SET provider_task_id/i);
  assert.match(sql,/a\.attgenerated <> 's' OR a\.atttypid <> 'text'::regtype/);
  assert.match(sql,/GENERATION_PROVIDER_TASK_COLUMN_CONFLICT/);
  assert.match(sql,/DO \$\$\s+BEGIN[\s\S]*END \$\$;/,'PostgreSQL procedural guard must use paired dollar quoting');
});

test('D purchased-only additive migration cannot disappear from merged manifest',()=>{
  // D PR #204 owns this independent SQL. Its file may not exist until that
  // PR is integrated. If it does exist, the merge must retain BOTH filenames.
  const sibling='20261017-purchased-dispatch-claim.sql';
  const siblingPath=new URL('../server/migrations/'+sibling,import.meta.url);
  if(!existsSync(siblingPath))return; // unmerged D branch: no false failure
  assert.ok(AI_MIGRATION_FILES.includes(sibling),
    'D purchased-dispatch migration exists but was lost from AI_MIGRATION_FILES');
  assert.ok(AI_MIGRATION_FILES.includes(newName),
    'legacy provider-task migration must remain registered alongside D migration');
  assert.ok(AI_MIGRATION_FILES.indexOf(newName)<AI_MIGRATION_FILES.indexOf(sibling),
    'keep both 20261017 migrations in lexicographic order');
});

test('historical migration ledger checksum stays valid; new migration is pending',async()=>{
  const fakePool={query:async query=>{
    // BASE49 reads the ledger using the active PostgreSQL search_path, not public.
    if(query.includes("to_regclass('vv_schema_migration')"))return {rows:[{reg:'vv_schema_migration'}]};
    if(query.includes('FROM vv_schema_migration ORDER BY name'))return {rows:[{name:legacyName,checksum:migrationChecksum(historical),applied_at:new Date('2026-10-15T00:00:00Z')}]};
    throw Error('UNEXPECTED_QUERY');
  }};
  const status=await aiMigrationStatus(fakePool);
  const old=status.find(x=>x.name===legacyName),up=status.find(x=>x.name===newName);
  assert.equal(old.applied,true);
  assert.equal(old.checksumMatches,true);
  assert.equal(up.applied,false);
  assert.equal(up.checksumMatches,true);
});
