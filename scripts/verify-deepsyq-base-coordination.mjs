/**
 * Read-only consistency check for the immutable original Deepsyq BASE spec and
 * the shared 55-row coordination board. Agent 5 scope: team safety only.
 *
 * It does not claim, unlock, deploy, generate media, or change user/product data.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const BASE_LANES=Object.freeze({
 A:[1,3,4,24,25,26,31,32,45,46],
 B:[5,6,7,8,9,10,11,12,33,34,39,40,41,42],
 C:[19,20,21,22,23,27,28,29,30,35,36,38],
 D:[2,13,14,15,16,17,18,37,43,44,48,49,50,51,52,54,55]
});
export const UNASSIGNED=new Set([47,53]);
/**
 * Git blob SHA is for the exact original owner BASE TXT, not just its 55 headers.
 * An owner-approved change requires explicit review of this pinned digest;
 * never silently update the expected value on a failed test.
 */
export const ORIGINAL_BASE_SPEC_BLOB_SHA='0de69857a38540af1c3fdcf75fb91fa2112b93fb';
export function gitBlobSha(text=''){
 const data=String(text);
 return createHash('sha1').update('blob '+Buffer.byteLength(data,'utf8')+'\0').update(data,'utf8').digest('hex');
}

/**
 * Historical 1–55 English tracking captions (editorial labels, NOT the original
 * Russian requirements). Pinning them independently prevents a simultaneous
 * edit to both live tables from silently redefining a numbered task.
 * Legitimate label updates require an explicit reviewed manifest change.
 */
export const BASE_TRACKING_LABELS=Object.freeze([
 "Product becomes Lumina-style AI creative platform",
 "New AI platform becomes `/`",
 "Hero / Canvas workspace",
 "Image generation",
 "Video generation",
 "BytePlus first provider adapter",
 "AI Provider Router",
 "Fallback",
 "Provider config in admin",
 "Normal generation-job database entity",
 "Permanent object storage",
 "Background jobs",
 "Internal AI credit system",
 "Credit ledger",
 "Credit reservation",
 "Stripe subscriptions + credit packs",
 "Unit economics",
 "Pricing engine",
 "AI Apps",
 "Product Video workflow",
 "AI Agents",
 "Inspiration / Discover",
 "Template system",
 "History",
 "My Creations",
 "Canvas",
 "Existing Video Uniquifier preserved under Tools",
 "Utilities gathered in Tools",
 "Final navigation",
 "Desktop / Android / iPhone responsive",
 "Generation UX/status",
 "Friendly error handling",
 "Safe retry",
 "Server-side rate/concurrency limits",
 "Security",
 "Privacy",
 "Business analytics",
 "Admin dashboard",
 "Provider performance",
 "Model routing registry",
 "Internal model capabilities",
 "Persist BytePlus output in our storage",
 "Pricing page",
 "Free plan",
 "Onboarding",
 "Homepage conversion",
 "Do not expose BytePlus as our product",
 "Production safety / regression",
 "Database migrations",
 "Feature flags",
 "First commercial vertical slice",
 "Required implementation order",
 "Explicit non-goals for now",
 "BASE readiness criteria",
 "Required final report"
]);

const EXPECTED=Array.from({length:55},(_,index)=>index+1);
const LANE_BY_NUMBER=new Map(Object.entries(BASE_LANES).flatMap(([lane,nums])=>nums.map(n=>[n,lane])));

export function originalBaseNumbers(spec=''){
 return [...String(spec).matchAll(/^#\s+(\d+)\.\s+[^\n]+$/gm)].map(match=>Number(match[1]));
}

export function boardRows(board=''){
 const rows=[];
 for(const line of String(board).split(/\r?\n/)){
  if(!/^\|\s*\d+\s*\|/.test(line))continue;
  // The table has 7 columns: item, title, state, lane, action, claim, owner.
  const cells=line.split('|').slice(1,-1).map(cell=>cell.trim());
  rows.push({number:Number(cells[0]),title:cells[1]||'',state:cells[2]||'',
   lane:cells[3]||'',action:cells[4]||'',claim:cells[5]||'',owner:cells[6]||'',
   width:cells.length});
 }
 return rows;
}

export function checklistRows(checklist=''){
 const rows=[];
 for(const line of String(checklist).split(/\r?\n/)){
  if(!/^\|\s*\d+\s*\|/.test(line))continue;
  // Detailed BASE checklist has 4 cells: number, same title, status, evidence.
  const cells=line.split('|').slice(1,-1).map(cell=>cell.trim());
  rows.push({number:Number(cells[0]),title:cells[1]||'',status:cells[2]||'',
   evidence:cells[3]||'',width:cells.length});
 }
 return rows;
}

export function verifyBaseCoordination(spec,board,checklist){

 const issues=[];
 const source=originalBaseNumbers(spec),rows=boardRows(board);
 if(gitBlobSha(spec)!==ORIGINAL_BASE_SPEC_BLOB_SHA){
  issues.push('ORIGINAL_BASE_SOURCE_CHANGED: original owner BASE TXT body differs from approved immutable Git blob');
 }
 if(JSON.stringify(source)!==JSON.stringify(EXPECTED)){
  issues.push('ORIGINAL_BASE_HEADINGS: expected exactly numbered #1–#55 in order (do not edit source TXT)');
 }
 const counts=new Map();
 for(const row of rows)counts.set(row.number,(counts.get(row.number)||0)+1);
 for(const n of EXPECTED){
  if(!counts.has(n))issues.push('MISSING_BASE_ROW: '+n);
  if((counts.get(n)||0)>1)issues.push('DUPLICATE_BASE_ROW: '+n);
 }
 for(const n of counts.keys())if(!EXPECTED.includes(n))issues.push('UNEXPECTED_BASE_ROW: '+n);
 for(const row of rows){
  if(row.width!==7)issues.push('INVALID_ROW_WIDTH: '+row.number+' ('+row.width+')');
  const expected=LANE_BY_NUMBER.get(row.number)||(UNASSIGNED.has(row.number)?'—':null);
  if(expected&&row.lane!==expected){
   issues.push('WRONG_LANE: '+row.number+' expected '+expected+' got '+row.lane);
  }
  if(!row.title||row.title==='—')issues.push('MISSING_ITEM_TITLE: '+row.number);
  if(EXPECTED.includes(row.number)&&row.title!==BASE_TRACKING_LABELS[row.number-1]){
   issues.push('BASE_TRACKING_LABEL_DRIFT: '+row.number);
  }
  // Only a *claim column* IN PROGRESS is an active reservation. BASE item #52
  // may have a general state IN PROGRESS while no specific agent has claimed it.
  if(/\bIN PROGRESS\b/i.test(row.claim)&&(!row.owner||/^(—|–|-)$/.test(row.owner))){
   issues.push('UNOWNED_ACTIVE_CLAIM: '+row.number);
  }
 }
 if(checklist!==undefined){
  const detailed=checklistRows(checklist),checkCounts=new Map();
  for(const item of detailed)checkCounts.set(item.number,(checkCounts.get(item.number)||0)+1);
  for(const n of EXPECTED){
   if(!checkCounts.has(n))issues.push('MISSING_CHECKLIST_ROW: '+n);
   if((checkCounts.get(n)||0)>1)issues.push('DUPLICATE_CHECKLIST_ROW: '+n);
  }
  for(const n of checkCounts.keys())if(!EXPECTED.includes(n))issues.push('UNEXPECTED_CHECKLIST_ROW: '+n);
  const boardByNumber=new Map(rows.filter(r=>counts.get(r.number)===1).map(r=>[r.number,r]));
  for(const item of detailed){
   if(item.width!==4)issues.push('INVALID_CHECKLIST_WIDTH: '+item.number+' ('+item.width+')');
   if(!item.title||item.title==='—')issues.push('MISSING_CHECKLIST_TITLE: '+item.number);
   const match=boardByNumber.get(item.number);
   if(match&&checkCounts.get(item.number)===1&&match.title!==item.title){
    issues.push('CHECKLIST_TITLE_MISMATCH: '+item.number);
   }
  }
 }
 return {ok:issues.length===0,issues,items:rows.length,sourceHeadings:source.length,
  checklistItems:checklist===undefined?null:checklistRows(checklist).length};
}

export function verifyCurrentFiles(){
 return verifyBaseCoordination(
  readFileSync('docs/DEEPSYQ_PLATFORM_SPEC.md','utf8'),
  readFileSync('docs/DEEPSYQ_BASE_55_COORDINATION.md','utf8'),
  readFileSync('docs/DEEPSYQ_BASE_CHECKLIST.md','utf8')
 );
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const result=verifyCurrentFiles();
 if(!result.ok){
  process.stderr.write(result.issues.join('\n')+'\n');
  process.exitCode=1;
 }else{
  process.stdout.write('BASE original Git blob verified; 55 source headings, board and detailed checklist items aligned. Active claim owners validated.\n');
 }
}
