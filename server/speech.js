// Server-only Google credentials. Disabled until the owner confirms a free-tier project.
export const voices=['Kore','Puck','Charon','Fenrir','Aoede','Leda','Orus','Zephyr'];
export const languages={'en-US':'American English','en-GB':'British English',de:'German',ru:'Russian',fr:'French',uk:'Ukrainian',es:'Spanish',it:'Italian',pt:'Portuguese',pl:'Polish',ja:'Japanese',ko:'Korean',ar:'Arabic',hi:'Hindi'};
export const speechEnabled=()=>process.env.GOOGLE_TTS_ENABLED==='true'&&!!process.env.GEMINI_API_KEY;
export function pcmWave(pcm,rate=24000){const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);return Buffer.concat([h,pcm]);}
export function installSpeech(app,{auth,reserve}){
 app.get('/api/speech/config',(req,res)=>res.json({enabled:speechEnabled(),voices,languages,maxChars:1000,dailyUserLimit:3,reason:speechEnabled()?null:'OWNER_SETUP_REQUIRED'}));
 app.post('/api/speech',auth,async(req,res)=>{
  if(!speechEnabled())return res.status(503).json({error:'SPEECH_NOT_ENABLED'});
  const {text,voice,language,consent}=req.body||{};
  if(typeof text!=='string'||!text.trim()||text.length>1000||!voices.includes(voice)||!Object.hasOwn(languages,language)||consent!==true)return res.status(400).json({error:'INVALID_SPEECH_REQUEST'});
  try{
   if(!await reserve(req.user.id))return res.status(429).json({error:'FREE_SPEECH_LIMIT'});
   const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',{method:'POST',signal:AbortSignal.timeout(90000),headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:`Read only the following text naturally in ${languages[language]}. Do not add commentary:\n${text}`}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}})});
   if(!r.ok)return res.status(r.status===429?429:502).json({error:r.status===429?'FREE_SPEECH_LIMIT':'SPEECH_PROVIDER_ERROR'});
   const data=await r.json(),audio=data.candidates?.[0]?.content?.parts?.find(p=>p.inlineData?.mimeType?.startsWith('audio/'))?.inlineData;
   if(!audio?.data)return res.status(502).json({error:'EMPTY_SPEECH'});
   const pcm=Buffer.from(audio.data,'base64');if(pcm.length>24*1024*1024)return res.status(502).json({error:'SPEECH_TOO_LONG'});
   const rate=Number(audio.mimeType.match(/rate=(\d+)/)?.[1]||24000);
   res.type('audio/wav').send(audio.mimeType.includes('wav')?pcm:pcmWave(pcm,rate));
  }catch(_){res.status(502).json({error:'SPEECH_UNAVAILABLE'});}
 });
}
