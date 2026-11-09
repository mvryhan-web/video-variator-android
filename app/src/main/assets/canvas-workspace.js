import {saveStudioHandoff} from './studio-handoff.js';

// A self-contained Canvas layer. Existing Studio owns model selection, pricing,
// consent, generation jobs and History. No duplicate billing or AI API calls.
const $=id=>document.getElementById(id);
const viewport=$('cwViewport'),world=$('cwWorld'),layer=$('cwNodes'),lines=$('cwEdges'),status=$('cwStatus');
if(!viewport||!world||!layer||!lines)throw Error('CANVAS_WORKSPACE_MISSING');
const DB='deepsyq-canvas-projects-v1',STORE='projects',WIDTH=3000,HEIGHT=2200;
const originalToken=localStorage.getItem('vv_token')||'guest';
let ownerHash=null,accountChanged=false,projectId=crypto.randomUUID(),projectName='Untitled project';
let nodes=[],edges=[],selected=null,connecting=null,dirty=false,scale=1,offset={x:70,y:60},urls=[];
const newId=()=>crypto.randomUUID();
const say=message=>{status.textContent=message;};
const nodeById=id=>nodes.find(n=>n.id===id);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const currentToken=()=>localStorage.getItem('vv_token')||'guest';
function accountOK(){
 if(accountChanged||currentToken()!==originalToken){
  if(!accountChanged){accountChanged=true;nodes=[];edges=[];selected=null;paint();say('Your account changed. Reload Canvas before working with private projects.');}
  return false;
 }
 return true;
}
async function fingerprint(token){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
}
function openDb(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'key'});};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(Error('Canvas storage unavailable'));
 });
}
async function database(mode,operation){
 const db=await openDb();
 try{return await new Promise((resolve,reject)=>{
  const transaction=db.transaction(STORE,mode),store=transaction.objectStore(STORE);
  let request;
  try{request=operation(store);}catch(error){reject(error);return;}
  transaction.oncomplete=()=>resolve(request?.result);
  transaction.onerror=()=>reject(Error('Cannot access Canvas projects'));
  transaction.onabort=()=>reject(Error('Canvas storage transaction aborted'));
 });}finally{db.close();}
}
function markChanged(){dirty=true;$('cwProjectName').textContent=projectName+' • Unsaved';}
function savedState(){dirty=false;$('cwProjectName').textContent=projectName;}
function canvasPosition(clientX,clientY){
 const r=viewport.getBoundingClientRect();
 return {x:clamp((clientX-r.left-offset.x)/scale,0,WIDTH-290),y:clamp((clientY-r.top-offset.y)/scale,0,HEIGHT-250)};
}
function addNode(type,x,y,file=null){
 if(!accountOK())return null;
 const node={id:newId(),type,x:Math.round(x),y:Math.round(y),prompt:'',kind:'image',ratio:'',name:file?.name||'',file};
 nodes.push(node);selected=node.id;paint();markChanged();return node;
}
function revokeUrls(){for(const url of urls)URL.revokeObjectURL(url);urls=[];}
function createButton(label,action,cls=''){
 const b=document.createElement('button');b.type='button';b.textContent=label;if(cls)b.className=cls;b.addEventListener('click',action);return b;
}
function selectNode(id){
 if(!accountOK())return;
 if(connecting&&connecting!==id){
  if(!edges.some(e=>e.from===connecting&&e.to===id)){
   edges.push({from:connecting,to:id});markChanged();
  }
  connecting=null;paint();say('Blocks connected.');return;
 }
 selected=id;paint();
}
function connectFrom(id){
 if(!accountOK())return;
 connecting=id;selected=id;paint();say('Click the destination block to connect it. Press Esc to cancel.');
}
function removeNode(id){
 if(!accountOK())return;
 nodes=nodes.filter(n=>n.id!==id);edges=edges.filter(e=>e.from!==id&&e.to!==id);
 if(selected===id)selected=null;if(connecting===id)connecting=null;
 paint();markChanged();
}
function downloadNode(n){
 if(!n.file)return say('This block has no downloadable file yet.');
 const href=URL.createObjectURL(n.file),a=document.createElement('a');
 a.href=href;a.download=n.name||'deepsyq-media';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(href),30000);
}
async function squareCrop(node){
 if(!accountOK()||node.type!=='image'||!node.file)return;
 try{
  const bitmap=await createImageBitmap(node.file);
  try{
   const size=Math.min(bitmap.width,bitmap.height),c=document.createElement('canvas');c.width=size;c.height=size;
   c.getContext('2d').drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,size,size);
   const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.84));
   if(!blob||blob.size>1024*1024)throw Error('Image exceeds 1 MB');
   node.file=new File([blob],'cropped-'+(node.name||'image')+'.jpg',{type:'image/jpeg'});
   node.name=node.file.name;paint();markChanged();say('Image cropped to a square. Original downloaded files are unchanged.');
  }finally{bitmap.close();}
 }catch(error){say('Crop failed: '+error.message);}
}
function renderNode(n){
 const el=document.createElement('article');el.className='cw-node'+(selected===n.id?' is-selected':'')+(connecting===n.id?' is-linking':'');
 el.style.left=n.x+'px';el.style.top=n.y+'px';el.dataset.nodeId=n.id;el.tabIndex=0;
 const top=document.createElement('div');top.className='cw-node-top';
 const handle=document.createElement('span');handle.className='cw-node-handle';handle.textContent=n.type==='prompt'?'✦ Prompt':n.type==='image'?'▧ Image':n.type==='video'?'▶ Video':'♫ Audio';handle.title='Drag to move';handle.setAttribute('aria-label','Drag '+n.type+' block');
 top.append(handle,createButton('Link',()=>connectFrom(n.id)),createButton('×',()=>removeNode(n.id),'cw-remove'));
 el.append(top);
 if(n.type==='prompt'){
  const area=document.createElement('textarea');area.placeholder='Describe the image or video you want to create…';area.maxLength=2000;area.rows=5;area.value=n.prompt;
  area.setAttribute('aria-label','Canvas prompt');
  area.addEventListener('input',()=>{n.prompt=area.value;markChanged();});
  const options=document.createElement('div');options.className='cw-node-options';
  const kind=document.createElement('select');kind.setAttribute('aria-label','Generation type');
  for(const k of ['image','video']){const o=new Option(k==='image'?'Image':'Video',k);kind.add(o);}
  kind.value=n.kind;kind.addEventListener('change',()=>{n.kind=kind.value;markChanged();});
  const ratio=document.createElement('select');ratio.setAttribute('aria-label','Aspect ratio');
  for(const [value,label] of [['','Auto'],['1:1','1:1'],['2:3','2:3'],['3:2','3:2'],['9:16','9:16'],['16:9','16:9']])ratio.add(new Option(label,value));
  ratio.value=n.ratio;ratio.addEventListener('change',()=>{n.ratio=ratio.value;markChanged();});
  options.append(kind,ratio);
  el.append(area,options,createButton('Generate in Canvas ↗',()=>void generateNode(n),'cw-run'));
 }else{
  const content=document.createElement('div');content.className='cw-node-media';
  if(n.file){
   const url=URL.createObjectURL(n.file);urls.push(url);
   const media=document.createElement(n.type==='image'?'img':n.type==='video'?'video':'audio');
   media.src=url;if(n.type==='image')media.alt=n.name||'Image reference';else{media.controls=true;media.preload='metadata';}
   content.append(media);
  }else{
   const empty=document.createElement('p');empty.textContent='Upload '+n.type+' or connect a prompt';content.append(empty);
  }
  const fileLabel=document.createElement('p');fileLabel.className='cw-filename';fileLabel.textContent=n.name||'No file selected';
  const actions=document.createElement('div');actions.className='cw-node-options';
  actions.append(createButton('Upload',()=>chooseFile(n.type,n.id)));
  if(n.file)actions.append(createButton('Download',()=>downloadNode(n)));
  if(n.type==='image'&&n.file)actions.append(createButton('Crop 1:1',()=>void squareCrop(n)));
  el.append(content,fileLabel,actions);
 }
 el.addEventListener('click',event=>{
  if(event.target.closest('button,input,textarea,select,video,audio'))return;
  selectNode(n.id);
 });
 el.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target===el){event.preventDefault();selectNode(n.id);}});
 // Drag only by the title bar; form controls stay fully editable on touch and desktop.
 handle.addEventListener('pointerdown',event=>{
  if(!accountOK()||event.button!==0)return;
  event.preventDefault();event.stopPropagation();selected=n.id;
  const startX=event.clientX,startY=event.clientY,baseX=n.x,baseY=n.y;
  handle.setPointerCapture(event.pointerId);
  const move=e=>{n.x=clamp(Math.round(baseX+(e.clientX-startX)/scale),0,WIDTH-290);n.y=clamp(Math.round(baseY+(e.clientY-startY)/scale),0,HEIGHT-250);el.style.left=n.x+'px';el.style.top=n.y+'px';drawEdges();};
  const up=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);if(n.x!==baseX||n.y!==baseY){markChanged();paint();}else{selectNode(n.id);}};
  handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);
 });
 return el;
}
function drawEdges(){
 lines.replaceChildren();lines.setAttribute('viewBox','0 0 '+WIDTH+' '+HEIGHT);
 for(const edge of edges){
  const a=nodeById(edge.from),b=nodeById(edge.to);if(!a||!b)continue;
  const x1=a.x+270,y1=a.y+90,x2=b.x,y2=b.y+90;
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  const bend=Math.max(65,Math.abs(x2-x1)*.45);
  path.setAttribute('d','M '+x1+' '+y1+' C '+(x1+bend)+' '+y1+' '+(x2-bend)+' '+y2+' '+x2+' '+y2);
  path.setAttribute('fill','none');path.setAttribute('stroke','#4de4c3');path.setAttribute('stroke-width','3');path.setAttribute('stroke-linecap','round');
  lines.append(path);
 }
}
function transform(){world.style.transform='translate('+offset.x+'px,'+offset.y+'px) scale('+scale+')';$('cwZoomLabel').textContent=Math.round(scale*100)+'%';}
function paint(){
 revokeUrls();layer.replaceChildren();
 for(const node of nodes)layer.append(renderNode(node));
 drawEdges();transform();
}
function zoomTo(next){scale=clamp(Math.round(next*100)/100,.4,1.75);transform();}
viewport.addEventListener('pointerdown',event=>{
 if(!accountOK()||event.button!==0||event.target.closest('.cw-node'))return;
 const startX=event.clientX,startY=event.clientY,origin={...offset};
 viewport.setPointerCapture(event.pointerId);
 const move=e=>{offset.x=origin.x+e.clientX-startX;offset.y=origin.y+e.clientY-startY;transform();};
 const up=()=>{viewport.removeEventListener('pointermove',move);viewport.removeEventListener('pointerup',up);viewport.removeEventListener('pointercancel',up);};
 viewport.addEventListener('pointermove',move);viewport.addEventListener('pointerup',up);viewport.addEventListener('pointercancel',up);
});
viewport.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey){event.preventDefault();zoomTo(scale+(event.deltaY<0?.1:-.1));}},{passive:false});
viewport.addEventListener('keydown',event=>{
 if(!accountOK()||event.target!==viewport)return;
 if(event.key==='Escape'){connecting=null;paint();say('Link cancelled.');}
 const node=nodeById(selected),steps={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};
 if(node&&steps[event.key]){event.preventDefault();node.x=clamp(node.x+steps[event.key][0],0,WIDTH-290);node.y=clamp(node.y+steps[event.key][1],0,HEIGHT-250);paint();markChanged();}
});
$('cwZoomIn').onclick=()=>zoomTo(scale+.15);
$('cwZoomOut').onclick=()=>zoomTo(scale-.15);
$('cwZoomReset').onclick=()=>{scale=1;offset={x:70,y:60};transform();};
document.querySelectorAll('[data-cw-add]').forEach(button=>button.onclick=()=>{
 if(!accountOK())return;
 const kind=button.dataset.cwAdd;
 const index=nodes.length,pos={x:130+(index%3)*310,y:100+Math.floor(index/3)*260};
 addNode(kind,pos.x,pos.y);
 say(kind+' block added. Drag the title to move it.');
});
let uploadTarget=null;
function chooseFile(kind,id=null){if(!accountOK())return;uploadTarget={kind,id};const input=$('cwFile');input.accept=kind==='image'?'image/png,image/jpeg':kind==='video'?'video/mp4,video/webm':'audio/mpeg,audio/wav';input.value='';input.click();}
$('cwFile').addEventListener('change',event=>{
 if(!accountOK())return;
 const file=event.target.files?.[0],target=uploadTarget;event.target.value='';uploadTarget=null;
 if(!file||!target)return;
 const valid=target.kind==='image'?['image/png','image/jpeg'].includes(file.type)&&file.size<=1024*1024:target.kind==='video'?['video/mp4','video/webm'].includes(file.type)&&file.size<=20*1024*1024:['audio/mpeg','audio/wav'].includes(file.type)&&file.size<=10*1024*1024;
 if(!valid||file.size<1){say('Unsupported media or file too large (image 1 MB, video 20 MB, audio 10 MB).');return;}
 const n=target.id?nodeById(target.id):null;
 if(n){n.file=file;n.name=file.name;selected=n.id;paint();markChanged();}
 else{addNode(target.kind,100+(nodes.length%3)*305,110+Math.floor(nodes.length/3)*240,file);}
 say('File added locally. It will be included when you save this project.');
});
$('cwUpload').onclick=()=>chooseFile('image');
$('cwConnect').onclick=()=>{if(selected)connectFrom(selected);else say('Select a block, then click Connect.');};
$('cwDelete').onclick=()=>{if(selected)removeNode(selected);else say('Select a block first.');};
$('cwNew').onclick=()=>{if(!accountOK())return;if(dirty&&!confirm('Discard unsaved changes and create a new Canvas project?'))return;projectId=newId();projectName='Untitled project';nodes=[];edges=[];selected=null;connecting=null;addNode('prompt',130,120);say('New project. Select a block to edit it.');};
async function saveProject(){
 if(!accountOK()||!ownerHash)return say('Project storage unavailable.');
 const name=prompt('Project name',projectName);
 if(name===null)return;
 projectName=name.trim().slice(0,72)||'Untitled project';
 const record={key:ownerHash+':'+projectId,owner:ownerHash,id:projectId,name:projectName,updatedAt:Date.now(),
  nodes:nodes.map(n=>({...n,file:n.file||null})),edges:edges.map(e=>({...e}))};
 try{await database('readwrite',s=>s.put(record));if(!accountOK())return;savedState();say('Project saved in this browser. Your media and prompts are not uploaded to DEEPSYQ.');}
 catch(error){say('Could not save project. Browser storage may be full: '+error.message);}
}
$('cwSave').onclick=()=>void saveProject();
async function openProjects(){
 if(!accountOK()||!ownerHash)return say('Project storage unavailable.');
 try{
  const records=(await database('readonly',s=>s.getAll())).filter(r=>r.owner===ownerHash).sort((a,b)=>b.updatedAt-a.updatedAt);
  const list=$('cwProjectList');list.replaceChildren();
  if(!records.length){const p=document.createElement('p');p.textContent='No saved Canvas projects on this device yet.';list.append(p);}
  for(const record of records){
   const b=createButton(record.name+' · '+new Date(record.updatedAt).toLocaleDateString(),()=>{
    if(dirty&&!confirm('Discard unsaved changes and open this project?'))return;
    if(!accountOK())return;
    projectId=record.id;projectName=record.name;nodes=record.nodes.map(n=>({...n,file:n.file||null}));edges=record.edges.map(e=>({...e}));
    selected=null;connecting=null;paint();savedState();$('cwProjectsDialog').close();say('Project opened from this browser.');
   });
   list.append(b);
  }
  $('cwProjectsDialog').showModal();
 }catch(error){say('Cannot list projects: '+error.message);}
}
$('cwOpen').onclick=()=>void openProjects();
$('cwProjectsClose').onclick=()=>$('cwProjectsDialog').close();
async function generateNode(n){
 if(!accountOK())return;
 if(!n||n.type!=='prompt')return say('Select a Prompt block to generate.');
 if(!n.prompt.trim())return say('Write a description in your Prompt block first.');
 const refs=edges.filter(e=>e.to===n.id).map(e=>nodeById(e.from)).filter(x=>x?.type==='image'&&x.file).slice(0,4).map(x=>x.file);
 try{
  say('Preparing Studio inside Canvas. No generation or credit charge has started.');
  await saveStudioHandoff({kind:n.kind,prompt:n.prompt.trim(),settings:n.ratio?{ratio:n.ratio}:{},files:refs,source:'canvas-workspace'});
  if(!accountOK())return;
  const overlay=$('cwStudioOverlay');overlay.hidden=false;
  $('cwStudioFrame').src='generate-studio.html?studio='+n.kind+'&from=canvas';
  $('cwStudioClose').focus();document.body.classList.add('cw-studio-open');
  say('Studio is open inside Canvas. Review model, credits and consent before generating.');
 }catch(error){say('Cannot prepare Studio: '+error.message);}
}
$('cwGenerate').onclick=()=>{const n=nodeById(selected)||nodes.find(x=>x.type==='prompt');void generateNode(n);};
$('cwStudioClose').onclick=()=>{
 if(!confirm('Close Studio? Any job already submitted to the server can still be checked in Studio History.'))return;
 $('cwStudioFrame').src='about:blank';$('cwStudioOverlay').hidden=true;document.body.classList.remove('cw-studio-open');say('Returned to Canvas. Studio results are available through Studio History.');
};
window.addEventListener('storage',event=>{if(event.key==='vv_token')accountOK();});
document.addEventListener('visibilitychange',accountOK);
window.addEventListener('focus',accountOK);
window.addEventListener('pagehide',revokeUrls);
(async()=>{
 try{ownerHash=await fingerprint(originalToken);if(!accountOK())return;
  const projects=(await database('readonly',s=>s.getAll())).filter(r=>r.owner===ownerHash).sort((a,b)=>b.updatedAt-a.updatedAt);
  if(!accountOK())return;
  if(projects.length){const p=projects[0];projectId=p.id;projectName=p.name;nodes=p.nodes.map(n=>({...n,file:n.file||null}));edges=p.edges.map(e=>({...e}));paint();savedState();say('Last saved Canvas project restored on this device.');}
  else{addNode('prompt',130,120);say('Canvas ready. Write an idea, add images, connect blocks, then open Studio to generate.');}
 }catch(_){addNode('prompt',130,120);say('Canvas works locally; project saving is unavailable in this browser.');}
})();