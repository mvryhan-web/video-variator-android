// Static JARVIX Tour V3 recordings, made from the owner's established VoxCPM2 voice.
// The owner authorized a TEST preview of this pack. Individual multilingual listening
// approval remains pending; reviewed flags are deliberately left false.
let manifestPromise;
const normalize = text => String(text||'').normalize('NFC').trim().replace(/\s+/g,' ');
const LANGUAGES = new Set(['ru','en','fr','es']);
export async function getTourV3Recording(text,language) {
 if (!LANGUAGES.has(language)) return null;
 manifestPromise ||= fetch('/media/jarvix/tour-v3/manifest.json',{signal:AbortSignal.timeout(4000)})
  .then(async r=>r.ok?await r.json():null)
  .catch(()=>null);
 const manifest=await manifestPromise;
 // Retry a transient missing/failed manifest after the user presses Continue.
 if(!manifest) manifestPromise=null;
 if(manifest?.schemaVersion!=='jarvix-tour-v3-audio/v1'||
    manifest?.engine!=='VoxCPM2'||
    manifest?.format!=='mp3'||
    (manifest.previewApproved!==true && manifest.reviewed!==true)) return null;
 const clip=manifest.clips?.find(c=>c.language===language&&normalize(c.text)===normalize(text));
 if(!clip || (manifest.previewApproved!==true&&clip.reviewed!==true) ||
    !/^t3_(ru|en|fr|es)_[a-f0-9]{12}\.mp3$/.test(clip.filename)) return null;
 return '/media/jarvix/tour-v3/'+clip.filename;
}
