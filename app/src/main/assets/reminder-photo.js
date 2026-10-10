/* Secondary option: scan ticket or appointment image on-device and suggest dates/times.
 * Saving a reminder always uses the main form confirmation, never automatic OCR output.
 */
import {extractTicketDateTimes} from './reminder-input-parser.js';
const $=id=>document.getElementById(id);
const lng=(navigator.language||'en').slice(0,2),ru=lng==='ru',uk=lng==='uk',fr=lng==='fr';
const t=(en,r,fa,ua)=>ru?(r||en):fr?(fa||en):uk?(ua||r||en):en;
const input=$('reminderPhotoFile'),scan=$('reminderScanPhoto');
const preview=$('photoPreview'),text=$('photoRecognized'),textLine=$('photoRecognizedLine');
const status=$('photoStatus'),candidates=$('photoCandidates');
let photoURL=null,working=false;
$('photoSummary').textContent=t('📷 Optional: create from a photo','📷 Дополнительно: создать по фото','📷 Facultatif : créer à partir d’une photo','📷 Додатково: створити з фото');
$('photoExplain').textContent=t('Take a photo of a ticket or appointment letter. The image stays on this device. Check all details before saving.','Сфотографируйте билет или запись к врачу. Фото останется на устройстве. Перед сохранением проверьте дату и время.','Prenez un billet en photo. Vérifiez la date et l’heure avant de sauvegarder.','Сфотографуйте квиток або запис. Перевірте дату й час перед збереженням.');
$('photoLabel').textContent=t('Choose a photo or take one with your camera','Выберите фото или сфотографируйте билет','Choisir ou prendre une photo','Оберіть фото або сфотографуйте');
scan.textContent=t('Recognize dates and times','Распознать дату и время','Reconnaître la date et l’heure','Розпізнати дату й час');
$('photoRecognizedLabel').textContent=t('Text found (editable)','Распознанный текст (можно исправить)','Texte reconnu (modifiable)','Розпізнаний текст (можна виправити)');
function setStatus(s){status.textContent=s;}
function clearPreview(){if(photoURL)URL.revokeObjectURL(photoURL);photoURL=null;preview.hidden=true;preview.removeAttribute('src');}
input.addEventListener('change',()=>{
 clearPreview();candidates.hidden=true;candidates.replaceChildren();textLine.hidden=true;
 const f=input.files?.[0];if(!f)return;
 if(!f.type.startsWith('image/')||f.size>15*1048576){setStatus(t('Use an image smaller than 15 MB.','Выберите изображение меньше 15 МБ.'));input.value='';return;}
 photoURL=URL.createObjectURL(f);preview.src=photoURL;preview.hidden=false;setStatus('');
});
function setField(id,value){$(id).value=value;$('reminderConfirmation').hidden=true;}
function addCandidate(label,action){
 const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',()=>{action();setStatus(t('Value selected. Check all fields before saving.','Значение выбрано. Проверьте все поля перед сохранением.'));});candidates.append(button);
}
function showCandidates(str){
 candidates.replaceChildren();
 const {dates,times}=extractTicketDateTimes(str);
 // Do not leave a default date/time in place when the ticket is ambiguous.
 setField('reminderDate',dates.length===1?dates[0].date:'');
 setField('reminderTime',times.length===1?times[0]:'');
 // Never silently guess which of multiple flight departure/arrival times is intended.
 if(dates.length>1){const line=document.createElement('p');line.textContent=t('Several dates found — choose the event date:','Найдено несколько дат — выберите дату события:');candidates.append(line);dates.forEach(d=>addCandidate(d.date+' ('+d.source+')',()=>setField('reminderDate',d.date)));}
 if(times.length>1){const line=document.createElement('p');line.textContent=t('Several times found — choose the correct one:','Найдено несколько вариантов времени — выберите нужный:');candidates.append(line);times.forEach(v=>addCandidate(v,()=>setField('reminderTime',v)));}
 candidates.hidden=!candidates.childElementCount;
 if(!$('reminderWhat').value.trim()){
   setField('reminderWhat',t('Ticket / appointment','Билет или запись','Billet / rendez-vous','Квиток або запис'));
 }
 if(!dates.length||!times.length){
   setStatus(t('Recognition finished. Could not reliably identify all details; fill in missing date/time yourself.','Распознавание завершено. Не все даты и время удалось определить — заполните недостающие поля вручную.'));
 }else if(dates.length>1||times.length>1){
   setStatus(t('Recognition finished. Select the correct date and time.','Распознавание завершено. Выберите правильные дату и время.'));
 }else setStatus(t('Date and time filled from the photo. Check them before saving.','Дата и время заполнены из фотографии. Проверьте перед сохранением.'));
}
$('photoRecognized').addEventListener('input',()=>showCandidates(text.value));
async function loadOCR(){
 if(window.Tesseract)return window.Tesseract;
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/ocr/tesseract.min.js';script.onload=resolve;script.onerror=()=>reject(Error('OCR_LIBRARY_UNAVAILABLE'));document.head.append(script);});
 if(!window.Tesseract)throw Error('OCR_LIBRARY_UNAVAILABLE');return window.Tesseract;
}
scan.onclick=async()=>{
 if(working)return;
 const file=input.files?.[0];if(!file){setStatus(t('Choose a photo first.','Сначала выберите фотографию.'));return;}
 working=true;scan.disabled=true;setStatus(t('Reading the ticket on your device. First run may download a language model…','Читаю билет на устройстве. При первом запуске может загрузиться языковая модель…'));
 let worker=null;
 try{
  const T=await loadOCR();
  const lang=ru?['rus','eng']:uk?['ukr','eng']:fr?['fra','eng']:['eng'];
  worker=await T.createWorker(lang,1,{
    workerPath:'/vendor/ocr/worker.min.js',
    corePath:'/vendor/ocr-core/tesseract-core-simd.wasm.js',
    langPath:'https://tessdata.projectnaptha.com/4.0.0',
    workerBlobURL:false
  });
  const r=await worker.recognize(file);const recognized=(r?.data?.text||'').trim();
  if(!recognized)throw Error(t('No readable text detected. Try a clearer photo.','Текст не найден. Сделайте фотографию чётче.'));
  text.value=recognized.slice(0,10000);textLine.hidden=false;
  showCandidates(text.value);
 }catch(e){
  setStatus(t('Photo recognition is unavailable. You can always enter a reminder by voice or text.','Не удалось распознать фото. Напоминание можно создать голосом или текстом.')+' '+String(e?.message||''));
 }finally{if(worker)try{await worker.terminate();}catch(_){}working=false;scan.disabled=false;}
};
