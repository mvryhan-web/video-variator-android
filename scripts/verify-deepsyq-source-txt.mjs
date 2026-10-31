/**
 * Read-only integrity guard for the owner's ORIGINAL BASE TXT and 7 separate
 * roadmap TXT sources. These source files are specifications, not status boards.
 *
 * A legitimate owner-approved text revision requires a reviewed digest update;
 * never automatically refresh these pinned Git blob IDs after a failure.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {gitBlobSha,ORIGINAL_BASE_SPEC_BLOB_SHA,normalizeOwnerApprovedBase} from './verify-deepsyq-base-coordination.mjs';

export const ORIGINAL_SOURCE_TXT_BLOB_SHAS=Object.freeze({
 'docs/DEEPSYQ_PLATFORM_SPEC.md': ORIGINAL_BASE_SPEC_BLOB_SHA,
 'docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_1.txt': '4c9f94201168d546b24ae1b7f9f3a177a26e7d42',
 'docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_2.txt': '197cd0e95fda3c43b99a105c2d0c3b08ffc77089',
 'docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_3.txt': '536d125cc3325f2cf0549e6483faca4a71153439',
 'docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_4.txt': '96fb2d7ec7569d3d20d34e4c5ba4e7a1f78b687f',
 'docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_5.txt': '986186ccdba91a8f1b5eda493d3c854772bc3fed',
 'docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_6.txt': '6d33092f34dd7ad4853c3029dc19437c68030c70',
 'docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_7.txt': '6a0355a6276bd7ed1d811205d7b0484743d7c700'
});


/** Pin approved 2026-10-18 DECISIONS annotations independently of original
 * immutable Block 1–7 text. Neither owner source nor digest is rewritten. */
export const APPROVED_BLOCK_OWNER_NOTES=Object.freeze({
 "docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_1.txt": {
  "count": 1,
  "notesBlobSha": "c7b2dd2e6a3790281348fc208b114cad28e74882"
 },
 "docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_2.txt": {
  "count": 3,
  "notesBlobSha": "54e7246f9323ffc09c4781cdb7585a802fdfb003"
 },
 "docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_3.txt": {
  "count": 2,
  "notesBlobSha": "5b0ac28d86a46eaedfeb7e9af64c83b020731259"
 },
 "docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_4.txt": {
  "count": 3,
  "notesBlobSha": "643f3d4985bfe3f6bdfc40710e9201d7a64c9734"
 },
 "docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_5.txt": {
  "count": 2,
  "notesBlobSha": "b383f26757523276b143459baa50550d55934b6c"
 },
 "docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_6.txt": {
  "count": 3,
  "notesBlobSha": "c840e481dc1756082dc7134e48f0955260a1417e"
 },
 "docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_7.txt": {
  "count": 4,
  "notesBlobSha": "7a2b68990d389379558332c24d2bada0a276e732"
 }
});
const BLOCK_NOTE_PREFIX='ИЗМЕНЕНО РЕШЕНИЕМ ВЛАДЕЛЬЦА, 2026-10-18, см. DECISIONS.md.';
export function normalizeVerifiedSourceTxt(path,source){
 if(typeof source!=='string')return {valid:false,original:''};
 if(path==='docs/DEEPSYQ_PLATFORM_SPEC.md'){
  const data=normalizeOwnerApprovedBase(source);
  return {valid:data.valid,original:data.original};
 }
 const expected=APPROVED_BLOCK_OWNER_NOTES[path];
 if(!expected)return {valid:false,original:''};
 const lines=source.split('\n'),original=[],notes=[];
 for(let i=0;i<lines.length;i++){
  if(lines[i]===''&&lines[i+1]?.startsWith(BLOCK_NOTE_PREFIX)){notes.push(lines[i+1]);i++;}
  else original.push(lines[i]);
 }
 let stripped=original.join('\n');
 if(path==='docs/DEEPSYQ_SOURCE_TXT/DEEPSYQ_BLOCK_7.txt'){
  const needle='\nEVERYDAY TOOLS\n\n- may have free/limited first use';
  if(!stripped.includes(needle))return {valid:false,original:''};
  stripped=stripped.replace(needle,'\nEVERYDAY TOOLS\n- may have free/limited first use');
 }
 return {valid:notes.length===expected.count&&
  gitBlobSha(notes.join('\n')+'\n')===expected.notesBlobSha,original:stripped};
}

/**
 * The injected read function is for tests only. Read-only: no git, write,
 * network, provider, database, payment, or deployment side effects.
 */
export function verifyOriginalSourceTxt(read=readFileSync){
 const issues=[];
 for(const [path,expected] of Object.entries(ORIGINAL_SOURCE_TXT_BLOB_SHAS)){
  let source;
  try{source=read(path,'utf8');}
  catch{
   issues.push('ORIGINAL_TXT_UNREADABLE: '+path);
   continue;
  }
  const normalized=normalizeVerifiedSourceTxt(path,source);
  if(!normalized.valid||gitBlobSha(normalized.original)!==expected){
   issues.push('ORIGINAL_TXT_CHANGED: '+path);
  }
 }
 return {ok:issues.length===0,checked:Object.keys(ORIGINAL_SOURCE_TXT_BLOB_SHAS).length,issues};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const result=verifyOriginalSourceTxt();
 if(!result.ok){
  process.stderr.write(result.issues.join('\n')+'\n');
  process.exitCode=1;
 }else{
  process.stdout.write('Original BASE plus all 7 Block originals and separately pinned owner decision notes verified (8/8).\n');
 }
}
