// Optional profile extension. No changes to existing login, Stripe or history UI.
(()=>{
 'use strict';
 const host=document.querySelector('#profileView .profileGrid');
 if(!host)return;
 const card=document.createElement('article');card.className='card profileCard';
 const h=document.createElement('h3');h.textContent='Telegram account';
 const paragraph=document.createElement('p');paragraph.className='muted';paragraph.textContent='Connect your Telegram to share one paid subscription across website, Android and Telegram.';
 const line=document.createElement('p');line.className='muted';
 const button=document.createElement('button');button.type='button';button.className='ghostBtn';button.textContent='Connect Telegram';
 const refresh=document.createElement('button');refresh.type='button';refresh.className='ghostBtn';refresh.textContent='Check link';
 const holder=document.createElement('div');holder.className='profileActionRow';holder.append(button,refresh);
 card.append(h,paragraph,holder,line);host.append(card);
 const request=async method=>{
  const token=localStorage.getItem('vv_token');
  if(!token)throw Error('Sign in to your existing Video Uniquifier account first.');
  const result=await fetch('/api/telegram-mini/account-link',{method,headers:{Authorization:'Bearer '+token}});
  const json=await result.json().catch(()=>({}));
  if(!result.ok)throw Error(json.error||'Could not connect Telegram');
  return json;
 };
 const status=s=>{line.textContent=s;};
 const state=async()=>{
  try{
   const r=await request('GET');
   button.disabled=!!r.linked;button.textContent=r.linked?'✓ Telegram linked':'Connect Telegram';
   status(r.linked?'Your Telegram is connected. Paid access is shared.':'Telegram not linked yet.');
  }catch(e){status(e.message);}
 };
 button.onclick=async()=>{
  button.disabled=true;
  try{
   const r=await request('POST');
   if(r.linked){status('Telegram already connected.');return state();}
   if(!r.url||!r.url.startsWith('https://t.me/VideoUniqAppBot?start=a_'))throw Error('Invalid link');
   status('Open Telegram and press Start. This link expires in 10 minutes.');
   const a=document.createElement('a');a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open Telegram to finish linking';
   line.append(' ',a);
   try{window.open(r.url,'_blank','noopener,noreferrer');}catch(_){}
  }catch(e){status(e.message);}finally{button.disabled=false;}
 };
 refresh.onclick=state;
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&localStorage.getItem('vv_token'))state();});
 // Account may be signed in later; the button remains available.
})();
