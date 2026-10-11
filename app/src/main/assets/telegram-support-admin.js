(()=>{
'use strict';
const $=id=>document.getElementById(id);
const headers=()=>{const token=localStorage.getItem('vv_token');if(!token)throw Error('Sign in to the website as the Google administrator first.');return{'Authorization':'Bearer '+token,'Content-Type':'application/json'};};
const status=x=>{$('state').textContent=x;};
const root=$('tickets');
async function load(){
 try{
  const r=await fetch('/api/telegram-support/tickets',{headers:headers()}),d=await r.json();
  if(!r.ok)throw Error(d.error||'Could not load tickets');
  root.replaceChildren();
  for(const t of d.tickets){
   const card=document.createElement('div');card.className='ticket';
   const heading=document.createElement('h3');heading.textContent=(t.category==='payment'?'Payment':'General')+' · '+t.status+' · '+new Date(t.created_at).toLocaleString();
   const meta=document.createElement('small');meta.textContent='Ticket '+t.id+' · Telegram ID '+t.telegram_id;
   const body=document.createElement('p');body.textContent=t.message;
   card.append(heading,meta,body);
   if(t.status==='open'){
    const textarea=document.createElement('textarea');textarea.maxLength=1800;textarea.placeholder='Write your reply (do not share private account information).';
    const button=document.createElement('button');button.className='primary response';button.textContent='Reply and close ticket';button.type='button';
    const note=document.createElement('p');
    button.onclick=async()=>{
     const message=textarea.value.trim();
     if(message.length<3){note.textContent='Write a reply first.';return;}
     button.disabled=true;
     try{
      const res=await fetch('/api/telegram-support/reply',{method:'POST',headers:headers(),body:JSON.stringify({ticket:t.id,message})});
      const data=await res.json();if(!res.ok)throw Error(data.error||'Reply failed');
      note.textContent='Delivered to Telegram.';button.remove();textarea.remove();
     }catch(e){note.textContent=e.message;button.disabled=false;}
    };
    card.append(textarea,button,note);
   }
   root.append(card);
  }
  status((d.tickets||[]).filter(x=>x.status==='open').length+' open tickets');
 }catch(e){status(e.message);}
}
$('load').onclick=load;load();
})();