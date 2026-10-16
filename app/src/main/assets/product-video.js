import {saveStudioHandoff} from './studio-handoff.js';
const $=id=>document.getElementById(id);let photos=[],logo=null,previewUrls=[];
function validFile(f){return !!f&&['image/png','image/jpeg'].includes(f.type)&&f.size<=1024*1024;}
function clearUrls(){for(const u of previewUrls)URL.revokeObjectURL(u);previewUrls=[];}
function renderFiles(){
 clearUrls();$('photoPreview').replaceChildren();$('logoPreview').replaceChildren();
 photos.forEach((f,index)=>{
  const item=document.createElement('div');item.className='photo-item';
  const img=document.createElement('img'),u=URL.createObjectURL(f);previewUrls.push(u);
  img.src=u;img.alt='Product photo '+(index+1);
  const title=document.createElement('small');title.textContent='Photo '+(index+1)+' of '+photos.length;
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
function prompt(){const name=$('productName').value.trim(),style=$('style').value,ratio=$('ratio').value,duration=$('duration').value;return `Create a ${style} advertising video for ${name?name:'the product shown in the reference image'}. Keep the product recognizable and visually consistent with the supplied reference image${photos.length===1?'':'s'}. Compose the creative for a ${ratio} format. Duration preference: ${duration}. Focus on the product, clear commercial presentation, coherent lighting and natural motion. ${logo?'Use the supplied logo only as a brand reference and keep it undistorted. ':''}Do not invent product features, claims, packaging text or brand details that are not visible in the references.`.slice(0,2000);}
function updatePrompt(){$('promptPreview').value=prompt();}
$('photos').onchange=()=>{const list=Array.from($('photos').files||[]);if(list.length>3||list.some(f=>!validFile(f))){$('status').textContent='Use up to 3 PNG/JPG product photos, each under 1 MB. Your previous valid selection is preserved.';$('photos').value='';}else{$('status').textContent='';photos=list;}renderFiles();};
$('logo').onchange=()=>{const f=$('logo').files?.[0]||null;if(f&&!validFile(f)){$('status').textContent='Logo must be PNG/JPG under 1 MB. Your previous logo is preserved.';$('logo').value='';}else{$('status').textContent='';logo=f;}renderFiles();};
for(const id of ['productName','style','ratio','duration'])$(id).addEventListener(id==='productName'?'input':'change',updatePrompt);
$('workflow').onsubmit=async e=>{e.preventDefault();if(!photos.length){$('status').textContent='Add at least one product photo first.';return;}const button=$('continue');button.disabled=true;$('status').textContent='Preparing your Studio locally…';try{await saveStudioHandoff({kind:'video',prompt:prompt(),settings:{ratio:$('ratio').value,durationPreference:$('duration').value},files:[...photos,...(logo?[logo]:[])],source:'product-video',meta:{productName:$('productName').value.trim(),style:$('style').value,hasLogo:!!logo}});location.assign('generate-studio.html?studio=video&from=product-video');}catch(err){$('status').textContent=err.message==='LOCAL_HANDOFF_UNAVAILABLE'?'This browser could not prepare the local handoff. Open Video Studio and add the files there.':'Could not prepare the workflow. Check the files and try again.';button.disabled=false;}};
updatePrompt();window.addEventListener('pagehide',clearUrls);