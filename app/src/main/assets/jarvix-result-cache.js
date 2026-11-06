export function mediaExtension(type){
 return {'video/mp4':'mp4','audio/wav':'wav','audio/mpeg':'mp3','image/svg+xml':'svg','image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[String(type).split(';')[0]]||'bin';
}
export async function downloadResult(url,{origin,kind,fetcher=fetch,headers={},signal,guard=()=>{}}){
 const target=new URL(url,origin);
 if(target.origin!==origin||!/^\/api\/studio\/jobs\/[\w-]+\/media$/.test(target.pathname))throw Error('Unsafe result URL');
 guard();
 const response=await fetcher(target.href,{headers,signal,cache:'no-store'});
 guard();
 if(!response.ok)throw Error('Result is no longer available on the TEST server.');
 const blob=await response.blob();guard();
 const prefix=kind==='video'?'video/':kind==='audio'?'audio/':'image/';
 if(!blob.type.startsWith(prefix)||!blob.size||blob.size>16*1024*1024)throw Error('Invalid or oversized media result');
 return blob;
}
