import {parseReminderText} from './reminder-input-parser.js';
import './reminder-photo.js';
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
 const raw=$('spokenReminder').value.trim();
 if(!raw)return status(t('Describe the reminder first.','Сначала продиктуйте или напишите напоминание.'));
 const p=parseReminderText(raw,new Date());
 if(p.title)$('reminderWhat').value=p.title;
 if(p.date)$('reminderDate').value=p.date;
 if(p.time)$('reminderTime').value=p.time;
 if(p.recurrence)$('repeatRule').value=p.recurrence;
 if(p.weekdays?.length)setDays(p.weekdays);
 if(p.advanceMinutes!==null)$('advanceMinutes').value=String(p.advanceMinutes);
 $('repeatDays').hidden=$('repeatRule').value!=='weekly';
 $('reminderConfirmation').hidden=true;
 draft=null;
 const missing=[];
 if(!p.date)missing.push(t('date','дату'));
 if(!p.time)missing.push(t('time','время'));
 const msg=missing.length
  ?t('Speech recognized. Please enter/check ','Речь распознана. Уточните ')+missing.join(', ')+'.'
  :t('Details filled from speech. Review the date, time and task before saving.','Данные из голосового ввода заполнены. Проверьте задачу, дату и время перед сохранением.');
 status(p.notes.includes('MULTIPLE_TIMES')?t('Several times detected. Choose the correct time manually.','Найдено несколько вариантов времени. Выберите правильное вручную.'):msg);
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
   const calendar=document.createElement('button');calendar.type='button';
   calendar.textContent=t('Add to calendar','В календарь','Au calendrier','У календар');
   calendar.onclick=()=>exportICS(item);
   const del=document.createElement('button');del.type='button';del.textContent=t('Delete','Удалить');del.onclick=async()=>{
    if(!confirm(t('Delete this reminder?','Удалить напоминание?')))return;
    try{await api('/'+encodeURIComponent(item.id),{method:'DELETE'});await list();}catch(e){status(errorText(e));}
   };actions.append(edit,calendar,del);row.append(title,desc,actions);list.append(row);
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
 const mic=$('reminderMic'),hint=$('voiceHint'),API=window.SpeechRecognition||window.webkitSpeechRecognition;
 const idle=t('🎙️ Dictate reminder','🎙️ Продиктовать напоминание','🎙️ Dicter un rappel','🎙️ Продиктувати нагадування');
 const stop=t('■ Stop recording','■ Завершить запись','■ Arrêter','■ Зупинити запис');
 mic.textContent=idle;
 hint.textContent=t('Tap the microphone, say what and when. Review the fields before saving.','Нажмите микрофон и скажите, что и когда напомнить. Затем проверьте поля.','Touchez le micro, dictez la tâche et la date. Vérifiez avant de sauvegarder.','Натисніть мікрофон, скажіть що й коли нагадати. Перевірте поля.');
 if(!API){
  mic.disabled=true;mic.title=t('Voice recognition is unavailable in this browser. Use the text field instead.','Этот браузер не поддерживает распознавание голоса. Используйте текстовое поле.');
  hint.textContent=mic.title;
  return;
 }
 mic.onclick=()=>{
  if(speech){speech.stop();return;}
  const recognition=new API();speech=recognition;
  recognition.lang=navigator.language||'en-US';
  recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=1;
  let received=false;
  recognition.onstart=()=>{mic.textContent=stop;mic.setAttribute('aria-pressed','true');status(t('Listening… Speak clearly.','Слушаю… Говорите.'));};
  recognition.onresult=e=>{
   const transcript=Array.from(e.results||[]).map(r=>r[0]?.transcript||'').join(' ').trim();
   if(!transcript)return;
   received=true;$('spokenReminder').value=transcript;fillText();
  };
  recognition.onerror=e=>{
   const code=String(e?.error||'');
   const msg=code==='not-allowed'||code==='service-not-allowed'
    ?t('Microphone permission denied. Allow it in browser settings or type a reminder.','Нет разрешения на микрофон. Разрешите его в браузере или напишите напоминание.')
    :t('Speech recognition failed. You can type the reminder instead.','Не удалось распознать речь. Можно написать напоминание вручную.');
   status(msg);
  };
  recognition.onend=()=>{
   if(speech===recognition)speech=null;
   mic.textContent=idle;mic.setAttribute('aria-pressed','false');
   if(!received&&!$('reminderStatus').textContent.includes('микрофон')){ /* Retain recognition error if displayed. */ }
  };
  try{recognition.start();}catch(e){speech=null;mic.textContent=idle;mic.setAttribute('aria-pressed','false');status(t('Microphone could not start. Try typing.','Не удалось включить микрофон. Попробуйте написать текст.'));}
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
if(userToken()){list();loadNotes();handlePushAction();}else $('reminderList').textContent=t('Sign in first to synchronize reminders across devices.','Сначала войдите в аккаунт, чтобы напоминания сохранялись между устройствами.');


function exportICS(reminder){
 const date=String(reminder.date_local).slice(0,10).replace(/-/g,'');
 const time=String(reminder.time_local).slice(0,5).replace(':','');
 const zone=String(reminder.timezone);
 const escape=s=>String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const local=date+'T'+time+'00';
 const uid='vv-reminder-'+reminder.id+'@video-uniquifier';
 const trigger=Number(reminder.advance_minutes)===0?'PT0S':'-PT'+Number(reminder.advance_minutes)+'M';
 const start=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Video Uniquifier//Smart Reminders//EN',
  'BEGIN:VEVENT','UID:'+uid,'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z'),
  'SUMMARY:'+escape(reminder.title),'DTSTART;TZID='+zone+':'+local,'DURATION:PT15M'];
 if(reminder.recurrence==='daily')start.push('RRULE:FREQ=DAILY');
 if(reminder.recurrence==='weekly')start.push('RRULE:FREQ=WEEKLY;BYDAY='+reminder.weekdays.map(n=>['','MO','TU','WE','TH','FR','SA','SU'][n]).join(','));
 if(reminder.recurrence==='monthly')start.push('RRULE:FREQ=MONTHLY');
 start.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+escape(reminder.title),'TRIGGER:'+trigger,'END:VALARM','END:VEVENT','END:VCALENDAR');
 const file=new File([start.join('\r\n')+'\r\n'],'reminder-'+reminder.id+'.ics',{type:'text/calendar'});
 const url=URL.createObjectURL(file),link=document.createElement('a');
 link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
 status(t('Calendar file created. Open the ICS file to import it. This is a one-way export.','Файл календаря готов. Откройте ICS, чтобы импортировать событие. Это односторонний экспорт.'));
}
async function handlePushAction(){
 const args=new URLSearchParams(location.search),action=args.get('action'),id=args.get('id');
 if(!['done','snooze'].includes(action)||!/^[a-f0-9-]{36}$/i.test(id||''))return;
 history.replaceState(history.state,'',location.pathname+location.hash);
 try{
  await api('/'+encodeURIComponent(id)+'/'+action,{method:'POST'});
  status(action==='done'?t('Reminder completed.','Напоминание отмечено выполненным.'):t('Snoozed for 10 minutes.','Напоминание отложено на 10 минут.'));
  await list();
 }catch(e){status(errorText(e));}
}
function setNotesCopy(){
 $('notesHeading').textContent=t('Quick notes','Быстрые заметки','Notes rapides','Швидкі нотатки');
 $('notesHint').textContent=t('Notes are saved in your account and appear on your other devices after sign-in.','Заметки сохраняются в аккаунте и доступны на других устройствах после входа.');
 $('notesBodyLabel').textContent=t('Write a note','Напишите заметку','Écrire une note','Написати нотатку');
 $('notesBody').placeholder=t('Write here…','Напишите здесь…');
 $('notesSave').textContent=t('Save note','Сохранить заметку','Enregistrer','Зберегти');
}
let editingNoteId=null;
async function loadNotes(){
 try{
  const data=await api('/notes');
  const box=$('notesList');box.replaceChildren();
  if(!data.items.length){box.textContent=t('No notes yet.','Пока нет заметок.');return;}
  for(const note of data.items){
   const row=document.createElement('article');row.className='reminder-entry';
   const text=document.createElement('p');text.textContent=note.body;
   const actions=document.createElement('div');actions.className='actions';
   const edit=document.createElement('button');edit.type='button';edit.textContent=t('Edit','Изменить');edit.onclick=()=>{
    editingNoteId=note.id;$('notesBody').value=note.body;$('notesBody').focus();};
   const del=document.createElement('button');del.type='button';del.textContent=t('Delete','Удалить');del.onclick=async()=>{
    if(!confirm(t('Delete note?','Удалить заметку?')))return;
    try{await api('/notes/'+encodeURIComponent(note.id),{method:'DELETE'});if(editingNoteId===note.id){editingNoteId=null;$('notesBody').value='';}await loadNotes();}
    catch(e){$('notesStatus').textContent=errorText(e);}
   };
   actions.append(edit,del);row.append(text,actions);box.append(row);
  }
 }catch(e){$('notesList').textContent=errorText(e);}
}
setNotesCopy();
$('notesSave').onclick=async()=>{
 const body=$('notesBody').value.trim();if(!body)return;
 $('notesSave').disabled=true;
 try{
  await api('/notes'+(editingNoteId?'/'+editingNoteId:''),{
   method:editingNoteId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body})});
  editingNoteId=null;$('notesBody').value='';
  $('notesStatus').textContent=t('Note saved and synced.','Заметка сохранена и синхронизирована.');
  await loadNotes();
 }catch(e){$('notesStatus').textContent=errorText(e);}
 finally{$('notesSave').disabled=false;}
};
