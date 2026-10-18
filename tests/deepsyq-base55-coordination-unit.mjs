import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BASE_LANES,BASE_TRACKING_LABELS,ORIGINAL_BASE_SPEC_BLOB_SHA,gitBlobSha,originalBaseNumbers,boardRows,checklistRows,verifyBaseCoordination,verifyCurrentFiles} from '../scripts/verify-deepsyq-base-coordination.mjs';

const spec=readFileSync('docs/DEEPSYQ_PLATFORM_SPEC.md','utf8');
const board=readFileSync('docs/DEEPSYQ_BASE_55_COORDINATION.md','utf8');
const checklist=readFileSync('docs/DEEPSYQ_BASE_CHECKLIST.md','utf8');
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
test('active task claims require real owners; a board with zero claims is valid',()=>{
 // Current concurrent agents may have zero, one, or several legitimate active
 // task claims. Build deterministic in-memory fixtures instead of depending
 // on their changing GitHub board when this workflow is queued or retried.
 const neutral=board.split('\n').map(line=>{
  if(!/^\|\s*\d+\s*\|/.test(line))return line;
  const cells=line.split('|');
  if(/\bIN PROGRESS\b/i.test(cells[6]||'')){
   cells[6]=' — ';cells[7]=' — ';
  }
  return cells.join('|');
 }).join('\n');
 assert.equal(boardRows(neutral).filter(row=>/\bIN PROGRESS\b/.test(row.claim)).length,0);
 const general=boardRows(neutral).find(row=>row.number===52);
 assert.equal(general.state,'IN PROGRESS');
 assert.equal(general.claim,'—');
 assert.equal(verifyBaseCoordination(spec,neutral,checklist).ok,true);

 // Claiming a real D-lane row with a named owner is valid; dropping that
 // owner must fail even though the item's overall state need not change.
 const claimed=neutral.split('\n').map(line=>{
  if(!/^\|\s*52\s*\|/.test(line))return line;
  const cells=line.split('|');
  cells[6]=' IN PROGRESS ';
  cells[7]=' Agent D / isolated test claim ';
  return cells.join('|');
 }).join('\n');
 assert.equal(verifyBaseCoordination(spec,claimed,checklist).ok,true);
 const unowned=claimed.split('\n').map(line=>{
  if(!/^\|\s*52\s*\|/.test(line))return line;
  const cells=line.split('|');
  cells[7]=' — ';
  return cells.join('|');
 }).join('\n');
 const result=verifyBaseCoordination(spec,unowned,checklist);
 assert.ok(result.issues.includes('UNOWNED_ACTIVE_CLAIM: 52'),JSON.stringify(result.issues));
 assert.equal(verifyCurrentFiles().ok,true);
});
test('tampered original requirement numbering is rejected without modifying the real TXT',()=>{
 const broken=spec.replace('# 19. AI APPS','# 119. AI APPS');
 const result=verifyBaseCoordination(broken,board);
 assert.ok(result.issues.some(issue=>issue.startsWith('ORIGINAL_BASE_HEADINGS')));
});
test('malformed table shape and missing requirement title are detected',()=>{
 const truncated=verifyBaseCoordination(spec,edited(23,line=>{const parts=line.split('|');parts.splice(parts.length-2,1);return parts.join('|');}));
 assert.ok(truncated.issues.some(issue=>issue.startsWith('INVALID_ROW_WIDTH: 23')));
 const missingTitle=verifyBaseCoordination(spec,edited(23,line=>line.replace('| Template system |','| — |')));
 assert.ok(missingTitle.issues.includes('MISSING_ITEM_TITLE: 23'));
});

const editChecklist=(n,fn)=>checklist.split('\n').map(line=>new RegExp('^\\|\\s*'+n+'\\s*\\|').test(line)?fn(line):line).join('\n');

test('original BASE detailed checklist stays in one-to-one parity with canonical coordination',()=>{
 const result=verifyCurrentFiles();
 assert.equal(result.ok,true,JSON.stringify(result.issues));
 assert.equal(result.checklistItems,55);
 assert.equal(checklistRows(checklist).length,55);
 const base=new Map(boardRows(board).map(x=>[x.number,x.title]));
 for(const item of checklistRows(checklist))assert.equal(item.title,base.get(item.number),'BASE '+item.number+' title mismatch');
});

test('removed, duplicated and unlisted checklist numbers fail read-only audit',()=>{
 const missing=verifyBaseCoordination(spec,board,editChecklist(19,()=>''));
 assert.ok(missing.issues.includes('MISSING_CHECKLIST_ROW: 19'),JSON.stringify(missing.issues));
 const line=checklist.split('\n').find(x=>/^\|\s*19\s*\|/.test(x));
 const duplicated=verifyBaseCoordination(spec,board,checklist+'\n'+line);
 assert.ok(duplicated.issues.includes('DUPLICATE_CHECKLIST_ROW: 19'));
 const outOfScope=verifyBaseCoordination(spec,board,checklist+'\n| 56 | invented | PARTIAL | Never accepted |');
 assert.ok(outOfScope.issues.includes('UNEXPECTED_CHECKLIST_ROW: 56'));
});

test('drifting title or malformed checklist table fails independently of existing source board',()=>{
 const rename=verifyBaseCoordination(spec,board,editChecklist(23,line=>line.replace('Template system','Completely new feature')));
 assert.ok(rename.issues.includes('CHECKLIST_TITLE_MISMATCH: 23'),JSON.stringify(rename.issues));
 const corrupt=verifyBaseCoordination(spec,board,editChecklist(23,line=>{
  const parts=line.split('|');parts.splice(parts.length-2,1);return parts.join('|');
 }));
 assert.ok(corrupt.issues.some(x=>x.startsWith('INVALID_CHECKLIST_WIDTH: 23')),JSON.stringify(corrupt.issues));
 const noTitle=verifyBaseCoordination(spec,board,editChecklist(23,line=>line.replace('| Template system |','| — |')));
 assert.ok(noTitle.issues.includes('MISSING_CHECKLIST_TITLE: 23'));
});

test('different descriptive progress wording between checklist and board is allowed',()=>{
 const changed=editChecklist(30,line=>line.replace('| PARTIAL |','| PARTIAL — scoped CI checked |'));
 const result=verifyBaseCoordination(spec,board,changed);
 assert.equal(result.ok,true,JSON.stringify(result.issues));
});

test('original owner BASE TXT is frozen by exact Git blob SHA, not headings alone',()=>{
 assert.equal(gitBlobSha(spec),ORIGINAL_BASE_SPEC_BLOB_SHA);
 const changed=spec.replace('Video Variator','Video Varietator');
 assert.notEqual(changed,spec,'fixture must modify a real BASE paragraph');
 assert.deepEqual(originalBaseNumbers(changed),originalBaseNumbers(spec),'all numbered headings remain unchanged');
 const result=verifyBaseCoordination(changed,board,checklist);
 assert.ok(result.issues.some(issue=>issue.startsWith('ORIGINAL_BASE_SOURCE_CHANGED:')),JSON.stringify(result.issues));
 assert.ok(!result.issues.some(issue=>issue.startsWith('ORIGINAL_BASE_HEADINGS:')),'this test must guard body changes missed by numbered headings');
});

test('canonical 55 translated tracking labels are stable even if both live tables are jointly renamed',()=>{
 assert.equal(BASE_TRACKING_LABELS.length,55);
 for(const row of boardRows(board)){
  assert.equal(row.title,BASE_TRACKING_LABELS[row.number-1],'Tracking title for #'+row.number);
 }
 // The old checker only compared titles between the two editable documents.
 // An identical rewrite in both used to pass despite redefining a BASE row.
 const name='Renamed template system without owner review';
 const updatedBoard=edited(23,line=>line.replace('| Template system |','| '+name+' |'));
 const updatedChecklist=editChecklist(23,line=>line.replace('| Template system |','| '+name+' |'));
 const result=verifyBaseCoordination(spec,updatedBoard,updatedChecklist);
 assert.ok(result.issues.includes('BASE_TRACKING_LABEL_DRIFT: 23'),JSON.stringify(result.issues));
 assert.ok(!result.issues.includes('CHECKLIST_TITLE_MISMATCH: 23'),'both edited tables still agree');
 // Progress and ownership evolve freely; the exact tracked task remains the same.
 const statusOnly=edited(23,line=>line.replace('| PARTIAL', '| PARTIAL — scoped verification'));
 assert.equal(verifyBaseCoordination(spec,statusOnly,checklist).ok,true);
});


test('full browser PR regression skips only isolated BASE coordinator tests, retaining all product triggers',()=>{
 const workflow=readFileSync('.github/workflows/deepsyq-platform.yml','utf8');
 const paths=workflow.match(/\bpull_request:\s*\n([\s\S]*?)\njobs:/)?.[1]||'';
 const app=paths.indexOf("'app/src/main/assets/deepsyq*'");
 const allTests=paths.indexOf("'tests/deepsyq*'");
 const excluded=paths.indexOf("'!tests/deepsyq-base55-coordination-unit.mjs'");
 const itself=paths.indexOf("'.github/workflows/deepsyq-platform.yml'");
 assert.ok(app>=0&&allTests>=0&&itself>=0,'app code, all regular Deepsyq tests and the workflow itself still trigger platform CI');
 assert.ok(excluded>allTests&&excluded<itself,'only the coordinator-only test is excluded after the broad prefix');
 assert.match(workflow,/push:\s*\n\s+branches:\s*\[deepsyq-platform\]/,'full post-merge BASE push checks are preserved');
});
