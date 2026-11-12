/* JARVIX NEW: smalltalk from real owner MP3, without tour narration.
 * This module never fabricates a recording. MP3 must exist on TEST.
 * New phrases can be added by Antigravity in the same manifest without
 * replacing the owner's already recorded Tour V3 voice.
 */
const LANGUAGE=new Set(['ru','en','fr','es']);
const FOLDER='/media/jarvix/conversation/';
const NAMES={
 ru:{hello:'Привет! Я JARVIX.',prompt:'Просто скажите, что хотите создать.'},
 en:{hello:"Hi! I'm JARVIX.",prompt:'Just tell me what you want to make.'},
 fr:{hello:'Salut ! Je suis JARVIX.',prompt:'Dites-moi ce que vous voulez créer.'},
 es:{hello:'¡Hola! Soy JARVIX.',prompt:'Dime qué quieres crear.'}
};
const TOPICS={
 ru:{
  hello:/\b(?:привет|здравствуй|здравствуйте|здорово|добрый день|доброе утро|добрый вечер)\b/u,
  wellbeing:/\b(?:как дела|как ты|как поживаешь|как жизнь|все хорошо|всё хорошо)\b/u,
  activity:/\b(?:что делаешь|чем занимаешься|что ты делаешь|что сейчас делаешь)\b/u,
  hearing:/\b(?:ты меня слышишь|слышишь меня|ты слушаешь|слушаешь меня)\b/u,
  identity:/\b(?:кто ты|как тебя зовут|твое имя|твоё имя)\b/u,
  thanks:/\b(?:спасибо|благодарю)\b/u,
  farewell:/\b(?:пока|до свидания|до встречи)\b/u,
  image:/\b(?:картинку|картинки|изображение|изображения|фото|фотографию)\b/u,
  video:/\b(?:видео|видеоролик|ролик)\b/u,
  audio:/\b(?:аудио|звук|музыку|музыка)\b/u
 },
 en:{
  hello:/\b(?:hi|hello|hey|good morning|good evening)\b/,
  wellbeing:/\b(?:how are you|how is it going|how do you feel)\b/,
  activity:/\b(?:what are you doing|what do you do)\b/,
  hearing:/\b(?:can you hear me|are you listening)\b/,
  identity:/\b(?:who are you|what is your name)\b/,
  thanks:/\b(?:thanks|thank you)\b/,
  farewell:/\b(?:bye|goodbye)\b/,
  image:/\b(?:images?|photos?|picture)\b/,
  video:/\b(?:videos?|movies?)\b/,
  audio:/\b(?:audio|music|sound)\b/
 },
 fr:{
  hello:/\b(?:salut|bonjour|bonsoir|coucou)\b/u,
  wellbeing:/\b(?:comment ca va|ca va|comment vas tu|comment allez vous)\b/u,
  activity:/\b(?:que fais tu|tu fais quoi|que faites vous)\b/u,
  hearing:/\b(?:tu m entends|vous m entendez|tu ecoutes)\b/u,
  identity:/\b(?:qui es tu|comment tu t appelles|votre nom)\b/u,
  thanks:/\b(?:merci)\b/u,
  farewell:/\b(?:au revoir|a bientot)\b/u,
  image:/\b(?:image|photo)\b/u,
  video:/\b(?:video|film)\b/u,
  audio:/\b(?:audio|musique|son)\b/u
 },
 es:{
  hello:/\b(?:hola|buenos dias|buenas tardes|buenas noches)\b/u,
  wellbeing:/\b(?:como estas|que tal|como te va)\b/u,
  activity:/\b(?:que haces|que estas haciendo)\b/u,
  hearing:/\b(?:me escuchas|me oyes)\b/u,
  identity:/\b(?:quien eres|como te llamas)\b/u,
  thanks:/\b(?:gracias)\b/u,
  farewell:/\b(?:adios|hasta luego)\b/u,
  image:/\b(?:imagen|imagenes|foto)\b/u,
  video:/\b(?:video|pelicula)\b/u,
  audio:/\b(?:audio|musica|sonido)\b/u
 }
};
// Tour clips with exact, owner-recorded descriptions, not placeholder prompts.
const EXISTING={
 ru:{
  image:['t3_ru_1ae298d5287c.mp3','Создавайте по описанию или добавьте фотографию.'],
  video:['t3_ru_7c68463ede33.mp3','Создавайте ролики по описанию или из фотографий.'],
  audio:['t3_ru_d9cfe7fef0ca.mp3','Создавайте музыку по своему описанию.']
 },
 en:{
  image:['t3_en_3399a1585ce3.mp3','Create from a description or add a photo.'],
  video:['t3_en_24cc24464989.mp3','Create videos from text or photos.'],
  audio:['t3_en_d62fb64de249.mp3','Create music from your own description.']
 },
 fr:{
  image:['t3_fr_654e84a9d072.mp3',"Créez à partir d'une description ou ajoutez une photo."],
  video:['t3_fr_c07b48d1be19.mp3','Créez des vidéos à partir d’un texte ou de photos.'],
  audio:['t3_fr_d232d5d5e0d0.mp3','Créez de la musique à partir de votre description.']
 },
 es:{
  image:['t3_es_edec08775153.mp3','Crea con una descripción o añade una foto.'],
  video:['t3_es_4be3b4da98c9.mp3','Crea vídeos con texto o fotografías.'],
  audio:['t3_es_69fdc094ebea.mp3','Crea música a partir de tu descripción.']
 }
};
let catalogPromise;
function normalize(s){
 return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
function classify(q,lang){
 const s=normalize(q);
 const rules=TOPICS[lang]||TOPICS.ru;
 for(const intent of ['wellbeing','activity','hearing','identity','thanks','farewell','image','video','audio','hello']){
  // JavaScript `\\b` is ASCII word-boundary and fails for Russian letters.
  // Replace only the leading/trailing word anchors with Unicode-safe spaces.
  const pattern=rules[intent].source.replace(/^\\b/,'(?:^|\\s)').replace(/\\b$/,'(?=$|\\s)');
  if(new RegExp(pattern,'u').test(s))return intent;
 }
 return null;
}
function recorded(clip){
 return {id:clip.id,text:clip.text,audioUrl:clip.url,source:'smalltalk',purpose:clip.purpose};
}
function fromStored(clip,lang){
 if(!clip||clip.language!==lang||!clip.text||!/^[A-Za-z_]+_(ru|en|fr|es)\.mp3$/.test(clip.filename))return null;
 const name=clip.filename;
 if(clip.previewOnly!==true)return null;
 return recorded({id:name,language:lang,purpose:name.split('_')[0],
  text:clip.text,url:FOLDER+name});
}
async function catalog(){
 return catalogPromise||=fetch(FOLDER+'manifest.json',{cache:'no-store'})
  .then(async r=>{
   if(!r.ok)return {};
   const j=await r.json();
   if(j.schema!=='jarvix-new-short-voice-v1'||!Array.isArray(j.clips)||j.clips.length<8)return {};
   const out={};
   for(const c of j.clips){
    if(LANGUAGE.has(c.language)&&['hello','prompt'].includes(c.id.split('_')[0])){
      out[c.id]=c;
    }
   }
   return out;
  }).catch(()=>({}));
}
const FALLBACK_ORIGINAL={
 ru:['t3_ru_5c4572bce29c.mp3',1.40],
 en:['t3_en_023784bec3bf.mp3',1.80],
 fr:['t3_fr_8b174811bfee.mp3',1.16],
 es:['t3_es_8d5f3b1ff6c2.mp3',1.65]
};
export async function helloRecording(language='ru'){
 const lang=LANGUAGE.has(language)?language:'ru',assets=await catalog();
 const found=fromStored(assets['hello_'+lang],lang);
 if(found)return found;
 const [name,stopAtSeconds]=FALLBACK_ORIGINAL[lang];
 // In old deployments, stop BEFORE "Смотрите, что я умею".
 return {id:'tour-short-'+lang,text:NAMES[lang].hello,
    audioUrl:'/media/jarvix/tour-v3/'+name,source:'smalltalk',
    stopAtSeconds,purpose:'hello'};
}
export async function promptRecording(language='ru'){
 const lang=LANGUAGE.has(language)?language:'ru',assets=await catalog();
 const found=fromStored(assets['prompt_'+lang],lang);
 if(found)return found;
 // No pretending that a missing MP3 or local AI exists. If clip packaging
 // failed, return no audio rather than unrelated full tour narration.
 return null;
}
export async function smalltalkReply(question,language='ru'){
 const lang=LANGUAGE.has(language)?language:'ru';
 const kind=classify(question,lang);
 if(!kind)return null;
 if(kind==='hello'||kind==='identity')return helloRecording(lang);
 if(['image','video','audio'].includes(kind)){
  const [name,text]=EXISTING[lang][kind];
  return recorded({id:name,text,url:'/media/jarvix/tour-v3/'+name,purpose:kind});
 }
 // New approved human-recorded smalltalk (how are you / listening / thanks)
 // can be added when the local VoxCPM2 batch actually produces real MP3.
 // Until then, use the real, neutral prompt instead of "MP3 not found".
 return promptRecording(lang);
}
export {classify as classifySmalltalk};
