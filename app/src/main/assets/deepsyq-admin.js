import {summarizeAiTemplateReadiness} from './ai-template-readiness.js';
const $=id=>document.getElementById(id);
let base='';try{base=window.AndroidBridge?.getApiBase?.()||'';}catch(_){}base=String(base||window.VV_API_BASE||location.origin).replace(/\/$/,'');
async function api(path,options={}){const token=localStorage.getItem('vv_token');if(!token)throw Error('AUTH_REQUIRED');const r=await fetch(base+path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),Authorization:`Bearer ${token}`}});const d=await r.json().catch(()=>({}));if(r.status===401&&verifiedOwnerSession)checkOwnerSession(true);if(!r.ok)throw Error(d.error||'REQUEST_FAILED');return d;}

async function loadReadiness(){try{$('readinessStatus').textContent='Loading…';const [d,m]=await Promise.all([api('/api/studio/admin/readiness'),api('/api/studio/admin/migrations')]),root=$('launchGates');root.replaceChildren();const gates=[...(d.gates||[]),{id:'migrations',label:'AI database migrations',ready:!!m.ready,required:true}];for(const g of gates){const card=document.createElement('article');card.className='gate-card';card.dataset.ready=String(!!g.ready);const state=document.createElement('strong');state.textContent=g.ready?'Ready':'Blocked';const label=document.createElement('span');label.textContent=g.label;const need=document.createElement('small');need.textContent=g.id==='migrations'?(m.items||[]).map(x=>x.name+': '+(x.applied?(x.checksumMatches?'ok':'checksum mismatch'):'pending')).join(' · '):(g.required?'Required for public AI':'Optional / test-only');card.append(state,label,need);root.append(card);}const blockers=[...(d.blockers||[]),...(!m.ready?['migrations']:[])],b=$('launchBlockers');b.textContent=!blockers.length?'All repository/config/schema launch gates report ready. Live provider/payment/storage smoke tests are still required before launch.':'Blocked by: '+blockers.join(', ')+'.';$('readinessStatus').textContent=d.billing?.liveAiPaymentsEnabled?'Live AI billing gates are enabled. A real controlled Stripe/provider smoke test is still required before public launch.':'Live AI billing remains disabled until mode, live key and explicit owner approval are all enabled.';}catch(e){$('readinessStatus').textContent=e.message;}}

async function loadAudit(){try{$('auditStatus').textContent='Loading…';const d=await api('/api/studio/admin/audit');$('auditTable').replaceChildren();for(const a of d.items||[]){const tr=document.createElement('tr'),vals=[new Date(a.createdAt).toLocaleString(),a.action,[a.targetType,a.targetId].filter(Boolean).join(' · '),a.actorUserId,JSON.stringify(a.details||{})];for(const v of vals){const td=document.createElement('td');td.textContent=String(v);tr.append(td);}$('auditTable').append(tr);}$('auditStatus').textContent=d.items?.length?'':'No audited actions yet.';}catch(e){$('auditStatus').textContent=e.message;}}

function pct(v){return new Intl.NumberFormat(undefined,{style:'percent',maximumFractionDigits:1}).format(Number(v||0));}
function num(v){return new Intl.NumberFormat().format(Number(v||0));}
function costLabel(amount,currency){if(amount==null)return'—';const c=String(currency||'').toLowerCase();if(!/^[a-z]{3}$/.test(c))return Number(amount).toLocaleString()+' · currency unset';try{return new Intl.NumberFormat(undefined,{style:'currency',currency:c.toUpperCase(),maximumFractionDigits:6}).format(Number(amount));}catch(_){return Number(amount).toLocaleString()+' '+c.toUpperCase();}}
function date(v){try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(v));}catch(_){return'—';}}
function stat(label,value,sub=''){const card=document.createElement('article');card.className='stat-card';const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=value;const s=document.createElement('small');s.textContent=sub;card.append(l,v,s);return card;}
async function loadBusiness(){try{$('businessStatus').textContent='Loading…';const d=await api('/api/studio/admin/business'),root=$('businessOverview');root.replaceChildren(stat('Users',num(d.users.total),num(d.users.registrations30d)+' registered in 30 days'),stat('Generation adoption',pct(d.users.generationAdoptionRate),num(d.generation.generatingUsers)+' generating users'),stat('First completed generation',num(d.generation.firstSuccessfulUsers),num(d.generation.firstSuccessfulUsers30d)+' first successes in 30 days'),stat('Confirmed AI credit buyers',pct(d.users.aiCreditBuyerConversionRate),num(d.users.aiCreditBuyers)+' accounts with net-positive confirmed AI credit purchases'),stat('Ever subscribed',pct(d.users.everSubscribedRate),num(d.users.everSubscribed)+' accounts'),stat('Generation jobs',num(d.generation.jobs),d.generation.completedFailureRate==null?'No completed jobs yet':pct(d.generation.completedFailureRate)+' failures among '+num(d.generation.completedJobs)+' completed jobs'),stat('Generations per active creator',d.generation.generatingUsers?num(d.generation.jobsPerGeneratingUser):'—','Saved jobs / users with at least one generation'),stat('Most-used tracked tool',!d.generation.trackedToolsAvailable?'Tracking unavailable':d.generation.topTrackedTool?.tool||'No completed runs',d.generation.topTrackedTool?num(d.generation.topTrackedTool.completedRuns)+' recorded completions; excludes untracked local tools':'Only tracked Tools completions are counted'),stat('AI creation mix',d.generation.topCreationType||'—',(d.generation.creationTypes||[]).map(x=>x.kind+': '+num(x.jobs)+' jobs ('+num(x.ready)+' ready, '+num(x.failed)+' failed)').join(' · ')||'No recorded AI creation jobs'),stat('Average generation',d.generation.averageSeconds==null?'—':d.generation.averageSeconds+' s',d.generation.topModel?'Top model: '+d.generation.topModel:'No model data'),stat('AI credits charged',num(d.generation.creditsCharged),'Recorded provider cost: '+((d.generation.providerCosts||[]).map(x=>costLabel(x.amount,x.currency)+(x.averageReadyJobCost==null?'':' · avg ready priced job '+costLabel(x.averageReadyJobCost,x.currency)+' ('+num(x.readyPricedJobs)+' jobs)')).join(' · ')||'—')));const p=$('purchaseSummary');p.replaceChildren();for(const x of d.aiPurchases||[]){const row=document.createElement('span');row.textContent=`${String(x.currency).toUpperCase()}: ${x.purchases} confirmed purchase(s) · ${x.netAmountMinor} minor units net · ${x.creditsPurchased} credits`;p.append(row);}if(!(d.aiPurchases||[]).length)p.textContent='No confirmed AI wallet purchases recorded.';$('businessStatus').textContent=d.grossMargin===null?'Gross margin and revenue per user are not verified. Trial-to-paid, tool popularity and churn are not tracked reliably yet. Generation counts use non-deleted saved jobs; AI purchases use confirmed net-positive ledger entries.':'';}catch(e){$('businessStatus').textContent=e.message;}}
async function loadPurchases(){try{
 const d=await api('/api/studio/admin/purchases');$('purchasesTable').replaceChildren();
 for(const p of d.items||[]){const tr=document.createElement('tr'),currency=String(p.currency||'').toUpperCase(),money=v=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(Number(v||0)/100);}catch(_){return (Number(v||0)/100).toFixed(2)+' '+currency;}};for(const v of [p.userEmail||p.userId,Number(p.credits||0).toLocaleString(),money(p.amountMinor),money(p.refundedMinor),money(p.netMinor),p.createdAt?date(p.createdAt):'—']){const td=document.createElement('td');td.textContent=String(v);tr.append(td);}$('purchasesTable').append(tr);}
 $('purchasesStatus').textContent=d.items?.length?'':'No confirmed AI credit purchases recorded.';
 }catch(e){$('purchasesStatus').textContent=e.message;}}

// Ignore responses from obsolete admin searches/filter selections. Also prevent
// old owner-account responses from repainting this page after session rotation.
let userListRequest=0,jobListRequest=0,metricsListRequest=0;
const stillCurrent=(version,latest,token)=>!ownerViewInvalidated&&version===latest&&localStorage.getItem('vv_token')===token;

async function loadUsers(){
 const request=++userListRequest,token=localStorage.getItem('vv_token'),q=$('userQuery').value.trim();
 $('usersStatus').textContent='Loading…';
 $('usersTable').replaceChildren();
 try{
  const d=await api('/api/studio/admin/users?q='+encodeURIComponent(q));
  if(!stillCurrent(request,userListRequest,token))return;
  for(const u of d.items||[]){
   const tr=document.createElement('tr');
   const vals=[(u.name||'—')+(u.email?' · '+u.email:''),u.plan+' · '+u.status,
    `${u.aiWallet.available} available · ${u.aiWallet.reserved} held · ${u.aiWallet.debt} debt`,
    u.generationCount,u.aiPurchaseCount,date(u.createdAt)];
   for(const v of vals){const td=document.createElement('td');td.textContent=String(v);tr.append(td);}
   $('usersTable').append(tr);
  }
  $('usersStatus').textContent=d.items?.length?'':'No matching users.';
 }catch(e){
  if(stillCurrent(request,userListRequest,token))$('usersStatus').textContent=e.message;
 }
}
async function loadJobs(){
 const request=++jobListRequest,token=localStorage.getItem('vv_token'),f=$('jobFilter').value;
 $('jobsStatus').textContent='Loading…';
 $('jobsTable').replaceChildren();
 try{
  const d=await api('/api/studio/admin/jobs?status='+encodeURIComponent(f));
  if(!stillCurrent(request,jobListRequest,token))return;
  for(const j of d.items||[]){
   const tr=document.createElement('tr');
   const vals=[j.id,j.userEmail||j.userId,j.status,
    [j.provider,j.model].filter(Boolean).join(' · ')||'—',
    j.durationSeconds==null?'—':j.durationSeconds.toFixed(1)+' s',
    j.actualCost==null?(j.estimatedCost==null?'—':'est. '+costLabel(j.estimatedCost,j.costCurrency)):costLabel(j.actualCost,j.costCurrency),
    `${j.creditsCharged} charged · ${j.creditsReserved} held`,j.error||'—'];
   for(const v of vals){const td=document.createElement('td');td.textContent=String(v);tr.append(td);}
   $('jobsTable').append(tr);
  }
  $('jobsStatus').textContent=d.items?.length?'':'No jobs in this filter.';
 }catch(e){
  if(stillCurrent(request,jobListRequest,token))$('jobsStatus').textContent=e.message;
 }
}

function field(label,input){const wrap=document.createElement('label'),span=document.createElement('span');span.textContent=label;wrap.append(span,input);return wrap;}
function input(type,value,min,max){const e=document.createElement('input');e.type=type;if(value!=null)e.value=value;if(min!=null)e.min=min;if(max!=null)e.max=max;return e;}
function renderModels(items){$('models').replaceChildren();for(const m of items){const card=document.createElement('article');const head=document.createElement('div');head.className='card-head';const title=document.createElement('div');title.innerHTML=`<strong></strong><small></small>`;title.querySelector('strong').textContent=m.label||m.id;title.querySelector('small').textContent=`${m.provider} · ${m.kind} · ${m.id}`;const live=document.createElement('span');live.className='state';live.textContent=m.enabled?'Available':'Unavailable';head.append(title,live);
 const mode=document.createElement('select');for(const [v,t] of [['inherit','Inherit base availability'],['on','Force enabled'],['off','Force disabled']])mode.add(new Option(t,v));mode.value=m.control?.enabledOverride===true?'on':m.control?.enabledOverride===false?'off':'inherit';
 const maintenance=input('checkbox');maintenance.checked=!!m.control?.maintenance;
 const priority=input('number',m.control?.priority??100,0,10000);
 const markup=input('number',m.control?.markupBps??'',0,100000);markup.placeholder='unset';
 const cost=input('number',m.control?.internalCostMicros??'',0,1000000000000);cost.placeholder='unset';
 const form=document.createElement('div');form.className='controls';form.append(field('Availability',mode),field('Priority',priority),field('Markup (bps)',markup),field('Internal cost (micros)',cost));const maint=field('Maintenance',maintenance);maint.className='check';form.append(maint);
 const save=document.createElement('button');save.textContent='Save';const msg=document.createElement('p');msg.className='message';save.onclick=async()=>{save.disabled=true;msg.textContent='Saving…';try{const body={enabled:mode.value==='inherit'?null:mode.value==='on',priority:Number(priority.value),maintenance:maintenance.checked,markupBps:markup.value===''?null:Number(markup.value),internalCostMicros:cost.value===''?null:Number(cost.value)};await api('/api/studio/admin/models/'+encodeURIComponent(m.id),{method:'PATCH',body:JSON.stringify(body)});msg.textContent='Saved reference settings. Approved customer credit prices are unchanged.';await loadModels();}catch(e){msg.textContent=e.message;}finally{save.disabled=false;}};
 const advisory=document.createElement('p');advisory.className='message';
 advisory.textContent='Markup and internal cost are reference settings only. They do not change customer AI-credit prices; only separately approved server pricing can do that.';
 card.append(head,form,advisory,save,msg);$('models').append(card);}}
async function loadModels(){try{$('modelStatus').textContent='Loading…';const d=await api('/api/studio/admin/models');renderModels(d.items||[]);$('modelStatus').textContent=d.items?.length?'':'No model records.';}catch(e){$('models').replaceChildren();$('modelStatus').textContent=e.message==='MODEL_ADMIN_NOT_ENABLED'?'Model controls are prepared but the feature flag is OFF. No settings were changed.':e.message;}}
async function loadMetrics(){
 const request=++metricsListRequest,token=localStorage.getItem('vv_token');
 const window=$('metricsWindow')?.value||'7d';
 $('metricsStatus').textContent='Loading…';
 $('metrics').replaceChildren();
 try{
  const d=await api('/api/studio/admin/metrics?window='+encodeURIComponent(window));
  if(!stillCurrent(request,metricsListRequest,token))return;
  for(const m of d.items||[]){
   const tr=document.createElement('tr');
   for(const v of [m.provider||'—',m.model||'—',m.kind,m.jobs,m.succeeded,m.failed,m.processing,
    pct(m.successRate),m.averageSeconds??'—',costLabel(m.actualCost,m.costCurrency),m.creditsCharged]){
    const td=document.createElement('td');td.textContent=String(v);tr.append(td);
   }
   $('metrics').append(tr);
  }
  $('metricsStatus').textContent=d.items?.length?'Window: '+d.window:'No generation data in this window.';
 }catch(e){
  if(stillCurrent(request,metricsListRequest,token))$('metricsStatus').textContent=e.message;
 }
}




function renderInspirationReadiness(d){
 const root=$('inspirationReadiness');root.replaceChildren();
 const head=document.createElement('div');head.className='inspiration-readiness-head';const title=document.createElement('strong');title.textContent=d.ready?'Block 3 content is ready to publish':'Block 3 still needs approved content';const flag=document.createElement('span');flag.textContent=d.featureEnabled?'Public flag ON':'Public flag OFF';head.append(title,flag);root.append(head);
 const stats=document.createElement('div');stats.className='inspiration-readiness-stats';for(const [label,value] of [['Publishable',d.counts?.studio||0],['Images',d.counts?.images||0],['Videos',d.counts?.videos||0],['Featured',d.counts?.featured||0],['Rights blocked',d.counts?.rightsBlocked||0]]){const s=document.createElement('span');s.textContent=label+': '+value;stats.append(s);}root.append(stats);
 const details=document.createElement('p');details.textContent=(d.categories?.length?'Categories: '+d.categories.join(', ')+'. ':'')+(d.ratios?.length?'Ratios: '+d.ratios.join(', ')+'. ':'')+(d.counts?.agentGated&&!d.agentTargetsEnabled?'Agent examples remain gated until Block 2 has a real destination.':'');root.append(details);
 if(d.blockers?.length){const ul=document.createElement('ul'),labels={NO_PUBLISHED_STUDIO_EXAMPLES:'Add at least one publishable Studio example.',NO_PUBLISHED_IMAGE_EXAMPLES:'Add at least one approved image example.',NO_PUBLISHED_VIDEO_EXAMPLES:'Add at least one approved video example.',NO_FEATURED_INSPIRATION:'Mark at least one approved Studio example as Featured.',ACTIVE_ITEMS_MISSING_RIGHTS_EVIDENCE:'Add rights evidence to every active item or deactivate it.'};for(const code of d.blockers){const li=document.createElement('li');li.textContent=labels[code]||code;ul.append(li);}root.append(ul);}
}
async function loadInspirationReadiness(){try{renderInspirationReadiness(await api('/api/studio/admin/inspiration-readiness'));}catch(e){$('inspirationReadiness').textContent=e.message;}}

function parseInspirationForm(form){
 const fd=new FormData(form),inputs=String(fd.get('requiredInputTypes')||'').split(',').map(x=>x.trim()).filter(Boolean);let settings={};const raw=String(fd.get('defaultSettings')||'').trim();if(raw){try{settings=JSON.parse(raw);}catch(_){throw Error('Settings must be valid JSON.');}}
 return {title:String(fd.get('title')||'').trim(),slug:String(fd.get('slug')||'').trim(),kind:String(fd.get('kind')||'image'),category:String(fd.get('category')||'').trim(),description:String(fd.get('description')||'').trim(),previewUrl:String(fd.get('previewUrl')||'').trim(),previewPosterUrl:String(fd.get('previewPosterUrl')||'').trim()||null,prompt:String(fd.get('prompt')||'').trim(),defaultModel:String(fd.get('defaultModel')||'').trim()||null,aspectRatio:String(fd.get('aspectRatio')||'1:1'),requiredInputTypes:inputs,defaultSettings:settings,actionTarget:String(fd.get('actionTarget')||'studio'),rightsBasis:String(fd.get('rightsBasis')||'owned'),rightsNote:String(fd.get('rightsNote')||'').trim(),sortOrder:Number(fd.get('sortOrder')||100),active:fd.get('active')==='on',featured:fd.get('featured')==='on'};
}
function inspirationEditor(item){
 const form=document.createElement('form');form.className='template-form template-card inspiration-card';
 const textFields=['title','slug','category','previewUrl','previewPosterUrl','defaultModel','requiredInputTypes','rightsNote'];for(const name of textFields){const el=document.createElement('input');el.name=name;el.value=name==='requiredInputTypes'?(item.requiredInputTypes||[]).join(','):(item[name]||'');el.placeholder=name;form.append(field(name,el));}
 for(const [name,values] of [['kind',['image','video']],['aspectRatio',['1:1','16:9','9:16','2:3','3:2','4:3','3:4']],['rightsBasis',['owned','licensed']],['actionTarget',['studio','agent']]]){const sel=document.createElement('select');sel.name=name;for(const v of values)sel.add(new Option(v,v));sel.value=item[name];form.append(field(name,sel));}
 for(const name of ['description','prompt','defaultSettings']){const el=document.createElement('textarea');el.name=name;el.value=name==='defaultSettings'?JSON.stringify(item.defaultSettings||{}):(item[name]||'');form.append(field(name,el));}
 const orderEl=input('number',item.sortOrder??100,0,100000);orderEl.name='sortOrder';form.append(field('sort order',orderEl));
 const active=input('checkbox');active.name='active';active.checked=!!item.active;const featured=input('checkbox');featured.name='featured';featured.checked=!!item.featured;const flags=document.createElement('div');flags.className='template-flags';const a=field('Active',active),b=field('Featured',featured);a.className='check';b.className='check';flags.append(a,b);form.append(flags);
 const rights=document.createElement('small');rights.className='inspiration-rights';rights.textContent='Publish only if rights are verified: '+(item.rightsBasis||'not set');form.append(rights);
 const save=document.createElement('button');save.type='submit';save.textContent='Save inspiration';const msg=document.createElement('p');msg.className='message';form.append(save,msg);
 form.onsubmit=async e=>{e.preventDefault();save.disabled=true;msg.textContent='Saving…';try{await api('/api/studio/admin/inspiration/'+encodeURIComponent(item.id),{method:'PATCH',body:JSON.stringify(parseInspirationForm(form))});msg.textContent='Saved.';await loadInspirationAdmin();}catch(err){msg.textContent=err.message;}finally{save.disabled=false;}};
 return form;
}
function renderInspirationAdmin(items){$('inspirationAdminList').replaceChildren();if(!items.length){const p=document.createElement('p');p.className='message';p.textContent='No inspiration items yet. Add only owned or licensed media.';$('inspirationAdminList').append(p);return;}for(const item of items)$('inspirationAdminList').append(inspirationEditor(item));}
async function loadInspirationAdmin(){try{$('inspirationAdminStatus').textContent='Loading…';const d=await api('/api/studio/admin/inspiration');renderInspirationAdmin(d.items||[]);$('inspirationAdminStatus').textContent='';await loadInspirationReadiness();}catch(e){$('inspirationAdminList').replaceChildren();$('inspirationAdminStatus').textContent=e.message;}}

function parseTemplateForm(form){
 const fd=new FormData(form),inputs=String(fd.get('requiredInputTypes')||'').split(',').map(x=>x.trim()).filter(Boolean);
 let settings={};const raw=String(fd.get('defaultSettings')||'').trim();if(raw){try{settings=JSON.parse(raw);}catch(_){throw Error('Default settings must be valid JSON.');}}
 return {title:String(fd.get('title')||'').trim(),slug:String(fd.get('slug')||'').trim(),category:String(fd.get('category')||'').trim(),generationType:String(fd.get('generationType')||'image'),defaultModel:String(fd.get('defaultModel')||'').trim()||null,thumbnail:String(fd.get('thumbnail')||'').trim()||null,description:String(fd.get('description')||'').trim(),promptTemplate:String(fd.get('promptTemplate')||'').trim(),requiredInputTypes:inputs,defaultSettings:settings,rightsBasis:String(fd.get('rightsBasis')||'')||null,rightsNote:String(fd.get('rightsNote')||'').trim(),sortOrder:Number(fd.get('sortOrder')||100),active:fd.get('active')==='on',featured:fd.get('featured')==='on'};
}
function templateEditor(t){
 const form=document.createElement('form');form.className='template-form template-card';
 const values={title:t.title,slug:t.slug,category:t.category,generationType:t.generationType,defaultModel:t.defaultModel||'',thumbnail:t.thumbnail||'',description:t.description||'',promptTemplate:t.promptTemplate,requiredInputTypes:(t.requiredInputTypes||[]).join(','),defaultSettings:JSON.stringify(t.defaultSettings||{}),rightsNote:t.rightsNote||'',sortOrder:t.sortOrder};
 for(const name of ['title','slug','category','defaultModel','thumbnail','rightsNote','requiredInputTypes']){const el=document.createElement('input');el.name=name;el.value=values[name]||'';el.placeholder=name;form.append(field(name,el));}
 const basis=document.createElement('select');basis.name='rightsBasis';for(const [title,value] of [['Rights not verified',''],['Owned by Deepsyq','owned'],['Licensed for use','licensed']])basis.add(new Option(title,value));basis.value=t.rightsBasis||'';form.append(field('Rights basis',basis));
 const type=document.createElement('select');type.name='generationType';for(const v of ['image','video','avatar','audio'])type.add(new Option(v.replace('_',' '),v));type.value=t.generationType;form.append(field('generation type',type));
 for(const name of ['description','promptTemplate','defaultSettings']){const el=document.createElement('textarea');el.name=name;el.value=values[name]||'';form.append(field(name,el));}
 const orderEl=input('number',t.sortOrder??100,0,100000);orderEl.name='sortOrder';form.append(field('sort order',orderEl));
 const active=input('checkbox');active.name='active';active.checked=!!t.active;const featured=input('checkbox');featured.name='featured';featured.checked=!!t.featured;const flags=document.createElement('div');flags.className='template-flags';const a=field('Active',active),b=field('Featured',featured);a.className='check';b.className='check';flags.append(a,b);form.append(flags);
 const save=document.createElement('button');save.type='submit';save.textContent='Save template';const msg=document.createElement('p');msg.className='message';form.append(save,msg);
 form.onsubmit=async e=>{e.preventDefault();save.disabled=true;msg.textContent='Saving…';try{const body=parseTemplateForm(form);await api('/api/studio/admin/templates/'+encodeURIComponent(t.id),{method:'PATCH',body:JSON.stringify(body)});msg.textContent='Saved.';await loadTemplates();}catch(err){msg.textContent=err.message;}finally{save.disabled=false;}};
 return form;
}
function renderTemplates(items){$('templates').replaceChildren();if(!items.length){const p=document.createElement('p');p.className='message';p.textContent='No templates yet.';$('templates').append(p);return;}for(const t of items)$('templates').append(templateEditor(t));}
function renderTemplateReadiness(items){
 const root=$('templateReadiness');if(!root)return;root.replaceChildren();
 const r=summarizeAiTemplateReadiness(items);
 const head=document.createElement('div');head.className='inspiration-readiness-head';
 const title=document.createElement('strong');title.textContent='AI Apps publish readiness';
 const status=document.createElement('span');status.textContent=r.actionable+' usable / '+r.total+' records';
 head.append(title,status);root.append(head);
 const stats=document.createElement('div');stats.className='inspiration-readiness-stats';
 for(const [label,n] of [['Active records',r.active],['Rights recorded + active',r.publicEligible],['Studio-compatible + active',r.actionable],['Drafts',r.drafts],['Rights not recorded',r.missingRights],['Without preview image',r.noThumbnail]]){
  const count=document.createElement('span');count.textContent=label+': '+n;stats.append(count);
 }
 root.append(stats);
 const notice=document.createElement('p');notice.textContent='Metadata review only. Recorded rights notes are not independent license verification. Public access still requires approved migrations, real model access and the production feature flag.';root.append(notice);
 if(r.blockers.length){const label=document.createElement('strong');label.textContent='Review before publishing:';root.append(label);const ul=document.createElement('ul');for(const b of r.blockers.slice(0,8)){const item=document.createElement('li');item.textContent=b;ul.append(item);}root.append(ul);}
 else{const p=document.createElement('p');p.textContent=r.total?'No metadata blockers found for active templates. This does not approve public launch.':'Add your first owned/licensed draft with real rights evidence to begin.';root.append(p);}
}
async function loadTemplates(){try{$('templateStatus').textContent='Loading…';const d=await api('/api/studio/admin/templates');renderTemplates(d.items||[]);renderTemplateReadiness(d.items||[]);$('templateStatus').textContent='';}catch(e){$('templates').replaceChildren();const root=$('templateReadiness');if(root)root.textContent='Could not load template publish readiness.';$('templateStatus').textContent=e.message;}}

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

async function verifyOwner(){try{const {user}=await api('/api/me');if(!user?.isAdmin)throw Error('OWNER_ONLY');verifiedOwnerSession=true;await Promise.all([loadReadiness(),loadBusiness(),loadPurchases(),loadUsers(),loadJobs(),loadAudit(),loadModels(),loadMetrics(),loadBillingReview(),loadTemplates(),loadInspirationAdmin()]);}catch(e){$('modelStatus').textContent=e.message==='AUTH_REQUIRED'?'Sign in with the owner account first.':'Owner access required.';$('metricsStatus').textContent='';}}

$('creditAdjustForm').onsubmit=async e=>{e.preventDefault();const userId=$('creditUserId').value.trim(),delta=Number($('creditDelta').value),reason=$('creditReason').value.trim(),status=$('creditAdjustStatus');if(!userId||!Number.isSafeInteger(delta)||delta===0||reason.length<3){status.textContent='Enter exact user ID, a non-zero whole credit amount, and a reason.';return;}const verb=delta>0?'ADD':'REMOVE',amount=Math.abs(delta);if(!confirm(`${verb} ${amount} AI credits ${delta>0?'to':'from'} user ${userId}?\n\nReason: ${reason}\n\nThis does not change Stripe.`))return;status.textContent='Applying audited adjustment…';const requestId=crypto.randomUUID();try{const d=await api('/api/studio/admin/users/'+encodeURIComponent(userId)+'/credits/adjust',{method:'POST',body:JSON.stringify({requestId,confirmUserId:userId,delta,reason})});status.textContent=`Saved. Available: ${d.balance.available}, held: ${d.balance.reserved}, debt: ${d.balance.debt}.`;await Promise.all([loadUsers(),loadBusiness()]);}catch(err){status.textContent=err.message==='OWNER_CREDIT_ADJUSTMENTS_DISABLED'?'Manual credit adjustment is safely disabled on the server.':err.message==='INSUFFICIENT_AVAILABLE_AI_CREDITS'?'Cannot remove more credits than the user currently has available.':err.message;}};

// Across-tab logout/account switching sends a native storage event. Clear the
// rendered owner dashboard synchronously before navigating away; the dashboard
// must not keep another account's user/job data visible while async fetches end.
const ownerTokenAtOpen=localStorage.getItem('vv_token');
let ownerViewInvalidated=false,verifiedOwnerSession=false;
function checkOwnerSession(force=false){
 if(ownerViewInvalidated||(!force&&localStorage.getItem('vv_token')===ownerTokenAtOpen))return;
 ownerViewInvalidated=true;
 userListRequest++;jobListRequest++;metricsListRequest++;
 document.body.style.visibility='hidden';
 location.replace('deepsyq.html');
}
window.addEventListener('storage',event=>{
 if((event.key!=='vv_token'&&event.key!==null)||event.storageArea!==localStorage)return;
 checkOwnerSession();
});
// BFCache can restore a page without rerunning module code. Check the original
// owner session before making a previously visible owner dashboard interactive.
// Do not pass the pageshow Event as checkOwnerSession(force): a truthy Event
// would bypass the same-token check and evict even a valid owner session.
window.addEventListener('pageshow',()=>checkOwnerSession());
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden)checkOwnerSession();
});

$('userSearch').onsubmit=e=>{e.preventDefault();void loadUsers();};
$('jobFilter').onchange=()=>void loadJobs();
$('metricsWindow').onchange=()=>void loadMetrics();
$('inspirationCreate').onsubmit=async e=>{e.preventDefault();const button=$('inspirationCreate').querySelector('button[type=submit]');button.disabled=true;$('inspirationAdminStatus').textContent='Creating…';try{const body=parseInspirationForm($('inspirationCreate'));await api('/api/studio/admin/inspiration',{method:'POST',body:JSON.stringify(body)});$('inspirationCreate').reset();$('inspirationCreate').querySelector('[name=sortOrder]').value='100';$('inspirationAdminStatus').textContent='Inspiration item created.';await loadInspirationAdmin();}catch(err){$('inspirationAdminStatus').textContent=err.message;}finally{button.disabled=false;}};
$('templateCreate').onsubmit=async e=>{e.preventDefault();const button=$('templateCreate').querySelector('button[type=submit]');button.disabled=true;$('templateStatus').textContent='Creating…';try{const body=parseTemplateForm($('templateCreate'));await api('/api/studio/admin/templates',{method:'POST',body:JSON.stringify(body)});$('templateCreate').reset();$('templateCreate').querySelector('[name=sortOrder]').value='100';$('templateStatus').textContent='Template created.';await loadTemplates();}catch(err){$('templateStatus').textContent=err.message;}finally{button.disabled=false;}};
$('routePreview').onclick=previewRoute;
$('routeKind').onchange=()=>{$('routeRatio').disabled=$('routeKind').value==='music';};
$('refresh').onclick=()=>Promise.all([loadReadiness(),loadBusiness(),loadPurchases(),loadUsers(),loadJobs(),loadAudit(),loadModels(),loadMetrics(),loadBillingReview(),loadTemplates(),loadInspirationAdmin()]);verifyOwner();