/* JARVIX NEW TEST: use the owner's EXISTING 500-scenario / 1,900-file MP3 library.
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
const TOUR_FILE=/^t3_(ru|en|fr|es)_[a-f0-9]{12}\.mp3$/;
const UNVERIFIED_PROMISE=/гарант(?:ия|ируем)|все функции работают прямо из коробки|кредиты вернутся мгновенно|guaranteed results|instant credit refund/i;
function allowedText(text){return typeof text==='string' && !!text.trim() && !UNVERIFIED_PROMISE.test(text);}
const audioRecord=(record,lang,available)=>{
 if (!record || !FILE.test(record.audio?.[lang]||''))return null;
 const filename=record.audio[lang];
 if (!available.has(filename))return null;
 const text=record.qa?.[lang]?.answer || record.phrases?.[lang];
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
async function catalog(lang){
 const [data,physical]=await Promise.all([prepareStaticClips(),verifiedPhysicalPaths()]);
 const available=new Set((data.clips||[]).filter(c=>c.language===lang &&
  FILE.test(c.filename) && physical.has('/media/jarvix/clips/'+c.filename)).map(c=>c.filename));
 return {available,scenarios:data.scenarios||[],tour:(data.tourClips||[]).filter(c=>
  c.language===lang && TOUR_FILE.test(c.filename) && allowedText(c.text) &&
  physical.has('/media/jarvix/tour-v3/'+c.filename))};
}
/** Exact previously recorded text, useful for the tour and LLaMA exact replies. */
export async function recordedExact(text,language='ru'){
 const lang=LANGS.has(language)?language:'ru',q=normalize(text);
 if (!q)return null;
 const {scenarios,available,tour}=await catalog(lang);
 const clip=tour.find(c=>normalize(c.text)===q);
 if (clip)return {id:clip.filename,text:clip.text,audioUrl:clip.url,source:'tour'};
 for (const item of scenarios){
  const answer=audioRecord(item,lang,available);
  if (answer && normalize(answer.text)===q)return answer;
 }
 return null;
}
/** Each user question checks the existing catalog BEFORE calling Ollama. */
export async function recordedReply(question,language='ru'){
 const lang=LANGS.has(language)?language:'ru',q=normalize(question);
 if (!q)return null;
 const {scenarios,available,tour}=await catalog(lang);
 const exact=tour.find(c=>normalize(c.text)===q);
 if (exact)return {id:exact.filename,text:exact.text,audioUrl:exact.url,source:'tour'};
 let best=null,score=0;
 for (const item of scenarios){
  const answer=audioRecord(item,lang,available);
  if (!answer)continue;
  const match=scoreRecordedQuestion(question,item.qa?.[lang]?.question,
    item.triggers?.[lang]||[]);
  if (match>score){score=match;best=answer;}
 }
 // Do not play an unrelated recording to make the voice appear functional.
 return score>=100?best:null;
}

const RECORDED_DIALOG_FLAGS=Object.freeze({followUps:true,combineReplies:true});
const FOLLOW_UP=/^(?:а\s+)?(?:а дальше|что дальше|дальше|продолжай|подробнее|расскажи подробнее|и что дальше|what next|go on|tell me more|et ensuite|continue|y después|continúa)[\s.!?]*$/iu;

export async function recordedConversationReply(question,language,history=[]){
 const direct=await recordedReply(question,language);
 if(direct)return direct;
 if(RECORDED_DIALOG_FLAGS.combineReplies){
  const parts=question.trim().split(/\?\s*(?=\S)/u);
  if(parts.length>=2&&parts.length<=3&&parts.every(part=>part.trim().length>3)){
   const clips=await Promise.all(parts.map(part=>recordedReply(part,language)));
   if(clips.every(Boolean)&&new Set(clips.map(clip=>clip.audioUrl)).size===clips.length)
    return {parts:clips,text:clips.map(clip=>clip.text).join(' '),source:'combined-recordings'};
  }
 }
 if(!RECORDED_DIALOG_FLAGS.followUps||!FOLLOW_UP.test(question.trim()))return null;
 const previous=[...history].reverse().find(turn=>turn.role==='user'&&!FOLLOW_UP.test(turn.content.trim()));
 if(!previous)return null;
 const {available,scenarios}=await catalog(language);
 const alreadySpoken=new Set(history.filter(turn=>turn.role==='assistant').map(turn=>normalize(turn.content)));
 let best=null,score=0;
 for(const item of scenarios){
  const answer=audioRecord(item,language,available);
  if(!answer||alreadySpoken.has(normalize(answer.text)))continue;
  const match=scoreRecordedQuestion(previous.content,item.qa?.[language]?.question,item.triggers?.[language]||[]);
  if(match>score){best=answer;score=match;}
 }
 return score>=100?best:null;
}
