// BASE #37: pending AI tasks are not completed failures or successes.
// An empty completed cohort has no measurable failure rate, not 0%.
export function completedGenerationSummary({ready,failed}={}){
 const parse=(value)=>{
  if((typeof value!=='number'&&typeof value!=='string')||
      (typeof value==='string'&&!/^\d+$/.test(value)))throw Error('INVALID_GENERATION_COUNT');
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<0)throw Error('INVALID_GENERATION_COUNT');
  return n;
 };
 const successes=parse(ready),failures=parse(failed),completed=successes+failures;
 if(!Number.isSafeInteger(completed))throw Error('INVALID_GENERATION_COUNT');
 return {completedJobs:completed,completedFailureRate:completed?failures/completed:null};
}
