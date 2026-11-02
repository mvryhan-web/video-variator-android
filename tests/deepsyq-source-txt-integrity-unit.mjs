import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ORIGINAL_SOURCE_TXT_BLOB_SHAS,verifyOriginalSourceTxt,normalizeVerifiedSourceTxt,APPROVED_BLOCK_OWNER_NOTES} from '../scripts/verify-deepsyq-source-txt.mjs';
import {gitBlobSha,ORIGINAL_BASE_SPEC_BLOB_SHA} from '../scripts/verify-deepsyq-base-coordination.mjs';

const paths=Object.keys(ORIGINAL_SOURCE_TXT_BLOB_SHAS);
const actual=new Map(paths.map(path=>[path,readFileSync(path,'utf8')]));
const fromMemory=path=>actual.get(path);

test('original BASE and seven distinct roadmap TXT sources are pinned independently',()=>{
 assert.equal(paths.length,8);
 assert.equal(new Set(paths).size,8);
 assert.equal(paths[0],'docs/DEEPSYQ_PLATFORM_SPEC.md');
 assert.equal(ORIGINAL_SOURCE_TXT_BLOB_SHAS[paths[0]],ORIGINAL_BASE_SPEC_BLOB_SHA);
 for(let n=1;n<=7;n++){
  const path='docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_'+n+'.txt';
  assert.ok(paths.includes(path),'separate original Block '+n+' must exist');
  assert.match(ORIGINAL_SOURCE_TXT_BLOB_SHAS[path],/^[a-f0-9]{40}$/);
 }
 const result=verifyOriginalSourceTxt();
 assert.deepEqual(result,{ok:true,checked:8,issues:[]});
});

test('mutating the body of ANY one original TXT fails without rewriting other sources',()=>{
 for(const path of paths){
  const result=verifyOriginalSourceTxt(file=>
   file===path?fromMemory(file)+'\nAccidental unapproved owner TXT amendment.\n':fromMemory(file)
  );
  assert.deepEqual(result.issues,['ORIGINAL_TXT_CHANGED: '+path],'must detect '+path);
  assert.equal(result.ok,false);
  const original=normalizeVerifiedSourceTxt(path,fromMemory(path));
  assert.ok(original.valid,'approved owner annotations must validate');
  assert.equal(gitBlobSha(original.original),ORIGINAL_SOURCE_TXT_BLOB_SHAS[path],'fixture must not mutate owner text');
 }
});

test('missing or unreadable source files fail closed with no leaked original TXT contents',()=>{
 const missing='docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_6.txt';
 const result=verifyOriginalSourceTxt(file=>{
  if(file===missing)throw new Error('raw path and secret content must not be printed');
  return fromMemory(file);
 });
 assert.deepEqual(result.issues,['ORIGINAL_TXT_UNREADABLE: '+missing]);
 assert.ok(!JSON.stringify(result).includes('raw path and secret'));
});

test('a non-string read result fails closed; pure fixture checks do not alter source files',()=>{
 const path='docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_1.txt';
 assert.deepEqual(verifyOriginalSourceTxt(file=>file===path?null:fromMemory(file)).issues,
  ['ORIGINAL_TXT_CHANGED: '+path]);
 assert.deepEqual(verifyOriginalSourceTxt(fromMemory),{ok:true,checked:8,issues:[]});
});

test('all seven annotated owner TXT blocks are independently pinned; altered owner notes fail closed',()=>{
 assert.equal(Object.keys(APPROVED_BLOCK_OWNER_NOTES).length,7);
 for(const path of paths.slice(1)){
  const normalized=normalizeVerifiedSourceTxt(path,fromMemory(path));
  assert.ok(normalized.valid,path);
  const modified=fromMemory(path).replace('ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА','ИЗМЕНЕНО БЕЗ РЕШЕНИЯ ВЛАДЕЛЬЦА');
  assert.notEqual(modified,fromMemory(path));
  assert.deepEqual(verifyOriginalSourceTxt(file=>file===path?modified:fromMemory(file)).issues,['ORIGINAL_TXT_CHANGED: '+path]);
 }
});
