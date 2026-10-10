/* Free mobile utilities: processing on-device, no raw file uploads. */
import {createEngine,saveLocal,subtitleFiles} from './ai-media.js';
const $=id=>document.getElementById(id);
const catalog=window.VUMobileToolsCatalog,tool=new URLSearchParams(location.search).get('tool');
const mode=catalog?.tools.find(x=>x.id===tool);
const lang=catalog?.lang||'en',ru=lang==='ru';
const label=(en,russian)=>ru?russian:en;
if(!mode)location.replace('free-tools.html');
else init();

function field(name,visible){const el=$(name+'Line');if(el)el.hidden=!visible;}
function status(msg){$('utilityStatus').textContent=msg;}
function help(en,russian){$('utilityHelp').textContent=label(en,russian);}
function loadScript(src,globalName){
 if(window[globalName])return Promise.resolve(window[globalName]);
 return new Promise((ok,no)=>{const script=document.createElement('script');script.src=src;script.onload=()=>window[globalName]?ok(window[globalName]):no(Error('Library unavailable'));script.onerror=()=>no(Error('Library loading failed'));document.head.append(script);});
}
const pdf=()=>loadScript('/vendor/pdf-lib/pdf-lib.min.js','PDFLib');
const jszip=()=>loadScript('/vendor/jszip/jszip.min.js','JSZip');
const qr=()=>loadScript('/vendor/qr/qrcode.js','qrcode');
const fileTypes={
 'scan-pdf':['image/*',true],'pdf-merge':['application/pdf,.pdf',true],
 'pdf-split':['application/pdf,.pdf',false],'pdf-sign':['application/pdf,.pdf',false],
 'pdf-compress':['application/pdf,.pdf',false],
 'photo-convert':['image/*',false],'photo-resize':['image/*',false],
 'photo-redact':['image/*',false],'photo-ocr':['image/*',false],
 'video-trim':['video/*',false],'video-mute':['video/*',false],
 'audio-trim':['audio/*',false],'qr':['',false],
 'zip':['*/*',true],'captions':['video/*,audio/*',false]};
const timeModes=['video-trim','audio-trim'];
let active=false,abort=false,engine=null,redactRects=[],redactImage=null,redactBase=null,redactDragging=null;
function init(){
 $('utilityTitle').textContent=mode.title;document.title=mode.title+' · Video Uniquifier';
 $('utilityDescription').textContent=mode.note;document.getElementById('utilityBack').textContent=label('← Free tools','← Бесплатные инструменты');
 $('utilityKicker').textContent=label('FREE • ON DEVICE','БЕСПЛАТНО • НА УСТРОЙСТВЕ');
 $('utilityFileLabel').textContent=label('Choose files','Выберите файлы');
 $('utilityRun').textContent=label('Create result','Создать результат');
 $('utilityCancel').textContent=label('Cancel','Отмена');
 $('utilityFormatLabel').textContent=label('Output format','Формат результата');
 $('utilityStartLabel').textContent=label('Start (seconds)','Начало (секунды)');
 $('utilityEndLabel').textContent=label('End (seconds)','Конец (секунды)');
 $('utilityWidthLabel').textContent=label('Width (px)','Ширина (пиксели)');
 $('utilityHeightLabel').textContent=label('Height (px)','Высота (пиксели)');
 $('utilityPagesLabel').textContent=label('Page numbers, e.g. 1-3,5','Номера страниц, например 1-3,5');
 $('utilityQrLabel').textContent=label('Link or QR text','Ссылка или текст для QR-кода');
 $('utilityKindLabel').textContent=label('ZIP action','Действие с ZIP');
 $('utilityKind').options[0].textContent=label('Create archive','Создать архив');
 $('utilityKind').options[1].textContent=label('Unpack archive','Распаковать архив');
 $('signatureHint').textContent=label('Draw your signature with a finger or mouse.','Нарисуйте подпись пальцем или мышью.');
 $('signatureClear').textContent=label('Clear signature','Очистить подпись');
 $('redactHint').textContent=label('Drag over private information. Opaque boxes cover pixels permanently.','Проведите по личным данным. Непрозрачные прямоугольники навсегда закроют выбранные участки.');
 $('redactUndo').textContent=label('Undo last','Отменить последнее');
 $('redactReset').textContent=label('Start over','Сбросить');
 const [accept,multiple]=fileTypes[tool]||['',false];
 $('utilityFiles').accept=accept;$('utilityFiles').multiple=multiple;
 $('fileLine').hidden=tool==='qr';
 $('textLine').hidden=tool!=='pdf-sign';
 $('utilityTextLabel').textContent=label('Text to add (optional)','Текст для добавления (необязательно)');
 $('formatLine').hidden=!['photo-convert','photo-resize'].includes(tool);
 for(const f of ['start','end'])field(f,timeModes.includes(tool));
 for(const f of ['width','height'])field(f,tool==='photo-resize');
 field('pages',tool==='pdf-split'||tool==='pdf-sign');
 field('kind',tool==='zip');field('qr',tool==='qr');field('lang',tool==='photo-ocr');
 $('signatureRow').hidden=tool!=='pdf-sign';$('redactRow').hidden=tool!=='photo-redact';
 if(tool==='pdf-sign'){$('utilityPages').value='1';setupSignature();help('Add visible text or a drawn signature to a chosen page. This is not a cryptographic digital signature.','Добавьте текст или нарисованную подпись на выбранную страницу. Это не криптографическая цифровая подпись.');}
 else if(tool==='pdf-compress')help('Rewrites the PDF with object streams. Scanned image PDFs may not become smaller.','Оптимизирует структуру PDF. Сканированные файлы могут не уменьшиться.');
 else if(tool==='photo-ocr')help('First use downloads a free language model. Recognized text may contain mistakes.','При первом запуске загрузится бесплатная языковая модель. Проверьте распознанный текст.');
 else if(tool==='captions')help('Uses local transcription to create an SRT file. SRT can be imported into a video editor.','Распознаёт речь на устройстве и создаёт SRT. Файл можно добавить в видеоредактор.');
 else help('Processing stays in this browser or on your device. Keep the page open.','Обработка выполняется здесь, на устройстве. Не закрывайте страницу.');
 if(tool==='photo-resize')addResizeOption();
 if(tool==='photo-redact')setupRedaction();
 if(tool==='captions'){
  $('fileLine').hidden=true;$('settingsRow').hidden=true;
  $('utilityRun').textContent=label('Open subtitle creator','Открыть создание субтитров');
 }
 $('utilityFiles').addEventListener('change',()=>{status('');if(tool==='photo-redact')loadRedaction();if(['video-trim','audio-trim'].includes(tool))estimateDuration();});
 $('utilityKind').addEventListener('change',()=>{const unpack=$('utilityKind').value==='unpack';$('utilityFiles').accept=unpack?'.zip,application/zip':'*/*';$('utilityFiles').multiple=!unpack;$('utilityFiles').value='';});
 $('utilityRun').addEventListener('click',run);
 $('utilityCancel').onclick=()=>{abort=true;try{engine?.terminate();}catch(_){};status(label('Canceled','Отменено'));};
}
function files(){
 const f=Array.from($('utilityFiles').files);
 if(!f.length)throw Error(label('Choose a file first.','Сначала выберите файл.'));
 if(f.length>50||f.some(x=>x.size>160*1024*1024))throw Error(label('Too many or oversized files.','Слишком много файлов или большой размер.'));
 return f;
}
function safeName(s){return (s||'result').replace(/[^a-zA-Z0-9._-]/g,'_').replace(/^\.+/,'').slice(0,100)||'result';}
function base(f){return safeName(f.name.replace(/\.[^.]+$/,''));}
async function result(file){
 const row=document.createElement('div');row.className='utility-result';
 const p=document.createElement('p');p.textContent=file.name+' · '+(file.size/1048576).toFixed(2)+' MB';
 const b=document.createElement('button');b.type='button';b.textContent=label('Download','Скачать');b.onclick=()=>saveLocal(file);
 row.append(p);
 if(file.type.startsWith('image/')){const img=new Image();const url=URL.createObjectURL(file);img.src=url;img.alt=file.name;img.onload=()=>setTimeout(()=>URL.revokeObjectURL(url),60000);row.append(img);}
 row.append(b);$('utilityResults').append(row);
 return file;
}
async function textResult(text,filename){
 const row=document.createElement('div');row.className='utility-result';
 const area=document.createElement('textarea');area.value=text;area.setAttribute('aria-label',label('Recognized text','Распознанный текст'));row.append(area);
 const copy=document.createElement('button');copy.textContent=label('Copy text','Копировать текст');copy.onclick=async()=>{await navigator.clipboard.writeText(area.value);status(label('Copied','Скопировано'));};
 const b=document.createElement('button');b.textContent=label('Download TXT','Скачать TXT');b.onclick=()=>saveLocal(new File([area.value],filename,{type:'text/plain;charset=utf-8'}));row.append(copy,b);$('utilityResults').append(row);
}
async function openImage(f){
 const url=URL.createObjectURL(f),im=new Image();
 try{await new Promise((ok,no)=>{im.onload=ok;im.onerror=()=>no(Error('This image format is not supported by your browser.'));im.src=url;});
 if(im.naturalWidth*im.naturalHeight>40000000)throw Error('Image too large');
 const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);return c;
 }finally{URL.revokeObjectURL(url);}
}
const blobFrom=(canvas,type='image/png',quality=.9)=>new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error('Could not encode image')),type,quality));
function settingsNum(id){const n=Number($(id).value);if(!Number.isFinite(n)||n<0)throw Error(label('Check numeric settings.','Проверьте числовые параметры.'));return n;}
async function estimateDuration(){
 const f=$('utilityFiles').files[0];if(!f)return;
 const u=URL.createObjectURL(f),a=document.createElement(tool==='video-trim'?'video':'audio');a.preload='metadata';
 try{await new Promise((ok,no)=>{const timeout=setTimeout(()=>no(Error('Metadata unavailable')),10000);a.onloadedmetadata=()=>{clearTimeout(timeout);ok();};a.onerror=()=>{clearTimeout(timeout);no(Error('Unsupported media'));};a.src=u;});$('utilityEnd').value=String(Math.round(a.duration*10)/10);}
 catch(_){}finally{a.removeAttribute('src');a.load();URL.revokeObjectURL(u);}
}
function addResizeOption(){
 const l=document.createElement('label');l.id='cropLine';l.textContent=label('Fit mode','Способ кадрирования');
 const select=document.createElement('select');select.id='resizeMode';
 for(const [v,en,rus] of [['contain','Fit inside','Вписать'],['cover','Fill / center crop','Заполнить / обрезать по центру']]){const o=document.createElement('option');o.value=v;o.textContent=label(en,rus);select.add(o);}l.append(select);$('settingsRow').append(l);
}
async function run(){
 if(active)return;
 if(tool==='captions'){location.href='audio-studio.html?tool=stt';return;}
 active=true;abort=false;$('utilityRun').disabled=true;$('utilityCancel').disabled=false;$('utilityResults').replaceChildren();
 status(label('Processing locally…','Обработка на устройстве…'));
 try{await perform();if(!abort)status(label('Ready — download the result.','Готово — скачайте результат.'));}
 catch(e){if(!abort)status(label('Could not complete: ','Не удалось выполнить: ')+String(e?.message||e));}
 finally{try{engine?.terminate();}catch(_){}engine=null;active=false;$('utilityRun').disabled=false;$('utilityCancel').disabled=true;}
}
async function perform(){
 switch(tool){
  case 'photo-convert':return convertPhoto();
  case 'photo-resize':return resizePhoto();
  case 'photo-redact':return exportRedaction();
  case 'qr':return makeQR();
  case 'zip':return manageZip();
  case 'video-trim':case 'video-mute':case 'audio-trim':return processMedia();
  case 'scan-pdf':case 'pdf-merge':case 'pdf-split':case 'pdf-sign':case 'pdf-compress':return processPDF();
  case 'photo-ocr':return runOCR();
  default:throw Error('Unsupported operation');
 }
}

async function convertPhoto(){
 const f=files()[0],c=await openImage(f),type=$('utilityFormat').value;
 const b=await blobFrom(c,type,.92),ext=type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
 await result(new File([b],base(f)+'-converted.'+ext,{type}));
 c.width=c.height=1;
}
async function resizePhoto(){
 const f=files()[0],im=await openImage(f);
 const width=Math.round(settingsNum('utilityWidth')),height=Math.round(settingsNum('utilityHeight'));
 if(width<1||height<1||width*height>40000000)throw Error(label('Dimensions must be within 40 megapixels.','Максимальный размер 40 мегапикселей.'));
 const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');
 const crop=$('resizeMode').value==='cover',scale=crop?Math.max(width/im.width,height/im.height):Math.min(width/im.width,height/im.height);
 const dw=im.width*scale,dh=im.height*scale;
 x.fillStyle='#fff';x.fillRect(0,0,width,height);x.drawImage(im,(width-dw)/2,(height-dh)/2,dw,dh);
 const type=$('utilityFormat').value,blob=await blobFrom(c,type,.92);
 const ext=type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
 await result(new File([blob],base(f)+'-'+width+'x'+height+'.'+ext,{type}));
 im.width=im.height=c.width=c.height=1;
}
async function makeQR(){
 const text=$('utilityQr').value.trim();if(!text)throw Error(label('Enter text or a URL first.','Введите ссылку или текст.'));
 await qr();
 const q=window.qrcode(0,'M');q.addData(text);q.make();
 // Store as a printable SVG; only locally calculated cells, no QR-code API request.
 const svg=q.createSvgTag({cellSize:8,margin:12,scalable:true});
 await result(new File([svg],'VideoUniquifier-QR.svg',{type:'image/svg+xml'}));
}
async function manageZip(){
 await jszip();
 const zip=new window.JSZip(),kind=$('utilityKind').value,fs=files();
 if(kind==='pack'){
  for(const f of fs){if(abort)throw Error('Canceled');zip.file(safeName(f.name),f);}
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5}});
  return result(new File([blob],'VideoUniquifier-files.zip',{type:'application/zip'}));
 }
 if(fs.length!==1)throw Error('Choose one ZIP archive.');
 const z=await window.JSZip.loadAsync(fs[0]);let count=0,total=0;
 for(const [name,entry] of Object.entries(z.files)){
  if(entry.dir)continue;if(++count>100)throw Error('Archive contains too many files');
  if(/(^|\/|\\)\.\.(\/|\\|$)/.test(name))continue;
  const out=await entry.async('blob');total+=out.size;
  if(total>200*1048576)throw Error('Archive expands beyond 200 MB');
  if(abort)throw Error('Canceled');
  await result(new File([out],safeName(name.split('/').pop()),{type:'application/octet-stream'}));
 }
 if(!count)throw Error('Empty archive');
}
function setupSignature(){
 const c=$('utilitySignature'),x=c.getContext('2d');x.strokeStyle='#101828';x.lineWidth=3;x.lineJoin='round';x.lineCap='round';
 let drawing=false,prior=null;
 const point=e=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};};
 c.addEventListener('pointerdown',e=>{drawing=true;prior=point(e);c.setPointerCapture(e.pointerId);x.beginPath();x.moveTo(prior.x,prior.y);x.lineTo(prior.x+.01,prior.y);x.stroke();});
 c.addEventListener('pointermove',e=>{if(!drawing)return;const p=point(e);x.beginPath();x.moveTo(prior.x,prior.y);x.lineTo(p.x,p.y);x.stroke();prior=p;});
 const stop=()=>{drawing=false;prior=null;};c.addEventListener('pointerup',stop);c.addEventListener('pointercancel',stop);
 $('signatureClear').onclick=()=>x.clearRect(0,0,c.width,c.height);
}
function setupRedaction(){
 const c=$('redactCanvas');
 const point=e=>{const r=c.getBoundingClientRect();return{x:Math.min(c.width,Math.max(0,(e.clientX-r.left)*c.width/r.width)),y:Math.min(c.height,Math.max(0,(e.clientY-r.top)*c.height/r.height))};};
 c.addEventListener('pointerdown',e=>{if(!redactBase)return;redactDragging={start:point(e),end:point(e)};c.setPointerCapture(e.pointerId);renderRedactions();});
 c.addEventListener('pointermove',e=>{if(!redactDragging)return;redactDragging.end=point(e);renderRedactions();});
 c.addEventListener('pointerup',e=>{if(!redactDragging)return;redactDragging.end=point(e);
  const r=redactDragging;redactDragging=null;
  if(Math.abs(r.start.x-r.end.x)>3&&Math.abs(r.start.y-r.end.y)>3)redactRects.push(r);
  renderRedactions();
 });
 c.addEventListener('pointercancel',()=>{redactDragging=null;renderRedactions();});
 $('redactUndo').onclick=()=>{redactRects.pop();renderRedactions();};
 $('redactReset').onclick=()=>{redactRects=[];renderRedactions();};
}
async function loadRedaction(){
 const c=$('redactCanvas'),f=$('utilityFiles').files[0];
 redactRects=[];redactBase=null;if(!f)return;
 try{redactImage=await openImage(f);const scale=Math.min(1,920/Math.max(redactImage.width,redactImage.height));c.width=Math.max(1,Math.round(redactImage.width*scale));c.height=Math.max(1,Math.round(redactImage.height*scale));redactBase=c.getContext('2d');renderRedactions();}catch(e){status(String(e.message||e));}
}
function drawCovers(context,r,scale=1){
 const x=Math.min(r.start.x,r.end.x)*scale,y=Math.min(r.start.y,r.end.y)*scale,w=Math.abs(r.start.x-r.end.x)*scale,h=Math.abs(r.start.y-r.end.y)*scale;
 context.fillStyle='#000';context.fillRect(x,y,w,h);
}
function renderRedactions(){
 if(!redactBase||!redactImage)return;const c=$('redactCanvas');
 redactBase.clearRect(0,0,c.width,c.height);redactBase.drawImage(redactImage,0,0,c.width,c.height);
 for(const r of redactRects)drawCovers(redactBase,r);
 if(redactDragging)drawCovers(redactBase,redactDragging);
}
async function exportRedaction(){
 const f=files()[0];if(!redactImage||!redactRects.length)throw Error(label('Select an image and cover at least one area.','Выберите фото и закройте хотя бы одну область.'));
 const full=document.createElement('canvas');full.width=redactImage.width;full.height=redactImage.height;
 const x=full.getContext('2d');x.drawImage(redactImage,0,0);
 const scale=full.width/$('redactCanvas').width;
 for(const r of redactRects)drawCovers(x,r,scale);
 // Opaque blocks replace pixels; exporting does not retain image layers.
 const blob=await blobFrom(full,'image/png');
 await result(new File([blob],base(f)+'-redacted.png',{type:'image/png'}));
 full.width=full.height=1;
}
