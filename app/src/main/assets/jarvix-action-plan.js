// Fast local intent pass. No provider calls, guessed prices or invented models.
export const ACTION_ROUTES=Object.freeze({image:'generate-studio.html?studio=image',video:'generate-studio.html?studio=video',audio:'generate-studio.html?studio=audio',tools:'free-tools.html',apps:'ai-apps.html',canvas:'canvas.html',pricing:'pricing.html',history:'my-creations.html',home:'deepsyq.html',uniquifier:'index.html',inspiration:'deepsyq.html#inspirationPreview',compare:'compare-ai.html',background:'simple-background-remover.html',collage:'photo-collage.html',teleprompter:'teleprompter.html',reminders:'smart-reminders.html',avatar:'avatar-studio.html',pdf:'mobile-utility.html',audioTools:'audio-studio.html',pets:'virtual-pet.html',privacy:'ai-privacy.html'});
const SPECIFIC_TOOL_PAGES=[
 ['quick-notes',/(?:быстр[а-яё]*\s+заметк|quick notes)/iu,'smart-reminders.html#quick-notes'],
 ['extract-audio',/(?:извлеч[ььи]*|вытащи|extract).*?(?:звук|аудио|audio)|(?:видео|video).*?mp3/iu,'free-tools.html?tool=audio'],
 ['split-clips',/(?:нарез|разбей).*?(?:видео|ролик)|split video/iu,'free-tools.html?tool=clips'],
 ['photo-motion',/(?:фото|photo)\s*(?:в|→|to)\s*(?:видео|video)/iu,'free-tools.html?tool=motion'],
 ['transcribe',/(?:запись|аудио|recording|audio)\s*(?:в|→|to)\s*(?:текст|text)|расшифруй\s+аудио/iu,'audio-studio.html?tool=stt'],
 ['text-to-voice',/(?:текст|text)\s*(?:в|→|to)\s*(?:голос|voice)|озвучк[ауи]\s+текст/iu,'audio-studio.html?tool=tts']
];
const UTILITY_ROUTES = [
 ['photo-compress',/(?:компресс|сжат|сжать|compress).*?(?:фото|изображен|photo|image)/iu],
 ['video-compress',/(?:компресс|сжат|сжать|compress).*?(?:видео|ролик|video)/iu],
 ['video-trim',/(?:обрез|отрез|trim|cut).*?(?:видео|ролик|video)/iu],
 ['video-mute',/(?:убрать|убери|удали|отключи).*?звук.*?видео|mute.*?video/iu],
 ['audio-trim',/(?:обрез|trim).*?(?:аудио|audio)/iu],
 ['scan-pdf',/сканер|сканир.*?пдф|scan.*?pdf/iu],
 ['pdf-merge',/(?:объедин|скле|merge|combine).*?(?:pdf|пдф)/iu],
 ['pdf-split',/(?:раздел|извлеч.*?страниц|split).*?(?:pdf|пдф)/iu],
 ['pdf-sign',/(?:подпис|sign).*?(?:pdf|пдф)/iu],
 ['pdf-compress',/(?:сжат|сжать|compress).*?(?:pdf|пдф)/iu],
 ['photo-convert',/конвертер.*?фото|(?:конверт|convert).*?(?:фото|photo|image)/iu],
 ['photo-resize',/(?:размер|обрез|resize|crop).*?(?:фото|photo|image)/iu],
 ['qr',/(?:qr|куар|кьюар)(?:[ -]?код)?/iu],
 ['photo-redact',/(?:скрыть|замазать|redact).*?(?:фото|photo)/iu],
 ['photo-ocr',/\bocr\b|(?:фото|изображен).*?в текст|photo.*?to text/iu],
 ['zip',/\bzip\b|архиватор/iu],
 ['captions',/субтитр|\bsrt\b|captions/iu]
];
export function extractAction(text){
 const raw=String(text||'').trim().slice(0,2000),s=raw.toLowerCase();
 const targets=[['background',/(?:удал(?:ить|ение|ять|и)?|убер(?:и|ать)?|remove|erase)\s*(?:мне\s*)?(?:фон|background)|background\s*(?:remover|removal)|убрать\s*фон|удаление\s*фона/iu],['pdf',/(?:pdf|пдф|сканер|scanner|photo\s*to\s*pdf|фото\s*(?:в|to)\s*pdf)/iu],['collage',/(?:коллаж|collage)/iu],['teleprompter',/(?:телесуфл[её]р|телепромптер|teleprompter|téléprompteur)/iu],['reminders',/(?:напоминани|напоминалк|reminders?|rappels?|recordatorios?)/iu],['avatar',/(?:аватар|avatar)/iu],['audioTools',/(?:обрезать\s*аудио|audio\s*trim|mp3\s*extract|извлечь\s*(?:звук|аудио))/iu],['pets',/(?:питомц|питомец|pet\s*(?:companion|studio)|virtual\s*pets?)/iu],['compare',/(?:сравн[а-яё]*\s*модел|compare\s*(?:ai\s*)?models?|comparateur)/iu],['inspiration',/(?:вдохновени|inspiration|inspiración)/iu],['uniquifier',/(?:уникализ|uniquif)/iu],['pricing',/(?:тариф|подписк|pricing|plans?|tarifs|precios)/iu],['privacy',/(?:конфиденциальност|приватност|privacy|confidentialité)/iu],['history',/(?:мои\s*работ|мои\s*результат|my\s*creations?|history|истори|creations)/iu],['canvas',/(?:холст|canvas|канва)/iu],['apps',/(?:ai\s*apps?|приложени)/iu],['tools',/(?:инструмент|утилит|tools|outils|herramientas)/iu],['home',/(?:главн|home|accueil|inicio)/iu],['video',/(?:видео|ролик|video|vidéo|vídeo)/iu],['audio',/(?:аудио|музык|песн|трек|audio|music|musique|música)/iu],['image',/(?:фото|картин|изображ|рисунок|image|photo|imagen)/iu]];
 const target=targets.find(([,re])=>re.test(s))?.[0];
 const create=/^(?:пожалуйста[, ]*)?(?:создай|сделай|сгенерируй|нарисуй|хочу создать|create|generate|make|crée|génère|crea|genera)\b/iu.test(s)||/^(?:создай|сделай|сгенерируй|нарисуй|хочу создать|crée|génère|crea|genera)/iu.test(s);
 const navigate=/(?:^|\s)(?:открой|перейди|запусти|открыть|open|go to|navigate to|ouvre|abre|affiche|покажи|show)(?:\s|$)/iu.test(s);
 if(navigate&&!create){
  const page=SPECIFIC_TOOL_PAGES.find(([,pattern])=>pattern.test(s));
  if(page)return {intent:'NAVIGATE',target:'utility:'+page[0],url:page[2],voice_ack:'Открыл'};
  const utility=UTILITY_ROUTES.find(([,pattern])=>pattern.test(s))?.[0];
  if(utility)return {intent:'NAVIGATE',target:'utility:'+utility,url:'mobile-utility.html?tool='+utility,voice_ack:'Открыл'};
 }
 if(!target||(!create&&!navigate))return null;
 if(create&&!['image','video','audio'].includes(target))return null;
 const ratio=s.match(/\b(16\s*[:хx×]\s*9|9\s*[:хx×]\s*16|1\s*[:хx×]\s*1)\b/)?.[0]?.replace(/\s/g,'').replace(/[хx×]/,':')||null;
 const seconds=s.match(/(?:^|\s)(5|8|10)\s*(?:секунд\w*|сек\.?|seconds?|secs?|s)(?=\s|[,.!?]|$)/iu);
 const model=s.match(/\b(kling(?:[ -][\w.-]+)?|runway(?:[ -]gen[ -]?\d)?|luma|flux(?:[ -](?:schnell|dev))?|sdxl|midjourney|suno(?:[ -]v[\d.]+)?|udio|minimax)\b/i)?.[0]||null;
 let prompt=raw.replace(/^(?:пожалуйста[, ]*)?(?:создай|сделай|сгенерируй|нарисуй|хочу создать|create|generate|make|crée|génère|crea|genera)\s*(?:мне\s*)?/iu,'').replace(/^(?:видео|ролик|аудио|музыку|песню|трек|фото|фотографию|картинку|изображение|video|audio|music|image|photo|imagen)\s*(?:про\s+|о\s+|of\s+|de\s+)?/iu,'');
 if(ratio)prompt=prompt.replace(/\b(?:16\s*[:хx×]\s*9|9\s*[:хx×]\s*16|1\s*[:хx×]\s*1)\b/iu,'');
 if(seconds)prompt=prompt.replace(seconds[0],' ');
 if(model)prompt=prompt.replace(new RegExp(model.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),'');
 prompt=prompt.replace(/\s+/g,' ').replace(/^[,;\s]+|[,;\s]+$/g,'').trim();
 return {intent:create?'GENERATE_MEDIA':'NAVIGATE',target,media_type:['image','video','audio'].includes(target)?target:null,url:ACTION_ROUTES[target],recommended_model:model,aspect_ratio:ratio,duration:seconds?Number(seconds[1]):null,raw_prompt:prompt,enhanced_prompt:prompt,voice_ack:create?'Выполняю':'Открыл'};
}
export function resolveActionModel(action,models){
 const kind=action.media_type==='audio'?'music':action.media_type;
 const enabled=(models||[]).filter(m=>m.enabled&&m.kind===kind);
 let model=enabled[0];
 if(action.recommended_model){const requested=action.recommended_model.toLowerCase().replace(/[ -]/g,'');model=enabled.find(m=>(m.id+' '+(m.label||'')).toLowerCase().replace(/[ -]/g,'').includes(requested));if(!model)throw Error('Requested model is unavailable on this stand.');}
 if(!model)throw Error('No model is available for this mode.');
 if(action.aspect_ratio&&!(model.ratios||[]).includes(action.aspect_ratio))throw Error('Requested aspect ratio is unavailable for this model.');
 const durations=model.capabilities?.durations||model.durations;
 if(action.duration&&(!Array.isArray(durations)||!durations.map(Number).includes(action.duration)))throw Error('Requested duration is unavailable for this model.');
 return model;
}
