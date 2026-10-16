import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BASE_LANES,originalBaseNumbers,boardRows,verifyBaseCoordination,verifyCurrentFiles} from '../scripts/verify-deepsyq-base-coordination.mjs';

const spec=readFileSync('docs/DEEPSYQ_PLATFORM_SPEC.md','utf8');
const board=readFileSync('docs/DEEPSYQ_BASE_55_COORDINATION.md','utf8');
const edited=(n,fn)=>board.split('\n').map(line=>new RegExp('^\\|\\s*'+n+'\\s*\\|').test(line)?fn(line):line).join('\n');

test('canonical original BASE and active coordination board contain one item for all 55 requirements',()=>{
 const result=verifyCurrentFiles();
 assert.deepEqual(result.issues,[]);
 assert.equal(result.items,55);
 assert.equal(result.sourceHeadings,55);
 assert.deepEqual(originalBaseNumbers(spec),Array.from({length:55},(_,i)=>i+1));
 assert.equal(boardRows(board).length,55);
});
test('all 55 numbers are in exactly one lane or explicit immutable rule',()=>{
 const all=Object.values(BASE_LANES).flat();
 assert.equal(all.length,53);
 assert.equal(new Set(all).size,53);
 assert.ok(!all.includes(47));
 assert.ok(!all.includes(53));
});
test('duplicate row or missing row cannot be silently accepted',()=>{
 const row=board.split('\n').find(line=>/^\|\s*19\s*\|/.test(line));
 const dup=verifyBaseCoordination(spec,board+'\n'+row);
 assert.ok(dup.issues.includes('DUPLICATE_BASE_ROW: 19'));
 const missing=verifyBaseCoordination(spec,edited(19,()=>'')); // one row removed
 assert.ok(missing.issues.includes('MISSING_BASE_ROW: 19'));
});
test('lane collisions and unexpected rows fail closed',()=>{
 const wrong=verifyBaseCoordination(spec,edited(20,line=>line.replace('| C |','| A |')));
 assert.ok(wrong.issues.includes('WRONG_LANE: 20 expected C got A'));
 const unexpected=verifyBaseCoordination(spec,board+'\n| 56 | Fake new spec task | PARTIAL | A | — | — | — |');
 assert.ok(unexpected.issues.includes('UNEXPECTED_BASE_ROW: 56'));
});
test('claimed IN PROGRESS requires a recorded owner, general item state does not',()=>{
 const current=boardRows(board);
 const active=current.find(row=>/\bIN PROGRESS\b/.test(row.claim));
 assert.ok(active,'fixture requires one genuinely claimed BASE task');
 const unowned=verifyBaseCoordination(spec,edited(active.number,line=>line.replace(/\|\s*[^|]+\s*\|\s*$/, '| — |')));
 assert.ok(unowned.issues.includes('UNOWNED_ACTIVE_CLAIM: '+active.number),JSON.stringify(unowned.issues));
 // General BASE #52 status may be IN PROGRESS without any exclusive claim.
 const general=current.find(row=>row.number===52);
 assert.equal(general.state,'IN PROGRESS');
 assert.equal(general.claim,'—');
 assert.equal(verifyCurrentFiles().ok,true);
});
test('tampered original requirement numbering is rejected without modifying the real TXT',()=>{
 const broken=spec.replace('# 19. AI APPS','# 119. AI APPS');
 const result=verifyBaseCoordination(broken,board);
 assert.ok(result.issues.some(issue=>issue.startsWith('ORIGINAL_BASE_HEADINGS')));
});
test('malformed table shape and missing requirement title are detected',()=>{
 const truncated=verifyBaseCoordination(spec,edited(23,line=>line.replace(' | — | — |',' | — |')));
 assert.ok(truncated.issues.some(issue=>issue.startsWith('INVALID_ROW_WIDTH: 23')));
 const missingTitle=verifyBaseCoordination(spec,edited(23,line=>line.replace('| Template system |','| — |')));
 assert.ok(missingTitle.issues.includes('MISSING_ITEM_TITLE: 23'));
});
