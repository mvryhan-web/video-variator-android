/**
 * Read-only integrity guard for the owner's ORIGINAL BASE TXT and 7 separate
 * roadmap TXT sources. These source files are specifications, not status boards.
 *
 * A legitimate owner-approved text revision requires a reviewed digest update;
 * never automatically refresh these pinned Git blob IDs after a failure.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {gitBlobSha,ORIGINAL_BASE_SPEC_BLOB_SHA} from './verify-deepsyq-base-coordination.mjs';

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
  if(typeof source!=='string'||gitBlobSha(source)!==expected){
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
  process.stdout.write('Original BASE and all 7 separate Block TXT files match reviewed Git blob IDs (8/8).\n');
 }
}
