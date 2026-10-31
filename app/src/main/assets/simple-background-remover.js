import {eraseConnectedColor} from './simple-background-remover-core.mjs';
const $=id=>document.getElementById(id);
const source=$('original'),result=$('result'),srcCtx=source.getContext('2d',{willReadFrequently:true}),outCtx=result.getContext('2d');
let original=null,selected={x:0,y:0},photoName='photo',generation=0,exportUrl=null;
const setStatus=message=>{$('status').textContent=message;};
const setSample=()=>{
 const i=(selected.y*source.width+selected.x)*4,d=original.data;
 $('sampleStatus').textContent='Background sample at '+(selected.x+1)+', '+(selected.y+1)+' · RGB '+d[i]+', '+d[i+1]+', '+d[i+2];
};
function discardExport(){
 if(exportUrl){URL.revokeObjectURL(exportUrl);exportUrl=null;}
 $('download').disabled=true;
}
function resetResult(){
 generation++;discardExport();result.width=result.height=1;
 outCtx.clearRect(0,0,1,1);
}
function clearCurrent({clearInput=false}={}){
 // Clear both canvases immediately. Never retain a previous user's photo
 // behind an invalid/new file selection while the next image is decoding.
 if(original?.data)original.data.fill(0);
 original=null;source.width=1;source.height=1;selected={x:0,y:0};photoName='photo';
 $('erase').disabled=true;$('topLeft').disabled=true;
 $('sampleStatus').textContent='Choose a photo to begin.';
 resetResult(); // Also invalidates any pending asynchronous image decode.
 if(clearInput){
  $('photo').value='';$('clearPhoto').disabled=true;
  setStatus('Photo and preview cleared from this page.');
 }
}
$('clearPhoto').onclick=()=>clearCurrent({clearInput:true});
$('photo').addEventListener('change',async()=>{
 const file=$('photo').files?.[0];
 clearCurrent();$('clearPhoto').disabled=!file;
 const epoch=generation;
 if(!file){setStatus('Choose a photo to begin.');return;}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024||!file.size){
  setStatus('Choose a JPG, PNG or WebP photo under 10 MB.');return;
 }
 let url=null;
 try{
  url=URL.createObjectURL(file);
  const image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('IMAGE_LOAD_FAILED'));image.src=url;});
  if(epoch!==generation)return;
  const width=image.naturalWidth,height=image.naturalHeight;
  if(!width||!height||width*height>8000000)throw new Error('IMAGE_DIMENSIONS_UNSUPPORTED');
  source.width=width;source.height=height;result.width=width;result.height=height;
  srcCtx.drawImage(image,0,0,width,height);
  original=srcCtx.getImageData(0,0,width,height);
  selected={x:0,y:0};photoName=(file.name||'photo').replace(/\.[^.]+$/,'').slice(0,100)||'photo';
  $('erase').disabled=false;$('topLeft').disabled=false;setSample();
  setStatus('Tap the original photo to select a background color, then remove it. Your file stays here.');
 }catch(_){if(epoch===generation)setStatus('Could not load this photo. Use an image with no more than 8 million pixels.');}
 finally{if(url)URL.revokeObjectURL(url);}
});
source.addEventListener('click',event=>{
 if(!original)return;
 const bounds=source.getBoundingClientRect();
 selected={
  x:Math.min(source.width-1,Math.max(0,Math.floor((event.clientX-bounds.left)*source.width/bounds.width))),
  y:Math.min(source.height-1,Math.max(0,Math.floor((event.clientY-bounds.top)*source.height/bounds.height)))
 };
 resetResult();setSample();setStatus('Background color selected. Adjust tolerance, then remove it.');
});
source.addEventListener('keydown',event=>{
 if(!original)return;
 const step=event.shiftKey?10:1;
 let {x,y}=selected;
 if(event.key==='ArrowLeft')x-=step;
 else if(event.key==='ArrowRight')x+=step;
 else if(event.key==='ArrowUp')y-=step;
 else if(event.key==='ArrowDown')y+=step;
 else if(event.key==='Home'){x=0;y=0;}
 else if(event.key==='End'){x=source.width-1;y=source.height-1;}
 else if(event.key==='Enter'||event.key===' '){
  event.preventDefault();
  setSample();
  setStatus('Background pixel selected. Adjust tolerance and remove it.');
  return;
 }else return;
 event.preventDefault();
 selected={x:Math.max(0,Math.min(source.width-1,x)),y:Math.max(0,Math.min(source.height-1,y))};
 resetResult();setSample();setStatus('Background color selected with keyboard. Review RGB and remove it.');
});
$('topLeft').onclick=()=>{if(!original)return;selected={x:0,y:0};resetResult();setSample();};
$('tolerance').oninput=()=>{$('toleranceValue').textContent=$('tolerance').value;resetResult();};
$('erase').onclick=async()=>{
 if(!original)return;
 // Prepare the PNG while processing, rather than after the download click.
 // Safari/iOS requires the eventual download to use a direct user gesture.
 resetResult();const epoch=generation;
 $('erase').disabled=true;
 setStatus('Removing matching background pixels and preparing PNG on your device…');
 try{
  const removed=eraseConnectedColor(original.data,source.width,source.height,selected.x,selected.y,Number($('tolerance').value));
  result.width=source.width;result.height=source.height;
  outCtx.putImageData(new ImageData(removed.rgba,source.width,source.height),0,0);
  if(!removed.removedPixels){
   setStatus('No matching connected pixels found. Pick a background color and retry.');
   return;
  }
  const blob=await new Promise(resolve=>result.toBlob(resolve,'image/png'));
  if(epoch!==generation)return; // Selection, photo, or tolerance was changed mid-encode.
  if(!blob)throw new Error('PNG_ENCODE_FAILED');
  exportUrl=URL.createObjectURL(blob);
  $('download').disabled=false;
  setStatus('Transparent PNG ready. Removed '+removed.removedPixels.toLocaleString()+' pixels. Review edges before downloading.');
 }catch(e){
  if(epoch===generation)setStatus(e.message==='SAMPLE_IS_TRANSPARENT'
   ?'Pixel is already transparent. Choose an opaque background color.'
   :'Could not prepare the transparent PNG. Try a smaller image.');
 }finally{
  // A previous asynchronous PNG encode must not re-enable controls for a
  // newly selected photo while its own encode is still in progress.
  if(epoch===generation)$('erase').disabled=!original;
 }
};
$('download').onclick=()=>{
 if($('download').disabled||!original||!exportUrl)return;
 // Click an already prepared local Blob URL synchronously with this gesture.
 const link=document.createElement('a');
 link.href=exportUrl;link.download=photoName+'-transparent.png';
 document.body.append(link);link.click();link.remove();
 setStatus('Transparent PNG downloaded. The original photo was not changed.');
};
window.addEventListener('pagehide',()=>{
 // A page restored from the back/forward cache must not display the previous
 // customer's image, even though its Blob URL and CPU buffer were released.
 clearCurrent({clearInput:true});
});