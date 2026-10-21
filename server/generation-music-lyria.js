// Lyria 3 Clip: official Gemini generateContent API, always a 30-second MP3.
// The server-only adapter is a response trust boundary, not commercial access.

// Prompt-form inputs only; Lyria Clip has NO documented native genre, lyrics,
// instrument or exact-duration parameters. The selected style is encoded in
// normal text, validated and billed as the same fixed 30-second clip.
export const LYRIA_CLIP_GENRES=Object.freeze({
 lofi:'Lo-fi',pop:'Pop',hiphop:'Hip-hop',edm:'EDM',rock:'Rock',
 cinematic:'Cinematic',jazz:'Jazz',ambient:'Ambient'
});
const MOODS=new Set(['warm','calm','energetic','melancholic','dreamy','dark']);
const INSTRUMENTS=new Set(['piano','guitar','synth','drums','strings','bass','saxophone','flute']);
const LANGUAGES=new Set(['en','fr','ru','uk','de','es','pt']);
const invalid=()=>{throw Error('UNSUPPORTED_MUSIC_CONTROL');};
export function normalizeLyriaClipControls(input={}){
 const str=(name,max)=>{const value=input[name];if(value==null||value==='')return null;
  if(typeof value!=='string'||value.length>max||!value.trim()||/[\x00-\x1f]/.test(value))invalid();
  return value.trim();};
 const musicGenre=str('musicGenre',20);
 if(musicGenre&&!Object.hasOwn(LYRIA_CLIP_GENRES,musicGenre))invalid();
 const musicMood=str('musicMood',20);
 if(musicMood&&!MOODS.has(musicMood))invalid();
 const musicLanguage=str('musicLanguage',10);
 if(musicLanguage&&!LANGUAGES.has(musicLanguage))invalid();
 const musicTitle=str('musicTitle',80);
 let musicLyrics=input.musicLyrics??null;
 if(musicLyrics!=null){
  if(typeof musicLyrics!=='string'||musicLyrics.length>1500||!musicLyrics.trim()||
     /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(musicLyrics))invalid();
  musicLyrics=musicLyrics.trim();
 }
 if(musicLyrics&&input.musicMode!=='song')invalid();
 const instruments=input.musicInstruments??[];
 if(!Array.isArray(instruments)||instruments.length>4||new Set(instruments).size!==instruments.length||
  instruments.some(x=>!INSTRUMENTS.has(x)))invalid();
 return {musicGenre,musicMood,musicLanguage,musicTitle,musicLyrics,musicInstruments:instruments.slice()};
}

export function buildLyriaClipPrompt({prompt,musicMode,references=[],model}={}){
 if(model!=='lyria-3-clip-preview'||typeof prompt!=='string'||!prompt.trim()||
    prompt.length>2000||!Array.isArray(references)||references.length||
    !['song','instrumental'].includes(musicMode))throw Error('INVALID_MUSIC_REQUEST');
 const controls=normalizeLyriaClipControls(arguments[0]||{});
 const lines=[musicMode==='instrumental'?'Instrumental only, no vocals.':'Create an original song with vocals.',
  'Make an original 30-second music clip.',
  controls.musicGenre?'Genre: '+LYRIA_CLIP_GENRES[controls.musicGenre]+'.':null,
  controls.musicMood?'Mood: '+controls.musicMood+'.':null,
  controls.musicInstruments.length?'Instruments: '+controls.musicInstruments.join(', ')+'.':null,
  controls.musicLanguage?'Requested lyrics language: '+controls.musicLanguage+'.':null,
  controls.musicTitle?'Suggested title: '+controls.musicTitle+'.':null,
  'Music idea: '+prompt.trim(),
  controls.musicLyrics?'User-provided lyrics (separate from production instructions):\n'+controls.musicLyrics:null];
 return lines.filter(Boolean).join('\n');
}
// MPEG Layer III requires complete, consecutive frames. A four-byte sync
// prefix plus arbitrary garbage is NOT valid proof of audio (old false positive).
const MPEG1_BITRATES=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320];
const MPEG2_BITRATES=[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
const SAMPLE_RATES={0:[11025,12000,8000],2:[22050,24000,16000],3:[44100,48000,32000]};
function mpeg3Frame(bytes,offset){
 if(offset<0||offset+4>bytes.length||bytes[offset]!==0xff)return null;
 const b=bytes[offset+1],c=bytes[offset+2];
 if((b&0xe0)!==0xe0||(b&0x06)!==0x02)return null; // sync + Layer III only
 const version=(b>>3)&3,bitrateIndex=(c>>4)&15,sampleIndex=(c>>2)&3;
 if(version===1||bitrateIndex===0||bitrateIndex===15||sampleIndex===3)return null;
 const sampleRate=SAMPLE_RATES[version]?.[sampleIndex];
 const bitrate=(version===3?MPEG1_BITRATES:MPEG2_BITRATES)[bitrateIndex];
 if(!sampleRate||!bitrate)return null;
 const frameBytes=Math.floor((version===3?144:72)*bitrate*1000/sampleRate)+((c>>1)&1);
 if(frameBytes<24||offset+frameBytes>bytes.length)return null;
 return {version,sampleRate,frameBytes};
}
export function looksLikeMp3(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<32)return false;
 let start=0;
 if(bytes.subarray(0,3).toString('ascii')==='ID3'){
  if(bytes.length<10||![2,3,4].includes(bytes[3]))return false;
  const len=bytes.subarray(6,10);
  if(len.some(x=>(x&0x80)!==0))return false;
  start=10+((len[0]<<21)|(len[1]<<14)|(len[2]<<7)|len[3]);
  if(bytes[5]&0x10)start+=10;
  if(start>=bytes.length)return false;
 }
 // A real 30-second Lyria clip contains thousands of frames. Three complete,
 // adjoining MP3 Layer III frames is only a cheap structural gate, NOT decoder
 // validation or proof that the output is playable. Keep real media QA separate.
 for(let i=start;i<Math.min(bytes.length-3,start+512);i++){
  const first=mpeg3Frame(bytes,i);
  if(first){
   let offset=i,good=true;
   for(let k=0;k<3;k++){
    const frame=mpeg3Frame(bytes,offset);
    if(!frame||frame.version!==first.version||frame.sampleRate!==first.sampleRate){good=false;break;}
    offset+=frame.frameBytes;
   }
   if(good)return true;
  }
  if(bytes[i]!==0)break; // padding between ID3 metadata and first frame
 }
 return false;
}
export function parseLyriaClipResult(response){
 const parts=response?.candidates?.[0]?.content?.parts;
 if(!Array.isArray(parts))throw Error('EMPTY_GENERATION');
 const media=parts.map(part=>part?.inlineData||part?.inline_data).find(x=>x?.data&&
   String(x.mimeType||x.mime_type||'').startsWith('audio/'));
 if(!media)throw Error('EMPTY_GENERATION');
 const mime=media.mimeType||media.mime_type;
 if(!['audio/mpeg','audio/mp3'].includes(mime))throw Error('UNSUPPORTED_PROVIDER_MEDIA');
 const data=media.data;
 if(typeof data!=='string'||!data.length||data.length>40*1024*1024||
    data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(data))
  throw Error('INVALID_PROVIDER_MEDIA');
 const bytes=Buffer.from(data,'base64');
 if(bytes.length>30*1024*1024||!looksLikeMp3(bytes))throw Error('INVALID_PROVIDER_MEDIA');
 const text=parts.filter(p=>typeof p?.text==='string').map(p=>p.text).join('\n').slice(0,12000);
 return {mime:'audio/mpeg',bytes,text};
}
