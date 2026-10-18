import test from 'node:test';
import assert from 'node:assert/strict';
import {
 AI_MIGRATION_FILES, aiMigrationStatus, runAiMigrations, loadAiMigrationManifest
} from '../server/ai-migrations.js';

const createDb=(ledger=null)=>{
 const statements=[];
 const pool={
  query:async(sql)=>{
   statements.push(String(sql));
   if(String(sql).includes("to_regclass"))return {rows:[{reg:ledger===null?null:'vv_schema_migration'}]};
   if(String(sql).includes('FROM vv_schema_migration ORDER BY name'))return {rows:ledger||[]};
   throw Error('UNEXPECTED_QUERY');
  },
  connect:()=>{throw Error('CHECK_ONLY_MUST_NOT_REQUEST_WRITE_CLIENT');}
 };
 return {pool,statements};
};

test('BASE #49: --check on fresh database never creates migration ledger',async()=>{
 const {pool,statements}=createDb();
 const result=await runAiMigrations(pool,{checkOnly:true});
 assert.deepEqual(result.pending,AI_MIGRATION_FILES);
 assert.equal(result.applied.length,0);
 assert.equal(result.status.length,AI_MIGRATION_FILES.length);
 assert.equal(statements.length,1);
 assert.equal(statements[0],"SELECT to_regclass('vv_schema_migration') AS reg",'ledger existence must follow same session search_path as CREATE/INSERT/SELECT');
 assert.ok(statements.every(sql=>/^SELECT\b/i.test(sql)));
});

test('BASE #49: check-only on populated database reads status but issues no DDL',async()=>{
 const manifest=await loadAiMigrationManifest();
 const ledger=manifest.map(m=>({name:m.name,checksum:m.checksum,applied_at:'2026-10-16T10:00:00Z'}));
 const {pool,statements}=createDb(ledger);
 const result=await runAiMigrations(pool,{checkOnly:true});
 assert.deepEqual(result.pending,[]);
 assert.equal(result.status.length,manifest.length);
 assert.ok(result.status.every(x=>x.applied&&x.checksumMatches));
 assert.equal(statements.length,2);
 assert.ok(statements.every(sql=>/^SELECT\b/i.test(sql)));
});

test('BASE #49: unknown applied migrations are visible and fail closed',async()=>{
 const orphan={name:'20260101-unknown-legacy.sql',checksum:'orphan-sha',applied_at:'2026-01-01T00:00:00Z'};
 const {pool,statements}=createDb([orphan]);
 const status=await aiMigrationStatus(pool);
 const unknown=status.find(x=>x.name===orphan.name);
 assert.ok(unknown);
 assert.equal(unknown.applied,true);
 assert.equal(unknown.checksumMatches,false);
 assert.equal(unknown.unknown,true);
 await assert.rejects(()=>runAiMigrations(pool,{checkOnly:true}),/MIGRATION_CHECKSUM_MISMATCH:20260101-unknown-legacy.sql/);
 assert.ok(statements.every(sql=>/^SELECT\b/i.test(sql)));
});

test('BASE #49: checksum drift for a known migration still blocks without writes',async()=>{
 const {pool,statements}=createDb([{name:AI_MIGRATION_FILES[0],checksum:'bad',applied_at:null}]);
 await assert.rejects(()=>runAiMigrations(pool,{checkOnly:true}),/MIGRATION_CHECKSUM_MISMATCH/);
 assert.ok(statements.every(sql=>/^SELECT\b/i.test(sql)));
});
