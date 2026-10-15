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
 try{busy=true;if(current)render(current);const d=await api('/api/product-watcher/admin/status');busy=false;render(d);feedback('Status updated.');}
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
