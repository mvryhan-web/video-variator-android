// V3 speech must come from the existing licensed JARVIX voice profile only.
// A pre-rendered owner voice pack is optional; otherwise the existing VoxCPM2
// worker is used by jarvix-owner-speech.js. Never fall back to browser TTS.
let manifestPromise;
const normalize=text=>String(text||'').normalize('NFC').trim().replace(/\s+/g,' ');
export async function getTourV3Recording(text,language){
 manifestPromise ||= fetch('media/jarvix/tour-v3/manifest.json',{signal:AbortSignal.timeout(4000)})
  .then(async r=>r.ok?await r.json():null)
  .catch(()=>null);
 const m=await manifestPromise;
 if(m?.schemaVersion!=='jarvix-tour-v3-audio/v1'||m?.reviewed!==true||m?.engine!=='VoxCPM2')return null;
 const clip=m.clips?.find(x=>x.language===language&&normalize(x.text)===normalize(text)&&x.reviewed===true);
 if(!clip||!/^t3_(?:ru|en|fr|es)_[a-f0-9]{12}\.wav$/.test(clip.filename))return null;
 return 'media/jarvix/tour-v3/'+clip.filename;
}
