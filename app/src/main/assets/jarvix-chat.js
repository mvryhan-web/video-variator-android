
export function openWorkspace(url, title = 'Everyday Tool') {
  const pane = $('jWorkspacePane'), frame = $('jWorkspaceFrame'), headTitle = $('jWorkspaceTitle'), popout = $('jWorkspacePopout');
  if (!pane || !frame) {
    location.assign(url);
    return;
  }
  let targetUrl = url;
  if (targetUrl === 'index.html' || targetUrl === 'video-uniquifier-app.html' || targetUrl === 'video-uniquifier.html') {
    targetUrl = 'video-uniquifier.html?embed=chat';
  }
  const titleMap = {
    'index.html': 'Video Uniquifier',
    'video-uniquifier.html': 'Video Uniquifier',
    'video-uniquifier-app.html': 'Video Uniquifier',
    'free-tools.html': 'Everyday Tools',
    'free-tools.html#compress-photos': 'Compress Photos',
    'free-tools.html#compress-video': 'Compress Video',
    'avatar-studio.html': 'Avatar Studio',
    'teleprompter.html': 'Teleprompter',
    'audio-studio.html': 'Audio Studio',
    'canvas.html': 'Canvas'
  };
  frame.src = targetUrl;
  if (headTitle) headTitle.textContent = titleMap[url] || titleMap[targetUrl] || title;
  if (popout) popout.href = targetUrl;
  pane.hidden = false;
  document.body.classList.add('has-chat-workspace');
}
window.openWorkspace = openWorkspace;
import {ACTION_ROUTES,extractAction,resolveActionModel} from './jarvix-action-plan.js';
import {downloadResult,mediaExtension} from './jarvix-result-cache.js';
import {makeId,conversationStore,resolveMode} from './jarvix-conversations.js';
import {bindComposer,trackViewport} from './jarvix-composer.js';
import {getJarvixSessionId,getJarvixLanguage,speakJarvis} from './jarvis-core.js';
import {findCatalogReply} from './jarvix-clip-library.js';
import {hasVerifiedJarvixSubscription} from './jarvix-access.js';
import {saveStudioHandoff, takeStudioHandoff} from './studio-handoff.js';
const $=id=>document.getElementById(id),status=text=>$('jStatus').textContent=text;
const store=await conversationStore();let conversation=null,busy=false,epoch=0,controller=null,config=null,urls=[];
const headers=()=>({'Content-Type':'application/json',...(localStorage.getItem('vv_token')?{Authorization:'Bearer '+localStorage.getItem('vv_token')}:{})});
async function api(path,body){store.guard();const r=await fetch(path,{method:body?'POST':'GET',headers:headers(),cache:'no-store',...(body?{body:JSON.stringify(body)}:{}),signal:controller?.signal});store.guard();const d=await r.json();if(!r.ok)throw Error(d.message||d.error||'Request failed');return d;}
async function save(){conversation=await store.save(conversation);await historyList();}
async function historyList(){const rows=await store.list();$('jHistory').replaceChildren();for(const r of rows){const o=document.createElement('option');o.value=r.id;o.textContent=r.title;o.selected=r.id===conversation?.id;$('jHistory').append(o);}}
const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
function showFile(parent,file){const box=node('div'),url=URL.createObjectURL(file);urls.push(url);const el=node(file.type.startsWith('image/')?'img':file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':'a');el.src=url;if(el.tagName==='IMG')el.alt=file.name||'Attachment';else if(el.tagName==='A'){el.href=url;el.download=file.name;el.textContent=file.name;}else el.controls=true;box.append(el);parent.append(box);}

function createMessageFooter(m, item){
 if(!m.text||typeof m.text!=='string'||!m.text.trim())return null;
 const footer=node('div');
 footer.className='j-msg-footer';
 const lang=typeof getJarvixLanguage==='function'?getJarvixLanguage():'ru';
 const i18n={
  ru:{copy:'Копировать',copied:'Скопировано',edit:'Редактировать',save:'Отправить',cancel:'Отмена'},
  en:{copy:'Copy',copied:'Copied',edit:'Edit',save:'Send',cancel:'Cancel'},
  fr:{copy:'Copier',copied:'Copié',edit:'Modifier',save:'Envoyer',cancel:'Annuler'},
  es:{copy:'Copiar',copied:'Copiado',edit:'Editar',save:'Enviar',cancel:'Cancelar'}
 }[lang]||{copy:'Копировать',copied:'Скопировано',edit:'Редактировать',save:'Отправить',cancel:'Отмена'};

 if(m.role==='user'){
  const editBtn=node('button');
  editBtn.type='button';
  editBtn.className='j-msg-action-btn j-edit-btn';
  editBtn.title=i18n.edit;
  editBtn.setAttribute('aria-label',i18n.edit);
  editBtn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> <span>'+i18n.edit+'</span>';
  editBtn.onclick=(e)=>{
   e.stopPropagation();
   if(item.querySelector('.j-inline-edit'))return;
   const contentDiv=item.querySelector('.j-message-content')||item.firstElementChild;
   const origDisp=contentDiv?contentDiv.style.display:'';
   if(contentDiv)contentDiv.style.display='none';
   footer.style.display='none';

   const bottomInp=$('jInput');
   if(bottomInp){bottomInp.value=m.text;bottomInp.dispatchEvent(new Event('input',{bubbles:true}));}

   const editWrap=node('div');
   editWrap.className='j-inline-edit';
   const ta=document.createElement('textarea');
   ta.className='j-edit-textarea';
   ta.value=m.text;
   ta.rows=Math.min(8,Math.max(2,(m.text.split('\n').length||1)+1));

   const actions=node('div');
   actions.className='j-edit-actions';
   const saveBtn=node('button');
   saveBtn.type='button';
   saveBtn.className='j-edit-save-btn';
   saveBtn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>'+i18n.save+'</span>';
   const cancelBtn=node('button');
   cancelBtn.type='button';
   cancelBtn.className='j-edit-cancel-btn';
   cancelBtn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> <span>'+i18n.cancel+'</span>';

   cancelBtn.onclick=(ce)=>{
    ce.stopPropagation();
    editWrap.remove();
    if(contentDiv)contentDiv.style.display=origDisp;
    footer.style.display='flex';
   };

   saveBtn.onclick=async(se)=>{
    se.stopPropagation();
    const newText=ta.value.trim();
    if(!newText||busy)return;
    m.text=newText;
    m.status='pending';
    const idx=conversation.messages.indexOf(m);
    if(idx!==-1&&idx+1<conversation.messages.length&&conversation.messages[idx+1].role==='assistant'){
     conversation.messages.splice(idx+1,1);
    }
    await save();
    render();
    await run(()=>processMessage(m));
   };

   actions.append(saveBtn,cancelBtn);
   editWrap.append(ta,actions);
   item.insertBefore(editWrap,footer);
   ta.focus();
   ta.setSelectionRange(ta.value.length,ta.value.length);
  };
  footer.append(editBtn);
 }

 const copyBtn=node('button');
 copyBtn.type='button';
 copyBtn.className='j-msg-action-btn j-copy-btn';
 copyBtn.title=i18n.copy;
 copyBtn.setAttribute('aria-label',i18n.copy);
 const iconCopy='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
 const iconDone='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
 copyBtn.innerHTML=iconCopy+' <span>'+i18n.copy+'</span>';
 copyBtn.onclick=async(e)=>{
  e.stopPropagation();
  try{
   if(navigator.clipboard&&navigator.clipboard.writeText){
    await navigator.clipboard.writeText(m.text);
   }else{
    const temp=document.createElement('textarea');
    temp.value=m.text;
    temp.style.position='fixed';
    temp.style.opacity='0';
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
   }
   copyBtn.classList.add('copied');
   copyBtn.innerHTML=iconDone+' <span style="color:#4ade80">'+i18n.copied+'</span>';
   setTimeout(()=>{
    copyBtn.classList.remove('copied');
    copyBtn.innerHTML=iconCopy+' <span>'+i18n.copy+'</span>';
   },2000);
  }catch(_){}
 };
 footer.append(copyBtn);
 return footer;
}

function render(){for(const url of urls)URL.revokeObjectURL(url);urls=[];const area=$('jMessages');area.replaceChildren();if(!conversation.messages.length){const empty=node('div');empty.className='j-empty';empty.append(node('h2','What would you like to create?'));area.append(empty);}
 for(const m of conversation.messages){const item=node('article');item.className='j-message '+m.role;const content=node('div',m.text);content.className='j-message-content';item.append(content);const footer=createMessageFooter(m,item);if(footer)item.append(footer);if(m.role==='assistant'&&m.limitReached===true){const pricing=node('a','View Pricing');pricing.href='pricing.html';pricing.style.cssText='display:inline-block;margin-top:10px;padding:10px 14px;border:1px solid #fff;border-radius:8px;color:#fff;font-weight:700';item.append(pricing);}for(const f of m.files||[])showFile(item,f);
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
 if(m.jobId){item.append(node('small',(m.status||'processing')+(m.demo?' · AI Generation':'')));const mediaSrc=(m.resultFile instanceof Blob)?URL.createObjectURL(m.resultFile):(m.status==='ready'?m.mediaUrl:null);if(mediaSrc){if(m.resultFile instanceof Blob)urls.push(mediaSrc);const el=node(m.kind==='video'?'video':m.kind==='audio'?'audio':'img');el.src=mediaSrc;if(el.tagName==='IMG')el.alt=m.text||'Media';else el.controls=true;item.append(el);const download=node('a',({ru:'Скачать',en:'Download'}[getJarvixLanguage()]||'Download'));download.href=mediaSrc;download.download='deepsyq-'+m.jobId+(m.resultFile?.type?('.'+mediaExtension(m.resultFile.type)):'');download.target='_blank';item.append(download);if(m.resultFile instanceof Blob&&['image/png','image/jpeg','video/mp4','audio/wav','audio/mpeg'].includes(m.resultFile.type)){const reuse=node('button',({ru:'Прикрепить к сообщению',en:'Use as attachment'}[getJarvixLanguage()]||'Use as attachment'));reuse.type='button';reuse.onclick=()=>{try{store.guard();composer.add(new File([m.resultFile],'result-'+m.jobId+'.'+mediaExtension(m.resultFile.type),{type:m.resultFile.type}));status('Прикреплено к сообщению');}catch(e){status(e.message);}};item.append(reuse);}}else if(m.status==='ready'){item.append(node('p',m.mediaExpired?'This older result has expired. Your message is preserved; create a new creation to replace it.':'Saving result on this device…'));}
 if(m.status!=='ready'&&m.status!=='failed'){const check=node('button','Check task');check.type='button';check.onclick=()=>run(()=>poll(m));item.append(check);}}
 if(m.status==='pending'||(m.role==='user'&&m.status==='processing')||m.status==='interrupted'||m.status==='error'){const retry=node('button',m.status==='error'?'Retry':'Continue');retry.type='button';retry.onclick=()=>run(()=>processMessage(m));item.append(retry);}
 area.append(item);}
 area.scrollTop=area.scrollHeight;
}
async function run(work){if(busy)return;busy=true;const version=++epoch;controller=new AbortController();$('jSend').disabled=true;$('jStop').hidden=false;try{await work();}catch(e){if(e.name!=='AbortError')status(e.message);}finally{if(version===epoch){busy=false;controller=null;$('jSend').disabled=false;$('jStop').hidden=true;render();}}}
async function poll(message){const version=epoch;for(let i=0;i<60;i++){const d=await api('/api/studio/jobs/'+encodeURIComponent(message.jobId));if(version!==epoch)return;if(d.status==='ready'&&d.mime&&!d.mime.startsWith(message.kind==='video'?'video/':message.kind==='audio'?'audio/':'image/'))throw Error('The task did not return a compatible media file.');message.status=d.status;message.mediaUrl=d.mediaUrl||d.previewUrl||null;message.demo=d.previewOnly===true;if(d.provider==='bundled-test-demo-not-ai')message.text='Bundled TEST demo video — not generated from your prompt.';message.kind=d.kind==='music'||d.kind==='voice'?'audio':d.kind||message.kind;message.text=d.status==='failed'?(d.error||'Generation failed.'):message.text;if(d.status==='ready'&&!message.resultFile&&message.mediaUrl){try{message.resultFile=await downloadResult(message.mediaUrl,{origin:location.origin,kind:message.kind,headers:headers(),signal:controller?.signal,guard:store.guard});}catch(_){}message.mediaExpired=false;}await save();render();if(['ready','failed','canceled'].includes(d.status))return;await new Promise(r=>setTimeout(r,1500));}status('Still processing. Use Check task later; your task has been saved.');}
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
   const label=({ru:'Открываю инструмент прямо здесь в чате.',en:'Opening the DEEPSYQ section.',fr:'Ouverture de la section DEEPSYQ.',es:'Abriendo la sección DEEPSYQ.'})[getJarvixLanguage()]||'Opening the DEEPSYQ section.';
   const response={id:makeId(),role:'assistant',text:label,toolAction:{kind:'navigate',target:command.target,url:command.url},createdAt:Date.now()};
   message.status='sent';conversation.messages.push(response);await save();render();store.guard();openWorkspace(command.url,command.target);return;
  }
  if(command?.intent==='GENERATE_MEDIA'&&command.raw_prompt){
   const label=({ru:'Подготовил запрос для Studio. Откройте студию и проверьте модель и стоимость перед созданием. Генерация и списание кредитов не запускаются автоматически.',en:'Your Studio prompt is ready. Open Studio to review the model and cost. No generation or credit charge has started.',fr:'Votre demande est prête dans Studio. Vérifiez le modèle et le coût avant de lancer. Aucun débit automatique.',es:'Tu solicitud está lista para Studio. Revisa el modelo y el coste antes de empezar. No hay cobro automático.'})[getJarvixLanguage()]||'Your Studio prompt is ready.';
   const response={id:makeId(),role:'assistant',text:label,toolAction:{kind:'prepare-studio',target:command.target,url:command.url,prompt:command.raw_prompt,ratio:command.aspect_ratio},createdAt:Date.now()};
   message.status='sent';conversation.messages.push(response);await save();render();return;
  }
  let mode=resolveMode(message.text,message.mode);
  if(['image','video','audio'].includes(mode))setChatHeaderMode(mode);
  if(message.mode==='auto'&&mode==='text'&&/измен|сделай.*(ярче|темнее)|ещё|change|brighter|darker|modifier|cambiar/i.test(message.text)){const previous=[...conversation.messages].reverse().find(m=>m.role==='assistant'&&m.jobId);if(previous)mode=previous.kind;}
  let answer;
  const rawText = String(message.text || '').trim();
  const isQuestion = rawText.includes('?') || /^(привет|здравствуй|хай|ку|салют|hello|hi|hey|как|что|почему|зачем|расскажи|посоветуй|помоги|объясни|who|what|how|why|can you|tell me|help)/i.test(rawText);
  const isExplicitGen = /^(сгенерируй|нарисуй|создай|сделай|generate|create|draw|make|render)\b/i.test(rawText);
  const shouldGenerateMedia = ['image','video','audio'].includes(mode) && (!isQuestion || isExplicitGen);

  if(!shouldGenerateMedia){
   // Google Gemini is the default conversational model across all chat modes
   const textFiles=await Promise.all((message.files||[]).filter(f=>f.type==='text/plain').map(f=>f.text()));store.guard();
   const text=(message.text+(textFiles.length?'\n'+textFiles.join('\n'):'')).slice(0,3000);
   const d=await api('/api/jarvix/chat',{sessionId:conversation.sessionId,message:text,language:getJarvixLanguage()});
   answer={id:makeId(),role:'assistant',text:d.reply||'No answer received.',limitReached:false,createdAt:Date.now()};
   if((message.files||[]).some(f=>f.type!=='text/plain'))answer.text+='\nMedia attachments are saved in this conversation.';
  }else{
   config=config||await api('/api/studio/config');
   // Fail closed outside the isolated zero-spend preview. Production launch remains in Studio's existing consent/payment flow.
   if(config.previewOnly!==true||config.outputMode!=='local-demo')throw Error('Generation here is limited to TEST demo mode. Open the existing Studio to review model, consent and cost.');
   const kind=mode==='audio'?'music':mode,model=message.action?resolveActionModel(message.action,config.models):(config.models||[]).find(m=>m.enabled&&m.kind===kind);
   if(!model)throw Error('No model is available for this mode.');
   const parameters=message.action?{...(message.action.aspect_ratio?{ratio:message.action.aspect_ratio}:{}),...(message.action.duration?{videoDuration:message.action.duration}:{})}:{};
   const quote=await api('/api/studio/estimate',{kind,model:model.id,quantity:1,...parameters});
   if(quote.previewOnly!==true||Number(quote.cost)!==0)throw Error('Zero-cost TEST estimate could not be verified.');
   const d=await api('/api/studio/jobs',{kind,model:model.id,prompt:message.text,quantity:1,requestId:message.id,consent:false,...parameters});
   if(message.voiceAction)speakJarvis({ru:'Запустил',en:'Started',fr:'Lancé',es:'Iniciado'}[getJarvixLanguage()]||'Started');
   const resultLabel = ({ru:'Результат генерации · ',en:'Generation result · ',fr:'Résultat de génération · ',es:'Resultado de generación · '}[getJarvixLanguage()]||'Generation result · ') + mode;
   answer={id:makeId(),role:'assistant',text:resultLabel,jobId:d.jobId||d.id,status:d.status,kind:mode,demo:false,createdAt:Date.now()};
  }
  message.status='sent';conversation.messages.push(answer);await save();render();if(answer.jobId)await poll(answer);
 }catch(e){message.status=message.status==='sent'?'sent':e.name==='AbortError'?'interrupted':'error';message.error=e.message;await save();if(e.name!=='AbortError'){
   status(e.message);if(message.voiceAction)speakJarvis(/credit|balance/i.test(e.message)?'Недостаточно кредитов':'Уточните промпт');const link=node('button','Open request in Studio');link.type='button';link.onclick=async()=>{const mode=resolveMode(message.text,message.mode),kind=mode==='audio'?'music':mode==='text'?'image':mode;const files=(message.files||[]).filter(f=>['image/png','image/jpeg'].includes(f.type)&&f.size<=1024*1024);try{await saveStudioHandoff({kind,prompt:message.text,files,source:'jarvix-chat'});location.assign('jarvix-chat.html?mode='+(kind==='music'?'audio':kind)+'&prompt='+encodeURIComponent(message.text||''));}catch(e){status(e.message);}};$('jStatus').append(link);
  }if(e.name==='AbortError')throw e;}
}
const composer=bindComposer({form:$('jChatForm'),input:$('jInput'),onError:status,onSend:async({text,mode,files})=>{if(busy)return;try{store.guard();const m={id:makeId(),role:'user',text,mode,files,status:'pending',createdAt:Date.now()};if(!conversation.messages.length)conversation.title=text.slice(0,60);conversation.messages.push(m);await save();composer.clear();render();await run(()=>processMessage(m));}catch(e){status(e.message);}}});
$('jStop').onclick=()=>{controller?.abort();$('jStop').hidden=true;status('Browser waiting stopped. Already submitted generation tasks are not cancelled.');};
function resetToDefaultChat(startNew = true, preserveMode = false) {
  if (startNew && busy) return;
  try {
    const activeMode = preserveMode ? (sessionStorage.getItem('jarvix_composer_mode') || 'auto') : 'auto';
    if (!preserveMode) sessionStorage.removeItem('jarvix_composer_mode');
    setChatHeaderMode(activeMode);
    window.dispatchEvent(new CustomEvent('jarvix:mode', { detail: { mode: activeMode } }));
  } catch(err){}
  if (typeof minimizeWorkspace === 'function') minimizeWorkspace();
  if (startNew) {
    // A fresh conversation starts INSIDE the current JARVIX pane; there is no navigation.
    // Do not persist an empty conversation. The existing send handler saves its first message.
    conversation = store.create('jarvix-' + makeId());
    sessionStorage.setItem('jarvix_session_id', conversation.sessionId);
    sessionStorage.setItem('jarvix_active_conversation', conversation.id);
    composer.clear();
    setChatHeaderMode('auto');
    status('');
    render();
    historyList().catch(() => {});
  }
}
window.resetToDefaultChat = resetToDefaultChat;
window.addEventListener('jarvix:reset-chat', () => resetToDefaultChat(true, false));

$('jNew').onclick = () => resetToDefaultChat(true, false);
$('jHistory').onchange=async()=>{if(busy)return;const next=await store.get($('jHistory').value);if(!next)return;conversation=next;sessionStorage.setItem('jarvix_session_id',conversation.sessionId);sessionStorage.setItem('jarvix_active_conversation',conversation.id);render();await restoreResults();};
function freeze(){try{store.guard();}catch{++epoch;controller?.abort();composer.stop();for(const u of urls)URL.revokeObjectURL(u);$('jMessages').replaceChildren();$('jChatForm').hidden=true;status('Account changed. Reload to open the correct private conversations.');}}
window.addEventListener('storage',freeze);window.addEventListener('focus',freeze);window.addEventListener('pageshow',freeze);
conversation=await store.get(sessionStorage.getItem('jarvix_active_conversation'))||store.create(getJarvixSessionId());sessionStorage.setItem('jarvix_active_conversation',conversation.id);if(conversation.messages.length)await save();else await historyList();render();trackViewport();watchChatViewport();await restoreResults();

function sizeChatToVisibleViewport() {
  const root = document.querySelector('main.jarvix-chat');
  if (!root) return;
  const visible = window.visualViewport;
  const bottom = (visible?.offsetTop || 0) + (visible?.height || window.innerHeight);
  const top = root.getBoundingClientRect().top;
  // Subtract the actual platform header rather than assuming 132px or 156px.
  // Reserve a small bottom margin, including when the mobile keyboard is open.
  const height = Math.max(200, Math.floor(bottom - top - 10));
  root.style.setProperty('--j-chat-available-height', height + 'px');
  // The mobile history uses ~62% of width, never a half-height chat takeover.
}
function watchChatViewport() {
  const update = () => requestAnimationFrame(sizeChatToVisibleViewport);
  update();
  window.addEventListener('resize', update, { passive: true });
  window.visualViewport?.addEventListener('resize', update, { passive: true });
  window.visualViewport?.addEventListener('scroll', update, { passive: true });
  window.addEventListener('pageshow', update);
  document.fonts?.ready.then(update).catch(() => {});
}
watchChatViewport();

const pending=conversation.messages.find(m=>m.status==='pending');if(pending)await run(()=>processMessage(pending));

window.addEventListener('jarvix:conversation-updated',async()=>{if(busy)return;const next=await store.get(sessionStorage.getItem('jarvix_active_conversation'));if(!next)return;conversation=next;render();const pending=conversation.messages.find(m=>m.status==='pending');if(pending)await run(()=>processMessage(pending));});

const modeHeaderLabels={
  ru:{text:'Чат',auto:'Чат',image:'Изображения',video:'Видео',audio:'Аудио',music:'Аудио'},
  en:{text:'Chat',auto:'Chat',image:'Image',video:'Video',audio:'Audio',music:'Audio'},
  fr:{text:'Chat',auto:'Chat',image:'Image',video:'Vidéo',audio:'Audio',music:'Audio'},
  es:{text:'Chat',auto:'Chat',image:'Imagen',video:'Vídeo',audio:'Audio',music:'Audio'}
};
function setChatHeaderMode(m){
  const norm=m==='music'?'audio':(m||'auto');
  let lang='ru';try{lang=(localStorage.getItem('deepsyq_home_language')||document.documentElement.lang||'ru').slice(0,2)}catch{}
  const dict=modeHeaderLabels[lang]||modeHeaderLabels.ru;
  const display=dict[norm]||dict.auto;
  const labelEl=$('jActiveModeLabel');
  if(labelEl){labelEl.textContent=display;labelEl.dataset.mode=norm;}
  const heading=$('jDrawerHeading');
  if(heading)heading.textContent='JARVIX '+display;
}

window.addEventListener('jarvix:mode',e=>{if(e.detail?.mode)setChatHeaderMode(e.detail.mode);});
window.addEventListener('deepsyq:lang',()=>setChatHeaderMode($('jActiveModeLabel')?.dataset.mode||'auto'));
try {
  const _sp = new URLSearchParams(location.search);
  const _initMode = _sp.get('mode') || _sp.get('studio');
  if (_initMode) {
    const _norm = _initMode.toLowerCase() === 'music' ? 'audio' : _initMode.toLowerCase();
    if (['video', 'audio', 'image'].includes(_norm)) {
      sessionStorage.setItem('jarvix_composer_mode', _norm);
      setChatHeaderMode(_norm);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('jarvix:mode', { detail: { mode: _norm } }));
      }, 50);
    }
  } else {
    sessionStorage.removeItem('jarvix_composer_mode');
    setChatHeaderMode('auto');
  }
} catch (e) {}

const composerInput=$('jInput');
if(composerInput){
  composerInput.addEventListener('input',()=>{
    const val=composerInput.value.trim();
    if(!val){try{setChatHeaderMode(sessionStorage.getItem('jarvix_composer_mode')||'auto');}catch{}return;}
    const detected=resolveMode(val,'auto');
    if(['image','video','audio'].includes(detected))setChatHeaderMode(detected);
  });
}

async function applyIncomingHandoffOrTemplate() {
  let incomingPrompt = '';
  let incomingMode = '';
  let incomingFiles = [];

  try {
    const raw = sessionStorage.getItem('deepsyq_template_start');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.promptTemplate) incomingPrompt = String(parsed.promptTemplate).trim();
      if (parsed.generationType) incomingMode = parsed.generationType;
      sessionStorage.removeItem('deepsyq_template_start');
    }
  } catch (_) {}

  if (!incomingPrompt) {
    try {
      const handoff = await takeStudioHandoff();
      if (handoff) {
        if (handoff.prompt) incomingPrompt = String(handoff.prompt).trim();
        if (handoff.kind) incomingMode = handoff.kind;
        if (Array.isArray(handoff.files)) incomingFiles = handoff.files;
      }
    } catch (_) {}
  }

  if (!incomingPrompt) {
    try {
      const p = new URLSearchParams(location.search).get('prompt');
      if (p) incomingPrompt = p.trim();
    } catch (_) {}
  }

  if (incomingMode) {
    const norm = incomingMode.toLowerCase() === 'music' ? 'audio' : incomingMode.toLowerCase();
    if (['video', 'audio', 'image'].includes(norm)) {
      try {
        sessionStorage.setItem('jarvix_composer_mode', norm);
        setChatHeaderMode(norm);
        window.dispatchEvent(new CustomEvent('jarvix:mode', { detail: { mode: norm } }));
      } catch (_) {}
    }
  }

  if (incomingFiles.length && typeof composer?.add === 'function') {
    for (const f of incomingFiles) composer.add(f);
  }

  if (incomingPrompt && composerInput) {
    composerInput.value = incomingPrompt;
    composerInput.dispatchEvent(new Event('input', { bubbles: true }));
    composerInput.style.height = 'auto';
    composerInput.style.height = Math.min(composerInput.scrollHeight, 180) + 'px';
  }
}
void applyIncomingHandoffOrTemplate();

const wpPane=$('jWorkspacePane');
if(wpPane){
  let touchStartX=null,touchStartY=null;
  wpPane.addEventListener('touchstart',e=>{
    const t=e.touches?.[0];if(t){touchStartX=t.clientX;touchStartY=t.clientY;}
  },{passive:true});
  wpPane.addEventListener('touchend',e=>{
    if(touchStartX===null)return;
    const t=e.changedTouches?.[0];
    if(t){
      const dx=t.clientX-touchStartX,dy=t.clientY-touchStartY;
      if(dx<-45&&Math.abs(dx)>Math.abs(dy)){
        $('jWorkspaceClose')?.click();
      }
    }
    touchStartX=null;touchStartY=null;
  },{passive:true});
}

const expandBtn = $('jWorkspaceExpand');
if (expandBtn) {
  expandBtn.onclick = () => {
    $('jWorkspacePane')?.classList.toggle('j-workspace-expanded');
  };
}

if ($('jWorkspaceClose')) {
  $('jWorkspaceClose').onclick = () => {
    if ($('jWorkspacePane')) $('jWorkspacePane').hidden = true;
    if ($('jWorkspaceFrame')) $('jWorkspaceFrame').src = 'about:blank';
    document.body.classList.remove('has-chat-workspace');
  };
}

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

// Auto-open tool if specified in URL query
try {
  const initialTool = new URLSearchParams(location.search).get('tool');
  if (initialTool) {
    setTimeout(() => openWorkspace(initialTool), 300);
  }
} catch (_) {}



// --- ChatGPT-style Chat Dropdown under JARVIX Title ---
function initChatMenuDrawer() {
  const titleBtn = $('jChatTitleBtn');
  const dropdown = $('jChatDropdown');
  const backdrop = $('jDropdownBackdrop');
  const newBtn = $('jMenuNewChat');
  const historyListEl = $('jMenuHistoryList');
  const historyToggle = $('jDrawerHistoryToggle');
  const searchInput = $('jDrawerSearch');
  const searchToggle = $('jDrawerSearchToggle');
  const sortToggle = $('jDrawerSortToggle');
  let newestFirst = true;

  if (!titleBtn || !dropdown) return;
  const setHistoryExpanded = (expanded) => {
    if (!historyListEl) return;
    const open = Boolean(expanded);
    historyListEl.hidden = !open;
    historyToggle?.setAttribute('aria-expanded', String(open));
    historyToggle?.setAttribute('aria-label', open ? 'Свернуть список чатов' : 'Развернуть список чатов');
    if (!open && searchInput && !searchInput.hidden) {
      searchInput.hidden = true;
      searchInput.value = '';
      updateHistoryList().catch(() => {});
    }
  };
  historyToggle?.addEventListener('click', () => {
    const expand = Boolean(historyListEl?.hidden);
    setHistoryExpanded(expand);
    if (expand) updateHistoryList().catch(() => {});
  });
  searchToggle?.addEventListener('click', () => {
    if (!searchInput) return;
    searchInput.hidden = !searchInput.hidden;
    if (!searchInput.hidden) {
      setHistoryExpanded(true);
      searchInput.focus();
    } else { searchInput.value = ''; updateHistoryList().catch(() => {}); }
  });
  searchInput?.addEventListener('input', () => updateHistoryList().catch(() => {}));
  sortToggle?.addEventListener('click', () => {
    setHistoryExpanded(true);
    newestFirst = !newestFirst;
    sortToggle.setAttribute('aria-pressed', String(!newestFirst));
    sortToggle.title = newestFirst ? 'Сначала старые чаты' : 'Сначала новые чаты';
    updateHistoryList().catch(() => {});
  });
  $('jDrawerRecent')?.addEventListener('click', () => {
    setHistoryExpanded(true);
    updateHistoryList().then(() => historyListEl?.scrollTo({top:0,behavior:'smooth'})).catch(() => {});
    if(searchInput && !searchInput.hidden)searchInput.focus();
  });
  document.querySelectorAll('[data-j-drawer-mode]').forEach(button => {
    button.addEventListener('click', () => {
      const mode = button.dataset.jDrawerMode;
      closeDropdown();
      const target = document.querySelector('#jPlusMenu [data-j-mode="'+mode+'"]');
      if(target instanceof HTMLElement)target.click();
    });
  });
  $('jDrawerSettings')?.addEventListener('click', () => {
    closeDropdown();
    const gear = document.querySelector('#jChatForm .j-settings-shortcut');
    if(gear instanceof HTMLElement)gear.click();
    else status('Настройки студии сейчас недоступны.');
  });

  // Account identity is resolved from /api/me for the CURRENT session only.
  // Never infer an email from an unverified token or reuse a previous account.
  const updateDrawerAccount = async () => {
    const account = $('jDrawerAccountLink');
    if (!account) return;
    const token = localStorage.getItem('vv_token');
    const label = account.querySelector('strong');
    const subtitle = account.querySelector('small');
    const avatar = account.querySelector('.j-drawer-avatar');
    account.href = token ? 'video-uniquifier.html#profile' : 'video-uniquifier.html#signin';
    if (label) label.textContent = token ? 'Аккаунт DEEPSYQ' : 'Войти в аккаунт';
    if (subtitle) {
      subtitle.textContent = token ? 'Профиль и подписка' : 'Вход и регистрация';
      subtitle.removeAttribute('title');
    }
    if (avatar) avatar.textContent = 'D';
    if (!token) return;
    try {
      const response = await fetch('/api/me', {
        headers: {Authorization:'Bearer ' + token}, cache:'no-store'
      });
      if (!response.ok || token !== localStorage.getItem('vv_token') || dropdown.hidden) return;
      const data = await response.json();
      if (token !== localStorage.getItem('vv_token') || dropdown.hidden) return;
      const user = data?.user;
      const email = typeof user?.email === 'string' ? user.email.trim() : '';
      if (!email || !email.includes('@')) return;
      if (subtitle) {
        subtitle.textContent = email;
        subtitle.title = email;
      }
      const displayName = typeof user.name === 'string' && user.name.trim()
        ? user.name.trim() : email.split('@')[0];
      const initial = Array.from(displayName)[0];
      if (avatar) avatar.textContent = initial ? initial.toLocaleUpperCase() : 'D';
    } catch (_) {
      // Keep neutral copy when identity cannot be verified, never show stale email.
    }
  };

  const openDropdown = async () => {
    await updateHistoryList();
    setChatHeaderMode($('jActiveModeLabel')?.dataset.mode||'auto');
    dropdown.hidden = false;
    titleBtn.setAttribute('aria-expanded', 'true');
    titleBtn.classList.add('open');
    void updateDrawerAccount();
  };

  const closeDropdown = () => {
    dropdown.hidden = true;
    dropdown.classList.remove('j-swipe-closing');
    setHistoryExpanded(false);
    titleBtn.setAttribute('aria-expanded', 'false');
    titleBtn.classList.remove('open');
  };

  titleBtn.onclick = (e) => {
    e.stopPropagation();
    if (dropdown.hidden) openDropdown();
    else closeDropdown();
  };

  if (backdrop) backdrop.onclick = () => closeDropdown();
  const closeBtn = $('jDrawerClose');
  if (closeBtn) closeBtn.onclick = () => closeDropdown();

  // Horizontal swipe closes the SAME menu. Vertical scrolling of chat history
  // remains native; swiping never navigates or creates another conversation.
  const drawerPanel = dropdown.querySelector('.j-drawer-panel');
  let touchOrigin = null;
  drawerPanel?.addEventListener('touchstart', event => {
    if (dropdown.hidden || !window.matchMedia('(max-width:760px)').matches ||
        event.touches.length !== 1 ||
        (event.target instanceof Element && event.target.closest('input, textarea, [contenteditable="true"]'))) {
      touchOrigin = null;
      return;
    }
    const touch = event.touches[0];
    touchOrigin = {x: touch.clientX, y: touch.clientY};
  }, {passive:true});
  drawerPanel?.addEventListener('touchend', event => {
    if (!touchOrigin || event.changedTouches.length !== 1 || dropdown.hidden) {
      touchOrigin = null;
      return;
    }
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchOrigin.x;
    const dy = touch.clientY - touchOrigin.y;
    touchOrigin = null;
    if (dx < -65 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      event.preventDefault();
      if (!dropdown.classList.contains('j-swipe-closing') &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        dropdown.classList.add('j-swipe-closing');
        window.setTimeout(closeDropdown, 170);
      } else closeDropdown();
    }
  }, {passive:false});
  drawerPanel?.addEventListener('touchcancel', () => { touchOrigin = null; }, {passive:true});

  $('jInput')?.addEventListener('focus', () => {
    if (window.matchMedia('(max-width:760px)').matches && !dropdown.hidden) closeDropdown();
  });
  dropdown.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDropdown();
      titleBtn.focus();
    }
  });

  if (newBtn) {
    newBtn.onclick = () => {
      if (busy) return;
      resetToDefaultChat(true, false);
      closeDropdown();
      $('jInput')?.focus();
    };
  }

  const vuPill = $('jQuickVideoUniquifier');
  if (vuPill) {
    vuPill.onclick = () => openWorkspace('video-uniquifier.html?embed=chat', 'Видео-уникализатор');
  }



  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === d.toDateString();
    const ru = (getJarvixLanguage() || 'ru').startsWith('ru');
    if (isToday) return ru ? 'Сегодня' : 'Today';
    if (isYesterday) return ru ? 'Вчера' : 'Yesterday';
    const months = ru ? ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'] : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return d.getDate() + ' ' + months[d.getMonth()];
  }

  async function updateHistoryList() {
    if (!historyListEl) return;
    const allRows = await store.list();
    const query=(searchInput?.value||'').trim().toLocaleLowerCase();
    const rows=allRows.filter(r => Array.isArray(r.messages) && r.messages.length > 0)
      .filter(r => !query || (r.title||'').toLocaleLowerCase().includes(query));
    if(!newestFirst)rows.reverse();
    historyListEl.replaceChildren();

    const ru = (getJarvixLanguage() || 'ru').startsWith('ru');

    if (!rows.length) {
      const emptyMsg = node('div', ru ? (query?'Ничего не найдено':'Пока нет переписок') : (query?'No matching conversations':'No saved conversations'));
      emptyMsg.style.cssText = 'color:#64748b;font-size:12px;padding:8px 6px;text-align:center;';
      historyListEl.append(emptyMsg);
      return;
    }

    let lastGroup = '';
    for (const r of rows) {
      const updated=new Date(r.updatedAt || r.createdAt || 0);
      const today=new Date();const midnight=new Date(today.getFullYear(),today.getMonth(),today.getDate());
      const ageDays=Math.floor((midnight.getTime()-new Date(updated.getFullYear(),updated.getMonth(),updated.getDate()).getTime())/86400000);
      const group=ageDays<=0?(ru?'Сегодня':'Today'):ageDays===1?(ru?'Вчера':'Yesterday'):ageDays<7?(ru?'На этой неделе':'This week'):(ru?'Ранее':'Earlier');
      if(group!==lastGroup){
        const heading=node('div',group);
        heading.className='j-drawer-history-group';
        historyListEl.append(heading);lastGroup=group;
      }
      const item = node('button');
      item.type = 'button';
      item.className = 'j-dropdown-conv-item' + (r.id === conversation?.id ? ' active' : '');

      const infoBox = node('div');
      infoBox.className = 'j-conv-info';
      const icon = node('span', '💬');
      icon.className = 'j-conv-icon';
      const title = node('span', r.title || (ru ? 'Новый диалог' : 'New chat'));
      title.className = 'j-conv-title';
      infoBox.append(icon, title);

      const date = node('span', formatDate(r.updatedAt || r.createdAt));
      date.className = 'j-conv-date';

      item.append(infoBox, date);

      item.onclick = async () => {
        if (busy) return;
        const next = await store.get(r.id);
        if (!next) return;
        conversation = next;
        sessionStorage.setItem('jarvix_session_id', conversation.sessionId);
        sessionStorage.setItem('jarvix_active_conversation', conversation.id);
        render();
        closeDropdown();
        await historyList();
        await restoreResults();
      };

      historyListEl.append(item);
    }
  }

  // Pre-load history list
  updateHistoryList().catch(() => {});
}

export function minimizeWorkspace() {
  const pane = $('jWorkspacePane');
  if (pane) {
    pane.classList.add('j-minimized');
    if ($('jWorkspaceMinibar')) $('jWorkspaceMinibar').hidden = false;
  }
}

export function expandWorkspace() {
  const pane = $('jWorkspacePane');
  if (pane) {
    pane.classList.remove('j-minimized');
    if ($('jWorkspaceMinibar')) $('jWorkspaceMinibar').hidden = true;
  }
}

// Listen to postMessage from embedded tools
window.addEventListener('message', (e) => {
  if (e.data?.type === 'vu:processing_started') {
    const vc = e.data.variants || '2';
    const msg = ({
      ru: '⚡ Video Uniquifier: обработка запущена (' + vc + ' вар.)',
      en: '⚡ Video Uniquifier: processing started (' + vc + ' var.)'
    })[getJarvixLanguage()] || ('⚡ Video Uniquifier: processing started (' + vc + ' var.)');
    if ($('jMinibarText')) $('jMinibarText').textContent = msg;
    minimizeWorkspace();
  }
  if (e.data?.type === 'vu:completed') {
    const msg = ({
      ru: '✓ Video Uniquifier: готово! Разверните для скачивания',
      en: '✓ Video Uniquifier: ready! Expand to download'
    })[getJarvixLanguage()] || '✓ Video Uniquifier: ready!';
    if ($('jMinibarText')) $('jMinibarText').textContent = msg;
  }
});

// Bind top workspace actions
if ($('jWorkspaceMinimize')) {
  $('jWorkspaceMinimize').onclick = () => minimizeWorkspace();
}
if ($('jMinibarExpandBtn')) {
  $('jMinibarExpandBtn').onclick = () => expandWorkspace();
}
if ($('jMinibarCloseBtn')) {
  $('jMinibarCloseBtn').onclick = () => $('jWorkspaceClose')?.click();
}

initChatMenuDrawer();
