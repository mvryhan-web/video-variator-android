/* Lightweight offline date/time extraction used for dictated or typed reminders.
 * Never saves anything; the user must review and confirm the form.
 * Unsupported/ambiguous phrases remain for manual correction.
 */
const ruMonths=['январ','феврал','март','апрел','ма','июн','июл','август','сентябр','октябр','ноябр','декабр'];
const enMonths=['january','february','march','april','may','june','july','august','september','october','november','december'];
const frMonths=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const ukMonths=['січ','лют','берез','квіт','трав','черв','лип','серп','верес','жовт','листопад','груд'];
const dayPatterns=[
 /понедельник|понеділ|monday|lundi/i,
 /вторник|вівтор|tuesday|mardi/i,
 /сред[ауеы]|серед|wednesday|mercredi/i,
 /четверг|четвер|thursday|jeudi/i,
 /пятниц|пятниц|п'ятниц|п’ятниц|friday|vendredi/i,
 /суббот|субот|saturday|samedi/i,
 /воскрес|неділ|sunday|dimanche/i
];
function localDate(d){const z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());}
function validDate(d,y,m,day){return d.getFullYear()===y&&d.getMonth()===m-1&&d.getDate()===day;}
function timeValue(h,m,ampm=''){h=Number(h);m=Number(m);if(ampm.toLowerCase()==='pm'&&h<12)h+=12;if(ampm.toLowerCase()==='am'&&h===12)h=0;return h>=0&&h<=23&&m>=0&&m<=59?String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'):null;}
function monthIndex(s){const v=s.toLowerCase();for(let i=0;i<12;i++){if([ruMonths[i],enMonths[i],frMonths[i],ukMonths[i]].some(a=>a&&v.startsWith(a)))return i+1;}return 0;}
const isoDate=/\b(20\d{2})[-\/](0?[1-9]|1[012])[-\/](0?[1-9]|[12]\d|3[01])\b/;
const dayDate=/\b(0?[1-9]|[12]\d|3[01])[.\/-](0?[1-9]|1[012])(?:[.\/-](20\d{2}))?\b/;
const wordDate=/\b(\d{1,2})\s+([^\d\s.,:\/-]{3,18})(?:\s+(20\d{2}))?\b/iu;
function chooseFutureDate(day,month,year,now){const y=year||now.getFullYear();let d=new Date(y,month-1,day);if(!validDate(d,y,month,day))return null;if(!year&&d<new Date(now.getFullYear(),now.getMonth(),now.getDate())){d=new Date(y+1,month-1,day);if(!validDate(d,y+1,month,day))return null;}return d;}
export function parseReminderText(raw,now=new Date()){
 const text=String(raw||'').trim(),s=text.toLowerCase(),out={title:null,date:null,time:null,recurrence:null,weekdays:[],advanceMinutes:null,notes:[]};
 if(!text)return out;
 const weekdays=dayPatterns.flatMap((p,i)=>p.test(s)?[i+1]:[]);
 const repeats=/\b(every|chaque|tous les)\b|кажд|кожн|щодня|щотиж/i.test(s);
 if(/каждый день|кожен день|щодня|every day|tous les jours/i.test(s))out.recurrence='daily';
 else if(/каждый месяц|кожного місяця|щомісяця|every month|chaque mois/i.test(s))out.recurrence='monthly';
 else if(repeats&&weekdays.length){out.recurrence='weekly';out.weekdays=weekdays;}
 let d=null;
 const afterTomorrow=/послезавтра|післязавтра|day after tomorrow|après-demain/i.test(s);
 if(afterTomorrow){d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+2);}
 else if(/завтра|tomorrow|demain/i.test(s)){d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);}
 else{
  let m=s.match(isoDate);if(m)d=chooseFutureDate(Number(m[3]),Number(m[2]),Number(m[1]),now);
  if(!d){m=s.match(dayDate);if(m)d=chooseFutureDate(Number(m[1]),Number(m[2]),m[3]?Number(m[3]):null,now);}
  if(!d){m=s.match(wordDate);if(m){const mm=monthIndex(m[2]);if(mm)d=chooseFutureDate(Number(m[1]),mm,m[3]?Number(m[3]):null,now);}}
  if(!d){
   m=s.match(/(?:через|in|dans|за)\s+(\d+|один|одну|два|дві|две|три|one|two|three)\s+(месяц\w*|місяц\w*|months?|mois|дн[ьяей]+|день|днів|days?|jours?)/i);
   if(m){const words={один:1,одну:1,два:2,две:2,дві:2,три:3,one:1,two:2,three:3};const n=Number(m[1])||words[m[1]]||0;const unit=m[2];
    if(n>0&&n<=120){d=new Date(now);if(/мес|місяц|month|mois/i.test(unit)){const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));}else d.setDate(d.getDate()+n);}
   }
  }
 }
 if(!d&&weekdays.length){const jsDay=(now.getDay()+6)%7+1, offsets=weekdays.map(day=>(day-jsDay+7)%7);let off=Math.min(...offsets);d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+off);}
 if(d)out.date=localDate(d);
 // Prefer explicit times with a colon or "18 часов". Do not confuse dates with times.
 const times=[...s.matchAll(/(?:\b(?:в|о|at|à|in|на)\s*)?(\d{1,2})[:](\d{2})\s*(am|pm)?\b/gi)]
   .map(m=>timeValue(m[1],m[2],m[3]||'')).filter(Boolean);
 const hour=s.match(/(?:\bв|\bat|\bà)\s*(\d{1,2})\s*(?:час(?:ов|а)?|годин[уі]?|o'clock|h)\b/i);
 const ampm=s.match(/\b(\d{1,2})\s*(am|pm)\b/i);
 if(times.length===1)out.time=times[0];
 else if(times.length>1)out.notes.push('MULTIPLE_TIMES');
 else if(hour)out.time=timeValue(hour[1],0);
 else if(ampm)out.time=timeValue(ampm[1],0,ampm[2]);
 const minutes=s.match(/(?:за|before|avant)\s+(\d{1,4})\s*(?:минут|хвилин|minutes?)/i);
 if(minutes&&[5,15,30,60,120,1440].includes(Number(minutes[1])))out.advanceMinutes=Number(minutes[1]);
 else if(/за\s+(?:один\s+)?час\b|one hour before|1 hour before|une heure avant/i.test(s))out.advanceMinutes=60;
 else if(/за\s+(?:один\s+)?день\b|one day before|1 day before|un jour avant/i.test(s))out.advanceMinutes=1440;
 // Use the user's wording, avoid overinterpreting the task.
 let title=text.replace(/^\s*(напомни(?:\s+мне)?|нагадай(?:\s+мені)?|remind me(?:\s+to)?|rappelle[- ]moi)\s*/i,'')
  .replace(/\b(?:завтра|послезавтра|післязавтра|tomorrow|demain)\b/gi,'')
  .replace(/\b(?:в|at|à)\s*\d{1,2}(?::\d{2})?\s*(?:час(?:ов|а)?|годин[уі]?)?/gi,'')
  .replace(/\b(?:за\s+(?:\d+\s+)?(?:час|день|минут\w*|хвилин\w*|годин\w*))\b/gi,'')
  .replace(/^[\s,.:;-]+|[\s,.:;-]+$/g,'').trim();
 out.title=(title||text).slice(0,180);
 if(!out.date)out.notes.push('DATE_NOT_DETECTED');
 if(!out.time)out.notes.push('TIME_NOT_DETECTED');
 return out;
}
export function extractTicketDateTimes(text,now=new Date()){
 const s=String(text||'');
 const result=[];
 // Return options; never guess whether a time means boarding, departure or arrival.
 for(const m of s.matchAll(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/g)){
  const d=chooseFutureDate(+m[3],+m[2],+m[1],now);if(d)result.push({date:localDate(d),source:m[0]});
 }
 for(const m of s.matchAll(/\b(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](20\d{2}))?\b/g)){
  const d=chooseFutureDate(+m[1],+m[2],m[3]?+m[3]:null,now);if(d)result.push({date:localDate(d),source:m[0]});
 }
 for(const m of s.matchAll(/\b(\d{1,2})\s+([^\d\s,.:]{3,18})(?:\s+(20\d{2}))?\b/giu)){
  const month=monthIndex(m[2]);if(!month)continue;const d=chooseFutureDate(+m[1],month,m[3]?+m[3]:null,now);if(d)result.push({date:localDate(d),source:m[0]});
 }
 const dates=[...new Map(result.map(x=>[x.date,x])).values()];
 const times=[...new Set([...s.matchAll(/\b(\d{1,2})[:h](\d{2})\b/gi)].map(m=>timeValue(m[1],m[2])).filter(Boolean))];
 return {dates,times};
}
