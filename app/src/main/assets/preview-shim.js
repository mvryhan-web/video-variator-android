/* Isolated demo: local browser data only, no server, charges, or real pushes. */
(() => {
  'use strict';
  const key='vv_reminder_preview_20261010';
  const notesKey=key+'_notes';
  localStorage.setItem('vv_token','preview-only-no-server-session');
  const sourceFetch=window.fetch.bind(window);
  const load=k=>{try{return JSON.parse(localStorage.getItem(k))||[];}catch(_){return [];}};
  const save=(k,arr)=>localStorage.setItem(k,JSON.stringify(arr));
  const response=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:{'Content-Type':'application/json'}});
  const getId=()=>crypto.randomUUID();
  window.fetch=async(input,options={})=>{
    const u=typeof input==='string'?input:input.url||'';
    const path=new URL(u,location.href).pathname;
    if(!path.startsWith('/api/reminders'))return sourceFetch(input,options);
    const method=String(options.method||'GET').toUpperCase();
    const id=path.split('/')[3]||'';
    const tail=path.split('/')[4]||'';
    const payload=()=>{try{return JSON.parse(options.body||'{}');}catch(_){return {};}};
    const body=payload();
    if(path==='/api/reminders/config')return response({publicKey:null,pushSubscriptions:0,telegramConnected:false});
    if(path==='/api/reminders/telegram-link')return response({error:'TELEGRAM_NOT_AVAILABLE_IN_DEMO'},503);
    if(path==='/api/reminders/subscriptions')return response({error:'PUSH_NOT_AVAILABLE_IN_DEMO'},503);
    if(id==='notes'){
      let arr=load(notesKey);
      if(!tail && method==='GET')return response({items:arr});
      if(!tail && method==='POST'){const now=new Date().toISOString();const item={id:getId(),body:String(body.body||'').slice(0,2000),created_at:now,updated_at:now};arr.unshift(item);save(notesKey,arr);return response({item},201);}
      if(tail && method==='DELETE'){save(notesKey,arr.filter(x=>x.id!==tail));return response({ok:true});}
      if(tail && method==='PUT'){arr=arr.map(x=>x.id===tail?{...x,body:String(body.body||''),updated_at:new Date().toISOString()}:x);save(notesKey,arr);return response({item:arr.find(x=>x.id===tail)});}
    }
    let items=load(key);
    if(!id&&method==='GET')return response({items});
    const build=src=>({title:src.title||'',event_at:new Date(src.date+'T'+src.time+':00').toISOString(),date_local:src.date,time_local:src.time,timezone:src.timezone||'UTC',advance_minutes:Number(src.advanceMinutes)||0,channel:src.channel||'push',recurrence:src.recurrence||'none',weekdays:src.weekdays||[],enabled:true});
    if(!id&&method==='POST'){const item={id:getId(),...build(body),created_at:new Date().toISOString()};items.push(item);save(key,items);return response({item},201);}
    if(id&&method==='PUT'){const index=items.findIndex(x=>x.id===id);if(index<0)return response({error:'NOT_FOUND'},404);items[index]={...items[index],...build(body)};save(key,items);return response({item:items[index]});}
    if(id&&method==='DELETE'){items=items.filter(x=>x.id!==id);save(key,items);return response({ok:true});}
    if(id&&method==='POST'&&['done','snooze'].includes(tail)){
      const item=items.find(x=>x.id===id);if(item){if(tail==='done')item.enabled=false;else item.event_at=new Date(Date.now()+600000).toISOString();save(key,items);}
      return response({ok:!!item});
    }
    return response({error:'UNKNOWN_DEMO_ACTION'},404);
  };
  const init=()=>{
    const banner=document.createElement('div');
    banner.style.cssText='position:sticky;z-index:99;top:0;text-align:center;padding:12px 16px;background:#39215d;color:white;font-weight:600;font:14px/1.4 system-ui,sans-serif;';
    banner.textContent=(navigator.language||'').startsWith('ru')?'ДЕМО ДЛЯ ПРОВЕРКИ • Голос, фото и форма работают в браузере. Сохранённые записи остаются только здесь. Настоящие уведомления пока не отправляются.':'TEST PREVIEW • Voice, photo and the form can be tested here. Data stays in this browser. Real notifications are not sent.';
    document.body.prepend(banner);
    for(const id of ['enableNotifications','connectTelegram']){
      const b=document.getElementById(id);if(!b)continue;b.disabled=true;b.title='Available after final deployment';
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
