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
async function catalog(lang){
 const data=await prepareStaticClips();
 const available=new Set((data.clips||[]).filter(c=>c.language===lang && FILE.test(c.filename)).map(c=>c.filename));
 return {available,scenarios:data.scenarios||[],tour:(data.tourClips||[]).filter(c=>c.language===lang &&
  TOUR_FILE.test(c.filename) && allowedText(c.text))};
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
