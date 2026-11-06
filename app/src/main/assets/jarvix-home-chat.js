import {stopJarvixGuidedTour} from './jarvix-guided-tour.js';
import {makeId,conversationStore} from './jarvix-conversations.js';
import {bindComposer,trackViewport} from './jarvix-composer.js';
import {getJarvixSessionId} from './jarvis-core.js';
const form=document.getElementById('homeQuickForm'),status=document.getElementById('homeQuickStatus'),input=document.getElementById('homeQuickPrompt');
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
   conversation.messages.push({id:makeId(),role:'user',text,mode,files,status:'pending',createdAt:Date.now()});
   await store.save(conversation);sessionStorage.setItem('jarvix_active_conversation',conversation.id);location.assign('jarvix-chat.html');
  }catch(e){status.textContent=e.message;busy=false;button.disabled=false;}
 }});
 trackViewport(document.getElementById('homeQuickBar'));
 window.addEventListener('storage',e=>{if(e.key==='vv_token'){composer.clear();composer.stop();status.textContent='Account changed. Reload before sending.';}});
}
