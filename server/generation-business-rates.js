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

 // Read-only recorded subscription/trial Tools only, not local/offline utilities.
export async function trackedToolUsageSummary(pool){
 const table=await pool.query("SELECT to_regclass('public.vv_tool_runs') AS reg");
 if(!table.rows[0]?.reg)return {trackedToolsAvailable:false,topTrackedTool:null};
 const {rows}=await pool.query(`SELECT tool,COUNT(*)::bigint AS completed_runs
 FROM vv_tool_runs WHERE state='completed'
 GROUP BY tool ORDER BY completed_runs DESC,tool ASC LIMIT 1`);
 if(!rows.length)return {trackedToolsAvailable:true,topTrackedTool:null};
 const tool=rows[0].tool,count=Number(rows[0].completed_runs);
 if(typeof tool!=='string'||!/^[a-z][a-z0-9_]{0,39}$/.test(tool)||
    !Number.isSafeInteger(count)||count<=0)throw Error('INVALID_TRACKED_TOOL_METRIC');
 return {trackedToolsAvailable:true,topTrackedTool:{tool,completedRuns:count}};
}
