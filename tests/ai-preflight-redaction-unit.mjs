import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {safeAiPreflightError} from '../server/ai-preflight-errors.js';

test('BASE #48: common PostgreSQL/SSL connection failures produce constant non-sensitive codes',()=>{
 const known=[
  ['ECONNREFUSED','PREFLIGHT_DB_CONNECTION_REFUSED'],
  ['ENOTFOUND','PREFLIGHT_DB_HOST_UNRESOLVED'],
  ['ETIMEDOUT','PREFLIGHT_DB_TIMEOUT'],
  ['28P01','PREFLIGHT_DB_AUTHENTICATION_FAILED'],
  ['42501','PREFLIGHT_DB_PERMISSION_DENIED'],
  ['CERT_HAS_EXPIRED','PREFLIGHT_TLS_CERTIFICATE_INVALID'],
  ['ERR_INVALID_URL','PREFLIGHT_DB_URL_INVALID']
 ];
 for(const [code,expected] of known){
  const e=new Error('postgres://owner:super-secret@private.db:5432/example?sslmode=verify-full');
  e.code=code;
  assert.equal(safeAiPreflightError(e),expected);
  assert.doesNotMatch(safeAiPreflightError(e),/super-secret|postgres:|private.db/i);
 }
});

test('BASE #48: malicious or arbitrary driver error.code is never echoed',()=>{
 for(const code of ['postgres://owner:pw@private','DATABASE_URL=abc','SQL ERROR: TOKEN secret','',null,{}]){
  const error={code,message:'password=do-not-print',cause:{password:'another-secret'}};
  const sanitized=safeAiPreflightError(error);
  assert.equal(sanitized,'PREFLIGHT_VALIDATION_FAILED');
  assert.doesNotMatch(sanitized,/secret|token|password|postgres/i);
 }
 assert.equal(safeAiPreflightError(null),'PREFLIGHT_VALIDATION_FAILED');
 assert.equal(safeAiPreflightError({message:'full database url here'}),'PREFLIGHT_VALIDATION_FAILED');
});

test('BASE #48: production preflight logs only sanitized safe failure and preserves fail exit code',async()=>{
 const code=await readFile(new URL('../server/ai-preflight.js',import.meta.url),'utf8');
 assert.match(code,/error:safeAiPreflightError\(e\)/);
 assert.doesNotMatch(code,/console\.(?:error|log)\([^\n]*e\??\.message/);
 assert.match(code,/process\.exitCode=3/);
 assert.match(code,/aiMigrationStatus\(pool\)/);
});
