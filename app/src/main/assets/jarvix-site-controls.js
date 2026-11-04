// Site-owned vocabulary and live controls. No model training or private user memory.
export const normalizeCommand = value => String(value||'').normalize('NFC').toLowerCase().replace(/ё/g,'е').replace(/[«»"?!,]/g,' ').replace(/\s+/g,' ').trim();
const tool=(id,url,aliases)=>({id,url,aliases:aliases.split('|')});
export const SITE_TOOLS=Object.freeze([
 tool('compress-photo','free-tools.html?tool=photo','сжать фото|сжатие фото|компресс фото|комплекс фото|компрессор фото|compress photo|compress image|compresser photo|compresser les photos|comprimir foto'),
 tool('compress-video','free-tools.html?tool=video','сжать видео|сжатие видео|compress video|compresser video|compresser une vidéo|comprimir vídeo|comprimir video'),
 tool('extract-audio','free-tools.html?tool=audio','извлечь звук|извлечь аудио|звук из видео|extract audio|extraire le son|extraer audio'),
 tool('video-clips','free-tools.html?tool=clips','нарезать видео|нарезка видео|video clips|cut video|découper une vidéo|cortar video'),
 tool('photo-motion','free-tools.html?tool=motion','фото в видео|оживить фото|photo to video|photo vers vidéo|foto a video'),
 tool('tts','audio-studio.html?tool=tts','текст в голос|текст в речь|текст в мп3|text to voice|text to speech|texte en voix|texte en mp3|texto a voz'),
 tool('stt','audio-studio.html?tool=stt','запись в текст|аудио в текст|речь в текст|recording to text|speech to text|enregistrement en texte|audio a texto'),
 tool('prompter','free-tools.html?tool=prompter','телесуфлер|teleprompter|téléprompteur|téléprompter'),
 tool('collage','photo-collage.html','коллаж|photo collage|collage photo|collage de fotos'),
 tool('background','simple-background-remover.html','удалить фон|удаление фона|убрать фон|background remover|remove background|supprimer le fond|détourage|quitar fondo'),
 tool('reminders','smart-reminders.html','умные напоминания|напоминани|smart reminders|rappels|recordatorio'),
 tool('notes','smart-reminders.html#quick-notes','быстрые заметки|заметки|quick notes|notes rapides|notas rápidas'),
 tool('avatar','avatar-studio.html?from=tools','аватар|avatar'),
 tool('scan-pdf','mobile-utility.html?tool=scan-pdf','сканер документов|сканировать в пдф|фото в pdf|фото в пдф|scan to pdf|photo to pdf|scanner en pdf|escanear pdf'),
 tool('pdf-merge','mobile-utility.html?tool=pdf-merge','объединить pdf|объединить пдф|склеить пдф|combine pdf|merge pdf|fusionner|combinar pdf'),
 tool('pdf-split','mobile-utility.html?tool=pdf-split','разделить pdf|разделить пдф|страницы пдф|extract pdf pages|split pdf|extraire des pages|dividir pdf'),
 tool('pdf-sign','mobile-utility.html?tool=pdf-sign','подписать pdf|подписать пдф|заполнить пдф|sign pdf|fill pdf|signer un pdf|firmar pdf'),
 tool('pdf-compress','mobile-utility.html?tool=pdf-compress','сжать pdf|сжать пдф|compress pdf|optimize pdf|optimiser un pdf|comprimir pdf'),
 tool('photo-convert','mobile-utility.html?tool=photo-convert','конвертер фото|конвертер изображений|конвертер фотографий|convert image|convertir une image|convertir imagen'),
 tool('photo-resize','mobile-utility.html?tool=photo-resize','размер фото|обрезка фото|обрезать фото|resize photo|crop photo|redimensionner|recadrer|redimensionar|recortar foto'),
 tool('video-trim','mobile-utility.html?tool=video-trim','обрезка видео|обрезать видео|trim video|couper une vidéo|recortar video'),
 tool('video-mute','mobile-utility.html?tool=video-mute','убрать звук|видео без звука|mute video|video sans son|vidéo sans son|silenciar video'),
 tool('audio-trim','mobile-utility.html?tool=audio-trim','обрезать аудио|обрезка аудио|trim audio|couper un audio|recortar audio'),
 tool('qr','mobile-utility.html?tool=qr','qr|куар|кьюар'),
 tool('photo-redact','mobile-utility.html?tool=photo-redact','скрыть данные|скрыть детали|hide details|masquer des données|ocultar datos'),
 tool('photo-ocr','mobile-utility.html?tool=photo-ocr','фото в текст|распознать текст|ocr|photo to text|image en texte|imagen a texto'),
 tool('zip','mobile-utility.html?tool=zip','zip|зип|архиватор|распаковать архив|создать архив'),
 tool('captions','mobile-utility.html?tool=captions','субтитр|subtitle|sous-titre|subtítulo'),
 tool('uniquifier','index.html','уникализатор|уникализация видео|video uniquifier|uniquificateur|unificador de video')
]);
const negativeAction=/(?:не (?:откры|откро|меня|изменя|ставь|настра|устанавли|переключ)|don.t (?:open|change|set)|do not (?:open|change|set)|n.ouvre|ne change|no (?:abras|cambies|ajustes))/u;
const actionWords=/(?:откро|откры|открой|перейди|покажи|зайди|включи|open|show|go to|ouvre|ouvrez|montre|abre|abrir|muestra)/u;
export function resolveToolCommand(text){
 const t=normalizeCommand(text);
 if(negativeAction.test(t)||!actionWords.test(t))return null;
 const matches=SITE_TOOLS.filter(item=>item.aliases.some(a=>t.includes(normalizeCommand(a))));
 // More specific names win; several unrelated tools require a clarification.
 const score=item=>Math.max(...item.aliases.filter(a=>t.includes(normalizeCommand(a))).map(a=>a.length));
 matches.sort((a,b)=>score(b)-score(a));
 return matches.length&&(!matches[1]||score(matches[0])>score(matches[1]))?matches[0]:null;
}
export function parseVariationSettings(text){
 const t=normalizeCommand(text),settings={};
 if(/(?:не меняй|не изменяй|оставь|don't change|ne change|no cambies)/u.test(t))return null;
 const modes=[[/баланс|balanced|balance|équilibr|equilibrad/u,'balanced'],[/бережн|мягк|gentle|doux|suave/u,'gentle'],[/динамич|dynamic|dynamique|dinámic/u,'dynamic']];
 const selected=modes.filter(([r])=>r.test(t));
 if(selected.length>1)return {error:'ambiguous'};
 if(selected.length)settings.mode=selected[0][1];
 const ratios=[...t.matchAll(/(\d+)\s*(?::|на|x|×|by|sur|por)\s*(\d+)/gu)].map(m=>m[1]+':'+m[2]);
 if(ratios.some(r=>!['16:9','9:16'].includes(r))||new Set(ratios).size>1)return {error:'ratio'};
 if(ratios.length)settings.aspectRatio=ratios[0];
 const qualities=[[/4\s*[kк]|2160/u,'2160'],[/1080|тысяча восемьдесят|full\s*hd/u,'1080'],[/720/u,'720']].filter(([r])=>r.test(t));
 if(qualities.length>1)return {error:'ambiguous'};
 if(qualities.length)settings.quality=qualities[0][1];
 const count=t.match(/(?:вариант\S*|вариац\S*|variations?|variants?|variantes?)\s*(\d+)|(\d+)\s*(?:вариант|вариац|variations?|variants?|variantes?)/u);
 if(count){const n=Number(count[1]||count[2]);if(n<1||n>15)return {error:'count'};settings.variantCount=String(n);}
 return Object.keys(settings).length?{settings}:null;
}
const words={
 ru:{done:'Настроено:',unavailable:'Недоступно в текущем тарифе или состоянии:',ask:'Уточните настройки. Доступные пропорции — 16 на 9 или 9 на 16. Назовите один режим, качество и число вариантов от 1 до 15.',none:'Подходящий доступный элемент управления не найден.',prices:'Цены и условия беру из текущих данных сайта.',separate:'Генерация ИИ оплачивается отдельно AI-кредитами. Безлимитная генерация в тариф не входит.',trial:'Trial: пробное предложение; действующие условия и покупка ещё не утверждены.'},
 en:{done:'Configured:',unavailable:'Unavailable with the current plan or state:',ask:'Choose one mode, 16:9 or 9:16, one resolution and 1 to 15 variations.',none:'No matching available control was found.',prices:'These are the current site prices and terms.',separate:'AI generation uses separate AI credits. Plans do not include unlimited AI generation.',trial:'Trial is a proposed offer; terms and checkout are not approved.'},
 fr:{done:'Réglé :',unavailable:'Indisponible pour cette formule ou cet état :',ask:'Choisissez un mode, 16:9 ou 9:16, une résolution et 1 à 15 variantes.',none:'Aucun contrôle disponible ne correspond.',prices:'Voici les tarifs et conditions actuels du site.',separate:'La génération IA utilise des crédits IA séparés. Elle n’est pas illimitée.',trial:'Trial est une offre proposée à 0,99 dollar ; conditions et achat non approuvés.'},
 es:{done:'Configurado:',unavailable:'No disponible con este plan o estado:',ask:'Elige un modo, 16:9 o 9:16, una resolución y de 1 a 15 variantes.',none:'No se encontró un control disponible.',prices:'Estos son los precios y condiciones actuales del sitio.',separate:'La generación IA utiliza créditos IA separados. No incluye generación ilimitada.',trial:'Trial es una oferta propuesta de 0,99 dólares; las condiciones y la compra no están aprobadas.'}
};
function translateBenefit(text,language){
 const translations={ru:[[/Up to /g,'До '],[/variants/g,'вариантов'],[/modes/g,'режимы'],[/mode/g,'режим'],[/quality/g,'качество'],[/Included (.*?) tools/g,'Инструменты тарифа $1'],[/Tool credits: see current terms/g,'Кредиты инструментов: по текущим условиям']],fr:[[/Up to /g,'Jusqu’à '],[/variants/g,'variantes'],[/modes/g,'modes'],[/mode/g,'mode'],[/quality/g,'qualité'],[/Included (.*?) tools/g,'Outils de la formule $1'],[/Tool credits: see current terms/g,'Crédits outils : voir les conditions actuelles']],es:[[/Up to /g,'Hasta '],[/variants/g,'variantes'],[/modes/g,'modos'],[/mode/g,'modo'],[/quality/g,'calidad'],[/Included (.*?) tools/g,'Herramientas del plan $1'],[/Tool credits: see current terms/g,'Créditos de herramientas: consulta las condiciones actuales']]};
 return (translations[language]||[]).reduce((s,[pattern,replacement])=>s.replace(pattern,replacement),text);
}
export function pricingReply(config,text,language='ru',knowledge={}){
 const w=words[language]||words.en,t=normalizeCommand(text),keys=['basic','pro','business','lifetime'];
 const aliases={basic:/basic|бейсик|базов/u,pro:/\bpro\b|про(?:\s|$)/u,business:/business|бизнес/u,lifetime:/lifetime|лайфтайм|пожизн/u};
 const selected=keys.filter(k=>aliases[k].test(t));
 const modes={basic:'Gentle · 720p · 5',pro:'Gentle, Balance · 1080p · 10',business:'Gentle, Balance, Dynamic · 4K · 15',lifetime:'Gentle, Balance, Dynamic · 4K · 15'};
 const units=language==='ru'?['в месяц','разово','кредитов инструментов в месяц','вариантов']:language==='fr'?['par mois','paiement unique','crédits outils par mois','variantes']:language==='es'?['al mes','pago único','créditos de herramientas al mes','variantes']:['per month','one time','tool credits per month','variations'];
 const rows=(selected.length?selected:keys).map(k=>{
  const p=config?.plans?.[k];if(typeof p?.price!=='number'||!Number.isFinite(p.price)||p.price<=0)return k+': '+w.none;
  const currency=k==='lifetime'?p.currency:'USD';if(!currency)return k+': '+w.none;
  const money=new Intl.NumberFormat({ru:'ru-RU',en:'en-US',fr:'fr-FR',es:'es-ES'}[language]||'en-US',{style:'currency',currency:currency.toUpperCase()}).format(p.price);
  return k+': '+money+' '+units[k==='lifetime'?1:0]+'. '+(typeof p.limit==='number'?p.limit+' '+units[2]+'. ':'')+(knowledge.pricing?.[k]?.length?knowledge.pricing[k].filter(feature=>! /tool credits \/ month/i.test(feature)).map(feature=>translateBenefit(feature,language)).join('; '):modes[k]+' '+units[3])+'.';
 });
 if(!selected.length||/trial|пробн|триал/u.test(t))rows.push(w.trial);
 return rows.join(' ')+ ' '+w.separate+(config?.billingConfigured===false?' '+({ru:'В тестовом режиме покупка отключена.',en:'Checkout is disabled in this test.',fr:'Les achats sont désactivés dans ce test.',es:'Las compras están desactivadas en esta prueba.'}[language]||''): '');
}
const pendingKey='jarvix_pending_settings_v1';
export function applyVariationSettings(doc,settings,language='ru'){
 const w=words[language]||words.en,done=[],blocked=[];
 const names={ru:{mode:'режим',aspectRatio:'пропорции',quality:'разрешение',variantCount:'вариантов'},en:{mode:'mode',aspectRatio:'ratio',quality:'resolution',variantCount:'variations'},fr:{mode:'mode',aspectRatio:'format',quality:'résolution',variantCount:'variantes'},es:{mode:'modo',aspectRatio:'formato',quality:'resolución',variantCount:'variantes'}}[language]||{};
 for(const [id,value]of Object.entries(settings)){
  const el=doc.getElementById(id),option=el&&[...el.options].find(o=>o.value===value);
  if(!el||el.disabled||!option||option.disabled){blocked.push((names[id]||id)+' '+value);continue;}
  el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
  (el.value===value?done:blocked).push((names[id]||id)+' '+String(option.textContent||value).split('·')[0].trim());
 }
 return [done.length?w.done+' '+done.join(', '):'',blocked.length?w.unavailable+' '+blocked.join(', '):''].filter(Boolean).join('. ');
}
export function resumeSiteSettings(speak){
 let pending;try{pending=JSON.parse(sessionStorage.getItem(pendingKey));}catch{}if(!pending)return;
 sessionStorage.removeItem(pendingKey);
 if(Date.now()-pending.created>30000||location.pathname.split('/').pop()!=='index.html')return;
 // Run after the existing page has mounted its controls and plan restrictions.
 setTimeout(()=>{if(sessionStorage.getItem('jarvix_active')==='1')speak(applyVariationSettings(document,pending.settings,pending.language));},800);
}
function controlLabel(el){return [el.getAttribute('aria-label'),el.labels?.[0]?.textContent,el.getAttribute('placeholder'),el.textContent].filter(Boolean).join(' ').replace(/\s+/g,' ').trim().slice(0,240);}
export function currentPageControls(doc=document){return [...doc.querySelectorAll('button,a[href],select,input,textarea')].filter(el=>!el.closest('[hidden],dialog:not([open])')&&!['hidden','password'].includes(el.type)&&controlLabel(el)).map(el=>({id:el.id||null,type:el.tagName.toLowerCase(),label:controlLabel(el),disabled:!!el.disabled,options:el.options?[...el.options].map(o=>({label:o.textContent,value:o.value,disabled:o.disabled})):undefined}));}
function safeLiveSelection(text,speak,language){
 const t=normalizeCommand(text);if(!/(?:выбери|установи|поставь|настрой|select|set|choisis|règle|elige|selecciona)/u.test(t))return false;
 const matches=[];
 for(const el of document.querySelectorAll('main select')){
  if(el.disabled||el.closest('[hidden]')||el.getClientRects().length===0||/(?:plan|billing|payment|subscription)/i.test(el.id))continue;
  for(const op of el.options){const label=normalizeCommand(op.textContent);if(label.length>2&&t.includes(label))matches.push({el,op});}
 }
 if(matches.length!==1)return false;
 const {el,op}=matches[0];if(op.disabled){speak((words[language]||words.en).unavailable+' '+op.textContent);return true;}
 el.value=op.value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
 speak((words[language]||words.en).done+' '+op.textContent);return true;
}
export function routeSiteCommand(text,{language='ru',speak,navigate,isCurrent=()=>true}){
 const t=normalizeCommand(text),w=words[language]||words.en;
 if(negativeAction.test(t)){speak({ru:'Оставляю без изменений.',en:'Leaving it unchanged.',fr:'Je laisse les réglages inchangés.',es:'Lo dejo sin cambios.'}[language]||'Leaving it unchanged.');return true;}
 const isPrice=/(?:расскажи|сравни|сколько|стоимост|цена|цены|что входит|что получ|how much|price|cost|combien|coût|cuánto|cuanto|precio|все тариф|какие тариф)/u.test(t)&&/(?:тариф|подписк|план|basic|pro\b|business|lifetime|trial|бизнес|бейсик|пожизн|pricing|plan|subscription|abonnement|tarif|precio|suscrip)/u.test(t);
 if(isPrice){Promise.all(['/api/config','/api/jarvix/site-map'].map(url=>fetch(url,{cache:'no-store',signal:AbortSignal.timeout(5000)}).then(r=>{if(!r.ok)throw Error();return r.json();}))).then(([data,knowledge])=>{if(isCurrent())speak(pricingReply(data,t,language,knowledge));}).catch(()=>{if(isCurrent())speak(w.none);});return true;}
 const settings=parseVariationSettings(t);
 if(settings&&(location.pathname.endsWith('/index.html')||/уникализ|uniquif|unificador/u.test(t))){
  if(settings.error){speak(w.ask);return true;}
  if(!document.getElementById('aspectRatio')){sessionStorage.setItem(pendingKey,JSON.stringify({...settings,language,created:Date.now()}));navigate('index.html');return true;}
  speak(applyVariationSettings(document,settings.settings,language));return true;
 }
 const match=resolveToolCommand(t);if(match){navigate(match.url);return true;}
 if(/(?:какие кнопки|какие настройки|что на этой странице|what controls|quels réglages|qué controles)/u.test(t)){
  const labels=currentPageControls().filter(x=>!x.disabled).map(x=>x.label);speak(labels.slice(0,12).join('. ')||w.none);return true;
 }
 return safeLiveSelection(t,speak,language)||safeCurrentAction(t,speak,language);
}

// Only existing reversible controls; no arbitrary model-generated selectors or clicks.
function safeCurrentAction(text,speak,language){
 const w=words[language]||words.en;
 const settings=[['utilityWidth',/ширин|width|largeur|ancho/u],['utilityHeight',/высот|height|hauteur|alto/u],['utilityStart',/начал|start|début|inicio/u],['utilityEnd',/конец|конца|end|fin/u],['quality',/качеств|quality|qualité|calidad/u],['speed',/скорост|speed|vitesse|velocidad/u],['fontSize',/размер текста|font size|taille du texte|tamaño del texto/u]];
 if(/установи|поставь|настрой|сделай|set|règle|mets|ajusta|establece/u.test(text)){
  const done=[],blocked=[];
  for(const [id,pattern] of settings){
   if(!pattern.test(text))continue;
   const el=document.getElementById(id);if(!el||el.tagName!=='INPUT'||!['number','range'].includes(el.type))continue;
   const found=text.slice(text.search(pattern)).match(/\d+(?:[.,]\d+)?/);if(!found)continue;
   const value=Number(found[0].replace(',','.'));
   if(el.disabled||el.closest('[hidden]')||(el.min!==''&&value<Number(el.min))||(el.max!==''&&value>Number(el.max))){blocked.push(controlLabel(el));continue;}
   el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));done.push(controlLabel(el)+' '+el.value);
  }
  if(done.length||blocked.length){speak([done.length?w.done+' '+done.join(', '):'',blocked.length?w.unavailable+' '+blocked.join(', '):''].filter(Boolean).join('. '));return true;}
 }
 if(!/(?:нажми|выбери|переключи|открой|click|select|open|clique|ouvre|pulsa|abre)/u.test(text))return false;
 const target=normalizeCommand(text.replace(/^(?:нажми(?: на)?|выбери|переключи|открой|click(?: on)?|select|open|clique(?: sur)?|ouvre|pulsa|abre)\s*/u,''));
 if(target.length<3)return false;
 const candidates=[...document.querySelectorAll('main a[href],main button[role="tab"],main button[data-tab],main button[data-filter],main .hub-presets button,main #hubBack')].filter(el=>{
  if(el.disabled||el.closest('[hidden]')||el.getClientRects().length===0)return false;
  const label=normalizeCommand(el.getAttribute('aria-label')||el.textContent);
  if(/checkout|delete|remove|cancel subscription|оплат|купить|удал|подписать|sign|billing|payment|purchase|logout|accept|соглас/u.test(label+' '+el.id))return false;
  if(el.tagName==='A'){try{const url=new URL(el.href,location.href);if(url.origin!==location.origin||!url.pathname.endsWith('.html'))return false;}catch{return false;}}
  return label===target;
 });
 if(candidates.length!==1)return false;
 const label=controlLabel(candidates[0]);candidates[0].click();if(candidates[0].tagName!=='A')speak(w.done+' '+label);return true;
}
