/* Test-only JARVIX NEW entry. No new chat page or onboarding banner.
 * The approved ORIGINAL sphere in DEEPSYQ's existing header becomes the
 * only voice conversation start/stop control.
 */
import {installJarvixNewVoice} from './jarvix-new-voice.js';
if(location.hostname==='jarvis-new.deepsyq.pages.dev'){
 const init=()=>{
   installJarvixNewVoice();
   // Remove previous temporary UI from older deployments, if present.
   document.getElementById('jarvix-new-preview-banner')?.remove();
   document.getElementById('homeQuickBar')?.remove();
   const sphere=document.getElementById('topJarvisBtn');
   if(sphere){
     sphere.setAttribute('aria-label','JARVIX NEW · начать голосовой разговор');
     sphere.title='JARVIX NEW · нажми для разговора';
   }
   // Sidebar's JARVIX entry uses the same sphere, not a second chat.
   document.addEventListener('click',event=>{
     const anchor=event.target.closest?.('a[href="ai-agents.html"],a[href="voice-agent-preview.html"]');
     if(!anchor||!sphere)return;
     event.preventDefault();event.stopImmediatePropagation();
     sphere.click();
   },true);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
}