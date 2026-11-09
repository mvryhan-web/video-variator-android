// Read-only production sync followed by surgical JARVIX overlay.
// Called by the one-time guarded release workflow; no payment/generation requests.
import {cp,readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,relative,dirname,resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';

const origin='https://deepsyq.app',root=resolve('app/src/main/assets');
const dist=resolve('artifacts/jarvix-safe-dist');
const audit=resolve('artifacts/jarvix-safe-audit');
const targets=new Set(['deepsyq-site-shell.js','jarvix-chat.js','jarvix-chat.css','jarvix-chat.html','jarvix-activity-drawer.js']);
const protectedFiles=['deepsyq.html','generate-studio.html','generate-studio.js','pricing.html','pricing-page.js','jarvis-core.js','studio-classic-theme.css','deepsyq-logo.png'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const at=(base,p)=>join(base,...p.split('/'));
const mimeFor=p=>{
 const ext=extname(p).toLowerCase();
 if(['.js','.mjs'].includes(ext))return /javascript/;
 if(ext==='.css')return /css/;
 if(['.html','.htm'].includes(ext))return /html/;
 if(['.json','.webmanifest'].includes(ext))return /json/;
 if(['.png','.jpg','.jpeg','.gif','.webp','.svg','.avif','.ico'].includes(ext))return /image|octet-stream/;
 if(['.mp3','.mp4','.wav','.ogg','.webm'].includes(ext))return /audio|video|octet-stream/;
 if(['.woff','.woff2','.ttf','.otf'].includes(ext))return /font|octet-stream/;
 if(ext==='.pdf')return /pdf/;
 if(['.md','.txt','.xml','.csv'].includes(ext))return /text|xml|csv|octet-stream/;
 if(ext==='.wasm')return /wasm|octet-stream/;
 if(ext==='.glb')return /gltf|octet-stream/;
 return null;
};
async function allFiles(dir){
 let out=[];
 for(const f of await readdir(dir,{withFileTypes:true})){
  const full=join(dir,f.name);
  if(f.isDirectory())out.push(...await allFiles(full));
  else if(f.isFile())out.push(relative(root,full).split(sep).join('/'));
 }
 return out;
}
await mkdir(audit,{recursive:true});
await cp(root,dist,{recursive:true});
const paths=(await allFiles(root)).filter(p=>mimeFor(p));
const report={origin,preserved:[],matched:0,missing:[],skipped:[],targets:{},protected:{},total:paths.length};
const failures=[];
let index=0;
async function fetchLive(p){
 const url=origin+'/'+p.split('/').map(encodeURIComponent).join('/');
 const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(18000)});
 if(response.status===404)return null;
 if(!response.ok)throw Error('HTTP '+response.status);
 const expected=mimeFor(p),type=response.headers.get('content-type')||'';
 if(expected&&!expected.test(type))return null;
 const length=Number(response.headers.get('content-length')||0);
 if(length>25*1024*1024)throw Error('oversized live file');
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length>25*1024*1024)throw Error('oversized body');
 return bytes;
}
async function worker(){
 while(index<paths.length){
  const p=paths[index++];
  try{
   const original=await fetchLive(p);
   if(!original){
    report.missing.push(p);
    if(protectedFiles.includes(p)||targets.has(p)&&p!=='jarvix-activity-drawer.js')failures.push('Required live file missing: '+p);
    continue;
   }
   if(protectedFiles.includes(p))report.protected[p]=hash(original);
   if(targets.has(p)){
    await writeFile(at(audit,p),original);
    report.targets[p]=hash(original);
    continue;
   }
   const local=await readFile(at(root,p));
   if(hash(local)===hash(original)){report.matched++;continue;}
   await mkdir(dirname(at(dist,p)),{recursive:true});
   await writeFile(at(dist,p),original);
   report.preserved.push(p);
  }catch(e){failures.push(p+': '+String(e));}
 }
}
await Promise.all(Array.from({length:16},worker));
if(failures.length){
 console.error('LIVE_SNAPSHOT_FAILED',JSON.stringify(failures.slice(0,60)));
 throw Error('Live snapshot has '+failures.length+' errors. Deployment forbidden.');
}
const getLive=async p=>readFile(at(audit,p),'utf8');
const getCandidate=async p=>readFile(at(root,p),'utf8');
const one=(text,oldPart,newPart,label)=>{
 const count=text.split(oldPart).length-1;
 if(count!==1)throw Error('Unsafe '+label+' patch; occurrences='+count);
 return text.replace(oldPart,newPart);
};

let shell=await getLive('deepsyq-site-shell.js');
if(!shell.includes("import('./jarvix-activity-drawer.js')")){
 const addition=[
  "  // JARVIX shared recent chat for Chat, Image, Video, Audio.",
  "  if (['jarvix-chat','jarvix-chat.html','generate-studio','generate-studio.html'].includes(path)) {",
  "    import('./jarvix-activity-drawer.js').catch(error => console.warn('JARVIX activity unavailable:',error?.message));",
  "  }",
  ""
 ].join('\n');
 shell=one(shell,'  document.body.prepend(scrim, toggle, sidebar);\n','  document.body.prepend(scrim, toggle, sidebar);\n'+addition,'site-shell');
}
await writeFile(at(dist,'deepsyq-site-shell.js'),shell);

let css=await getLive('jarvix-chat.css');
const marker='/* Owner-requested ChatGPT-like recent activity drawer. Only JARVIX Chat and Studio. */';
const candidateCss=await getCandidate('jarvix-chat.css');
const where=candidateCss.indexOf(marker);
if(where<0)throw Error('No reviewed panel CSS');
const cssAddon=candidateCss.slice(where);
if(!css.includes(marker))css=css.trimEnd()+'\n'+cssAddon;
else if(css.slice(css.indexOf(marker))!==cssAddon)throw Error('Production panel CSS conflicts');
await writeFile(at(dist,'jarvix-chat.css'),css);

let html=await getLive('jarvix-chat.html');
if(html.includes('JARVIS Chat'))html=html.replaceAll('JARVIS Chat','JARVIX Chat');
if(!html.includes('JARVIX Chat'))throw Error('Chat heading absent in live HTML');
await writeFile(at(dist,'jarvix-chat.html'),html);

let chat=await getLive('jarvix-chat.js');
const historyOld="async function historyList(){const rows=await store.list();$('jHistory').replaceChildren();for(const r of rows){const o=document.createElement('option');o.value=r.id;o.textContent=r.title;o.selected=r.id===conversation?.id;$('jHistory').append(o);}}";
if(!chat.includes("new Event('jarvix:history-changed')"))chat=one(chat,historyOld,historyOld.slice(0,-1)+"window.dispatchEvent(new Event('jarvix:history-changed'));}",'history sync');
const selectOld="sessionStorage.setItem('jarvix_active_conversation',conversation.id);render();await restoreResults();};";
if(chat.includes(selectOld))chat=one(chat,selectOld,"sessionStorage.setItem('jarvix_active_conversation',conversation.id);await historyList();render();await restoreResults();};",'select stored chat');
else if(!chat.includes("await historyList();render();await restoreResults();};"))throw Error('Conversation selector differs from reviewed version');
const sessionOld="conversation=await store.get(sessionStorage.getItem('jarvix_active_conversation'))||store.create(getJarvixSessionId());sessionStorage.setItem('jarvix_active_conversation',conversation.id);await save();render();trackViewport();await restoreResults();";
const sessionNew="const requestedNew=new URLSearchParams(location.search).get('new')==='1';if(requestedNew){const clean=new URL(location.href);clean.searchParams.delete('new');history.replaceState(null,'',clean.pathname+clean.search+clean.hash);sessionStorage.removeItem('jarvix_active_conversation');}conversation=(requestedNew?null:await store.get(sessionStorage.getItem('jarvix_active_conversation')))||store.create(requestedNew?'jarvix-'+makeId():getJarvixSessionId());sessionStorage.setItem('jarvix_active_conversation',conversation.id);sessionStorage.setItem('jarvix_session_id',conversation.sessionId);await save();render();trackViewport();await restoreResults();";
if(chat.includes(sessionOld))chat=one(chat,sessionOld,sessionNew,'new chat route');
else if(!chat.includes('const requestedNew='))throw Error('Chat session initialization differs');
await writeFile(at(dist,'jarvix-chat.js'),chat);

const drawer=await getCandidate('jarvix-activity-drawer.js');
if(!drawer.includes('JARVIX Chat')||!drawer.includes('const rawPage'))throw Error('Reviewed shared drawer missing');
await writeFile(at(dist,'jarvix-activity-drawer.js'),drawer);
for(const p of protectedFiles){
 if(!report.protected[p])throw Error('Protected asset unsnapshotted: '+p);
 if(hash(await readFile(at(dist,p)))!==report.protected[p])throw Error('Protected asset changed: '+p);
}
await writeFile(at(audit,'manifest.json'),JSON.stringify(report,null,2));
console.log('JARVIX_OVERLAY_READY',JSON.stringify({source:origin,total:paths.length,preservedNonJarvix:report.preserved.length,matched:report.matched,missing:report.missing.length,protected:Object.keys(report.protected),targets:Object.keys(report.targets)}));
