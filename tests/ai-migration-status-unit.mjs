import test from 'node:test';
import assert from 'node:assert/strict';
import {aiMigrationStatus} from '../server/ai-migrations.js';

test('migration status is read-only when the migration ledger does not exist',async()=>{
 const calls=[];const pool={async query(sql){calls.push(sql);if(sql.startsWith("SELECT to_regclass"))return {rows:[{reg:null}]};throw new Error('unexpected mutation/query: '+sql);}};
 const status=await aiMigrationStatus(pool);assert.ok(status.length>0);assert.ok(status.every(x=>x.applied===false&&x.checksumMatches===true));assert.equal(calls.some(x=>x.startsWith('CREATE TABLE')),false);
});
