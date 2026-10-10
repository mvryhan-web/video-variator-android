/* Smart Reminders: explicit confirmation before any cloud schedule is saved. */
const $=id=>document.getElementById(id),locale=(navigator.language||'en').slice(0,2);
const ru=locale==='ru',fr=locale==='fr',uk=locale==='uk';
const t=(en,r,f,u)=>ru?(r||en):fr?(f||en):uk?(u||r||en):en;
const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
let draft=null,speech=null;
const userToken=()=>localStorage.getItem('vv_token')||'';
const errorText=e=>String(e?.message||e||'Unknown error');
const status=s=>{$('reminderStatus').textContent=s;};
async function api(url,options={}){
 if(!userToken())throw Error(t('Sign in on the home page to synchronize reminders.','Войдите в аккаунт на главной странице, чтобы сохранять напоминания.'));
 const response=await fetch('/api/reminders'+url,{...options,headers:{'Authorization':'Bearer '+userToken(),...options.headers}});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(result.error||'Request failed');return result;
}
function setCopy(){
 $('reminderBack').textContent=t('← Free tools','← Бесплатные инструменты','← Outils gratuits','← Безкоштовні інструменти');
 $('reminderTitle').textContent=t('Smart reminders','Умные напоминания','Rappels intelligents','Розумні нагадування');
 $('reminderLead').textContent=t('Create one-time or repeated alerts. Free, no video credits.','Разовые и повторяющиеся напоминания. Бесплатно, без видеокредитов.','Rappels uniques ou récurrents, sans crédits.','Разові або повторні нагадування, без відеокредитів.');
 $('reminderFormTitle').textContent=t('Create a reminder','Создать напоминание','Créer un rappel','Створити нагадування');
 $('spokenLabel').textContent=t('Describe in words (optional)','Опишите своими словами (необязательно)','Décrivez en quelques mots (facultatif)','Опишіть своїми словами (необов’язково)');
 $('spokenReminder').placeholder=t('Remind me tomorrow at 18:00 to call the doctor. Warn me 1 hour early.','Напомни завтра в 18:00 позвонить врачу, предупреди за час.');
 $('reminderMic').textContent=t('🎙️ Dictate','🎙️ Надиктовать','🎙️ Dicter','🎙️ Продиктувати');
 $('reminderParse').textContent=t('Fill from description','Заполнить по тексту','Remplir depuis le texte','Заповнити з тексту');
 $('reminderWhatLabel').textContent=t('What to remind you about','Что нужно напомнить','Quoi rappeler','Про що нагадати');
 $('reminderWhat').placeholder=t('Appointment, gym, cancel subscription…','Встреча, спорт, отменить подписку…');
 $('reminderDateLabel').textContent=t('Day / month / year','День, месяц и год','Jour / mois / année','День, місяць і рік');
 $('reminderTimeLabel').textContent=t('Time','Время','Heure','Час');
 $('repeatLabel').textContent=t('Repeat','Повторение','Répétition','Повторення');
 const rule=$('repeatRule').options;
 rule[0].textContent=t('Once','Один раз','Une fois','Один раз');
 rule[1].textContent=t('Every day','Каждый день','Tous les jours','Щодня');
 rule[2].textContent=t('Selected weekdays','По выбранным дням недели','Jours sélectionnés','Обрані дні тижня');
 rule[3].textContent=t('Every month','Каждый месяц','Chaque mois','Щомісяця');
 $('daysLabel').textContent=t('Which weekdays?','В какие дни недели?','Quels jours ?','У які дні?');
 const days=ru?['Пн','Вт','Ср','Чт','Пт','Сб','Вс']:fr?['Lu','Ma','Me','Je','Ve','Sa','Di']:uk?['Пн','Вт','Ср','Чт','Пт','Сб','Нд']:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 document.querySelectorAll('#repeatDays span').forEach((el,i)=>el.textContent=days[i]);
 $('advanceLabel').textContent=t('Notify in advance','Предупредить заранее','Prévenir avant','Попередити заздалегідь');
 for(const [i,en,r] of [[0,'At the event','В момент события'],[1,'5 minutes before','За 5 минут'],[2,'15 minutes before','За 15 минут'],[3,'30 minutes before','За 30 минут'],[4,'1 hour before','За 1 час'],[5,'2 hours before','За 2 часа'],[6,'1 day before','За 1 день']])$('advanceMinutes').options[i].textContent=t(en,r);
 $('notifyViaLabel').textContent=t('Notification method','Способ уведомления','Mode de notification','Спосіб сповіщення');
 $('notifyVia').options[0].textContent=t('From the app (push)','От приложения (push)','Depuis l’application','Від застосунку');
 $('notifyVia').options[1].textContent='Telegram';
 $('notifyVia').options[2].textContent=t('App + Telegram','Приложение + Telegram','App + Telegram','Застосунок + Telegram');
 $('reminderZone').textContent=t('Your time zone: ','Ваш часовой пояс: ','Votre fuseau horaire : ','Ваш часовий пояс: ')+zone;
 $('enableNotifications').textContent=t('Enable app notifications','Включить уведомления приложения','Activer les notifications','Увімкнути сповіщення');
 $('connectTelegram').textContent=t('Connect Telegram','Подключить Telegram','Connecter Telegram','Підключити Telegram');
 $('confirmHeading').textContent=t('Check the details','Проверьте дату и время','Vérifiez les détails','Перевірте дату й час');
 $('confirmSave').textContent=t('Save reminder','Сохранить напоминание','Enregistrer','Зберегти нагадування');
 $('confirmEdit').textContent=t('Edit','Изменить','Modifier','Змінити');
 $('reminderPreview').textContent=t('Check before saving','Проверить перед сохранением','Vérifier avant de sauver','Перевірити перед збереженням');
 $('listHeading').textContent=t('Your reminders','Ваши напоминания','Vos rappels','Ваші нагадування');
 $('listDescription').textContent=t('Only your own reminders are displayed. Delete them when no longer needed.','Здесь только ваши напоминания. Ненужные можно удалить.');
}
function selectedDays(){return [...document.querySelectorAll('#repeatDays input:checked')].map(el=>Number(el.value));}
function setDays(days){document.querySelectorAll('#repeatDays input').forEach(el=>el.checked=days.includes(Number(el.value)));}
function localISO(d){const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function setDate(d){$('reminderDate').value=localISO(d);}
function fillText(){
 const raw=$('spokenReminder').value.trim();if(!raw)return status(t('Describe the reminder first.','Сначала опишите напоминание.'));
 const s=raw.toLowerCase(),now=new Date(),date=new Date();
 let parsedDate=false;
 if(/послезавтра|day after tomorrow/.test(s)){date.setDate(now.getDate()+2);parsedDate=true;}
 else if(/завтра|tomorrow|demain|завтра/.test(s)){date.setDate(now.getDate()+1);parsedDate=true;}
 else {
  const months=/через\s+(\d+|один|одну|два|две|три)\s+месяц|in\s+(\d+)\s+months?/.exec(s);
  if(months){const map={один:1,одну:1,два:2,две:2,три:3},n=Number(months[1]||months[2])||map[months[1]]||1;date.setMonth(now.getMonth()+n);parsedDate=true;}
 }
 const time=s.match(/(?:в|at|à)\s*(\d{1,2})\s*[:.]\s*(\d{2})|(?:в|at|à)\s*(\d{1,2})(?!\d)/);
 if(time){let h=Number(time[1]||time[3]),m=Number(time[2]||0);if(/pm/.test(s)&&h<12)h+=12;if(/am/.test(s)&&h===12)h=0;if(h<24&&m<60)$('reminderTime').value=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
 const direct=s.match(/\b(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{4}))?\b/);
 if(direct){date.setFullYear(Number(direct[3]||now.getFullYear()),Number(direct[2])-1,Number(direct[1]));parsedDate=true;}
 let weekdays=[];
 const variants=[/понедельник|monday|lundi|понеділ/,/вторник|tuesday|mardi|вівтор/,/сред|wednesday|mercredi|серед/,/четвер|thursday|jeudi|четвер/,/пятниц|пятниц|friday|vendredi|п’ятниц|пятниц/,/суббот|saturday|samedi|субот/,/воскрес|sunday|dimanche|неділ/];
 variants.forEach((re,i)=>{if(re.test(s))weekdays.push(i+1);});
 if(/кажд|every|chaque|щотиж|щодня|tous les/.test(s)){if(/каждый день|every day|щодня|tous les jours/.test(s))$('repeatRule').value='daily';else if(/каждый месяц|every month|chaque mois/.test(s))$('repeatRule').value='monthly';else if(weekdays.length){$('repeatRule').value='weekly';setDays(weekdays);}}
 if($('repeatRule').value==='weekly'&&weekdays.length){
  const isoDay=(now.getDay()+6)%7+1;
  const offset=(weekdays[0]-isoDay+7)%7;
  if(!parsedDate)date.setDate(now.getDate()+offset);
 }
 if(/за час|за 1 час|one hour before|1 hour before/.test(s))$('advanceMinutes').value='60';
 else if(/за день|one day before|1 day before/.test(s))$('advanceMinutes').value='1440';
 else {const adv=s.match(/за\s+(\d+)\s+мин|\b(\d+)\s+minutes? before/);if(adv&&[5,15,30,60,120].includes(Number(adv[1]||adv[2])))$('advanceMinutes').value=adv[1]||adv[2];}
 const phrase=raw.replace(/^(напомни(?:\s+мне)?|remind me(?:\s+to)?|rappelle[- ]moi)\s*/i,'').replace(/\b(завтра|послезавтра|tomorrow|demain)\b/gi,'').replace(/\b(?:в|at)\s*\d{1,2}(?::\d{2})?/gi,'').replace(/(?:за\s+(?:час|день|\d+\s+минут)|one hour before)/gi,'').trim().replace(/^[,\s]+|[,\s]+$/g,'');
 if(phrase)$('reminderWhat').value=phrase.slice(0,180);
 if(parsedDate)setDate(date);
 $('repeatDays').hidden=$('repeatRule').value!=='weekly';
 status(t('I filled what I could. Please verify all fields.','Я заполнил то, что удалось распознать. Проверьте все поля.'));
}
function fromFields(){
 const title=$('reminderWhat').value.trim(),date=$('reminderDate').value,time=$('reminderTime').value;
 if(!title||!date||!time)throw Error(t('Fill in what, day and time.','Заполните что напомнить, дату и время.'));
 const parsed=new Date(date+'T'+time+':00');
 if(Number.isNaN(+parsed)||localISO(parsed)!==date)throw Error(t('Invalid date.','Некорректная дата.'));
 if(parsed.getTime()<=Date.now())throw Error(t('Choose a future date and time.','Выберите дату и время в будущем.'));
 const recurrence=$('repeatRule').value,days=recurrence==='weekly'?selectedDays():[];
 if(recurrence==='weekly'&&!days.length)throw Error(t('Choose at least one weekday.','Выберите хотя бы один день недели.'));
 return {title,date,time,timezone:zone,recurrence,weekdays:days,advanceMinutes:Number($('advanceMinutes').value),channel:$('notifyVia').value};
}
function summary(x){
 const opts={dateStyle:'full',timeStyle:'short',timeZone:x.timezone};
 const shown=new Date(x.date+'T'+x.time+':00').toLocaleString(locale,opts);
 const desc={none:t('Once','Один раз'),daily:t('Every day','Каждый день'),weekly:t('Selected weekdays: ','По дням: ')+x.weekdays.join(', '),monthly:t('Monthly','Каждый месяц')}[x.recurrence];
 return x.title+' — '+shown+' ('+x.timezone+'). '+desc+'. '+t('Alert ','Предупредить за ')+x.advanceMinutes+t(' minutes before.',' минут до начала.')+' '+x.channel+'.';
}
async function list(){
 try{
  const data=await api('');const list=$('reminderList');list.replaceChildren();
  if(!data.items.length){list.textContent=t('No reminders yet.','Пока нет напоминаний.');return;}
  for(const item of data.items){
   const row=document.createElement('article');row.className='reminder-entry';
   const title=document.createElement('strong');title.textContent=item.title;
   const desc=document.createElement('p');desc.textContent=new Date(item.event_at).toLocaleString(locale,{dateStyle:'medium',timeStyle:'short',timeZone:item.timezone})+' · '+item.recurrence+' · '+item.channel;
   const actions=document.createElement('div');actions.className='actions';
   const edit=document.createElement('button');edit.type='button';edit.textContent=t('Edit','Изменить');edit.onclick=()=>{
    $('reminderWhat').value=item.title;
    $('reminderDate').value=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:item.timezone}).format(new Date(item.event_at));
    $('reminderTime').value=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:item.timezone}).format(new Date(item.event_at));
    $('repeatRule').value=item.recurrence;setDays(item.weekdays||[]);$('repeatDays').hidden=item.recurrence!=='weekly';
    $('advanceMinutes').value=String(item.advance_minutes);$('notifyVia').value=item.channel;
    $('reminderWhat').dataset.editId=item.id;window.scrollTo({top:0,behavior:'smooth'});
    status(t('Editing reminder; confirm and save again.','Редактирование: проверьте и сохраните заново.'));
   };
   const del=document.createElement('button');del.type='button';del.textContent=t('Delete','Удалить');del.onclick=async()=>{
    if(!confirm(t('Delete this reminder?','Удалить напоминание?')))return;
    try{await api('/'+encodeURIComponent(item.id),{method:'DELETE'});await list();}catch(e){status(errorText(e));}
   };actions.append(edit,del);row.append(title,desc,actions);list.append(row);
  }
 }catch(e){$('reminderList').textContent=errorText(e);}
}
async function enablePush(){
 try{
  if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))throw Error(t('Push is unsupported here. Use an installed browser app or Telegram.','В этом браузере push не поддерживается. Откройте установленное веб-приложение или выберите Telegram.'));
  const cfg=await api('/config');
  if(!cfg.publicKey)throw Error(t('App push notifications are not configured yet.','Уведомления приложения пока не настроены.'));
  const permission=await Notification.requestPermission();
  if(permission!=='granted')throw Error(t('Notifications were not allowed.','Нет разрешения на уведомления.'));
  const registration=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
  const key=Uint8Array.from(atob(cfg.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  await api('/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(subscription)});
  $('notifyVia').value='push';status(t('App notifications enabled.','Уведомления приложения включены.'));
 }catch(e){status(errorText(e));}
}
async function telegram(){
 try{
  const r=await api('/telegram-link',{method:'POST'});
  window.open(r.url,'_blank','noopener');
  status(t('Open Telegram and press Start to link reminders.','Откройте Telegram и нажмите Start для подключения напоминаний.'));
 }catch(e){status(errorText(e));}
}
function speechInput(){
 const API=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!API){$('reminderMic').disabled=true;$('reminderMic').title=t('Voice input is not supported in this browser.','Голосовой ввод не поддерживается этим браузером.');return;}
 $('reminderMic').onclick=()=>{
  if(speech){speech.stop();return;}
  speech=new API();speech.lang=navigator.language||'en-US';speech.interimResults=false;
  speech.onresult=e=>{$('spokenReminder').value=e.results[0][0].transcript;fillText();};
  speech.onerror=()=>status(t('Microphone unavailable. You can type instead.','Микрофон недоступен. Можно ввести текст.'));
  speech.onend=()=>{speech=null;};speech.start();
 };
}
setCopy();$('repeatRule').onchange=()=>{$('repeatDays').hidden=$('repeatRule').value!=='weekly';$('reminderConfirmation').hidden=true;};
$('reminderParse').onclick=fillText;
$('reminderPreview').onclick=()=>{try{draft=fromFields();$('confirmSummary').textContent=summary(draft);$('reminderConfirmation').hidden=false;status('');}catch(e){status(errorText(e));}};
$('confirmEdit').onclick=()=>{$('reminderConfirmation').hidden=true;};
$('confirmSave').onclick=async()=>{
 if(!draft)return;
 $('confirmSave').disabled=true;
 try{
  const id=$('reminderWhat').dataset.editId;
  await api(id?'/'+encodeURIComponent(id):'',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});
  delete $('reminderWhat').dataset.editId;$('reminderConfirmation').hidden=true;draft=null;
  status(t('Reminder saved.','Напоминание сохранено.'));await list();
 }catch(e){status(errorText(e));}finally{$('confirmSave').disabled=false;}
};
$('enableNotifications').onclick=enablePush;$('connectTelegram').onclick=telegram;speechInput();
const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);setDate(tomorrow);
$('notifySupport').textContent=t('App notifications require a supported browser and permission; Telegram works after linking the bot.','Для уведомлений от приложения нужны поддерживаемый браузер и разрешение. Telegram работает после подключения бота.');
if(userToken())list();else $('reminderList').textContent=t('Sign in first to synchronize reminders across devices.','Сначала войдите в аккаунт, чтобы напоминания сохранялись между устройствами.');
