import {saveStudioHandoff} from './studio-handoff.js';
import {buildProductVideoPrompt} from './product-video-prompt.mjs';
import {validProductPhoto} from './product-video-file-safety.mjs';
const $=id=>document.getElementById(id);let photos=[],logo=null,previewUrls=[];
let photoSelectionEpoch=0,logoSelectionEpoch=0,photoPending=false,logoPending=false,handoffPending=false;
function syncContinue(){$('continue').disabled=photoPending||logoPending||handoffPending;}
// A matching PNG/JPEG header is not enough: confirm the browser can actually
// decode the source image, and reject decompression-size surprises early.
async function validDecodableProductImage(file){
 if(!await validProductPhoto(file))return false;
 const url=URL.createObjectURL(file);
 const image=new Image();
 try{
  image.src=url;
  if(typeof image.decode==='function')await image.decode();
  else await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;});
  return image.naturalWidth>0&&image.naturalHeight>0&&
   image.naturalWidth*image.naturalHeight<=40000000;
 }catch(_){return false;}
 finally{URL.revokeObjectURL(url);}
}
function clearUrls(){for(const u of previewUrls)URL.revokeObjectURL(u);previewUrls=[];}
function renderFiles(){
 clearUrls();$('photoPreview').replaceChildren();$('logoPreview').replaceChildren();
 photos.forEach((f,index)=>{
  const item=document.createElement('div');item.className='photo-item';
  const img=document.createElement('img'),u=URL.createObjectURL(f);previewUrls.push(u);
  img.src=u;img.alt='Product photo '+(index+1);
  const title=document.createElement('small');title.textContent=(index+1)+'. '+(f.name||'Product photo');title.title=f.name||'Product photo';
  const actions=document.createElement('div');actions.className='photo-order';
  for(const [label,delta] of [['Earlier',-1],['Later',1]]){
   const button=document.createElement('button');button.type='button';button.textContent=delta<0?'←':'→';
   button.setAttribute('aria-label','Move photo '+(index+1)+' '+label.toLowerCase());
   button.disabled=index+delta<0||index+delta>=photos.length;
   button.onclick=()=>{
    const next=index+delta;[photos[index],photos[next]]=[photos[next],photos[index]];
    renderFiles();
    $('status').textContent='Photo order updated. The first photo will be passed to Studio first.';
   };
   actions.append(button);
  }
  item.append(img,title,actions);$('photoPreview').append(item);
 });
 if(logo){
  const img=document.createElement('img'),u=URL.createObjectURL(logo);previewUrls.push(u);
  img.src=u;img.alt='Optional logo reference';$('logoPreview').append(img);
 }
 updatePrompt();
}
function prompt(){return buildProductVideoPrompt({productName:$('productName').value,style:$('style').value,ratio:$('ratio').value,duration:$('duration').value,hasLogo:!!logo,photoCount:photos.length});}
function updatePrompt(){$('promptPreview').value=prompt();}
$('photos').onchange=async()=>{
 const epoch=++photoSelectionEpoch,list=Array.from($('photos').files||[]);
 photoPending=true;syncContinue();
 $('status').textContent='Checking selected product photos locally…';
 const checks=await Promise.all(list.map(validDecodableProductImage));
 if(epoch!==photoSelectionEpoch)return;
 photoPending=false;syncContinue();
 if(list.length>3||!checks.every(Boolean)){
  $('status').textContent='Use up to 3 valid PNG/JPG product photos under 1 MB each. Your previous photos are preserved.';
  $('photos').value='';
 }else{$('status').textContent='';photos=list;}
 renderFiles();
};
$('logo').onchange=async()=>{
 const epoch=++logoSelectionEpoch,f=$('logo').files?.[0]||null;
 logoPending=true;syncContinue();
 const valid=!f||await validDecodableProductImage(f);
 if(epoch!==logoSelectionEpoch)return;
 logoPending=false;syncContinue();
 if(!valid){
  $('status').textContent='Logo must be a valid PNG/JPG under 1 MB. Your previous logo is preserved.';
  $('logo').value='';
 }else{$('status').textContent='';logo=f;}
 renderFiles();
};
for(const id of ['productName','style','ratio','duration'])$(id).addEventListener(id==='productName'?'input':'change',updatePrompt);
$('workflow').onsubmit=async e=>{
 e.preventDefault();
 // A keyboard submit or requestSubmit() may fire even while the button is disabled.
 // Never hand Studio unvalidated images or start two overlapping local writes.
 if(handoffPending)return;
 if(photoPending||logoPending){$('status').textContent='Finish checking your images before continuing.';return;}
 if(!photos.length){$('status').textContent='Add at least one product photo first.';return;}
 handoffPending=true;syncContinue();$('status').textContent='Preparing your Studio locally…';
 try{
  await saveStudioHandoff({
   kind:'video',prompt:prompt(),
   settings:{ratio:$('ratio').value,durationPreference:$('duration').value},
   files:[...photos,...(logo?[logo]:[])],source:'product-video',
   meta:{productName:$('productName').value.trim(),style:$('style').value,hasLogo:!!logo}
  });
  location.assign('generate-studio.html?studio=video&from=product-video');
 }catch(err){
  $('status').textContent=err.message==='LOCAL_HANDOFF_UNAVAILABLE'
   ?'This browser could not prepare the local handoff. Open Video Studio and add the files there.'
   :'Could not prepare the workflow. Check the files and try again.';
  handoffPending=false;syncContinue();
 }
};
updatePrompt();window.addEventListener('pagehide',clearUrls);