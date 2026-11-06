import {makeId,conversationStore,resolveMode} from './jarvix-conversations.js';
import {bindComposer,trackViewport} from './jarvix-composer.js';
import {getJarvixSessionId,getJarvixLanguage} from './jarvis-core.js';
import {saveStudioHandoff} from './studio-handoff.js';
const $=id=>document.getElementById(id),status=text=>$('jStatus').textContent=text;
const store=await conversationStore();let conversation=null,busy=false,epoch=0,controller=null,config=null,urls=[];
const headers=()=>({'Content-Type':'application/json',...(localStorage.getItem('vv_token')?{Authorization:'Bearer '+localStorage.getItem('vv_token')}:{})});
async function api(path,body){store.guard();const r=await fetch(path,{method:body?'POST':'GET',headers:headers(),cache:'no-store',...(body?{body:JSON.stringify(body)}:{}),signal:controller?.signal});store.guard();const d=await r.json();if(!r.ok)throw Error(d.message||d.error||'Request failed');return d;}
async function save(){conversation=await store.save(conversation);await historyList();}
async function historyList(){const rows=await store.list();$('jHistory').replaceChildren();for(const r of rows){const o=document.createElement('option');o.value=r.id;o.textContent=r.title;o.selected=r.id===conversation?.id;$('jHistory').append(o);}}
const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
function safeMedia(url){try{const u=new URL(url,location.href);return u.origin===location.origin&&/^\/api\/studio\/jobs\/[\w-]+\/media$/.test(u.pathname)?u.href:null;}catch{return null;}}
function showFile(parent,file){const box=node('div'),url=URL.createObjectURL(file);urls.push(url);const el=node(file.type.startsWith('image/')?'img':file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':'a');el.src=url;if(el.tagName==='IMG')el.alt=file.name||'Attachment';else if(el.tagName==='A'){el.href=url;el.download=file.name;el.textContent=file.name;}else el.controls=true;box.append(el);parent.append(box);}
function render(){for(const url of urls)URL.revokeObjectURL(url);urls=[];const area=$('jMessages');area.replaceChildren();if(!conversation.messages.length){const empty=node('div');empty.className='j-empty';empty.append(node('h2','What would you like to create?'),node('p','Text, images, video and audio — one conversation.'));area.append(empty);}
 for(const m of conversation.messages){const item=node('article');item.className='j-message '+m.role;item.append(node('strong',m.role==='user'?'YOU':'JARVIX'),node('div',m.text));for(const f of m.files||[])showFile(item,f);
 if(m.jobId){item.append(node('small',(m.status||'processing')+(m.demo?' · TEST demo, not generated AI content':'')));const media=safeMedia(m.mediaUrl);if(media){const el=node(m.kind==='video'?'video':m.kind==='audio'?'audio':'img');el.src=media;if(el.tagName==='IMG')el.alt=m.text;else el.controls=true;item.append(el);const download=node('a','Download');download.href=media;download.download='deepsyq-'+m.jobId;item.append(download);const reuse=node('button','Use as attachment');reuse.type='button';reuse.onclick=async()=>{try{const r=await fetch(media,{headers:headers(),cache:'no-store'});store.guard();if(!r.ok)throw Error('Result unavailable');const blob=await r.blob();composer.add(new File([blob],'result-'+m.jobId,{type:blob.type}));status('Attached to your next message. Choose a mode with +.');}catch(e){status(e.message);}};item.append(reuse);}
 if(m.status!=='ready'&&m.status!=='failed'){const check=node('button','Check task');check.type='button';check.onclick=()=>run(()=>poll(m));item.append(check);}}
 if(m.status==='pending'||(m.role==='user'&&m.status==='processing')||m.status==='interrupted'||m.status==='error'){const retry=node('button',m.status==='error'?'Retry':'Continue');retry.type='button';retry.onclick=()=>run(()=>processMessage(m));item.append(retry);}
 area.append(item);}
 area.scrollTop=area.scrollHeight;
}
async function run(work){if(busy)return;busy=true;const version=++epoch;controller=new AbortController();$('jSend').disabled=true;$('jStop').hidden=false;try{await work();}catch(e){if(e.name!=='AbortError')status(e.message);}finally{if(version===epoch){busy=false;controller=null;$('jSend').disabled=false;$('jStop').hidden=true;render();}}}
async function poll(message){const version=epoch;for(let i=0;i<60;i++){const d=await api('/api/studio/jobs/'+encodeURIComponent(message.jobId));if(version!==epoch)return;message.status=d.status;message.mediaUrl=d.mediaUrl||d.previewUrl||null;message.demo=d.previewOnly===true;message.kind=d.kind==='music'||d.kind==='voice'?'audio':d.kind||message.kind;message.text=d.status==='failed'?(d.error||'Generation failed.'):message.text;await save();render();if(['ready','failed','canceled'].includes(d.status))return;await new Promise(r=>setTimeout(r,1500));}status('Still processing. Use Check task later; your task has been saved.');}
async function processMessage(message){
 message.status='processing';await save();render();
 try{
  let mode=resolveMode(message.text,message.mode);
  if(message.mode==='auto'&&mode==='text'&&/измен|сделай.*(ярче|темнее)|ещё|change|brighter|darker|modifier|cambiar/i.test(message.text)){const previous=[...conversation.messages].reverse().find(m=>m.role==='assistant'&&m.jobId);if(previous)mode=previous.kind;}
  let answer;
  if(mode==='text'){
   // Same brain endpoint and session as the voice sphere; never a second assistant.
   const textFiles=await Promise.all((message.files||[]).filter(f=>f.type==='text/plain').map(f=>f.text()));store.guard();
   const text=(message.text+(textFiles.length?'\n'+textFiles.join('\n'):'')).slice(0,2000);
   const d=await api('/api/jarvix/chat',{sessionId:conversation.sessionId,message:text,language:getJarvixLanguage()});
   answer={id:makeId(),role:'assistant',text:d.reply||'No answer received.',createdAt:Date.now()};
   if((message.files||[]).some(f=>f.type!=='text/plain'))answer.text+='\nMedia attachments are saved in this conversation. This text handler does not inspect their contents.';
  }else{
   config=config||await api('/api/studio/config');
   // Fail closed outside the isolated zero-spend preview. Production launch remains in Studio's existing consent/payment flow.
   if(config.previewOnly!==true||config.outputMode!=='local-demo')throw Error('Generation here is limited to TEST demo mode. Open the existing Studio to review model, consent and cost.');
   if(message.files?.length)throw Error('TEST demo models do not process reference files. Files are preserved; open this request in Studio to choose a compatible model.');
   const kind=mode==='audio'?'music':mode,model=(config.models||[]).find(m=>m.enabled&&m.kind===kind);
   if(!model)throw Error('No model is available for this mode.');
   const quote=await api('/api/studio/estimate',{kind,model:model.id,quantity:1});
   if(quote.previewOnly!==true||Number(quote.credits)!==0||Number(quote.cost)!==0)throw Error('Zero-cost TEST estimate could not be verified.');
   const d=await api('/api/studio/jobs',{kind,model:model.id,prompt:message.text,quantity:1,requestId:message.id,consent:false});
   answer={id:makeId(),role:'assistant',text:'TEST demonstration result · '+mode,jobId:d.jobId||d.id,status:d.status,kind:mode,demo:true,createdAt:Date.now()};
  }
  message.status='sent';conversation.messages.push(answer);await save();render();if(answer.jobId)await poll(answer);
 }catch(e){message.status=message.status==='sent'?'sent':e.name==='AbortError'?'interrupted':'error';message.error=e.message;await save();if(e.name!=='AbortError'){
   status(e.message);const link=node('button','Open request in Studio');link.type='button';link.onclick=async()=>{const mode=resolveMode(message.text,message.mode),kind=mode==='audio'?'music':mode==='text'?'image':mode;const files=(message.files||[]).filter(f=>['image/png','image/jpeg'].includes(f.type)&&f.size<=1024*1024);try{await saveStudioHandoff({kind,prompt:message.text,files,source:'jarvix-chat'});location.assign('generate-studio.html?studio='+(kind==='music'?'audio':kind));}catch(e){status(e.message);}};$('jStatus').append(link);
  }if(e.name==='AbortError')throw e;}
}
const composer=bindComposer({form:$('jChatForm'),input:$('jInput'),onError:status,onSend:async({text,mode,files})=>{if(busy)return;try{store.guard();const m={id:makeId(),role:'user',text,mode,files,status:'pending',createdAt:Date.now()};if(!conversation.messages.length)conversation.title=text.slice(0,60);conversation.messages.push(m);await save();composer.clear();render();await run(()=>processMessage(m));}catch(e){status(e.message);}}});
$('jStop').onclick=()=>{controller?.abort();$('jStop').hidden=true;status('Browser waiting stopped. Already submitted generation tasks are not cancelled.');};
$('jNew').onclick=async()=>{if(busy)return;conversation=store.create('jarvix-'+makeId());sessionStorage.setItem('jarvix_session_id',conversation.sessionId);sessionStorage.setItem('jarvix_active_conversation',conversation.id);await save();render();};
$('jHistory').onchange=async()=>{if(busy)return;const next=await store.get($('jHistory').value);if(!next)return;conversation=next;sessionStorage.setItem('jarvix_session_id',conversation.sessionId);sessionStorage.setItem('jarvix_active_conversation',conversation.id);render();};
function freeze(){try{store.guard();}catch{++epoch;controller?.abort();composer.stop();for(const u of urls)URL.revokeObjectURL(u);$('jMessages').replaceChildren();$('jChatForm').hidden=true;status('Account changed. Reload to open the correct private conversations.');}}
window.addEventListener('storage',freeze);window.addEventListener('focus',freeze);window.addEventListener('pageshow',freeze);
conversation=await store.get(sessionStorage.getItem('jarvix_active_conversation'))||store.create(getJarvixSessionId());await save();render();trackViewport();
const pending=conversation.messages.find(m=>m.status==='pending');if(pending)await run(()=>processMessage(pending));
