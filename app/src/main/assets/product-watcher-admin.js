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
 AI_PURCHASE_LEDGER_INCONSISTENT:'Review invalid purchase credits, paid amount, refund sign or currency in the internal ledger. Never alter Stripe or user credits from this alert.',
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
  const topics=Array.isArray(p.possibleTopics)?p.possibleTopics.filter(x=>['models','deprecations','pricing','limits','api'].includes(x)):[];
  disclaimer.textContent=p.topicsCompared
   ?' · Page change; possible keyword contexts: '+(topics.join(', ')||'none detected')+'. NOT a verified model/pricing change.'
   :' · Page change; topic comparison unavailable (older baseline). NOT a verified model/pricing change.';
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
function renderBriefs(data){
 $('watcherBriefsStatus').textContent=!data.enabled?'Product Watcher disabled.'
  :data.schedulerEnabled?'Brief generator configured; verify private worker heartbeat to confirm execution.'
  :'Automatic briefs disabled. Past reports remain available.';
 const root=$('watcherBriefs');root.replaceChildren();
 if(!data.items?.length){const p=document.createElement('p');p.textContent='No verified report snapshots yet.';root.append(p);return;}
 for(const b of data.items){
  const card=document.createElement('article');card.className='note';card.style.marginTop='12px';
  const head=document.createElement('strong');head.textContent=b.kind+' · '+b.periodKey;card.append(head);
  const data=b.content||{},lines=[
   'Window: '+String(data.window||'not reported'),
   'Problems: '+String(data.problems?.criticalChecks??'—')+' critical checks, '+String(data.problems?.warningChecks??'—')+' warnings',
   'Official page changes (unverified): '+String(data.changed?.officialPageChangesUnverified??'—'),
   'Owner source reviews pending: '+String(data.pendingApprovals?.officialSourceReviews??'—'),
   'Recorded provider costs: '+((data.costs?.recordedByCurrency||[]).map(c=>String(c.currency).toUpperCase()+' '+String(c.recordedCost)).join(' · ')||'No verified cost entries'),
   'Recommendations: '+((data.recommendations||[]).map(String).join(' · ')||'No specific recommendations')
  ];
  for(const value of lines){const p=document.createElement('p');p.textContent=value;card.append(p);}
  root.append(card);
 }
}
function renderContentTasks(data){
 $('watcherContentStatus').textContent=!data.enabled?'Watcher disabled.'
  :data.schedulerEnabled?'Content checks configured; private worker deployment still requires verification.'
  :'Automatic content checks disabled; saved results remain visible.';
 const root=$('watcherContentTasks');root.replaceChildren();
 if(!data.items?.length){const p=document.createElement('p');p.textContent='No saved content checks yet.';root.append(p);return;}
 for(const item of data.items){
  const card=document.createElement('article');card.className='note';card.style.marginTop='12px';
  const head=document.createElement('strong');head.textContent=item.kind+' · '+item.periodKey;card.append(head);
  const c=item.content||{},msgs=item.kind==='content'
   ?['Status: '+String(c.status||'unknown'),
      'Active templates: '+String(c.templates?.active??'schema unavailable'),
      'Active inspiration images: '+String(c.inspiration?.images??'schema unavailable'),
      'Active inspiration videos: '+String(c.inspiration?.videos??'schema unavailable'),
      'Metadata rights gaps: '+String(c.inspiration?.rightsGaps??'not checked')]
   :['Internal suggestions: '+((c.recommendations||[]).map(r=>String(r.text)).join(' · ')||'No specific suggestions')];
  for(const line of msgs){const p=document.createElement('p');p.textContent=line;card.append(p);}
  root.append(card);
 }
}
function renderNotifications(data){
 $('watcherNotificationStatus').textContent=!data.enabled?'Watcher disabled.'
  :data.deliveryConfigured?'Private Telegram notifications configured; confirm delivery from saved records.'
  :'Telegram owner notifications disabled or not configured.';
 const root=$('watcherNotificationRows');root.replaceChildren();
 if(!data.items?.length){const tr=document.createElement('tr'),td=document.createElement('td');
  td.colSpan=3;td.textContent='No attempts recorded.';tr.append(td);root.append(tr);return;}
 for(const n of data.items){
  const tr=document.createElement('tr');
  for(const value of [formatDate(n.createdAt),String(n.source||'system')+' · '+String(n.code||''),
    String(n.status||'unverified')]){
    const td=document.createElement('td');td.textContent=value;tr.append(td);
  }
  root.append(tr);
 }
}
function renderPreflight(data){
 $('watcherPreflightStatus').textContent='Code checks: '+(data.readyForOwnerReview?'Ready for owner review':'Blocked or not deployed')+
  ' · Backup verified: No · Production verified: No';
 const rows=$('watcherPreflightRows');rows.replaceChildren();
 const values=[
  ['Feature enabled',data.flags?.watcher===true?'Yes':'No'],
  ['Worker configured',data.flags?.backgroundWorker===true?'Yes':'No'],
  ['HTTPS health origin validated',data.healthUrlValid===true?'Yes':'No'],
  ['Watcher schema tables',String((data.requiredTables||[]).filter(x=>x.present).length)+'/'+String((data.requiredTables||[]).length)],
  ['Base generation schema',data.baseTables?.every(x=>x.present)?'Present':'Not ready'],
  ['Owner state',data.paused===true?'Paused':data.paused===false?'Resumed':'Unknown'],
  ['Fresh worker heartbeat',data.schedulerHeartbeatFresh===true?'Observed':'Not observed'],
  ['Missing gates',(data.blockers||[]).join(' · ')||'No code-level blockers; production unverified']
 ];
 for(const [label,value] of values){
  const tr=document.createElement('tr'),title=document.createElement('td'),result=document.createElement('td');
  title.textContent=label;result.textContent=value;tr.append(title,result);rows.append(tr);
 }
}
function billingCountersText(check){
 if(!check||check.coverage==='disabled')return 'Billing diagnostics: disabled (no Stripe outcome checks).';
 const c=check.counters||{};
 const numbers=[
  'created AI orders (24h): '+String(c.recentCheckoutOrders24h??'—'),
  'old unmatched Checkout sessions (7d): '+String(c.oldUnmatchedCheckoutSessions7d??'—'),
  'AI credit purchases missing orders: '+String(c.orphanCreditPurchases??'—'),
  'over-refunded AI purchase records: '+String(c.overRefundedPurchases??'—'),
  'invalid AI purchase records: '+String(c.invalidCreditPurchases??'—')
 ];
 return 'Billing: '+String(check.code||'not ready')+' · '+numbers.join(' · ')+
  ' · Stripe webhook delivery NOT verified. Unmatched sessions may be cancelled or unpaid.';
}
function render(d){
 current=d;$('watcherStatus').textContent=d.enabled?(d.paused?'Paused':'Ready for manual checks'):'Not enabled';
 const scheduler=d.schedulerActive?'Fresh private-worker heartbeat observed':'No fresh private-worker heartbeat observed';
 const scheduleDetail=!d.schedulerActive?''
  :d.scheduleOverdue?' · Scheduled check overdue — check worker logs'
  :d.nextRun?' · Next expected check (estimate): '+formatDate(d.nextRun)
  :' · Next check: not established';
 $('watcherDetails').textContent=d.enabled?scheduler+' · Last run: '+formatDate(d.lastRun?.checkedAt)+scheduleDetail
  :'Product Watcher is disabled in server configuration.';
 $('watcherBilling').textContent=billingCountersText(d.lastRun?.checks?.billing);
 const stripe=d.lastRun?.checks?.webhookConfig;
 $('watcherWebhookConfig').textContent=!stripe||stripe.scope==='disabled'
  ?'Stripe webhook configuration diagnostics: disabled.'
  :'AI Stripe configuration: '+String(stripe.code||'not reported')+
    ' · '+((stripe.blockers||[]).map(x=>String(x.code)).join(' · ')||'No code-level blockers')+
    ' · Stripe delivery NOT verified.';
 $('watcherToggle').textContent=d.paused?'Resume checks':'Pause checks';
 $('watcherToggle').disabled=busy||!d.enabled;
 $('watcherRun').disabled=busy||!d.enabled||d.paused;
 $('watcherRefresh').disabled=busy;
 showRuns(d.runs||[]);
}
async function refresh(){
 try{busy=true;if(current)render(current);const [d,alerts,sources,briefs,content,delivery,preflight]=await Promise.all([api('/api/product-watcher/admin/status'),api('/api/product-watcher/admin/alerts'),api('/api/product-watcher/admin/official-sources'),api('/api/product-watcher/admin/briefs'),api('/api/product-watcher/admin/content-tasks'),api('/api/product-watcher/admin/notifications'),api('/api/product-watcher/admin/readiness')]);busy=false;render(d);renderAlerts(alerts.items);renderOfficialSources(sources);renderBriefs(briefs);renderContentTasks(content);renderNotifications(delivery);renderPreflight(preflight);feedback('Status updated.');}
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
