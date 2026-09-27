import {createEngine} from './ai-media.js';
export const voices=['Kore','Puck','Charon','Fenrir','Aoede','Leda','Orus','Zephyr'];
export const languages={'en-US':'English (US)','en-GB':'English (UK)',de:'Deutsch',ru:'Русский',fr:'Français',uk:'Українська',es:'Español',it:'Italiano',pt:'Português',pl:'Polski',ja:'日本語',ko:'한국어',ar:'العربية',hi:'हिन्दी'};
export async function synthesize(text,voice,language,consent,signal){
 const token=localStorage.getItem('vv_token');if(!token)throw Error('SIGN_IN_REQUIRED');
 const r=await fetch((window.VV_API_BASE||location.origin)+'/api/speech',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},signal,body:JSON.stringify({text,voice,language,consent})});
 if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||'SPEECH_UNAVAILABLE');
 return new File([await r.blob()],'VideoUniquifier-voice.wav',{type:'audio/wav'});
}
export async function toMp3(file,{onEngine=()=>{}}={}){let engine;try{engine=await createEngine();onEngine(engine);await engine.writeFile('narration.wav',new Uint8Array(await file.arrayBuffer()));if(await engine.exec(['-i','narration.wav','-vn','-c:a','libmp3lame','-b:a','128k','narration.mp3']))throw Error('MP3_ENCODE_FAILED');return new File([await engine.readFile('narration.mp3')],'VideoUniquifier-voice.mp3',{type:'audio/mpeg'});}finally{engine?.terminate();}}
