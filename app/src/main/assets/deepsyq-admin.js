const $=id=>document.getElementById(id);
let base='';try{base=window.AndroidBridge?.getApiBase?.()||'';}catch(_){}base=String(base||window.VV_API_BASE||location.origin).replace(/\/$/,'');
async function api(path,options={}){const token=localStorage.getItem('vv_token');if(!token)throw Error('AUTH_REQUIRED');const r=await fetch(base+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),Authorization:`Bearer ${token}`}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'REQUEST_FAILED');return d;}

function pct(v){return new Intl.NumberFormat(undefined,{style:'percent',maximumFractionDigits:1}).format(Number(v||0));}
function num(v){return new Intl.NumberFormat().format(Number(v||0));}
function date(v){try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(v));}catch(_){return'—';}}
function stat(label,value,sub=''){const card=document.createElement('article');card.className='stat-card';const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=value;const s=document.createElement('small');s.textContent=sub;card.append(l,v,s);return card;}
async function loadBusiness(){try{$('businessStatus').textContent='Loading…';const d=await api('/api/studio/admin/business'),root=$('businessOverview');root.replaceChildren(stat('Users',num(d.users.total),num(d.users.registrations30d)+' registered in 30 days'),stat('Generation adoption',pct(d.users.generationAdoptionRate),num(d.generation.generatingUsers)+' generating users'),stat('Ever subscribed',pct(d.users.everSubscribedRate),num(d.users.everSubscribed)+' accounts'),stat('Generation jobs',num(d.generation.jobs),pct(d.generation.failureRate)+' failure rate'),stat('Average generation',d.generation.averageSeconds==null?'—':d.generation.averageSeconds+' s',d.generation.topModel?'Top model: '+d.generation.topModel:'No model data'),stat('AI credits charged',num(d.generation.creditsCharged),'Recorded provider cost: '+num(d.generation.recordedProviderCost)));const p=$('purchaseSummary');p.replaceChildren();for(const x of d.aiPurchases||[]){const row=document.createElement('span');row.textContent=`${String(x.currency).toUpperCase()}: ${x.purchases} confirmed purchase(s) · ${x.netAmountMinor} minor units net · ${x.creditsPurchased} credits`;p.append(row);}if(!(d.aiPurchases||[]).length)p.textContent='No confirmed AI wallet purchases recorded.';$('businessStatus').textContent=d.grossMargin===null?'Gross margin is intentionally not calculated until provider cost currency and live AI revenue economics are verified.':'';}catch(e){$('businessStatus').textContent=e.message;}}
async function loadUsers(){try{const q=$('userQuery').value.trim();$('usersStatus').textContent='Loading…';const d=await api('/api/studio/admin/users?q='+encodeURIComponent(q));$('usersTable').replaceChildren();for(const u of d.items||[]){const tr=document.createElement('tr'),vals=[(u.name||'—')+(u.email?' · '+u.email:''),u.plan+' · '+u.status,`${u.aiWallet.available} available · ${u.aiWallet.reserved} held · ${u.aiWallet.debt} debt`,u.generationCount,u.aiPurchaseCount,date(u.createdAt)];for(const v of vals){const td=document.createElement('td');td.textContent=String(v);tr.append(td);}$('usersTable').append(tr);}$('usersStatus').textContent=d.items?.length?'':'No matching users.';}catch(e){$('usersStatus').textContent=e.message;}}
async function loadJobs(){try{const f=$('jobFilter').value;$('jobsStatus').textContent='Loading…';const d=await api('/api/studio/admin/jobs?status='+encodeURIComponent(f));$('jobsTable').replaceChildren();for(const j of d.items||[]){const tr=document.createElement('tr'),vals=[j.id,j.userEmail||j.userId,j.status,[j.provider,j.model].filter(Boolean).join(' · ')||'—',j.durationSeconds==null?'—':j.durationSeconds.toFixed(1)+' s',j.actualCost==null?(j.estimatedCost==null?'—':'est. '+j.estimatedCost):j.actualCost,`${j.creditsCharged} charged · ${j.creditsReserved} held`,j.error||'—'];for(const v of vals){const td=document.createElement('td');td.textContent=String(v);tr.append(td);}$('jobsTable').append(tr);}$('jobsStatus').textContent=d.items?.length?'':'No jobs in this filter.';}catch(e){$('jobsStatus').textContent=e.message;}}

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



function parseTemplateForm(form){
 const fd=new FormData(form),inputs=String(fd.get('requiredInputTypes')||'').split(',').map(x=>x.trim()).filter(Boolean);
 let settings={};const raw=String(fd.get('defaultSettings')||'').trim();if(raw){try{settings=JSON.parse(raw);}catch(_){throw Error('Default settings must be valid JSON.');}}
 return {title:String(fd.get('title')||'').trim(),slug:String(fd.get('slug')||'').trim(),category:String(fd.get('category')||'').trim(),generationType:String(fd.get('generationType')||'image'),defaultModel:String(fd.get('defaultModel')||'').trim()||null,thumbnail:String(fd.get('thumbnail')||'').trim()||null,description:String(fd.get('description')||'').trim(),promptTemplate:String(fd.get('promptTemplate')||'').trim(),requiredInputTypes:inputs,defaultSettings:settings,sortOrder:Number(fd.get('sortOrder')||100),active:fd.get('active')==='on',featured:fd.get('featured')==='on'};
}
function templateEditor(t){
 const form=document.createElement('form');form.className='template-form template-card';
 const values={title:t.title,slug:t.slug,category:t.category,generationType:t.generationType,defaultModel:t.defaultModel||'',thumbnail:t.thumbnail||'',description:t.description||'',promptTemplate:t.promptTemplate,requiredInputTypes:(t.requiredInputTypes||[]).join(','),defaultSettings:JSON.stringify(t.defaultSettings||{}),sortOrder:t.sortOrder};
 for(const name of ['title','slug','category','defaultModel','thumbnail','requiredInputTypes']){const el=document.createElement('input');el.name=name;el.value=values[name]||'';el.placeholder=name;form.append(field(name,el));}
 const type=document.createElement('select');type.name='generationType';for(const v of ['image','video','product_video','avatar','audio'])type.add(new Option(v.replace('_',' '),v));type.value=t.generationType;form.append(field('generation type',type));
 for(const name of ['description','promptTemplate','defaultSettings']){const el=document.createElement('textarea');el.name=name;el.value=values[name]||'';form.append(field(name,el));}
 const orderEl=input('number',t.sortOrder??100,0,100000);orderEl.name='sortOrder';form.append(field('sort order',orderEl));
 const active=input('checkbox');active.name='active';active.checked=!!t.active;const featured=input('checkbox');featured.name='featured';featured.checked=!!t.featured;const flags=document.createElement('div');flags.className='template-flags';const a=field('Active',active),b=field('Featured',featured);a.className='check';b.className='check';flags.append(a,b);form.append(flags);
 const save=document.createElement('button');save.type='submit';save.textContent='Save template';const msg=document.createElement('p');msg.className='message';form.append(save,msg);
 form.onsubmit=async e=>{e.preventDefault();save.disabled=true;msg.textContent='Saving…';try{const body=parseTemplateForm(form);await api('/api/studio/admin/templates/'+encodeURIComponent(t.id),{method:'PATCH',body:JSON.stringify(body)});msg.textContent='Saved.';await loadTemplates();}catch(err){msg.textContent=err.message;}finally{save.disabled=false;}};
 return form;
}
function renderTemplates(items){$('templates').replaceChildren();if(!items.length){const p=document.createElement('p');p.className='message';p.textContent='No templates yet.';$('templates').append(p);return;}for(const t of items)$('templates').append(templateEditor(t));}
async function loadTemplates(){try{$('templateStatus').textContent='Loading…';const d=await api('/api/studio/admin/templates');renderTemplates(d.items||[]);$('templateStatus').textContent='';}catch(e){$('templates').replaceChildren();$('templateStatus').textContent=e.message;}}

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

async function verifyOwner(){try{const {user}=await api('/api/me');if(!user?.isAdmin)throw Error('OWNER_ONLY');await Promise.all([loadBusiness(),loadUsers(),loadJobs(),loadModels(),loadMetrics(),loadBillingReview(),loadTemplates()]);}catch(e){$('modelStatus').textContent=e.message==='AUTH_REQUIRED'?'Sign in with the owner account first.':'Owner access required.';$('metricsStatus').textContent='';}}
$('userSearch').onsubmit=e=>{e.preventDefault();void loadUsers();};
$('jobFilter').onchange=()=>void loadJobs();
$('templateCreate').onsubmit=async e=>{e.preventDefault();const button=$('templateCreate').querySelector('button[type=submit]');button.disabled=true;$('templateStatus').textContent='Creating…';try{const body=parseTemplateForm($('templateCreate'));await api('/api/studio/admin/templates',{method:'POST',body:JSON.stringify(body)});$('templateCreate').reset();$('templateCreate').querySelector('[name=sortOrder]').value='100';$('templateStatus').textContent='Template created.';await loadTemplates();}catch(err){$('templateStatus').textContent=err.message;}finally{button.disabled=false;}};
$('routePreview').onclick=previewRoute;
$('routeKind').onchange=()=>{$('routeRatio').disabled=$('routeKind').value==='music';};
$('refresh').onclick=()=>Promise.all([loadBusiness(),loadUsers(),loadJobs(),loadModels(),loadMetrics(),loadBillingReview(),loadTemplates()]);verifyOwner();