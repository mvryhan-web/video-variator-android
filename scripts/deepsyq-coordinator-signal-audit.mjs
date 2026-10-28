/**
 * Deepsyq coordinator read-only signal audit.
 * OBSERVE ONLY: ACK is not completed work; green CI is not commercial GO.
 * No comments, labels, deploys, payment or secrets writes.
 */
const BOT='google-labs-jules[bot]';
const JULES=Object.freeze([{issue:316,step:'W5.5'},{issue:317,step:'W4.3'},{issue:278,step:'V6.2'}]);

export function classifyJulesBotComments(comments=[]){
 let latest={status:'NO_BOT_CONFIRMATION',taskId:null,commentId:null};
 const ordered=[...comments].sort((a,b)=>(Number(a.id)||0)-(Number(b.id)||0));
 for(const c of ordered){
  if(c?.user?.login!==BOT)continue; // Human reminders do NOT change Google state.
  const body=String(c.body||'');
  const task=body.match(/https:\/\/jules\.google\.com\/task\/(\d+)/i);
  if(/Jules is \[on it\]/i.test(body)){
   latest={status:'ACK_ONLY',taskId:task?.[1]||null,commentId:c.id};
  }else if(/Jules has failed to create a task|wasn't able to complete the \[task\]|unable to complete the task/i.test(body)){
   latest={status:'TASK_FAILED',taskId:task?.[1]||latest.taskId,commentId:c.id};
  }else if(/Jules (?:has finished|finished|has completed|completed|is ready)\b/i.test(body)){
   latest={status:'REVIEW_REQUIRED',taskId:task?.[1]||latest.taskId,commentId:c.id};
  }
 }
 return latest;
}

export function summarizeCheckRuns(checkRuns=[],expectedCount=checkRuns.length){
 if(!Array.isArray(checkRuns))throw new TypeError('checkRuns must be an array');
 const counts={success:0,failure:0,cancelled:0,skipped:0,neutral:0,pending:0,other:0};
 for(const c of checkRuns){
  if(c?.status!=='completed'){counts.pending++;continue;}
  const v=String(c.conclusion||'');
  if(v in counts && v!=='pending')counts[v]++;
  else counts.other++;
 }
 const complete=expectedCount>0&&checkRuns.length===expectedCount&&counts.pending===0;
 const allSuccess=complete&&counts.success===expectedCount;
 return {count:checkRuns.length,expectedCount,counts,complete,allSuccess,
  status:allSuccess?'ALL_SUCCESS':'NOT_GREEN'};
}

/** CI alone NEVER confers a commercial-production permission. */
export function commercialGate(){
 return 'NO_GO_REQUIRES_INDEPENDENT_SECURITY_ECONOMICS_AND_OWNER_RELEASE';
}
export function formatAudit({repo,head,checks,jules,prs}){
 const rows=[
  '# Deepsyq coordinator source audit',
  '',
  'Read-only GitHub evidence. Snapshot only; refresh before any merge.',
  '',
  'Repository: '+repo,
  'DEV HEAD: '+head,
  'DEV check runs: '+checks.count+'/'+checks.expectedCount+'; '+checks.status,
  'CI detail: '+Object.entries(checks.counts).map(([k,v])=>k+'='+v).join(', '),
  'Commercial gate: '+commercialGate(),
  '',
  '| Google Jules | Task | Evidence state | Bot task |',
  '| --- | --- | --- | --- |'
 ];
 for(const j of jules)rows.push('| #'+j.issue+' | '+j.step+' | '+j.status+' | '+(j.taskId||'—')+' |');
 rows.push('','PR #323: '+prs[323]?.state+' / '+(prs[323]?.draft?'DRAFT':'NOT_DRAFT')+' / '+(prs[323]?.sha||'unknown'));
 rows.push('PR #333: '+prs[333]?.state+' / '+(prs[333]?.draft?'DRAFT':'NOT_DRAFT')+' / '+(prs[333]?.sha||'unknown'));
 rows.push('','ACK_ONLY does not prove a running agent, delivered source or READY PR.');
 rows.push('REVIEW_REQUIRED does not mean merged, tested, deployed or DONE.');
 rows.push('No production/main/Stripe/provider changes made by this audit.');
 return rows.join('\n')+'\n';
}

async function get(url,token){
 const response=await fetch(url,{signal:AbortSignal.timeout(15000),
  headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,
   'X-GitHub-Api-Version':'2022-11-28','User-Agent':'deepsyq-coordinator-readonly'}});
 if(!response.ok)throw new Error('GitHub read failed HTTP '+response.status+' for '+new URL(url).pathname);
 return response.json();
}
async function pages(base,token,key,maxPages=5){
 const items=[];let expected=null;
 for(let page=1;page<=maxPages;page++){
  const data=await get(base+(base.includes('?')?'&':'?')+'per_page=100&page='+page,token);
  if(!Array.isArray(data)&&!(data&&Array.isArray(data[key])))
   throw new Error('Malformed GitHub page: '+key);
  const group=Array.isArray(data)?data:data[key];
  if(expected===null&&typeof data.total_count==='number')expected=data.total_count;
  items.push(...group);
  if(group.length<100){
   if(expected!==null&&items.length!==expected)throw new Error('Incomplete GitHub page count');
   return {items,total:expected===null?items.length:expected};
  }
 }
 throw new Error('Pagination limit exceeded: refusing incomplete evidence');
}
export async function liveAudit({repo='mvryhan-web/video-variator-android',token}){
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw new Error('Invalid repository');
 if(!token)throw new Error('GITHUB_TOKEN required for --live');
 const root='https://api.github.com/repos/'+repo;
 const branch=await get(root+'/branches/deepsyq-platform',token);
 const head=branch?.commit?.sha;
 if(!/^[a-f0-9]{40}$/.test(String(head)))throw new Error('Missing authoritative DEV SHA');
 const [checksPage,...rest]=await Promise.all([
  pages(root+'/commits/'+head+'/check-runs',token,'check_runs',3),
  ...JULES.map(j=>pages(root+'/issues/'+j.issue+'/comments',token,'comments',5)),
  get(root+'/pulls/323',token),get(root+'/pulls/333',token)
 ]);
 const checks=summarizeCheckRuns(checksPage.items,checksPage.total);
 const jules=JULES.map((j,i)=>({...j,...classifyJulesBotComments(rest[i].items)}));
 const prs={
  323:{state:rest[3].state,draft:rest[3].draft,sha:rest[3].head?.sha},
  333:{state:rest[4].state,draft:rest[4].draft,sha:rest[4].head?.sha}
 };
 return {repo,head,checks,jules,prs};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 if(process.argv.includes('--live')){
  try{
   const report=formatAudit(await liveAudit({
    repo:process.env.GITHUB_REPOSITORY||'mvryhan-web/video-variator-android',
    token:process.env.GITHUB_TOKEN
   }));
   process.stdout.write(report);
   if(process.env.GITHUB_STEP_SUMMARY){
    const {appendFileSync}=await import('node:fs');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
   }
  }catch(err){
   process.stderr.write('Read-only audit unavailable: '+err.message+'\n');
   process.exitCode=1;
  }
 }else{
  process.stdout.write('Offline signal audit module; use --live with read-only GITHUB_TOKEN for current evidence.\n');
 }
}
