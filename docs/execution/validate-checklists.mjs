#!/usr/bin/env node
// Document integrity only; no network, deployment or production claims.
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const source=read('docs/execution/DEEPSYQ_BLOCKS_1-7_CANONICAL.txt');
const heads=[...source.matchAll(/^BLOCK ([1-7]) — .+$/gm)];
const expected=[[15,40,0],[15,28,10],[14,41,0],[18,53,9],[20,82,0],[24,120,5],[25,141,21]];
const errors=[];
if(heads.length!==7||heads.some((x,i)=>Number(x[1])!==i+1)) errors.push('Missing/incorrect block headings');
for(let n=1;n<=7;n++){
 const path='docs/execution/BLOCK_'+n+'_CHECKLIST.md',doc=read(path),start=heads[n-1];
 if(!start){errors.push(path+': source heading missing');continue}
 const end=n<7?heads[n]?.index:source.indexOf('END OF CANONICAL BLOCKS');
 if(!(end>start.index)){errors.push(path+': source boundary missing');continue}
 const original=source.slice(start.index,end).replace(/(?:\r?\n)?={20,}\r?\n\s*$/,'').trim();
 const quoted=doc.match(/```text\r?\n([\s\S]*?)\r?\n```/);
 if(!quoted||quoted[1].trim()!==original) errors.push(path+': full original text differs');
 const bullets=(original.match(/^- /gm)||[]).length,arrows=(original.match(/^→ /gm)||[]).length;
 if(bullets!==expected[n-1][1]||arrows!==expected[n-1][2]) errors.push(path+': source bullet/arrow count differs');
 const stages=[...doc.matchAll(/^- \[([ xX])\] \*\*B(\d)-(\d\d)\./gm)];
 if(stages.length!==expected[n-1][0]) errors.push(path+': wrong number of stages '+stages.length);
 for(let i=0;i<stages.length;i++){
  const x=stages[i],limit=stages[i+1]?.index??doc.indexOf('## Полный исходный текст');
  const segment=doc.slice(x.index+x[0].length,limit);
  if(Number(x[2])!==n||Number(x[3])!==i+1) errors.push(path+': stage numbering mismatch');
  if(!segment.includes('  - Критерий:')) errors.push(path+': missing criterion at '+x[0]);
  if(x[1].toLowerCase()==='x'&&!/https:\/\/github\.com\/mvryhan-web\/video-variator-android\/(?:pull\/\d+|commit\/[a-f0-9]{7,40}|actions\/runs\/\d+)/.test(segment)) errors.push(path+': checked item without evidence '+x[0]);
 }
 console.log('Block '+n+': '+stages.length+' steps; canonical copy '+(quoted?.[1].trim()===original?'OK':'MISMATCH'));
}
if(errors.length){for(const e of errors)console.error('ERROR: '+e);process.exitCode=1;}
else console.log('PASS: 7 original sections; 131 ordered steps; checked items have evidence links.');
