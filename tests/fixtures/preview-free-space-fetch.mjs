// This preload is used ONLY by Node integration tests.
// No HTTP requests to a public provider, Stripe or paid inference can escape.
const originalFetch=globalThis.fetch;
const hosts={
 'black-forest-labs-flux-1-schnell.hf.space':{kind:'image',name:'test.png'},
 'lightricks-ltx-video-distilled.hf.space':{kind:'video',name:'test.mp4'},
 'stabilityai-stable-audio-3.hf.space':{kind:'music',name:'test.wav'}
};
function resultBytes(kind){
 if(kind==='image')return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(128)]);
 if(kind==='video')return Buffer.concat([Buffer.from('0000ftypisommoov0000mdat'),Buffer.alloc(128)]);
 const b=Buffer.alloc(256);b.write('RIFF',0);b.write('WAVE',8);return b;
}
const eventId='01234567-89ab-4cde-8fab-0123456789ab';
globalThis.fetch=async(input,options={})=>{
 const u=new URL(String(input));
 if(!u.hostname.endsWith('.hf.space'))return originalFetch(input,options);
 const model=hosts[u.hostname];
 if(!model)throw Error('UNEXPECTED_EXTERNAL_MODEL_HOST');
 const base='/gradio_api/call/';
 const method=options.method||'GET';
 if(method==='POST'&&u.pathname.startsWith(base)){
   return Response.json({event_id:eventId});
 }
 if(method==='GET'&&u.pathname.startsWith(base)&&u.pathname.endsWith('/'+eventId)){
   return new Response('event: complete\ndata: '+JSON.stringify([{url:'https://'+u.hostname+'/gradio_api/file='+model.name}])+'\n\n',{headers:{'content-type':'text/event-stream'}});
 }
 if(method==='GET'&&u.pathname==='/gradio_api/file='+model.name){
   const mime={image:'image/png',video:'video/mp4',music:'audio/wav'}[model.kind];
   return new Response(resultBytes(model.kind),{headers:{'content-type':mime}});
 }
 throw Error('UNEXPECTED_EXTERNAL_MODEL_REQUEST');
};
