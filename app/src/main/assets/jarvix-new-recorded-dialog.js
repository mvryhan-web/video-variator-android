/* JARVIX NEW TEST: catalog of physically available owner recordings.
 * No voice cloning, new TTS, browser SpeechSynthesis, or audio downloads beyond the
 * already hosted owner recordings. The phrase spoken must match its transcript.
 */
import {prepareStaticClips} from './jarvix-clip-library.js';

const normalize = value => String(value || '').normalize('NFC').toLowerCase()
 .replace(/ё/g, 'е').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

const COMMON = new Set([
 'а','и','но','в','на','о','об','от','до','за','для','по','с','со','у','из','мне',
 'моя','мой','моё','меня','пожалуйста','скажи','расскажи','объясни','помоги',
 'the','a','an','i','me','my','you','your','please','tell','about','de','la','el',
 'les','des','une','un','sur','para','con','por','and','et','y'
]);
const words = value => normalize(value).split(' ').filter(w => w.length > 1 && !COMMON.has(w));
const sameWord = (a,b) => a===b || (a.length>=6 && b.length>=6 &&
 a.slice(0,Math.min(5,a.length-2))===b.slice(0,Math.min(5,b.length-2)));
function intent(text){
 // Unicode word boundaries: JS \\b alone fails for Cyrillic.
 const q=' '+normalize(text)+' ';
 if (/\s(?:где|куда|where|où|dónde)\s/u.test(q))return 'where';
 if (/\s(?:сколько|стоимость|цена|цены|price|cost|prix|precio|cuánto)\s/u.test(q))return 'price';
 if (/\s(?:как|how|comment|cómo)\s/u.test(q))return 'how';
 if (/\s(?:зачем|почему|why|pourquoi|porqué)\s/u.test(q))return 'why';
 if (/\s(?:когда|when|quand|cuándo)\s/u.test(q))return 'when';
 if (/\s(?:что|кто|какой|what|who|which|que|qué|qui)\s/u.test(q))return 'what';
 return null;
}
export function scoreRecordedQuestion(query, reference, triggers=[]) {
 const q=normalize(query),target=normalize(reference);
 if (!q || !target)return 0;
 if (q===target)return 200;
 const t=triggers.map(normalize).filter(v=>v.length>=4);
 if (t.includes(q))return 190;
 if (q.length>=8 && target.length>=8 && q.includes(target))return 170;
 if (q.length>=8 && t.some(v=>v.length>=8 && q.includes(v)))return 160;
 const qWords=words(query),refWords=words(reference);
 if (qWords.length<2 || refWords.length<2)return 0;
 const matched=qWords.filter(qw=>refWords.some(rw=>sameWord(qw,rw))).length;
 const coverage=matched/qWords.length, specificity=matched/refWords.length;
 const from=intent(query),to=intent(reference);
 if (from && to && from!==to)return 0;
 if (matched<2 || coverage<0.67 || specificity<0.32)return 0;
 return 80+coverage*35+specificity*15;
}
const LANGS=new Set(['ru','en','fr','es']);
const FILE=/^jarvix_(ru|en|fr|es)_s\d{3}\.mp3$/;
const NUMBERED_FILE=/^jarvix_(ru|en|fr|es)_\d{2}\.mp3$/;
const TOUR_FILE=/^t3_(ru|en|fr|es)_[a-f0-9]{12}\.mp3$/;
const UNVERIFIED_PROMISE=/гарант(?:ия|ируем)|все функции работают прямо из коробки|кредиты вернутся мгновенно|guaranteed results|instant credit refund/i;
function allowedText(text){return typeof text==='string' && !!text.trim() && !UNVERIFIED_PROMISE.test(text);}
const audioRecord=(record,lang,available,reviewed)=>{
 if (!record || !FILE.test(record.audio?.[lang]||''))return null;
 const filename=record.audio[lang];
 if (!available.has(filename))return null;
 const review=reviewed.get(filename);
 if(review?.scenarioId!==record.id)return null;
 const text=review.spokenText;
 if (!allowedText(text))return null;
 return {id:record.id,text,audioUrl:'/media/jarvix/clips/'+filename,source:'scenario'};
};
let verifiedPhysicalPromise=null;
async function verifiedPhysicalPaths(){
 if(!verifiedPhysicalPromise)verifiedPhysicalPromise=fetch('/jarvix-new-physical-audio-index.json',{cache:'no-store'})
  .then(async response=>{
   if(!response.ok)throw new Error('Physical MP3 index unavailable');
   const index=await response.json();
   if(index.schema!=='jarvix-new-physical-audio-index/v1'||
      !Array.isArray(index.paths)||index.paths.length!==index.count)
    throw new Error('Invalid physical MP3 index');
   return new Set(index.paths);
  }).catch(()=>new Set());
 return verifiedPhysicalPromise;
}
// The numbered MP3 transcripts come from the source used by the clip generator.
let phrasesPromise;
function loadNumberedPhrases(){
 return phrasesPromise ||= fetch('/media/jarvix/jarvix-phrases.json',
  {signal:AbortSignal.timeout(6000)}).then(response=>{
   if(!response.ok)return {};
   return response.json().then(data=>data.phrases || {});
  }).catch(()=>({}));
}
// Review entries contain what was actually heard, independently of the script.
let reviewPromise;
function reviewedScenarios(){
 return reviewPromise ||= fetch('/media/jarvix/clips/reviewed-scenarios.json',
  {cache:'no-store',signal:AbortSignal.timeout(6000)}).then(async response=>{
   if(!response.ok)return new Map();
   const data=await response.json();
   if(data.schema!=='jarvix-reviewed-scenarios/v1'||!Array.isArray(data.clips))return new Map();
   return new Map(data.clips.filter(clip=>clip && clip.approved===true &&
    FILE.test(clip.filename) && typeof clip.scenarioId==='string' &&
    allowedText(clip.spokenText)).map(clip=>[clip.filename,clip]));
  }).catch(()=>new Map());
}
const catalogs=new Map();
function catalog(lang){
 if(!catalogs.has(lang))catalogs.set(lang,buildCatalog(lang));
 return catalogs.get(lang);
}
async function buildCatalog(lang){
 const [data,physical,phrases,reviewed]=await Promise.all([
  prepareStaticClips(),verifiedPhysicalPaths(),loadNumberedPhrases(),reviewedScenarios()
 ]);
 const available=new Set(data.clips.filter(c=>c.language===lang &&
  physical.has('/media/jarvix/clips/'+c.filename)).map(c=>c.filename));
 const clips=data.scenarios.flatMap(item=>{
  const answer=audioRecord(item,lang,available,reviewed);
  return answer?[{...answer,question:item.qa?.[lang]?.question,triggers:item.triggers?.[lang]||[]}]:[];
 });
 for(const {id,text} of phrases[lang]||[]){
  const filename=id+'.mp3';
  if(NUMBERED_FILE.test(filename)&&available.has(filename)&&allowedText(text))
   clips.push({id,text,audioUrl:'/media/jarvix/clips/'+filename,source:'numbered'});
 }
 for(const clip of data.tourClips){
  if(clip.language===lang&&TOUR_FILE.test(clip.filename)&&allowedText(clip.text)&&physical.has(clip.url))
   clips.push({id:clip.filename,text:clip.text,audioUrl:clip.url,source:'tour'});
 }
 return clips;
}
const SITE_ANSWERS_RU = [
 [/(?:canvas|canva|канва|холст)/iu, 't3_ru_cc451dff495e.mp3'],
 [/(?:ai\s*apps?|шаблон|приложени)/iu, 't3_ru_17ad4c84e62d.mp3'],
 [/(?:everyday\s*tools|инструмент|утилит)/iu, 't3_ru_76c07a8f82b9.mp3'],
 [/(?:uniquifier|уникализатор)/iu, 't3_ru_eb5198a625f8.mp3'],
 [/(?:inspiration|вдохновени)/iu, 't3_ru_70e7f65e6a88.mp3']
];
// Curated continuations from the same tour section. Each part is a complete sentence.
const SITE_DETAILS_RU = [
 [/(?:canvas|canva|канва|холст)/iu,[
  't3_ru_cc451dff495e.mp3',
  't3_ru_d3eeb273cee7.mp3']],
 [/(?:ai\s*apps?|шаблон)/iu,[
  't3_ru_17ad4c84e62d.mp3',
  't3_ru_d62b7ee5699f.mp3']],
 [/(?:uniquifier|уникализатор)/iu,[
  't3_ru_eb5198a625f8.mp3',
  't3_ru_390fad5b4fe8.mp3',
  't3_ru_8cd01ce443f9.mp3']]
];

// These prompts describe existing recordings. Event confirmations remain tied
// to the actual action and must never be selected by a loose keyword match.
const NUMBERED_QUESTIONS_RU=[
 [51,'Можно ли использовать результат коммерчески?'],
 [52,'Как составить промпт?'],
 [53,'Как превратить фотографию в видео?'],
 [54,'Как проходит оплата?'],
 [55,'Как пополнить баланс?'],
 [56,'Где посмотреть баланс кредитов?'],
 [57,'Доступно ли разрешение 4K?'],
 [58,'Сколько времени занимает генерация?'],
 [59,'В каком формате можно скачать результат?'],
 [61,'Какой формат выбрать для Reels или YouTube?'],
 [62,'Как выбрать тариф?'],
 [67,'Где посмотреть примеры для вдохновения?'],
 [70,'Как улучшить описание для генерации?'],
 [72,'Что ты умеешь?']
];
const FOLLOW_UP=/^(?:а\s+)?(?:что дальше|дальше|продолжай|подробнее|расскажи подробнее|и что дальше|what next|go on|tell me more|et ensuite|continue|y después|continúa)[\s.!?]*$/iu;
const REPHRASE=/^(?:а\s+)?(?:скажи\s+(?:иначе|по\s*другому)|объясни\s+(?:иначе|по\s*другому)|другими\s+словами|перефразируй|другой\s+вариант|еще\s+вариант|ещё\s+вариант|можно\s+(?:иначе|по\s*другому)|say\s+it\s+(?:differently|another\s+way)|rephrase(?:\s+that)?|in\s+other\s+words|another\s+version|different\s+wording|reformule|dis\s+le\s+autrement|autrement|avec\s+d\s+autres\s+mots|reformula|dilo\s+de\s+otra\s+manera|con\s+otras\s+palabras|otra\s+versi[oó]n)[\s.!?]*$/iu;
const SITE_QUESTION=/^\s*(?:что|как|зачем|для чего|расскажи|объясни)(?:[\s,.!?]|$)/iu;

function answerFromParts(parts){
 if(!parts.length || parts.some(part=>!part))return null;
 const unique=[...new Map(parts.map(part=>[part.audioUrl,part])).values()];
 return unique.length===1?unique[0]:{
  parts:unique,text:unique.map(part=>part.text).join(' '),source:'combined-recordings'
 };
}
export function wasRecordedReplyUsed(text,history){
 const phrase=normalize(text);
 return !!phrase&&history.some(turn=>turn.role==='assistant'&&
  (' '+normalize(turn.content)+' ').includes(' '+phrase+' '));
}

const languageKey=language=>LANGS.has(language)?language:'ru';
const exactClip=(clips,text)=>clips.find(clip=>normalize(clip.text)===normalize(text))||null;
const tourClip=(clips,file)=>clips.find(clip=>clip.source==='tour'&&clip.id===file)||null;
export async function recordedExact(text,language='ru'){
 return normalize(text)?exactClip(await catalog(languageKey(language)),text):null;
}
function findReply(clips,question,lang){
 const exact=exactClip(clips,question);
 if(exact)return exact;
 let best=null,score=99;
 for(const clip of clips){
  const alias=lang==='ru'&&clip.source==='numbered'
   ? NUMBERED_QUESTIONS_RU.find(([id])=>clip.id==='jarvix_ru_'+id)?.[1] : null;
  const match=scoreRecordedQuestion(question,clip.question||alias,clip.triggers);
  if(match>score){score=match;best=clip;}
 }
 if(best || lang!=='ru')return best;
 if(/^(?:а )?(?:какую|какое|какой) (?:фотографию|фото|изображение|снимок)(?: |$)/u.test(normalize(question))){
  for(const number of ['73','70','65']){
   const option=clips.find(clip=>clip.id==='jarvix_ru_'+number);
   if(option)return option;
  }
  return null;
 }
 if(!SITE_QUESTION.test(question))return null;
 const details=/(?:как\s|подробнее)/iu.test(question)
  ? SITE_DETAILS_RU.find(([topic])=>topic.test(question))?.[1] : null;
 if(details){
  const composed=answerFromParts(details.map(file=>tourClip(clips,file)));
  if(composed)return composed;
 }
 const entry=SITE_ANSWERS_RU.find(([topic])=>topic.test(question));
 return entry?tourClip(clips,entry[1]):null;
}
export async function recordedReply(question,language='ru'){
 const lang=languageKey(language);
 return normalize(question)?findReply(await catalog(lang),question,lang):null;
}

export async function recordedConversationReply(question,language,history=[]){
 const lang=languageKey(language);
 if(!normalize(question))return null;
 const clips=(await catalog(lang)).filter(clip=>!wasRecordedReplyUsed(clip.text,history));
 const exact=exactClip(clips,question);
 if(exact)return exact;
 const questions=question.trim().split(/\?\s*(?=\S)|\s+(?:и|and|et|y)\s+(?=(?:как|что|где|сколько|зачем|how|what|where|comment|cómo|dónde)\s)/iu);
 if(questions.length>1){
  if(questions.length>3)return null;
  const parts=questions.flatMap(part=>{
   const answer=findReply(clips,part,lang);
   return answer?.parts||[answer];
  });
  return parts.length<=3?answerFromParts(parts):null;
 }
 if(!FOLLOW_UP.test(question.trim())&&!REPHRASE.test(question.trim()))
  return findReply(clips,question,lang);
 // "Say it differently" means pick a different, already recorded response to
 // the preceding user question. Never edit audio bytes or invent a transcript.
 const previous=[...history].reverse().find(turn=>turn.role==='user'&&
  !FOLLOW_UP.test(turn.content.trim())&&!REPHRASE.test(turn.content.trim()));
 if(!previous)return null;
 if(REPHRASE.test(question.trim())){
  // Only a verified, unused clip with a matching documented question/triggers.
  // A semantically unrelated recording is never used as a stylistic variant.
  const alternative=clips.filter(clip=>clip.source==='scenario'&&clip.question)
   .map(clip=>({clip,score:scoreRecordedQuestion(previous.content,clip.question,clip.triggers)}))
   .filter(item=>item.score>=110)
   .sort((a,b)=>b.score-a.score||String(a.clip.id).localeCompare(String(b.clip.id)))[0];
  return alternative?.clip||null;
 }
 if(lang==='ru'){
  const details=SITE_DETAILS_RU.find(([topic])=>topic.test(previous.content))?.[1];
  const next=details?.map(file=>tourClip(clips,file)).filter(Boolean);
  if(next?.length)return answerFromParts(next);
  if(/(?:inspiration|вдохновени)/iu.test(previous.content)){
   const nextInspiration=tourClip(clips,'t3_ru_7fd91e38c5ce.mp3');
   if(nextInspiration)return nextInspiration;
  }
 }
 return findReply(clips,previous.content,lang);
}
