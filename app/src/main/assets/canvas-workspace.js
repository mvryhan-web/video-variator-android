import { saveStudioHandoff } from './studio-handoff.js';
/* Canvas workspace scope: browser-local editing + existing Studio handoff only.
   No Cloudflare Worker, credit, billing or global DEEPSYQ shell changes. */
const $=id=>document.getElementById(id);
const section=$('canvasWorkspace');
if (!section) throw new Error('Canvas workspace element is missing');
const canvas=$('cwStage'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const photoLabels=[
 ['Mediterranean terrace','travel lifestyle'],['Blue fashion portrait','portrait fashion'],
 ['Creative gallery collage','lifestyle inspiration'],['Alpine boat and lake','travel nature'],
 ['Jasmine perfume photo','product lifestyle'],['Breakfast by the sea','product lifestyle'],
 ['Neutral modern living room','lifestyle design'],['Sunset portrait','portrait fashion'],
 ['Santorini portrait','portrait travel'],['Mountain sunset','travel nature'],
 ['Beach fashion portrait','portrait fashion'],['Mountain lookout portrait','portrait travel'],
 ['Art-filled living room','lifestyle design']
];
const root='/media/canvas-demos/20261110/';
const photos=photoLabels.map(([name,tags],i)=>({id:'demo-'+(i+1),name,tags,src:root+'canvas-demo-'+String(i+1).padStart(2,'0')+'.webp',thumb:root+'canvas-demo-'+String(i+1).padStart(2,'0')+'-thumb.webp',uploaded:false}));
const srcMap=new Map(photos.map(item=>[item.id,item]));
const imgCache=new Map(),transparentCache=new Map(),objectUrls=new Set();
const originalAccount=localStorage.getItem('vv_token')||'guest';
const sameAccount=()=>originalAccount===(localStorage.getItem('vv_token')||'guest');
const note=message=>{$('cwStatus').textContent=message;};
const clean={mode:'image',id:'demo-1',ratio:'16:9',offsetX:0,offsetY:0,size:100,rotation:0,opacity:100,brightness:100,contrast:100,saturation:100,effect:'original',background:'#ffffff',removeWhite:false,layers:[],selected:-1,locked:false};
let state=JSON.parse(JSON.stringify(clean)),history=[],future=[],loadingSeq=0,played=null;
let sequence=['demo-1','demo-4','demo-5','demo-9','demo-11'];
const ratios={'16:9':[1280,720],'1:1':[1080,1080],'4:5':[1000,1250],'9:16':[720,1280]};
const clone=()=>JSON.parse(JSON.stringify({state,sequence}));
function mark(){history.push(clone());if(history.length>35)history.shift();future=[];updateUndo();}
function updateUndo(){$('cwUndo').disabled=!history.length;$('cwRedo').disabled=!future.length;}
function accountGuard(){if(sameAccount())return true;note('Account changed. Reload Canvas before editing a new private image.');$('cwGenerate').disabled=true;return false;}
for(const event of ['pointerdown','keydown'])document.addEventListener(event,accountGuard,true);
window.addEventListener('storage',e=>{if(e.key==='vv_token')accountGuard();});
function waitForImage(item){
 if(!item) return Promise.reject(new Error('No image selected'));
 if(imgCache.has(item.id))return imgCache.get(item.id);
 const promise=new Promise((resolve,reject)=>{
  const im=new Image(); im.decoding='async';
  im.onload=()=>resolve(im);
  im.onerror=()=>{imgCache.delete(item.id);reject(new Error('Image could not be loaded'))};
  im.src=item.src;
 });imgCache.set(item.id,promise);return promise;
}
function imageScale(im,w,h){return Math.max(w/im.naturalWidth,h/im.naturalHeight)*state.size/100;}
function effectFilter(){const presets={original:[0,0,0],warm:[8,6,-10],vivid:[0,12,24],noir:[0,15,-100]};let [br,co,sa]=presets[state.effect]||presets.original;return `brightness(${Math.max(0,state.brightness+br)}%) contrast(${Math.max(0,state.contrast+co)}%) saturate(${Math.max(0,state.saturation+sa)}%)`;}
function setupDimensions(){const [w,h]=ratios[state.ratio]||ratios['16:9'];if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}const art=$('cwArtboard');art.style.aspectRatio=w+'/'+h;art.style.width=state.ratio==='9:16'?'min(100%,340px)':state.ratio==='4:5'?'min(100%,435px)':state.ratio==='1:1'?'min(100%,560px)':'100%';canvas.style.aspectRatio=w+'/'+h;}
async function removeWhiteBackground(im,id){
 if(transparentCache.has(id))return transparentCache.get(id);
 const w=Math.min(im.naturalWidth,1600),h=Math.min(im.naturalHeight,1600);
 const off=document.createElement('canvas');off.width=w;off.height=h;
 const oc=off.getContext('2d',{willReadFrequently:true});oc.drawImage(im,0,0,w,h);
 const pixels=oc.getImageData(0,0,w,h),a=pixels.data;
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
 function match(p){const i=p*4;return a[i]>225&&a[i+1]>225&&a[i+2]>225&&Math.max(a[i],a[i+1],a[i+2])-Math.min(a[i],a[i+1],a[i+2])<32}
 function push(p){if(p<0||p>=seen.length||seen[p]||!match(p))return;seen[p]=1;queue[tail++]=p;}
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}
 for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
 while(head<tail){const p=queue[head++],x=p%w,y=(p/w)|0;a[p*4+3]=0;if(x>0)push(p-1);if(x+1<w)push(p+1);if(y>0)push(p-w);if(y+1<h)push(p+w);}
 oc.putImageData(pixels,0,0);transparentCache.set(id,off);return off;
}
function roundedRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function drawLayer(layer,selected){
 ctx.save();ctx.globalAlpha=layer.opacity??1;
 if(layer.type==='text'){
   ctx.font=`${layer.bold?'700 ':'600 '}${layer.size||64}px Inter,system-ui,sans-serif`;
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=layer.color||'#ffffff';
   ctx.shadowColor='#000a';ctx.shadowBlur=6;ctx.fillText(layer.text||'Your text',layer.x,layer.y,canvas.width*.9);
   if(selected){const wid=Math.min(canvas.width*.9,ctx.measureText(layer.text||'Your text').width+30);ctx.strokeStyle='#cb82ff';ctx.lineWidth=3;ctx.setLineDash([9,7]);ctx.strokeRect(layer.x-wid/2,layer.y-(layer.size||64)*.75,wid,(layer.size||64)*1.5);}
 } else {
   ctx.fillStyle=layer.color||'#e879f9';ctx.strokeStyle='#fff';ctx.lineWidth=2;
   let w=layer.w||150,h=layer.h||150;
   if(layer.type==='rect')roundedRect(ctx,layer.x-w/2,layer.y-h/2,w,h,16);
   else if(layer.type==='ellipse'){ctx.beginPath();ctx.ellipse(layer.x,layer.y,w/2,h/2,0,0,2*Math.PI);}
   else {ctx.beginPath();for(let i=0;i<10;i++){const angle=i*Math.PI/5-Math.PI/2,r=i%2?w*.22:w*.5;const xx=layer.x+r*Math.cos(angle),yy=layer.y+r*Math.sin(angle);i===0?ctx.moveTo(xx,yy):ctx.lineTo(xx,yy);}ctx.closePath();}
   ctx.fill();if(selected){ctx.setLineDash([8,5]);ctx.strokeStyle='#e0adff';ctx.strokeRect(layer.x-w/2-6,layer.y-h/2-6,w+12,h+12)}
 }
 ctx.restore();
}
async function render(){
 setupDimensions();const serial=++loadingSeq;
 const w=canvas.width,h=canvas.height;
 ctx.save();ctx.clearRect(0,0,w,h);ctx.fillStyle=state.background;ctx.fillRect(0,0,w,h);ctx.restore();
 const photo=srcMap.get(state.id);
 if(photo){
  try{
   const im=await waitForImage(photo);if(serial!==loadingSeq)return;
   let source=im;if(state.removeWhite)source=await removeWhiteBackground(im,photo.id);
   if(serial!==loadingSeq)return;
   const iw=source.width||source.naturalWidth,ih=source.height||source.naturalHeight;
   const f=Math.max(w/iw,h/ih)*(state.size/100);
   ctx.save();ctx.translate(w/2+state.offsetX*w/1280,h/2+state.offsetY*h/720);
   ctx.rotate(state.rotation*Math.PI/180);ctx.globalAlpha=state.opacity/100;
   ctx.filter=effectFilter();ctx.drawImage(source,-iw*f/2,-ih*f/2,iw*f,ih*f);ctx.restore();
  }catch(_){if(serial!==loadingSeq)return;note('This example could not load. Choose another photo or upload your own.');}
 }
 state.layers.forEach((layer,i)=>drawLayer(layer,i===state.selected));
 $('cwEmptyState').hidden=!!photo;
}
function updateControls(){
 $('cwImageMode').classList.toggle('cw-mode-active',state.mode==='image');$('cwVideoMode').classList.toggle('cw-mode-active',state.mode==='video');
 $('cwImageMode').setAttribute('aria-pressed',String(state.mode==='image'));$('cwVideoMode').setAttribute('aria-pressed',String(state.mode==='video'));
 for(const [key,value,suffix] of [['cwSize',state.size,'%'],['cwRotation',state.rotation,'°'],['cwOpacity',state.opacity,'%'],['cwBrightness',state.brightness,'%'],['cwContrast',state.contrast,'%'],['cwSaturation',state.saturation,'%']]){
  $(key).value=String(value);const label=$(key+'Label');if(label)label.textContent=String(value)+suffix;
 }
 $('cwRatio').value=state.ratio;$('cwLock').setAttribute('aria-pressed',String(state.locked));
 document.querySelectorAll('[data-cw-effect]').forEach(b=>b.classList.toggle('cw-preset-active',b.dataset.cwEffect===state.effect));
 document.querySelectorAll('#cwGallery [data-cw-photo]').forEach(b=>{const active=b.dataset.cwPhoto===state.id;b.classList.toggle('cw-selected',active);b.setAttribute('aria-pressed',String(active));});
 updateUndo();renderFrames();
}
function switchPhoto(id,{addToFrames=false}={}){
 if(!accountGuard()||!srcMap.has(id))return;
 mark();state.id=id;state.offsetX=0;state.offsetY=0;state.size=100;state.rotation=0;state.removeWhite=false;state.layers=[];state.selected=-1;state.locked=false;
 state.brightness=state.contrast=state.saturation=state.opacity=100;state.effect='original';
 if(addToFrames&&!sequence.includes(id))sequence.push(id);
 updateControls();void render();note(srcMap.get(id).name+' opened on the Canvas. You can edit or export it.');
}
function renderGallery(){
 const query=$('cwGallerySearch').value.trim().toLowerCase();const category=document.querySelector('[data-cw-filter].cw-category-active')?.dataset.cwFilter||'all';
 const grid=$('cwGallery');grid.replaceChildren();
 const upload=document.createElement('button');upload.className='cw-upload-tile';upload.type='button';upload.title='Upload your photo';upload.setAttribute('aria-label','Upload your photo');
 const plus=document.createElement('span');plus.textContent='+';const txt=document.createElement('small');txt.textContent='Upload photo';upload.append(plus,txt);upload.onclick=()=>$('cwUpload').click();grid.append(upload);
 for(const item of photos){if(category!=='all'&&!item.tags.includes(category))continue;if(query&&!item.name.toLowerCase().includes(query)&&!item.tags.includes(query))continue;
  const button=document.createElement('button');button.type='button';button.dataset.cwPhoto=item.id;
  button.title=item.name;button.setAttribute('aria-label','Open '+item.name);button.setAttribute('aria-pressed',String(item.id===state.id));button.className=item.id===state.id?'cw-selected':'';
  const im=document.createElement('img');im.src=item.thumb;im.alt=item.name;im.loading='lazy';button.append(im);button.onclick=()=>switchPhoto(item.id);grid.append(button);
 }
 if(grid.children.length===1){const missing=document.createElement('span');missing.textContent='No matching examples';missing.style.color='#b9c7df';grid.append(missing)}
}
function renderFrames(){
 const wrap=$('cwFrames');wrap.replaceChildren();
 for(const id of sequence){const item=srcMap.get(id);if(!item)continue;
 const btn=document.createElement('button');btn.type='button';btn.className=id===state.id?'cw-frame-selected':'';btn.title='Open '+item.name;
 const img=document.createElement('img');img.src=item.thumb;img.alt=item.name;img.loading='lazy';btn.append(img);btn.onclick=()=>switchPhoto(id);wrap.append(btn)}
}
function openUpload(){if(accountGuard())$('cwUpload').click();}
$('cwUpload').addEventListener('change',async event=>{
 const file=event.target.files?.[0];event.target.value='';if(!file||!accountGuard())return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024||file.size===0){note('Upload a PNG, JPG or WebP photo under 10 MB.');return;}
 const url=URL.createObjectURL(file),id='user-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 objectUrls.add(url);const item={id,name:file.name.slice(0,90),tags:'user',src:url,thumb:url,uploaded:true};
 try{const im=await waitForImage(item);if(im.naturalWidth>12000||im.naturalHeight>12000)throw Error('too large');
  photos.unshift(item);srcMap.set(id,item);renderGallery();switchPhoto(id,{addToFrames:true});
  $('cwGallerySearch').value='';document.querySelector('[data-cw-filter="all"]')?.click();note('Your photo is loaded locally. It was not uploaded to the server.');
 }catch(_){objectUrls.delete(url);URL.revokeObjectURL(url);note('The photo could not be decoded. Try another JPG, PNG or WebP file.');}
});
function addLayer(type){if(!accountGuard())return;mark();const base={x:canvas.width/2,y:canvas.height/2,opacity:1,locked:false};
 if(type==='text')state.layers.push({...base,type,text:'Your text',size:60,color:'#ffffff'});
 else state.layers.push({...base,type,w:190,h:150,color:type==='star'?'#ffc45c':'#bd60f8'});
 state.selected=state.layers.length-1;updateControls();void render();note('Added '+type+'. Drag it on the canvas to position.');
}
function showToolPane(tool){const pane=$('cwToolPane');pane.replaceChildren();pane.hidden=false;
 const heading=document.createElement('strong');heading.textContent={design:'Try a look',elements:'Add an element',text:'Add text',upload:'Your photos',photos:'Gallery',templates:'Quick templates',background:'Background',apps:'AI Studio'}[tool]||'Tools';pane.append(heading);
 const grid=document.createElement('div');grid.className='cw-tool-grid';pane.append(grid);
 const option=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);grid.append(b)};
 switch(tool){
  case 'design':case 'photos':pane.hidden=true;$('cwGallerySearch').focus();break;
  case 'elements':option('Rectangle',()=>addLayer('rect'));option('Circle',()=>addLayer('ellipse'));option('Star',()=>addLayer('star'));break;
  case 'text':option('Add heading',()=>addLayer('text'));option('Edit text',()=>{
   const selected=state.layers[state.selected];if(!selected||selected.type!=='text'){note('First add or select a text layer.');return;}
   const t=window.prompt('Edit selected text',selected.text);if(t===null||!t.trim())return;mark();selected.text=t.slice(0,120);void render();
  });break;
  case 'upload':option('+ Choose photo',openUpload);break;
  case 'templates':option('Portrait 4:5',()=>setRatio('4:5'));option('Story 9:16',()=>setRatio('9:16'));option('Square 1:1',()=>setRatio('1:1'));option('Wide 16:9',()=>setRatio('16:9'));break;
  case 'background':for(const [color,title] of [['#ffffff','White'],['#0d142b','Midnight'],['#f9d7e9','Rose'],['#3a2362','Violet']])option(title,()=>{mark();state.background=color;void render()});break;
  case 'apps':option('Open AI Studio',()=>void handoff());break;
 }
}
function setRatio(r){if(!ratios[r])return;mark();state.ratio=r;$('cwRatio').value=r;updateControls();void render();note('Canvas aspect ratio: '+r);}
function switchMode(kind){if(!['image','video'].includes(kind)||kind===state.mode)return;mark();state.mode=kind;state.ratio=kind==='video'?'9:16':'16:9';updateControls();void render();note(kind==='video'?'Video storyboard preview: use AI Studio for actual video generation.':'Image editing mode active.');}
$('cwImageMode').onclick=()=>switchMode('image');$('cwVideoMode').onclick=()=>switchMode('video');
$('cwRatio').addEventListener('change',e=>setRatio(e.target.value));
for(const [id,field] of [['cwSize','size'],['cwRotation','rotation'],['cwOpacity','opacity'],['cwBrightness','brightness'],['cwContrast','contrast'],['cwSaturation','saturation']]){
 let snapshotMade=false;$(id).addEventListener('pointerdown',()=>{snapshotMade=false});
 $(id).addEventListener('input',e=>{if(!snapshotMade){mark();snapshotMade=true;}state[field]=+e.target.value;const label=$(id+'Label');if(label)label.textContent=e.target.value+(field==='rotation'?'°':'%');void render();});
 $(id).addEventListener('change',()=>{snapshotMade=false;});
}
$('cwCrop').onclick=()=>{const order=['16:9','1:1','4:5','9:16'];setRatio(order[(order.indexOf(state.ratio)+1)%order.length]);};
$('cwReplace').onclick=openUpload;
$('cwRemoveBg').onclick=()=>{
 if(!state.id)return;mark();state.removeWhite=!state.removeWhite;
 note(state.removeWhite?'Removing connected near-white background only; detailed subjects may need Studio.':'Original background restored.');void render();
};
$('cwResetAdjust').onclick=()=>{mark();state.brightness=state.contrast=state.saturation=100;state.effect='original';updateControls();void render();};
for(const button of document.querySelectorAll('[data-cw-effect]'))button.onclick=()=>{mark();state.effect=button.dataset.cwEffect;updateControls();void render();};
for(const button of document.querySelectorAll('[data-cw-position]'))button.onclick=()=>{
 mark();const pos=button.dataset.cwPosition;if(pos==='left')state.offsetX=-250;
 if(pos==='right')state.offsetX=250;if(pos==='center')state.offsetX=state.offsetY=0;if(pos==='top')state.offsetY=-180;if(pos==='bottom')state.offsetY=180;
 void render();
};
for(const button of document.querySelectorAll('[data-cw-tab]'))button.onclick=()=>{
 document.querySelectorAll('[data-cw-tab]').forEach(x=>{const selected=x===button;x.classList.toggle('cw-tab-active',selected);x.setAttribute('aria-selected',String(selected))});
 for(const name of ['Edit','Adjust','Effects'])$('cwTab'+name).hidden=name.toLowerCase()!==button.dataset.cwTab;
};
for(const button of document.querySelectorAll('[data-cw-tool]'))button.onclick=()=>{
 document.querySelectorAll('[data-cw-tool]').forEach(x=>{x.classList.toggle('cw-rail-active',x===button);x.setAttribute('aria-pressed',String(x===button))});
 if(button.dataset.cwTool==='upload'){openUpload();showToolPane('upload');}else showToolPane(button.dataset.cwTool);
};
$('cwGallerySearch').addEventListener('input',renderGallery);
for(const b of document.querySelectorAll('[data-cw-filter]'))b.onclick=()=>{document.querySelectorAll('[data-cw-filter]').forEach(x=>x.classList.toggle('cw-category-active',x===b));renderGallery();};
for(const [id,dir] of [['cwGalleryPrev',-1],['cwGalleryNext',1]])$(id).onclick=()=>{$('cwGallery').scrollBy({left:dir*220,behavior:'smooth'});};
$('cwAddFrame').onclick=()=>{if(state.id&&!sequence.includes(state.id)){mark();sequence.push(state.id);renderFrames();note('Photo added to the local sequence.')}else note('This photo is already in the local sequence.');};
for(const button of document.querySelectorAll('[data-cw-prompt]'))button.onclick=()=>{
 const samples={portrait:'Create a professional editorial portrait. Preserve realistic skin texture and facial details.',product:'Create a premium product photo with natural studio light and an accurate product shape.',social:'Create a short social video based on the selected photo, using natural motion and a clear beginning.'};
 const prompt=samples[button.dataset.cwPrompt];if(!prompt)return;if($('cwPrompt').value.trim()&&!confirm('Replace your current prompt?'))return;$('cwPrompt').value=prompt;
 if(button.dataset.cwPrompt==='social')switchMode('video');$('cwPrompt').focus();
};
$('cwDuplicate').onclick=()=>{if(state.selected<0){note('Select a text or shape to duplicate.');return;}mark();const current=JSON.parse(JSON.stringify(state.layers[state.selected]));current.x+=35;current.y+=35;state.layers.push(current);state.selected=state.layers.length-1;void render();};
$('cwDelete').onclick=()=>{if(state.selected>=0){mark();state.layers.splice(state.selected,1);state.selected=-1;void render();note('Layer removed.')}else note('Select a text or shape to delete.');};
$('cwBringForward').onclick=()=>{if(state.selected<0||state.selected===state.layers.length-1)return;mark();const [layer]=state.layers.splice(state.selected,1);state.layers.push(layer);state.selected=state.layers.length-1;void render();};
$('cwLock').onclick=()=>{if(state.selected<0){note('Select a text or shape to lock.');return;}mark();const l=state.layers[state.selected];l.locked=!l.locked;state.locked=l.locked;$('cwLock').setAttribute('aria-pressed',String(l.locked));note(l.locked?'Layer locked.':'Layer unlocked.');};
$('cwUndo').onclick=()=>{if(!history.length)return;future.push(clone());const x=history.pop();state=x.state;sequence=x.sequence;updateControls();void render();};
$('cwRedo').onclick=()=>{if(!future.length)return;history.push(clone());const x=future.pop();state=x.state;sequence=x.sequence;updateControls();void render();};
$('cwZoom').onchange=()=>{const z=+$('cwZoom').value;$('cwStageInner').style.transform=`scale(${z/100})`;$('cwStageInner').style.transformOrigin='center';note('View zoom: '+z+'%. Export size stays unchanged.');};
let drag=null;
canvas.addEventListener('pointerdown',e=>{
 if(!accountGuard())return;const rect=canvas.getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width*canvas.width,y=(e.clientY-rect.top)/rect.height*canvas.height;
 let selected=-1;for(let i=state.layers.length-1;i>=0;i--){const layer=state.layers[i];if(Math.abs(layer.x-x)<Math.max(layer.w||130,120)/2+15&&Math.abs(layer.y-y)<Math.max(layer.h||90,90)/2+15){selected=i;break;}}
 state.selected=selected;state.locked=selected>=0?!!state.layers[selected].locked:false;drag={x:e.clientX,y:e.clientY,oldX:state.offsetX,oldY:state.offsetY,layerX:selected>=0?state.layers[selected].x:null,layerY:selected>=0?state.layers[selected].y:null,moved:false,selected};canvas.setPointerCapture(e.pointerId);void render();
});
canvas.addEventListener('pointermove',e=>{if(!drag||state.locked)return;const r=canvas.getBoundingClientRect(),dx=(e.clientX-drag.x)/r.width*canvas.width,dy=(e.clientY-drag.y)/r.height*canvas.height;
 if(Math.abs(dx)+Math.abs(dy)>3&&!drag.moved){mark();drag.moved=true;}
 if(drag.selected>=0){state.layers[drag.selected].x=drag.layerX+dx;state.layers[drag.selected].y=drag.layerY+dy;}
 else{state.offsetX=drag.oldX+dx*1280/canvas.width;state.offsetY=drag.oldY+dy*720/canvas.height;}
 void render();});
canvas.addEventListener('pointerup',()=>{if(drag?.moved)note('Position updated. Use Undo to restore.');drag=null;});canvas.addEventListener('pointercancel',()=>{drag=null;});
async function exportPng(){
 if(!accountGuard())return;await render();
 canvas.toBlob(blob=>{if(!blob){note('Export failed. Try a different photo.');return;}
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='DEEPSYQ-Canvas-'+state.ratio.replace(':','x')+'.png';
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);note('PNG exported to your device.');},'image/png');
}
$('cwExport').onclick=()=>void exportPng();
async function handoff(){
 if(!accountGuard())return;
 const prompt=$('cwPrompt').value.trim()||('Use the selected Canvas reference photo to create a polished '+(state.mode==='video'?'short video':'image')+'. Preserve realistic details and respect the source image.');
 if(prompt.length>2000){note('Keep the prompt under 2,000 characters.');return;}
 $('cwGenerate').disabled=true;note('Preparing a private Studio draft. No AI credits are spent here.');
 try{
  await render();const files=[];const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));
  if(blob&&blob.size<=1024*1024){files.push(new File([blob],'canvas-reference.jpg',{type:'image/jpeg'}));}
  await saveStudioHandoff({kind:state.mode,prompt,settings:{ratio:state.ratio},files,source:'canvas-workspace'});
  location.assign('generate-studio.html?studio='+state.mode+'&from=canvas');
 }catch(error){$('cwGenerate').disabled=false;note('Studio handoff was not available. Your Canvas is still here; please try again.');}
}
$('cwGenerate').onclick=()=>void handoff();
$('cwPromptUpload').onclick=openUpload;
$('cwSettings').onclick=()=>{$('cwTabAdjust').hidden=false;$('cwTabEdit').hidden=true;$('cwTabEffects').hidden=true;document.querySelector('[data-cw-tab="adjust"]')?.click();$('cwTabAdjust').scrollIntoView({behavior:'smooth',block:'nearest'});};
$('cwPlay').onclick=()=>{
 if(played){clearInterval(played);played=null;$('cwPlay').textContent='▷';$('cwSequenceTime').textContent='Preview';return;}
 if(!sequence.length){note('Add a photo to preview the sequence.');return;}
 let step=Math.max(0,sequence.indexOf(state.id));$('cwPlay').textContent='▣';note('Playing an image storyboard preview — this is not a generated video.');
 played=setInterval(()=>{step=(step+1)%sequence.length;switchPhoto(sequence[step]);$('cwSequenceTime').textContent=(step+1)+'/'+sequence.length;},2300);
};
window.addEventListener('pagehide',()=>{if(played)clearInterval(played);for(const u of objectUrls)URL.revokeObjectURL(u)});
document.addEventListener('keydown',e=>{
 if(!(e.ctrlKey||e.metaKey)||e.target.closest('textarea,input,[contenteditable]'))return;
 if(e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('cwRedo'):$('cwUndo')).click();}
 if(e.key.toLowerCase()==='y'){e.preventDefault();$('cwRedo').click();}
});
renderGallery();updateControls();void render();
