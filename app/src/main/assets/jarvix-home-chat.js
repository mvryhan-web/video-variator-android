import {stopJarvixGuidedTour} from './jarvix-guided-tour.js';
import {makeId,conversationStore} from './jarvix-conversations.js';
import {extractAction} from './jarvix-action-plan.js';
import {saveStudioHandoff} from './studio-handoff.js';
import {bindComposer,trackViewport} from './jarvix-composer.js';
import {getJarvixSessionId} from './jarvis-core.js';
const form=document.getElementById('jChatForm'),status=document.getElementById('homeQuickStatus'),input=document.getElementById('homeQuickPrompt');
if(form?.hasAttribute('data-jarvix-chat')){
 document.body.append(document.getElementById('homeQuickBar'));
 let busy=false;const token=localStorage.getItem('vv_token')||'guest';
 const composer=bindComposer({form,input,onError:text=>status.textContent=text,onSend:async({text,mode,files})=>{
  if(busy)return;stopJarvixGuidedTour();busy=true;const button=document.getElementById('homeQuickSubmit');button.disabled=true;
  try{
   if((localStorage.getItem('vv_token')||'guest')!==token)throw Error('Account changed. Reload before sending.');
   const store=await conversationStore();let conversation=await store.get(sessionStorage.getItem('jarvix_active_conversation'));
   if(!conversation)conversation=store.create(getJarvixSessionId());
   conversation.title=conversation.messages.length?conversation.title:text.slice(0,60);
   // The Home composer is the same JARVIX conversation entry, not another assistant.
   // Route only clear creation/open commands to a Studio mode; ordinary questions stay Chat.
   const action=mode==='auto'?extractAction(text):null;
   const target=['image','video','audio'].includes(mode)?mode:
     (['image','video','audio'].includes(action?.target)?action.target:'auto');
   const creating=target!=='auto'&&(mode!=='auto'||action?.intent==='GENERATE_MEDIA');
   // Pass the request to the existing Studio UI; never generate or charge automatically.
   if(creating){
    const kind=target==='audio'?'music':target;
    const supported=files.filter(f=>['image/png','image/jpeg'].includes(f.type)&&f.size<=1024*1024);
    await saveStudioHandoff({kind,prompt:action?.raw_prompt||text,files:supported,source:'jarvix-home'});
   }
   conversation.messages.push({id:makeId(),role:'user',text,mode:target,files,status:creating||target!=='auto'?'sent':'pending',createdAt:Date.now()});
   await store.save(conversation);
   sessionStorage.setItem('jarvix_active_conversation',conversation.id);
   location.assign('jarvix-chat.html'+(target!=='auto'?'?mode='+target:''));
  }catch(e){status.textContent=e.message;busy=false;button.disabled=false;}
 }});
 trackViewport(document.getElementById('homeQuickBar'));
 window.addEventListener('storage',e=>{if(e.key==='vv_token'){composer.clear();composer.stop();status.textContent='Account changed. Reload before sending.';}});
}
