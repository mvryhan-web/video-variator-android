// Cloudflare Pages branch-only bridge: reused existing canonical TEST JARVIX APIs.
// This file is copied to _worker.js ONLY in the dedicated preview deployment;
// it is NOT under app/src/main/assets and is NEVER published on deepsyq.app.
const testApi='https://deepsyq.pages.dev';
const routes=new Map([
 ['/api/jarvix/status','GET'],
 ['/api/jarvix/voice-config','GET'],
 ['/api/jarvix/site-map','GET'],
 ['/api/jarvix/capabilities','GET'],
 ['/api/jarvix/chat','POST'],
 ['/api/jarvix/tts','POST'],
 ['/api/jarvix/reset','POST']
]);
const response=(error,status)=>Response.json({ok:false,error},{status,headers:{'Cache-Control':'no-store'}});
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  const allowedMethod=routes.get(url.pathname);
  if(!allowedMethod)return response('PREVIEW_API_NOT_ALLOWED',403);
  if(request.method!==allowedMethod)return response('PREVIEW_METHOD_NOT_ALLOWED',405);
  const sourceOrigin=request.headers.get('origin');
  if(sourceOrigin&&sourceOrigin!==url.origin)return response('PREVIEW_ORIGIN_MISMATCH',403);
  if(url.search.length>400)return response('PREVIEW_QUERY_TOO_LARGE',400);
  const target=new URL(url.pathname+url.search,testApi);
  try{
   const upstream=new Request(target.toString(),request);
   upstream.headers.delete('host');
   upstream.headers.delete('cf-connecting-ip');
   upstream.headers.delete('x-forwarded-for');
   upstream.headers.delete('x-real-ip');
   const result=await fetch(upstream,{redirect:'manual'});
   const headers=new Headers(result.headers);
   headers.set('Cache-Control','no-store');
   return new Response(result.body,{status:result.status,headers});
  }catch{return response('TEST_API_BACKEND_UNAVAILABLE',503);}
 }
};
