export function mediaExtension(type){
 return {'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov','audio/wav':'wav','audio/mpeg':'mp3','audio/mp4':'m4a','audio/x-m4a':'m4a','image/svg+xml':'svg','image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[String(type).split(';')[0]]||'bin';
}
export async function downloadResult(url,{origin,kind,fetcher=fetch,headers={},signal,guard=()=>{}}){
 const target=new URL(url,origin);
 guard();
 const response=await fetcher(target.href,{...(target.origin===origin?{headers}:{}),signal,cache:'no-store'});
 guard();
 if(!response.ok)throw Error('Result is no longer available on the server.');
 const blob=await response.blob();guard();
 const prefix=kind==='video'?'video/':kind==='audio'?'audio/':'image/';
 if((!blob.type.startsWith(prefix)&&blob.type!=='application/octet-stream')||!blob.size||blob.size>100*1024*1024)throw Error('Invalid or oversized media result');
 return blob;
}
