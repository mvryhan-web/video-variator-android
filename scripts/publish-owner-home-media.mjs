// Publish this owner's supplied bundle through the EXISTING Inspiration admin API.
// No database access, migrations, provider calls, billing or automatic deployment.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const bundlePath=new URL('../app/src/main/assets/media/home/owner-20261018/manifest.json',import.meta.url);
export function publicationPlan(bundle,current=[],rightsNote=''){
 if(bundle.items?.length!==7||bundle.carouselOrder?.length!==6)throw Error('INVALID_OWNER_BUNDLE');
 const featured=bundle.items.filter(x=>x.carouselOrder!==null).sort((a,b)=>a.carouselOrder-b.carouselOrder);
 if(JSON.stringify(featured.map(x=>x.slug))!==JSON.stringify(bundle.carouselOrder)||featured.some((x,i)=>x.carouselOrder!==i+1))throw Error('INVALID_CAROUSEL_ORDER');
 if(new Set(bundle.items.map(x=>x.slug)).size!==7)throw Error('DUPLICATE_BUNDLE_SLUG');
 const operations=[];
 for(const source of bundle.items){
  const matches=current.filter(x=>x.slug===source.slug);
  if(matches.length>1)throw Error('DUPLICATE_EXISTING_SLUG');
  const {sourceFilename,sourceSha256,sha256,sizeBytes,durationSeconds,videoStreamUnchanged,audioTracks,carouselOrder,...payload}=source;
  payload.active=true;payload.featured=carouselOrder!==null;payload.rightsNote=rightsNote;
  operations.push({method:matches.length?'PATCH':'POST',path:'/api/studio/admin/inspiration'+(matches.length?'/'+encodeURIComponent(matches[0].id):''),slug:source.slug,payload});
 }
 // Keep original records and all images. Remove old films (including the lake)
 // from featured Home slots only; never delete user or original scene data.
 const wanted=new Set(bundle.carouselOrder);
 for(const old of current){
  if(old.kind==='video'&&old.actionTarget==='studio'&&old.featured&&!wanted.has(old.slug)&&!bundle.items.some(x=>x.slug===old.slug))operations.push({method:'PATCH',path:'/api/studio/admin/inspiration/'+encodeURIComponent(old.id),slug:old.slug,payload:{featured:false}});
 }
 return operations;
}
export async function publishOwnerMedia({bundle,origin,env=process.env,fetchImpl=fetch}){
 if(env.OWNER_MEDIA_RIGHTS_CONFIRMED!=='true'||env.OWNER_MEDIA_PUBLISH_APPROVED!=='true')throw Error('OWNER_RIGHTS_AND_PUBLICATION_APPROVAL_REQUIRED');
 const note=String(env.OWNER_MEDIA_RIGHTS_NOTE||'').trim();
 if(note.length<10||note.length>300)throw Error('OWNER_RIGHTS_NOTE_REQUIRED');
 if(!env.OWNER_MEDIA_ADMIN_TOKEN)throw Error('OWNER_GOOGLE_SESSION_REQUIRED');
 const base=new URL(origin);
 if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error('HTTPS_ORIGIN_REQUIRED');
 const headers={Authorization:'Bearer '+env.OWNER_MEDIA_ADMIN_TOKEN,'Content-Type':'application/json'};
 const request=async(path,options={})=>{
  const r=await fetchImpl(new URL(path,base),{...options,headers,redirect:'error'});
  if(!r.ok)throw Error('OWNER_API_HTTP_'+r.status);
  return r.json();
 };
 // Reject before any write if all seven exact static media URLs are not deployed.
 publicationPlan(bundle,[],note);
 for(const item of bundle.items){
  const r=await fetchImpl(new URL(item.previewUrl,base),{redirect:'error'});
  if(!r.ok||!String(r.headers.get('content-type')).includes('video/mp4'))throw Error('MEDIA_NOT_DEPLOYED');
  const bytes=Buffer.from(await r.arrayBuffer());
  if(bytes.length!==item.sizeBytes||createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('MEDIA_HASH_MISMATCH');
  const poster=await fetchImpl(new URL(item.previewPosterUrl,base),{redirect:'error'});
  if(!poster.ok||!String(poster.headers.get('content-type')).startsWith('image/'))throw Error('POSTER_NOT_DEPLOYED');
 }
 const current=await request('/api/studio/admin/inspiration');
 if(!Array.isArray(current.items))throw Error('INVALID_OWNER_API_RESPONSE');
 const plan=publicationPlan(bundle,current.items,note);
 for(const action of plan)await request(action.path,{method:action.method,body:JSON.stringify(action.payload)});
 const verification=await fetchImpl(new URL('/api/inspiration?featured=true&kind=video&target=studio&limit=13',base),{redirect:'error',cache:'no-store'});
 if(!verification.ok)throw Error('PUBLIC_FEED_UNAVAILABLE_AFTER_APPLY');
 const feed=await verification.json();
 if(JSON.stringify(feed.items?.map(x=>x.slug))!==JSON.stringify(bundle.carouselOrder))throw Error('PUBLIC_CAROUSEL_ORDER_NOT_VERIFIED');
 return {published:7,carousel:bundle.carouselOrder,source:'existing Inspiration API'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const bundle=JSON.parse(await readFile(bundlePath,'utf8'));
  if(process.argv.includes('--apply')){
   const result=await publishOwnerMedia({bundle,origin:process.env.OWNER_MEDIA_ORIGIN});
   console.log(JSON.stringify(result,null,2));
  }else console.log(JSON.stringify({mode:'OFFLINE_PLAN_ONLY_NO_NETWORK',commercialRightsConfirmed:false,productionPublicationApproved:false,carousel:bundle.carouselOrder,separateScene:bundle.items.find(x=>x.carouselOrder===null).slug,pending:bundle.pending},null,2));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
