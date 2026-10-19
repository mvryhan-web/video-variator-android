import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {safeAiPreflightError} from '../server/ai-preflight-errors.js';

test('BASE #48: migration checksum error is recognizable without disclosing ledger name or secrets',()=>{
 const e=Error('MIGRATION_CHECKSUM_MISMATCH:private-secret-name?password=sensitive');
 assert.equal(safeAiPreflightError(e),'PREFLIGHT_MIGRATION_CHECKSUM_MISMATCH');
 const unknown=Error('postgres://a:credential@host/database');unknown.code='ERR_PRIVATE_PASSWORD';
 assert.equal(safeAiPreflightError(unknown),'PREFLIGHT_VALIDATION_FAILED');
});

test('BASE #48: CLI catches failed migrate:ai and migrate:ai:check without showing connection secret',()=>{
 for(const args of [[],['--check']]){
  const result=spawnSync(process.execPath,['server/migrate-ai.js',...args],{
   cwd:new URL('../',import.meta.url).pathname,
   env:{...process.env,DATABASE_URL:'postgres://local-owner:SHOULD-NOT-LEAK-123@127.0.0.1:1/fixture',
    DATABASE_SSL:'false',PGCONNECT_TIMEOUT:'2'},
   encoding:'utf8',timeout:12000
  });
  assert.equal(result.error,undefined,JSON.stringify(result.error));
  assert.equal(result.status,3);
  assert.doesNotMatch(result.stderr,/SHOULD-NOT-LEAK-123|postgres:\/\/local-owner|database credential/i);
  const response=JSON.parse(result.stderr);
  assert.equal(response.mode,args.length?'check':'apply');
  assert.ok(/^PREFLIGHT_[A-Z_]+$/.test(response.error));
  assert.equal(result.stdout.trim(),'');
 }
});

test('BASE #48: only redacted fixed failure codes leave migration CLI exception catch',async()=>{
 const file=await readFile(new URL('../server/migrate-ai.js',import.meta.url),'utf8');
 assert.match(file,/catch\(e\)\s*\{/);
 assert.match(file,/error:safeAiPreflightError\(e\)/);
 assert.match(file,/process\.exitCode=3/);
 assert.match(file,/await pool\?\.end/);
 assert.doesNotMatch(file,/console\.(?:error|log)\([^\n]*e\??\.message/);
});
