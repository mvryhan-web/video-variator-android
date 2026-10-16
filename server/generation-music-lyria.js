// Lyria 3 Clip: official Gemini generateContent API, always a 30-second MP3.
// The server-only adapter is a response trust boundary, not commercial access.
export function buildLyriaClipPrompt({prompt,musicMode,references=[],model}={}){
 if(model!=='lyria-3-clip-preview'||typeof prompt!=='string'||!prompt.trim()||
    prompt.length>2000||!Array.isArray(references)||references.length||
    !['song','instrumental'].includes(musicMode))throw Error('INVALID_MUSIC_REQUEST');
 return `${musicMode==='instrumental'?'Instrumental only, no vocals.':'Create an original song with vocals.'}
 Make an original 30-second music clip. ${prompt.trim()}`;
}
function hasMpegFrame(bytes,offset){
 if(offset<0||offset+4>bytes.length)return false;
 const a=bytes[offset],b=bytes[offset+1],c=bytes[offset+2];
 return a===255&&(b&0xe0)===0xe0&&(b&0x18)!==0x08&&
  (b&0x06)!==0&&(c&0xf0)!==0&&(c&0xf0)!==0xf0&&(c&0x0c)!==0x0c;
}
export function looksLikeMp3(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<32)return false;
 let start=0;
 if(bytes.subarray(0,3).toString('ascii')==='ID3'){
  if(bytes.length<10)return false;
  const len=bytes.subarray(6,10);
  if(len.some(x=>(x&0x80)!==0))return false;
  start=10+((len[0]<<21)|(len[1]<<14)|(len[2]<<7)|len[3]);
  if(bytes[5]&0x10)start+=10; // tag footer
  if(start>=bytes.length)return false;
 }
 for(let i=start;i<Math.min(bytes.length-3,start+512);i++){
  if(hasMpegFrame(bytes,i))return true;
  if(bytes[i]!==0)break; // only tolerate padding between metadata and frame
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
