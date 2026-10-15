const $=id=>document.getElementById(id);
let base='';try{base=window.AndroidBridge?.getApiBase?.()||'';}catch(_){}base=String(base||window.VV_API_BASE||location.origin).replace(/\/$/,'');
async function api(path,options={}){const token=localStorage.getItem('vv_token');if(!token)throw Error('AUTH_REQUIRED');const r=await fetch(base+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),Authorization:`Bearer ${token}`}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'REQUEST_FAILED');return d;}
function field(label,input){const wrap=document.createElement('label'),span=document.createElement('span');span.textContent=label;wrap.append(span,input);return wrap;}
function input(type,value,min,max){const e=document.createElement('input');e.type=type;if(value!=null)e.value=value;if(min!=null)e.min=min;if(max!=null)e.max=max;return e;}
function renderModels(items){$('models').replaceChildren();for(const m of items){const card=document.createElement('article');const head=document.createElement('div');head.className='card-head';const title=document.createElement('div');title.innerHTML=`<strong></strong><small></small>`;title.querySelector('strong').textContent=m.label||m.id;title.querySelector('small').textContent=`${m.provider} · ${m.kind} · ${m.id}`;const live=document.createElement('span');live.className='state';live.textContent=m.enabled?'Available':'Unavailable';head.append(title,live);
 const mode=document.createElement('select');for(const [v,t] of [['inherit','Inherit base availability'],['on','Force enabled'],['off','Force disabled']])mode.add(new Option(t,v));mode.value=m.control?.enabledOverride===true?'on':m.control?.enabledOverride===false?'off':'inherit';
 const maintenance=input('checkbox');maintenance.checked=!!m.control?.maintenance;
 const priority=input('number',m.control?.priority??100,0,10000);
 const markup=input('number',m.control?.markupBps??'',0,100000);markup.placeholder='unset';
 const cost=input('number',m.control?.internalCostMicros??'',0,1000000000000);cost.placeholder='unset';
 const form=document.createElement('div');form.className='controls';form.append(field('Availability',mode),field('Priority',priority),field('Markup (bps)',markup),field('Internal cost (micros)',cost));const maint=field('Maintenance',maintenance);maint.className='check';form.append(maint);
 const save=document.createElement('button');save.textContent='Save';const msg=document.createElement('p');msg.className='message';save.onclick=async()=>{save.disabled=true;msg.textContent='Saving…';try{const body={enabled:mode.value==='inherit'?null:mode.value==='on',priority:Number(priority.value),maintenance:maintenance.checked,markupBps:markup.value===''?null:Number(markup.value),internalCostMicros:cost.value===''?null:Number(cost.value)};await api('/api/studio/admin/models/'+encodeURIComponent(m.id),{method:'PATCH',body:JSON.stringify(body)});msg.textContent='Saved.';await loadModels();}catch(e){msg.textContent=e.message;}finally{save.disabled=false;}};
 card.append(head,form,save,msg);$('models').append(card);}}
async function loadModels(){try{$('modelStatus').textContent='Loading…';const d=await api('/api/studio/admin/models');renderModels(d.items||[]);$('modelStatus').textContent=d.items?.length?'':'No model records.';}catch(e){$('models').replaceChildren();$('modelStatus').textContent=e.message==='MODEL_ADMIN_NOT_ENABLED'?'Model controls are prepared but the feature flag is OFF. No settings were changed.':e.message;}}
async function loadMetrics(){try{$('metricsStatus').textContent='Loading…';const d=await api('/api/studio/admin/metrics');$('metrics').replaceChildren();for(const m of d.items||[]){const tr=document.createElement('tr');for(const v of [m.provider||'—',m.model||'—',m.kind,m.jobs,m.succeeded,m.failed,m.processing,m.averageSeconds??'—',m.actualCost,m.creditsCharged]){const td=document.createElement('td');td.textContent=String(v);tr.append(td);}$('metrics').append(tr);}$('metricsStatus').textContent=d.items?.length?'':'No generation data yet.';}catch(e){$('metricsStatus').textContent=e.message;}}


async function previewRoute(){
 const button=$('routePreview'),out=$('routeResult');button.disabled=true;$('routeStatus').textContent='Checking compatible models…';out.replaceChildren();
 try{
  const kind=$('routeKind').value,ratio=kind==='music'?'':$('routeRatio').value;
  const d=await api('/api/studio/admin/route-preview',{method:'POST',body:JSON.stringify({kind,ratio,references:[]})});
  const primary=document.createElement('p');primary.innerHTML='<strong>Primary:</strong> ';primary.append(document.createTextNode(d.primary||'—'));out.append(primary);
  for(const [i,m] of (d.candidates||[]).entries()){const row=document.createElement('div');row.className='route-candidate';const rank=document.createElement('span');rank.textContent=String(i+1);const text=document.createElement('div');text.innerHTML='<strong></strong><small></small>';text.querySelector('strong').textContent=m.id;text.querySelector('small').textContent=[m.provider,'priority '+m.priority,m.quality,m.duration].filter(Boolean).join(' · ');row.append(rank,text);out.append(row);}
  $('routeStatus').textContent='Preview only. No provider call was made.';
 }catch(e){$('routeStatus').textContent=e.message==='SMART_ROUTING_NOT_ENABLED'?'Smart routing is prepared but its feature flag is OFF.':e.message;}finally{button.disabled=false;}
}

function renderBillingReview(items){
 const root=$('billingReview');root.replaceChildren();
 if(!items.length){const p=document.createElement('p');p.className='message';p.textContent='No held reservations need review.';root.append(p);return;}
 for(const item of items){
  const card=document.createElement('article');card.className='review-card';
  const title=document.createElement('strong');title.textContent=`${item.kind} · ${item.model||'unknown model'}`;
  const meta=document.createElement('small');meta.textContent=`${item.provider||'provider'} · ${item.credits} credits · job ${item.jobId}`;
  const note=input('text');note.placeholder='Why is this reservation being released?';note.maxLength=200;
  const button=document.createElement('button');button.textContent='Release held credits';
  const msg=document.createElement('p');msg.className='message';
  button.onclick=async()=>{const value=note.value.trim();if(value.length<3){msg.textContent='Add a short review note first.';return;}if(!confirm(`Return ${item.credits} held AI credits for this failed job?\n\nNo generation will be retried.`))return;button.disabled=true;msg.textContent='Releasing…';try{const d=await api('/api/studio/admin/billing-review/'+encodeURIComponent(item.jobId)+'/release',{method:'POST',body:JSON.stringify({confirmJobId:item.jobId,note:value})});msg.textContent=`Released ${d.releasedCredits} credits.`;await loadBillingReview();}catch(e){msg.textContent=e.message;}finally{button.disabled=false;}};
  card.append(title,meta,note,button,msg);root.append(card);
 }
}
async function loadBillingReview(){try{$('billingStatus').textContent='Loading…';const d=await api('/api/studio/admin/billing-review');renderBillingReview(d.items||[]);$('billingStatus').textContent='';}catch(e){$('billingReview').replaceChildren();$('billingStatus').textContent=e.message==='AI_WALLET_UNAVAILABLE'?'AI wallet review is not available yet.':e.message;}}

async function verifyOwner(){try{const {user}=await api('/api/me');if(!user?.isAdmin)throw Error('OWNER_ONLY');await Promise.all([loadModels(),loadMetrics(),loadBillingReview()]);}catch(e){$('modelStatus').textContent=e.message==='AUTH_REQUIRED'?'Sign in with the owner account first.':'Owner access required.';$('metricsStatus').textContent='';}}
$('routePreview').onclick=previewRoute;
$('routeKind').onchange=()=>{$('routeRatio').disabled=$('routeKind').value==='music';};
$('refresh').onclick=()=>Promise.all([loadModels(),loadMetrics(),loadBillingReview()]);verifyOwner();