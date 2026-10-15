const base=String(window.VV_API_BASE||location.origin).replace(/\/$/,'');
const token=()=>localStorage.getItem('vv_token')||'';
const $=id=>document.getElementById(id);
let current=null,busy=false;
async function api(path,{method='GET',body}={}){
 const t=token();if(!t)throw Error('SIGN_IN_REQUIRED');
 const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+t,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(String(d.error||'WATCHER_REQUEST_FAILED'));
 return d;
}
function feedback(message,isError=false){$('watcherFeedback').textContent=message;$('watcherFeedback').classList.toggle('error',isError);}
function formatDate(value){if(!value)return'—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString();}
function showRuns(runs){
 const el=$('watcherRuns');el.replaceChildren();
 if(!runs?.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=3;td.textContent='No recorded checks yet.';tr.append(td);el.append(tr);return;}
 for(const r of runs){
  const tr=document.createElement('tr');
  const findings=Array.isArray(r.findings)?r.findings:[];
  for(const value of [formatDate(r.checkedAt),String(r.status||'unknown'),findings.length?findings.map(f=>String(f.source||'system')+': '+String(f.code||'CHECK_WARNING')).join(' · '):'No findings']){
   const td=document.createElement('td');td.textContent=value;tr.append(td);
  }
  el.append(tr);
 }
}
const alertAdvice={
 PROVIDER_HIGH_FAILURE_RATE:'Check recent provider/model errors and availability before any routing changes.',
 RECORDED_SPEND_SPIKE:'Review job volume, model mix and recorded provider costs; this does not confirm a provider price increase.',
 RECORDED_UNIT_COST_SPIKE:'Compare models, resolutions and job mix against verified provider economics.',
 COST_VISIBILITY_GAP:'Review missing actual-cost reporting before estimating any gross margin.',
 HTTP_UNAVAILABLE:'Investigate Deepsyq service availability and Render status.',
 DB_UNAVAILABLE:'Verify database connectivity without exposing credentials.',
 GENERATION_ATTENTION:'Review failed, stuck and billing-review jobs in Owner AI Control.'
};
function renderAlerts(items){
 const root=$('watcherAlerts');root.replaceChildren();
 if(!Array.isArray(items)||!items.length){
  const tr=document.createElement('tr'),td=document.createElement('td');
  td.colSpan=4;td.textContent='No recorded alerts.';tr.append(td);root.append(tr);return;
 }
 for(const item of items){
  const tr=document.createElement('tr');
  const place=[formatDate(item.lastSeenAt),[item.source,item.code,item.provider,item.currency].filter(Boolean).join(' · '),
   alertAdvice[item.code]||'Review the saved check and investigate before making changes.'];
  for(const value of place){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}
  const actionCell=document.createElement('td');
  if(item.acknowledged){actionCell.textContent='Acknowledged';}
  else{
   const b=document.createElement('button');b.type='button';b.textContent='Acknowledge';
   b.disabled=busy;b.addEventListener('click',()=>{
    if(window.confirm('Acknowledge this alert? This does not fix the issue.'))void action('/api/product-watcher/admin/alerts/ack',{alertId:item.id,confirmAlertId:item.id});
   });
   actionCell.append(b);
  }
  tr.append(actionCell);root.append(tr);
 }
}
function safeOfficialLink(url,label){
 const span=document.createElement('span');span.textContent=label;
 try{
  const u=new URL(url);
  if(u.protocol!=='https:'||!['docs.byteplus.com','ai.google.dev','developers.openai.com'].includes(u.hostname))return span;
  const a=document.createElement('a');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';
  a.textContent=label;return a;
 }catch{return span;}
}
function renderOfficialSources(data){
 $('officialSourceStatus').textContent=!data.enabled?'Product Watcher disabled.'
  :data.monitoringEnabled?'Official-source checks configured (verify worker heartbeat to confirm actual runs).'
  :'Official-source checks off. Existing results can still be reviewed.';
 const list=$('officialSourceRows');list.replaceChildren();
 if(!data.sources?.length){
  const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=3;
  td.textContent='No official source checks recorded.';tr.append(td);list.append(tr);
 }
 for(const item of data.sources||[]){
  const tr=document.createElement('tr'),name=document.createElement('td');
  name.append(safeOfficialLink(item.url,[item.provider,item.key].filter(Boolean).join(' · ')));
  const when=document.createElement('td');when.textContent=formatDate(item.lastCheckedAt);
  const state=document.createElement('td');state.textContent=item.lastErrorCode||'Last fetch recorded (not verified pricing).';
  tr.append(name,when,state);list.append(tr);
 }
 const proposals=$('officialProposalRows');proposals.replaceChildren();
 if(!data.proposals?.length){
  const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=3;
  td.textContent='No page changes awaiting review.';tr.append(td);proposals.append(tr);
 }
 for(const p of data.proposals||[]){
  const tr=document.createElement('tr'),time=document.createElement('td'),label=document.createElement('td'),actions=document.createElement('td');
  time.textContent=formatDate(p.detectedAt);
  label.append(safeOfficialLink(p.url,p.provider+' — official changelog'));
  const disclaimer=document.createElement('small');
  disclaimer.textContent=' · Page changed; exact release/pricing impact not verified.';
  label.append(disclaimer);
  if(p.status==='pending'){
   for(const [decision,word] of [['reviewed','Mark reviewed'],['dismissed','Dismiss']]){
    const b=document.createElement('button');b.type='button';b.textContent=word;b.disabled=busy;
    b.addEventListener('click',()=>{
     if(window.confirm(word+'? This will NOT apply a model, pricing or website change.'))
      void action('/api/product-watcher/admin/proposals/review',{proposalId:p.id,confirmProposalId:p.id,decision});
    });actions.append(b);
   }
  }else actions.textContent=p.status+' (no changes applied)';
  tr.append(time,label,actions);proposals.append(tr);
 }
}
function render(d){
 current=d;$('watcherStatus').textContent=d.enabled?(d.paused?'Paused':'Ready for manual checks'):'Not enabled';
 $('watcherDetails').textContent=d.enabled?'Scheduler: '+(d.schedulerActive?'reported active':'not deployed')+' · Last run: '+formatDate(d.lastRun?.checkedAt):'Product Watcher is disabled in server configuration.';
 $('watcherToggle').textContent=d.paused?'Resume checks':'Pause checks';
 $('watcherToggle').disabled=busy||!d.enabled;
 $('watcherRun').disabled=busy||!d.enabled||d.paused;
 $('watcherRefresh').disabled=busy;
 showRuns(d.runs||[]);
}
async function refresh(){
 try{busy=true;if(current)render(current);const [d,alerts,sources]=await Promise.all([api('/api/product-watcher/admin/status'),api('/api/product-watcher/admin/alerts'),api('/api/product-watcher/admin/official-sources')]);busy=false;render(d);renderAlerts(alerts.items);renderOfficialSources(sources);feedback('Status updated.');}
 catch(e){busy=false;current=null;$('watcherStatus').textContent='Unavailable';$('watcherDetails').textContent=e.message==='SIGN_IN_REQUIRED'?'Sign in using the existing Deepsyq owner account.':'Owner access or Watcher database is unavailable.';$('watcherToggle').disabled=true;$('watcherRun').disabled=true;$('watcherRefresh').disabled=false;feedback(e.message,true);}
}
async function action(path,body){
 if(busy)return;busy=true;if(current)render(current);feedback('Working…');
 try{const d=await api(path,{method:'POST',body});feedback(d.status==='paused'?'Watcher is paused.':d.status==='skipped'?'Another check is already running.':'Saved.');}
 catch(e){feedback(e.message,true);}
 finally{busy=false;await refresh();}
}
$('watcherRefresh').addEventListener('click',refresh);
$('watcherToggle').addEventListener('click',()=>{if(current&&!busy)void action('/api/product-watcher/admin/control',{action:current.paused?'resume':'pause'});});
$('watcherRun').addEventListener('click',()=>{if(current&&!current.paused&&!busy)void action('/api/product-watcher/admin/run');});
void refresh();
