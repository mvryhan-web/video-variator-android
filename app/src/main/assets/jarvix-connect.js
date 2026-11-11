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
function translate(){for(const id of ['title','explain','tokenLabel','connect','jobTitle','jobExplain','kindLabel','promptLabel','submit','refresh','warning','back'])el(id).textContent=tr()[id];document.documentElement.lang=el('lang').value}
el('lang').addEventListener('change',()=>{try{localStorage.setItem('deepsyq_home_language',el('lang').value)}catch{}translate()});
translate();
let key='';
async function api(path,method='GET',body=null){
 const res=await fetch(ENDPOINT+path,{method,cache:'no-store',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const result=await res.json();if(!res.ok)throw Error(result.error||'Local bridge failed');return result;
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
 catch{key='';el('status').textContent=tr().offline;el('submit').disabled=true;el('refresh').disabled=true}
 finally{el('connect').disabled=false}
});
el('refresh').addEventListener('click',()=>refresh().catch(()=>{el('status').textContent=tr().offline}));
el('submit').addEventListener('click',async()=>{
 const prompt=el('prompt').value.trim();if(!prompt){el('status').textContent=tr().empty;return}
 el('submit').disabled=true;
 try{await api('/v1/tasks','POST',{kind:el('kind').value,prompt});el('prompt').value='';el('status').textContent=tr().saved;await refresh()}
 catch{el('status').textContent=tr().offline}
 finally{el('submit').disabled=false}
});
