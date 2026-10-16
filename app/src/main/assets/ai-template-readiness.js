// Read-only owner preview. This does not verify legal rights or provider availability.
const STUDIO_KINDS=new Set(['image','video','product_video','audio']);
const LOCAL_INPUTS=new Set(['image','text']);
export function summarizeAiTemplateReadiness(items=[]){
 const list=Array.isArray(items)?items:[];
 const result={total:list.length,active:0,drafts:0,publicEligible:0,actionable:0,missingRights:0,noThumbnail:0,blockers:[]};
 for(const item of list){
  if(!item||typeof item!=='object')continue;
  const active=item.active===true;
  const rights=['owned','licensed'].includes(item.rightsBasis)&&typeof item.rightsNote==='string'&&item.rightsNote.trim().length>=3;
  const inputs=Array.isArray(item.requiredInputTypes)?item.requiredInputTypes:[];
  const compatible=STUDIO_KINDS.has(item.generationType)&&inputs.every(input=>LOCAL_INPUTS.has(input));
  const title=typeof item.title==='string'&&item.title.trim()?item.title.trim().slice(0,80):'Untitled template';
  if(active)result.active++;else result.drafts++;
  if(!rights)result.missingRights++;
  if(!item.thumbnail)result.noThumbnail++;
  if(active&&rights)result.publicEligible++;
  if(active&&rights&&compatible)result.actionable++;
  if(active&&!rights)result.blockers.push(title+': active, but rights evidence is missing; public API hides it.');
  if(active&&rights&&!compatible)result.blockers.push(title+': active, but the current Studio handoff cannot accept its required inputs or generation type.');
 }
 if(result.total>0&&!result.active)result.blockers.push('No active templates are available for the AI Apps catalog.');
 if(result.total>0&&!result.actionable)result.blockers.push('There are no active, rights-recorded templates with a currently supported Studio handoff.');
 return result;
}
