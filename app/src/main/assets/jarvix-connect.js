/* JARVIX NEW test: browser-to-loopback pairing, no cloud credentials or API charges. */
const ENDPOINT = 'http://127.0.0.1:8768';
const LANG = {
 ru:{title:'JARVIX NEW — тест подключения',explain:'Открой JARVIX NEW на этом же компьютере, нажми «Подключить тестовый сайт», затем вставь сюда скопированный код. Связь работает только пока открыто приложение.',tokenLabel:'Код подключения с компьютера',connect:'Подключить',jobTitle:'Проверка заданий',jobExplain:'Записать одно задание в локальный журнал. Никакая AI-модель не запускается и кредиты не списываются.',kindLabel:'Тип задания',promptLabel:'Что сделать?',submit:'Сохранить задание',refresh:'Обновить статусы',warning:'Это локальная связь с 127.0.0.1, не облачная синхронизация. Не передавай код подключения другим людям. Браузер может запросить разрешение на локальную сеть.',back:'Скачать тестовое приложение',connected:'Соединение подтверждено. Задания читаются из локального журнала.',offline:'Не удалось подключиться. Открой приложение, включи тестовую связь и проверь код. Разреши браузеру доступ к локальной сети, если он запросит.',saved:'Задание записано, но генерация не запущена.',empty:'Введи текст задания.',count:'Заданий в локальном журнале'},
 en:{title:'JARVIX NEW — connection test',explain:'Open JARVIX NEW on this same computer, click Connect test website and paste the copied pairing code here. The app must stay open.',tokenLabel:'Desktop pairing code',connect:'Connect',jobTitle:'Test tasks',jobExplain:'Record a test task in the local log. No AI model runs and no credits are charged.',kindLabel:'Task type',promptLabel:'What to do?',submit:'Queue task',refresh:'Refresh statuses',warning:'Local 127.0.0.1 connection only, not cloud sync. Do not share the pairing code. Your browser may ask for local network access.',back:'Download test application',connected:'Connected. Reading real local task records.',offline:'Could not connect. Start the desktop bridge and check the code and local network permission.',saved:'Task queued; no generation started.',empty:'Enter a task prompt.',count:'Tasks in local journal'},
 fr:{title:'JARVIX NEW — test de connexion',explain:'Ouvrez JARVIX NEW sur le même ordinateur, cliquez sur Connexion au site de test puis collez le code. L’application doit rester ouverte.',tokenLabel:'Code de connexion de l’application',connect:'Connecter',jobTitle:'Test des tâches',jobExplain:'Ajouter une tâche au journal local sans lancer de modèle IA ni dépenser de crédits.',kindLabel:'Type de tâche',promptLabel:'Demande',submit:'Enregistrer la tâche',refresh:'Actualiser',warning:'Connexion locale 127.0.0.1 seulement, sans synchronisation cloud. Ne partagez pas le code. Le navigateur peut demander une autorisation réseau locale.',back:'Télécharger l’application',connected:'Connexion établie. Lecture du journal local.',offline:'Connexion impossible. Vérifiez l’application, le code et l’autorisation du réseau local.',saved:'Tâche enregistrée, génération non lancée.',empty:'Saisissez une demande.',count:'Tâches locales'},
 es:{title:'JARVIX NEW — prueba de conexión',explain:'Abre JARVIX NEW en este mismo ordenador, pulsa Conectar sitio de prueba y pega el código. Mantén la aplicación abierta.',tokenLabel:'Código del ordenador',connect:'Conectar',jobTitle:'Prueba de tareas',jobExplain:'Guarda una tarea en el registro local sin ejecutar modelos IA ni consumir créditos.',kindLabel:'Tipo de tarea',promptLabel:'Solicitud',submit:'Guardar tarea',refresh:'Actualizar',warning:'Conexión local 127.0.0.1, no sincronización en la nube. No compartas el código. El navegador puede pedir permiso de red local.',back:'Descargar aplicación de prueba',connected:'Conectado. Consultando tareas locales.',offline:'No se pudo conectar. Revisa la aplicación, el código y el permiso de red local.',saved:'Tarea guardada; no se ha iniciado la generación.',empty:'Escribe la solicitud.',count:'Tareas locales'}
};
const el=id=>document.getElementById(id);
function getLocale(){try{return(localStorage.getItem('deepsyq_home_language')||localStorage.getItem('deepsyq_lang')||navigator.language||'en').slice(0,2).toLowerCase()}catch{return'en'}}
el('lang').value=LANG[getLocale()]?getLocale():'en';
const tr=()=>LANG[el('lang').value]||LANG.en;
const permissionDenied={
 ru:'Браузер запретил доступ JARVIX к этому компьютеру. Открой настройки разрешений этого сайта (значок слева от адреса), разреши доступ к локальному приложению / loopback network и нажми «Подключить» снова.',
 en:'Your browser blocked access to the JARVIX app on this computer. Open site permissions (icon beside address), allow Local Network / Loopback access, then select Connect again.',
 fr:'Le navigateur bloque la liaison avec JARVIX sur cet ordinateur. Ouvrez les autorisations de ce site, autorisez le réseau local / loopback, puis réessayez.',
 es:'El navegador ha bloqueado el acceso a JARVIX en este equipo. Abre los permisos del sitio, permite el acceso a la red local / loopback y vuelve a conectar.'
};
async function offlineReason(){
 // Never query legacy "local-network-access" in navigator.permissions:
 // older Chrome versions may crash. Unsupported granular names are normal.
 try {
  const result=await navigator.permissions.query({name:'loopback-network'});
  if(result.state==='denied')return permissionDenied[el('lang').value]||permissionDenied.en;
 }catch{}
 return tr().offline;
}
const pairingProblem={
 ru:'Код не подходит. В настольном JARVIX NEW нажми «Скопировать код подключения» и вставь новый код: он меняется при каждом запуске приложения.',
 en:'Incorrect pairing code. In the desktop JARVIX NEW app select Copy pairing code and paste the current code; it changes every launch.',
 fr:'Code incorrect. Dans JARVIX NEW sur ordinateur, copiez le code de connexion actuel ; il change à chaque lancement.',
 es:'Código incorrecto. En JARVIX NEW para ordenador, copia el código de conexión actual; cambia con cada inicio.'
};
async function checkLocalVoice(){
 const btn=document.createElement('button');
 btn.type='button';
 btn.textContent=({ru:'Проверить связь с компьютером',en:'Check desktop connection',fr:'Vérifier la connexion locale',es:'Comprobar conexión local'})[el('lang').value]||'Check desktop connection';
 el('connect').after(btn);
 const info=document.createElement('p');info.className='status';info.setAttribute('role','status');btn.after(info);
 btn.addEventListener('click',async()=>{
  btn.disabled=true;
  try{
   const result=await fetch(ENDPOINT+'/v1/voice/status',{mode:'cors',targetAddressSpace:'loopback',cache:'no-store'});
   if(!result.ok)throw Error('Local bridge error');
   const data=await result.json();
   info.textContent=({ru:'Связь с компьютером есть. '+(data.ready?'Локальная AI-модель найдена.':'Локальная модель пока не готова.')+' Для ввода заданий нужен актуальный код из приложения.',en:'Desktop bridge is available. Use the current pairing code from the app to access tasks.',fr:'La liaison locale fonctionne. Utilisez le code actuel de l’application pour accéder aux tâches.',es:'La conexión local funciona. Utiliza el código actual de la aplicación para acceder a las tareas.'})[el('lang').value]||'Desktop bridge available.';
  }catch{
   info.textContent=await offlineReason();
  }finally{btn.disabled=false}
 });
}
function translate(){for(const id of ['title','explain','tokenLabel','connect','jobTitle','jobExplain','kindLabel','promptLabel','submit','refresh','warning','back'])el(id).textContent=tr()[id];document.documentElement.lang=el('lang').value}
el('lang').addEventListener('change',()=>{try{localStorage.setItem('deepsyq_home_language',el('lang').value)}catch{}translate()});
translate();
checkLocalVoice();
let key='';
async function api(path,method='GET',body=null){
 // Chrome 145+: explicit loopback target enables the browser's normal
 // local-device permission prompt for an HTTPS test site. Do not disable it.
 const res=await fetch(ENDPOINT+path,{method,mode:'cors',targetAddressSpace:'loopback',cache:'no-store',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const result=await res.json();if(!res.ok){const error=Error(result.error||'Local bridge failed');error.status=res.status;throw error;}return result;
}
async function refresh(){
 const [report,list]=await Promise.all([api('/v1/report'),api('/v1/tasks')]);
 el('report').textContent=tr().count+': '+report.jobs_in_recent_window;
 el('jobs').replaceChildren();
 for(const job of list.tasks){const li=document.createElement('li');li.textContent=job.kind+' · '+job.status+' · '+job.prompt;el('jobs').append(li)}
}
el('connect').addEventListener('click',async()=>{
 key=el('token').value.trim();if(!key){el('status').textContent=tr().offline;return}
 el('connect').disabled=true;
 try{await refresh();el('status').textContent=tr().connected;el('submit').disabled=false;el('refresh').disabled=false;el('token').value=''}
 catch(error){key='';el('status').textContent=error?.status===401?(pairingProblem[el('lang').value]||pairingProblem.en):await offlineReason();el('submit').disabled=true;el('refresh').disabled=true}
 finally{el('connect').disabled=false}
});
el('refresh').addEventListener('click',()=>refresh().catch(async()=>{el('status').textContent=await offlineReason()}));
el('submit').addEventListener('click',async()=>{
 const prompt=el('prompt').value.trim();if(!prompt){el('status').textContent=tr().empty;return}
 el('submit').disabled=true;
 try{await api('/v1/tasks','POST',{kind:el('kind').value,prompt});el('prompt').value='';el('status').textContent=tr().saved;await refresh()}
 catch{el('status').textContent=await offlineReason()}
 finally{el('submit').disabled=false}
});
