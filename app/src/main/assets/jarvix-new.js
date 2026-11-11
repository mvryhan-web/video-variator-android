/* Only JARVIX NEW. No existing Jarvis imports, no paid model APIs. */
const endpoint='http://127.0.0.1:8768';
const el=id=>document.getElementById(id);
let key='',mode='image';
const authorized=()=>Boolean(key);
const status=message=>{el('status').textContent=message;};
const msg=(body,kind='system')=>{const div=document.createElement('div');div.className='msg'+(kind==='user'?' user':'');div.textContent=body;el('messages').append(div);el('messages').scrollTop=el('messages').scrollHeight;};
async function api(path,method='GET',payload=null){
 const response=await fetch(endpoint+path,{method,mode:'cors',targetAddressSpace:'loopback',cache:'no-store',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined});
 const body=await response.json();
 if(!response.ok)throw Error(body.error||'Local bridge error');
 return body;
}
async function update(){
 const [report,list]=await Promise.all([api('/v1/report'),api('/v1/tasks')]);
 el('recent').replaceChildren();
 for(const job of list.tasks){const li=document.createElement('li');li.textContent=job.kind+' · '+job.status+' · '+job.prompt;el('recent').append(li);}
 status('Связь работает. Заданий в журнале: '+report.jobs_in_recent_window);
}
function setConnected(value){
 el('send').disabled=!value;el('refresh').disabled=!value;
 el('connectionState').textContent=value?'ПОДКЛЮЧЁН':'НЕ ПОДКЛЮЧЁН';
}
document.querySelectorAll('button[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
 mode=btn.dataset.mode;
 document.querySelectorAll('button[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
}));
const requestedMode=new URLSearchParams(location.search).get('mode');
const normalizedMode=requestedMode==='audio'?'music':requestedMode;
if(['image','video','music'].includes(normalizedMode)) {
 const chosen=document.querySelector('button[data-mode="'+normalizedMode+'"]');
 if(chosen)chosen.click();
}
el('pair').addEventListener('click',async()=>{
 const token=el('pairing').value.trim();if(!token){status('Вставь код подключения из приложения.');return;}
 key=token;el('pair').disabled=true;
 try{await update();setConnected(true);el('pairing').value='';msg('Компьютер подключён. Можно отправить одно тестовое задание.');}
 catch(e){key='';setConnected(false);status('Не удалось подключиться. Проверь приложение и код, разреши доступ к локальной сети для тестового сайта в настройках браузера.');}
 finally{el('pair').disabled=false;}
});
el('refresh').addEventListener('click',async()=>{try{await update()}catch{setConnected(false);status('Связь потеряна. Подключись повторно.')}});
el('send').addEventListener('click',async()=>{
 const prompt=el('prompt').value.trim();if(!prompt||!authorized()){status('Подключи компьютер и введи задание.');return;}
 el('send').disabled=true;
 try{
  const record=await api('/v1/tasks','POST',{kind:mode,prompt});
  msg(prompt,'user');
  msg('Задание '+record.id+' записано в локальный журнал. Статус: в очереди. Генерация не запущена.');
  el('prompt').value='';await update();
 }catch{setConnected(false);key='';status('Не удалось сохранить задание, проверь соединение.');}
 finally{el('send').disabled=!authorized();}
});