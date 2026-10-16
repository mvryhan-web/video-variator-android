import {eraseConnectedColor} from './simple-background-remover-core.mjs';
const $=id=>document.getElementById(id);
const source=$('original'),result=$('result'),srcCtx=source.getContext('2d',{willReadFrequently:true}),outCtx=result.getContext('2d');
let original=null,selected={x:0,y:0},photoName='photo',generation=0;
const setStatus=message=>{$('status').textContent=message;};
const setSample=()=>{
 const i=(selected.y*source.width+selected.x)*4,d=original.data;
 $('sampleStatus').textContent='Background sample at '+(selected.x+1)+', '+(selected.y+1)+' · RGB '+d[i]+', '+d[i+1]+', '+d[i+2];
};
function resetResult(){
 generation++;$('download').disabled=true;result.width=result.height=1;
 outCtx.clearRect(0,0,1,1);
}
$('photo').addEventListener('change',async()=>{
 const file=$('photo').files?.[0];original=null;
 $('erase').disabled=true;$('topLeft').disabled=true;
 resetResult();const epoch=generation;
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
$('erase').onclick=()=>{
 if(!original)return;
 $('erase').disabled=true;setStatus('Removing matching connected pixels on your device…');
 try{
  const removed=eraseConnectedColor(original.data,source.width,source.height,selected.x,selected.y,Number($('tolerance').value));
  result.width=source.width;result.height=source.height;
  outCtx.putImageData(new ImageData(removed.rgba,source.width,source.height),0,0);
  $('download').disabled=removed.removedPixels===0;
  setStatus(removed.removedPixels
   ?'Transparent preview ready. Removed '+removed.removedPixels.toLocaleString()+' pixels. Review edges before downloading.'
   :'No matching connected pixels found. Pick a background color and retry.');
 }catch(e){
  setStatus(e.message==='SAMPLE_IS_TRANSPARENT'?'Pixel is already transparent. Choose an opaque background color.':'Could not process this image.');
 }finally{$('erase').disabled=false;}
};
$('download').onclick=()=>{
 if($('download').disabled||!original)return;
 $('download').disabled=true;
 result.toBlob(blob=>{
  if(blob){
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download=photoName+'-transparent.png';document.body.append(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(url),12000);
   setStatus('Transparent PNG downloaded. The original photo was not changed.');
  }else setStatus('Could not save PNG. Try a smaller image.');
  $('download').disabled=false;
 },'image/png');
};