// Optional owner-recorded V4 narration. Never substitutes a browser/system TTS.
const langs=new Set(['ru','en','fr','es']);
let cache=null;
const normalize=x=>String(x||'').normalize('NFC').replace(/\s+/g,' ').trim();
export async function getTourV4Recording(id,language){
 if(!langs.has(language)||!/^[a-z][a-z0-9-]{2,50}$/.test(id))return null;
 if(!cache)cache=fetch('/media/jarvix/tour-v4/manifest.json',{signal:AbortSignal.timeout(4000)})
  .then(async r=>r.ok?r.json():null).catch(()=>null);
 const manifest=await cache; // Cache missing optional packs for this page; no repeated 404s.
 if(manifest?.schemaVersion!=='jarvix-tour-v4-audio/v1'||manifest.engine!=='VoxCPM2'||manifest.format!=='mp3'
  ||(manifest.reviewed!==true&&manifest.previewApproved!==true))return null;
 const clip=manifest.clips?.find(item=>item.id===id&&item.language===language);
 if(!clip||typeof clip.text!=='string'||!normalize(clip.text)
  ||(clip.reviewed!==true&&manifest.previewApproved!==true)
  ||!/^v4_(ru|en|fr|es)_[a-f0-9]{12}\.mp3$/.test(clip.filename))return null;
 return {url:'/media/jarvix/tour-v4/'+clip.filename,text:normalize(clip.text)};
}
// Exact beat replacement keys; preserve the original recorded V3 everywhere
// a matching approved V4 recording has not yet been supplied.
export function v4BeatId(stage,index){
 const replacements={
  Tools:{0:'tools-overview'},
  'Video Uniquifier':{0:'uniquifier-variants',2:'uniquifier-quality'},
  Canvas:{0:'canvas-edit'},
  Inspiration:{1:'inspiration-clone'},
  Pricing:{0:'plans-available'}
 };
 return replacements[stage]?.[index]||null;
}
