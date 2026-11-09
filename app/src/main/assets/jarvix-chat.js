
export function openWorkspace(url, title = 'Everyday Tool') {
  const pane = $('jWorkspacePane'), frame = $('jWorkspaceFrame'), headTitle = $('jWorkspaceTitle'), popout = $('jWorkspacePopout');
  if (!pane || !frame) {
    location.assign(url);
    return;
  }
  const titleMap = {
    'index.html': 'Video Uniquifier',
    'free-tools.html': 'Everyday Tools',
    'free-tools.html#compress-photos': 'Compress Photos',
    'free-tools.html#compress-video': 'Compress Video',
    'avatar-studio.html': 'Avatar Studio',
    'teleprompter.html': 'Teleprompter',
    'audio-studio.html': 'Audio Studio',
    'canvas.html': 'Canvas'
  };
  if(frame.getAttribute('src')!==url)frame.src = url;
  if (headTitle) headTitle.textContent = titleMap[url] || title;
  if (popout) popout.href = url;
  pane.hidden = false;
  document.body.classList.add('has-chat-workspace');
}
import {ACTION_ROUTES,extractAction,resolveActionModel} from './jarvix-action-plan.js';
import {downloadResult,mediaExtension} from './jarvix-result-cache.js';
import {makeId,conversationStore,resolveMode} from './jarvix-conversations.js';
import {bindComposer,trackViewport} from './jarvix-composer.js';
import {getJarvixSessionId,getJarvixLanguage,speakJarvis} from './jarvis-core.js';
import {saveStudioHandoff} from './studio-handoff.js';
const $=id=>document.getElementById(id),status=text=>$('jStatus').textContent=text;
const store=await conversationStore();let conversation=null,busy=false,epoch=0,controller=null,config=null,urls=[];
const headers=()=>({'Content-Type':'application/json',...(localStorage.getItem('vv_token')?{Authorization:'Bearer '+localStorage.getItem('vv_token')}:{})});
async function api(path,body){store.guard();const r=await fetch(path,{method:body?'POST':'GET',headers:headers(),cache:'no-store',...(body?{body:JSON.stringify(body)}:{}),signal:controller?.signal});store.guard();const d=await r.json();if(!r.ok)throw Error(d.message||d.error||'Request failed');return d;}
async function save(){conversation=await store.save(conversation);await historyList();}
async function historyList(){const rows=await store.list();$('jHistory').replaceChildren();for(const r of rows){const o=document.createElement('option');o.value=r.id;o.textContent=r.title;o.selected=r.id===conversation?.id;$('jHistory').append(o);}window.dispatchEvent(new Event('jarvix:history-changed'));}
const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
function showFile(parent,file){const box=node('div'),url=URL.createObjectURL(file);urls.push(url);const el=node(file.type.startsWith('image/')?'img':file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':'a');el.src=url;if(el.tagName==='IMG')el.alt=file.name||'Attachment';else if(el.tagName==='A'){el.href=url;el.download=file.name;el.textContent=file.name;}else el.controls=true;box.append(el);parent.append(box);}
function render(){for(const url of urls)URL.revokeObjectURL(url);urls=[];const area=$('jMessages');area.replaceChildren();if(!conversation.messages.length){const empty=node('div');empty.className='j-empty';empty.append(node('h2','What would you like to create?'));area.append(empty);}
 for(const m of conversation.messages){const item=node('article');item.className='j-message '+m.role;item.append(node('strong',m.role==='user'?'YOU':'JARVIS'),node('div',m.text));if(m.role==='assistant'&&m.limitReached===true){const pricing=node('a','View Pricing');pricing.href='pricing.html';pricing.style.cssText='display:inline-block;margin-top:10px;padding:10px 14px;border:1px solid #fff;border-radius:8px;color:#fff;font-weight:700';item.append(pricing);}for(const f of m.files||[])showFile(item,f);
 if(m.role==='assistant'&&m.toolAction){
  const action=m.toolAction,valid=ACTION_ROUTES[action.target]===action.url;
  if(valid&&action.kind==='navigate'){
     const link=node('button',({ru:'Открыть прямо здесь ↗',en:'Open right here ↗',fr:'Ouvrir ici ↗',es:'Abrir aquí ↗'}[getJarvixLanguage()]||'Open right here ↗'));
     link.type='button';
     link.className='j-tool-open-btn';
     link.onclick=()=>openWorkspace(action.url,action.target);
     item.append(link);
    }
  if(valid&&action.kind==='prepare-studio'&&['image','video','audio'].includes(action.target)&&typeof action.prompt==='string'&&action.prompt.trim()){
   const button=node('button',({ru:'Продолжить в Studio',en:'Continue in Studio',fr:'Continuer dans Studio',es:'Continuar en Studio'}[getJarvixLanguage()]||'Continue in Studio'));button.type='button';
   button.onclick=async()=>{try{store.guard();await saveStudioHandoff({kind:action.target==='audio'?'music':action.target,prompt:action.prompt,settings:action.ratio?{ratio:action.ratio}:{},source:'jarvix-chat'});store.guard();location.assign(action.url);}catch(e){status(e.message);}};
   item.append(button);
  }
 }
 if(m.jobId){item.append(node('small',(m.status||'processing')+(m.demo?' · TEST demo, not generated AI content':'')));if(m.resultFile instanceof Blob){const media=URL.createObjectURL(m.resultFile);urls.push(media);const el=node(m.kind==='video'?'video':m.kind==='audio'?'audio':'img');el.src=media;if(el.tagName==='IMG')el.alt=m.text;else el.controls=true;item.append(el);const download=node('a','Download');download.href=media;download.download='deepsyq-'+m.jobId+'.'+mediaExtension(m.resultFile.type);item.append(download);if(['image/png','image/jpeg','video/mp4','audio/wav','audio/mpeg'].includes(m.resultFile.type)){const reuse=node('button','Use as attachment');reuse.type='button';reuse.onclick=()=>{try{store.guard();composer.add(new File([m.resultFile],'result-'+m.jobId+'.'+mediaExtension(m.resultFile.type),{type:m.resultFile.type}));status('Attached to your next message. Choose a mode with +.');}catch(e){status(e.message);}};item.append(reuse);}}else if(m.status==='ready'){item.append(node('p',m.mediaExpired?'This older TEST result has expired. Your message is preserved; create a new demo to replace it.':'Saving result on this device…'));}
 if(m.status!=='ready'&&m.status!=='failed'){const check=node('button','Check task');check.type='button';check.onclick=()=>run(()=>poll(m));item.append(check);}}
 if(m.status==='pending'||(m.role==='user'&&m.status==='processing')||m.status==='interrupted'||m.status==='error'){const retry=node('button',m.status==='error'?'Retry':'Continue');retry.type='button';retry.onclick=()=>run(()=>processMessage(m));item.append(retry);}
 area.append(item);}
 area.scrollTop=area.scrollHeight;
}
async function run(work){if(busy)return;busy=true;const version=++epoch;controller=new AbortController();$('jSend').disabled=true;$('jStop').hidden=false;try{await work();}catch(e){if(e.name!=='AbortError')status(e.message);}finally{if(version===epoch){busy=false;controller=null;$('jSend').disabled=false;$('jStop').hidden=true;render();}}}
async function poll(message){const version=epoch;for(let i=0;i<60;i++){const d=await api('/api/studio/jobs/'+encodeURIComponent(message.jobId));if(version!==epoch)return;if(d.status==='ready'&&d.mime&&!d.mime.startsWith(message.kind==='video'?'video/':message.kind==='audio'?'audio/':'image/'))throw Error('The task did not return a compatible media file.');message.status=d.status;message.mediaUrl=d.mediaUrl||d.previewUrl||null;message.demo=d.previewOnly===true;if(d.provider==='bundled-test-demo-not-ai')message.text='Bundled TEST demo video — not generated from your prompt.';message.kind=d.kind==='music'||d.kind==='voice'?'audio':d.kind||message.kind;message.text=d.status==='failed'?(d.error||'Generation failed.'):message.text;if(d.status==='ready'&&!message.resultFile){message.resultFile=await downloadResult(message.mediaUrl,{origin:location.origin,kind:message.kind,headers:headers(),signal:controller?.signal,guard:store.guard});message.mediaExpired=false;}await save();render();if(['ready','failed','canceled'].includes(d.status))return;await new Promise(r=>setTimeout(r,1500));}status('Still processing. Use Check task later; your task has been saved.');}
async function restoreResults(){
 const selected=conversation;let changed=false;
 for(const message of selected.messages){
  if(message.status!=='ready'||message.resultFile||message.mediaExpired||!message.mediaUrl)continue;
  try{message.resultFile=await downloadResult(message.mediaUrl,{origin:location.origin,kind:message.kind,headers:headers(),guard:store.guard});}
  catch{store.guard();message.mediaExpired=true;message.mediaUrl=null;}
  changed=true;
 }
 if(changed){await store.save(selected);if(conversation.id===selected.id){await historyList();render();}}
}
async function processMessage(message){
 message.status='processing';await save();render();
 try{
  // Use the same allowlisted local tool router as the voice sphere.
  // Opening an existing page or preparing a Studio prompt costs 0 AI credits.
  const command=message.mode==='auto'&&!(message.files||[]).length?extractAction(message.text):null;
  if(command?.intent==='NAVIGATE'){
   const label=({ru:'Открываю раздел DEEPSYQ.',en:'Opening the DEEPSYQ section.',fr:'Ouverture de la section DEEPSYQ.',es:'Abriendo la sección DEEPSYQ.'})[getJarvixLanguage()]||'Opening the DEEPSYQ section.';
   const response={id:makeId(),role:'assistant',text:label,toolAction:{kind:'navigate',target:command.target,url:command.url},createdAt:Date.now()};
   message.status='sent';conversation.messages.push(response);await save();render();store.guard();location.assign(command.url);return;
  }
  if(command?.intent==='GENERATE_MEDIA'&&command.raw_prompt){
   const label=({ru:'Подготовил запрос для Studio. Откройте студию и проверьте модель и стоимость перед созданием. Генерация и списание кредитов не запускаются автоматически.',en:'Your Studio prompt is ready. Open Studio to review the model and cost. No generation or credit charge has started.',fr:'Votre demande est prête dans Studio. Vérifiez le modèle et le coût avant de lancer. Aucun débit automatique.',es:'Tu solicitud está lista para Studio. Revisa el modelo y el coste antes de empezar. No hay cobro automático.'})[getJarvixLanguage()]||'Your Studio prompt is ready.';
   const response={id:makeId(),role:'assistant',text:label,toolAction:{kind:'prepare-studio',target:command.target,url:command.url,prompt:command.raw_prompt,ratio:command.aspect_ratio},createdAt:Date.now()};
   message.status='sent';conversation.messages.push(response);await save();render();return;
  }
  let mode=message.mode==='auto'?'text':resolveMode(message.text,message.mode);
  if(message.mode==='auto'&&mode==='text'&&/измен|сделай.*(ярче|темнее)|ещё|change|brighter|darker|modifier|cambiar/i.test(message.text)){const previous=[...conversation.messages].reverse().find(m=>m.role==='assistant'&&m.jobId);if(previous)mode=previous.kind;}
  let answer;
  if(mode==='text'){
   // Same brain endpoint and session as the voice sphere; never a second assistant.
   const textFiles=await Promise.all((message.files||[]).filter(f=>f.type==='text/plain').map(f=>f.text()));store.guard();
   const text=(message.text+(textFiles.length?'\n'+textFiles.join('\n'):'')).slice(0,2000);
   const d=await api('/api/jarvix/chat',{sessionId:conversation.sessionId,message:text,language:getJarvixLanguage()});
   answer={id:makeId(),role:'assistant',text:d.reply||'No answer received.',limitReached:d.limitReached===true,createdAt:Date.now()};
   if((message.files||[]).some(f=>f.type!=='text/plain'))answer.text+='\nMedia attachments are saved in this conversation. This text handler does not inspect their contents.';
  }else{
   config=config||await api('/api/studio/config');
   // Fail closed outside the isolated zero-spend preview. Production launch remains in Studio's existing consent/payment flow.
   if(config.previewOnly!==true||config.outputMode!=='local-demo'){
   // Production: hand the prompt to the ORIGINAL Studio controller inside this
   // same JARVIX page. The Studio still requires login, quote and user consent.
   if((message.files||[]).some(f=>!['image/png','image/jpeg'].includes(f.type)))throw Error('Studio accepts photo references only. Please choose PNG or JPG.');
   await saveStudioHandoff({kind:mode==='audio'?'music':mode,prompt:message.text,files:message.files||[],source:'jarvix-chat'});
   openWorkspace('generate-studio.html?studio='+mode+'&embedded=1&handoff='+encodeURIComponent(message.id),'JARVIX '+mode.toUpperCase());
   const notice={id:makeId(),role:'assistant',text:'The '+mode+' editor is open here in JARVIX. Review the selected AI model, credit cost and consent before creating.',createdAt:Date.now()};
   message.status='sent';conversation.messages.push(notice);await save();render();return;
  }
   if(message.files?.length)throw Error('TEST demo models do not process reference files. Files are preserved; open this request in Studio to choose a compatible model.');
   const kind=mode==='audio'?'music':mode,model=message.action?resolveActionModel(message.action,config.models):(config.models||[]).find(m=>m.enabled&&m.kind===kind);
   if(!model)throw Error('No model is available for this mode.');
   const parameters=message.action?{...(message.action.aspect_ratio?{ratio:message.action.aspect_ratio}:{}),...(message.action.duration?{videoDuration:message.action.duration}:{})}:{};
   const quote=await api('/api/studio/estimate',{kind,model:model.id,quantity:1,...parameters});
   if(quote.previewOnly!==true||Number(quote.credits)!==0||Number(quote.cost)!==0)throw Error('Zero-cost TEST estimate could not be verified.');
   const d=await api('/api/studio/jobs',{kind,model:model.id,prompt:message.text,quantity:1,requestId:message.id,consent:false,...parameters});
   if(message.voiceAction)speakJarvis({ru:'Запустил',en:'Started',fr:'Lancé',es:'Iniciado'}[getJarvixLanguage()]||'Started');
   answer={id:makeId(),role:'assistant',text:'TEST demonstration result · '+mode,jobId:d.jobId||d.id,status:d.status,kind:mode,demo:true,createdAt:Date.now()};
  }
  message.status='sent';conversation.messages.push(answer);await save();render();if(answer.jobId)await poll(answer);
 }catch(e){message.status=message.status==='sent'?'sent':e.name==='AbortError'?'interrupted':'error';message.error=e.message;await save();if(e.name!=='AbortError'){
   status(e.message);if(message.voiceAction)speakJarvis(/credit|balance/i.test(e.message)?'Недостаточно кредитов':'Уточните промпт');const link=node('button','Open request in Studio');link.type='button';link.onclick=async()=>{const mode=resolveMode(message.text,message.mode),kind=mode==='audio'?'music':mode==='text'?'image':mode;const files=(message.files||[]).filter(f=>['image/png','image/jpeg'].includes(f.type)&&f.size<=1024*1024);try{await saveStudioHandoff({kind,prompt:message.text,files,source:'jarvix-chat'});location.assign('generate-studio.html?studio='+(kind==='music'?'audio':kind));}catch(e){status(e.message);}};$('jStatus').append(link);
  }if(e.name==='AbortError')throw e;}
}
const composer=bindComposer({form:$('jChatForm'),input:$('jInput'),onError:status,onMode:(mode)=>selectJarvixMode(mode,{fromComposer:true}),onSend:async({text,mode,files})=>{if(busy)return;try{store.guard();const m={id:makeId(),role:'user',text,mode,files,status:'pending',createdAt:Date.now()};if(!conversation.messages.length)conversation.title=text.slice(0,60);conversation.messages.push(m);await save();composer.clear();render();await run(()=>processMessage(m));}catch(e){status(e.message);}}});
/* All Creation sidebar choices now switch ONE JARVIX conversation. The original
   Studio keeps its own model, quote, consent and generation handlers as an
   attached tool pane; it is never replaced by a second JARVIX chat. */
function selectJarvixMode(next,{fromComposer=false,writeUrl=true}={}){
 const mode=['image','video','audio'].includes(next)?next:'auto';
 if(!fromComposer)composer.setMode(mode);
 const selected=mode==='auto'?'JARVIX':mode[0].toUpperCase()+mode.slice(1);
 const heading=$('jChatHeading')||document.querySelector('.j-chat-toolbar h1');
 if(heading)heading.textContent=mode==='auto'?'JARVIX Chat':'JARVIX '+selected;
 document.title=mode==='auto'?'JARVIX Chat · Deepsyq':'JARVIX '+selected+' · Deepsyq';
 document.body.dataset.jarvixMode=mode;
 const aside=document.querySelector('#dsSiteSidebar,#sidebar');
 if(aside)for(const a of aside.querySelectorAll('a[href]')){
  const u=new URL(a.href,location.href);
  if(!u.pathname.endsWith('/jarvix-chat.html'))continue;
  const key=u.searchParams.get('mode')||'auto';
  if(key===mode)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
 }
 if(mode==='auto'){
  $('jWorkspacePane').hidden=true;
  $('jWorkspaceFrame').src='about:blank';
  document.body.classList.remove('has-chat-workspace');
 }else if(!fromComposer||!$('jWorkspacePane').hidden){
  const target='generate-studio.html?studio='+mode+'&embedded=1';
  openWorkspace(target,'JARVIX '+selected);
 }
 if(writeUrl){
  const u=new URL(location.href);
  if(mode==='auto')u.searchParams.delete('mode');else u.searchParams.set('mode',mode);
  if(u.href!==location.href)history.pushState({jarvixMode:mode},'',u.pathname+u.search+u.hash);
 }
}
// Same-page changes keep the exact conversation ID, messages and session; no
// navigation to a competing chat, including when clicking JARVIX itself.
document.addEventListener('click',e=>{
 if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
 const anchor=e.target.closest?.('a[href]');if(!anchor||anchor.target==='_blank')return;
 const u=new URL(anchor.href,location.href);
 if(u.origin!==location.origin||!u.pathname.endsWith('/jarvix-chat.html'))return;
 e.preventDefault();e.stopPropagation();
 selectJarvixMode(u.searchParams.get('mode')||'auto');
},true);
window.addEventListener('popstate',()=>selectJarvixMode(new URLSearchParams(location.search).get('mode')||'auto',{writeUrl:false}));

$('jStop').onclick=()=>{controller?.abort();$('jStop').hidden=true;status('Browser waiting stopped. Already submitted generation tasks are not cancelled.');};
$('jNew').onclick=async()=>{if(busy)return;conversation=store.create('jarvix-'+makeId());sessionStorage.setItem('jarvix_session_id',conversation.sessionId);sessionStorage.setItem('jarvix_active_conversation',conversation.id);await save();render();};
$('jHistory').onchange=async()=>{if(busy)return;const next=await store.get($('jHistory').value);if(!next)return;conversation=next;sessionStorage.setItem('jarvix_session_id',conversation.sessionId);sessionStorage.setItem('jarvix_active_conversation',conversation.id);await historyList();render();await restoreResults();};
function freeze(){try{store.guard();}catch{++epoch;controller?.abort();composer.stop();for(const u of urls)URL.revokeObjectURL(u);$('jMessages').replaceChildren();$('jChatForm').hidden=true;status('Account changed. Reload to open the correct private conversations.');}}
window.addEventListener('storage',freeze);window.addEventListener('focus',freeze);window.addEventListener('pageshow',freeze);
const requestedNew=new URLSearchParams(location.search).get('new')==='1';if(requestedNew){const clean=new URL(location.href);clean.searchParams.delete('new');history.replaceState(null,'',clean.pathname+clean.search+clean.hash);sessionStorage.removeItem('jarvix_active_conversation');}conversation=(requestedNew?null:await store.get(sessionStorage.getItem('jarvix_active_conversation')))||store.create(requestedNew?'jarvix-'+makeId():getJarvixSessionId());sessionStorage.setItem('jarvix_active_conversation',conversation.id);sessionStorage.setItem('jarvix_session_id',conversation.sessionId);await save();render();trackViewport();await restoreResults();
const pending=conversation.messages.find(m=>m.status==='pending');if(pending)await run(()=>processMessage(pending));

window.addEventListener('jarvix:conversation-updated',async()=>{if(busy)return;const next=await store.get(sessionStorage.getItem('jarvix_active_conversation'));if(!next)return;conversation=next;render();const pending=conversation.messages.find(m=>m.status==='pending');if(pending)await run(()=>processMessage(pending));});

if ($('jWorkspaceClose')) $('jWorkspaceClose').onclick = () => selectJarvixMode('auto');

// Listen for limit-reached event from jarvis-core
window.addEventListener('jarvis:limit-reached', async (e) => {
  if (!conversation) return;
  conversation.messages.push({
    id: makeId(),
    role: 'assistant',
    text: e.detail?.text || 'Бесплатный 5-минутный лимит живого голосового общения исчерпан. Оформите подписку в разделе Тарифы для неограниченного доступа к Джарвису.',
    limitReached: true,
    createdAt: Date.now()
  });
  await save();
  render();
});

// Resolve URL mode first, falling back to the Home quick-composer selection.
try{
 const p=new URLSearchParams(location.search),requested=p.get('mode');
 const previous=sessionStorage.getItem('jarvix_composer_mode');
 selectJarvixMode(requested||previous||'auto',{writeUrl:false});
}catch{selectJarvixMode('auto',{writeUrl:false});}

// Auto-open tool if specified in URL query
try {
  const initialTool = new URLSearchParams(location.search).get('tool');
  if (initialTool) {
    setTimeout(() => openWorkspace(initialTool), 300);
  }
} catch (_) {}
