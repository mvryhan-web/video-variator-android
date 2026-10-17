import {MAX_COLLAGE_FILES,MAX_COLLAGE_FILE_BYTES,MAX_COLLAGE_TOTAL_BYTES,collageGeometry,centerCrop} from './photo-collage-core.js';
const $=id=>document.getElementById(id),lang=(navigator.language||'en').slice(0,2);
const dict={
en:{title:'Photo Collage',back:'← Everyday Tools',intro:'Create a photo grid in your browser. Images never upload to our servers.',choose:'Choose 2–9 photos',columns:'Columns',spacing:'Spacing',background:'Background',none:'None',small:'Small',wide:'Wide',white:'White',dark:'Dark',create:'Create collage',clear:'Clear',download:'Download PNG',safety:'Local PNG output, 1200 pixels wide. Supports JPG, PNG and WebP; up to 9 photos (15 MB each).',selected:n=>n+' photos selected',ready:(w,h)=>'Ready: '+w+' × '+h+' PNG',select:'Select 2–9 photos to start.',busy:'Creating collage on your device…',invalid:'Please choose between 2 and 9 JPG, PNG or WebP photos, up to 15 MB each (80 MB total).',fail:'Could not decode one of the photos. Try another image.',export:'Could not save the PNG. Try again.'},
ru:{title:'Фотоколлаж',back:'← Повседневные инструменты',intro:'Создайте коллаж прямо в браузере. Фотографии не отправляются на сервер.',choose:'Выберите 2–9 фотографий',columns:'Колонки',spacing:'Отступы',background:'Фон',none:'Без отступов',small:'Маленькие',wide:'Большие',white:'Белый',dark:'Тёмный',create:'Создать коллаж',clear:'Очистить',download:'Скачать PNG',safety:'PNG создаётся на устройстве, ширина 1200 пикселей. JPG, PNG, WebP; до 9 фото (каждое до 15 МБ).',selected:n=>'Выбрано фото: '+n,ready:(w,h)=>'Готово: '+w+' × '+h+' PNG',select:'Выберите от 2 до 9 фото.',busy:'Создаём коллаж на устройстве…',invalid:'Нужно 2–9 фотографий JPG, PNG или WebP, до 15 МБ каждая (всего не более 80 МБ).',fail:'Одно из фото не удалось открыть. Выберите другое.',export:'Не удалось сохранить PNG. Попробуйте снова.'},
fr:{title:'Collage photo',back:'← Outils du quotidien',intro:'Créez un collage dans votre navigateur. Les photos ne sont pas envoyées au serveur.',choose:'Choisissez 2 à 9 photos',columns:'Colonnes',spacing:'Espacement',background:'Fond',none:'Aucun',small:'Petit',wide:'Grand',white:'Blanc',dark:'Sombre',create:'Créer le collage',clear:'Effacer',download:'Télécharger PNG',safety:'PNG local de 1200 pixels de large. JPG, PNG, WebP; jusqu’à 9 images (15 Mo par image).',selected:n=>n+' photos choisies',ready:(w,h)=>'Prêt : '+w+' × '+h+' PNG',select:'Choisissez 2 à 9 photos.',busy:'Création sur votre appareil…',invalid:'Choisissez 2 à 9 photos JPG, PNG ou WebP, 15 Mo chacune (80 Mo au total).',fail:'Impossible de lire une photo. Essayez une autre image.',export:'Impossible de créer le PNG.'},
uk:{title:'Фотоколаж',back:'← Щоденні інструменти',intro:'Створюйте колаж у браузері. Фото не завантажуються на сервер.',choose:'Оберіть 2–9 фото',columns:'Стовпці',spacing:'Відступи',background:'Тло',none:'Немає',small:'Малі',wide:'Великі',white:'Біле',dark:'Темне',create:'Створити колаж',clear:'Очистити',download:'Завантажити PNG',safety:'Локальний PNG 1200 пікселів завширшки. JPG, PNG, WebP; до 9 фото (15 МБ кожне).',selected:n=>'Обрано фото: '+n,ready:(w,h)=>'Готово: '+w+' × '+h+' PNG',select:'Оберіть від 2 до 9 фото.',busy:'Створюємо на вашому пристрої…',invalid:'Оберіть 2–9 фото JPG, PNG або WebP, до 15 МБ кожне (80 МБ разом).',fail:'Не вдалося відкрити одне з фото.',export:'Не вдалося створити PNG.'}
};
const t=dict[lang]||dict.en;
for(const [id,key] of [['collageHeading','title'],['collageBack','back'],['collageIntro','intro'],['collageChooseLabel','choose'],['collageColsLabel','columns'],['collageGapLabel','spacing'],['collageBgLabel','background'],['collageCreate','create'],['collageClear','clear'],['collageDownload','download'],['collageSafety','safety']])$(id).textContent=t[key];
for(const [id,keys] of [['collageGap',['none','small','wide']],['collageBg',['white','dark']]]){
 [...$(id).options].forEach((option,index)=>option.textContent=t[keys[index]]);
}
document.title=t.title+' — Deepsyq Tools';
let busy=false,previewUrl=null,collageGeneration=0;
function setCollageControlsBusy(value){
 $('collageCreate').disabled=value;$('collageClear').disabled=value;
 for(const id of ['collageFiles','collageColumns','collageGap','collageBg'])$(id).disabled=value;
}
function revoke(){if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;$('collagePreview').removeAttribute('src');$('collageDownload').removeAttribute('href');$('collageDownload').hidden=true;$('collageResult').hidden=true;}
function info(message){$('collageStatus').textContent=message;}
function validFiles(files){
 return files.length>=2&&files.length<=MAX_COLLAGE_FILES&&files.every(f=>['image/jpeg','image/png','image/webp'].includes(f.type)&&f.size>0&&f.size<=MAX_COLLAGE_FILE_BYTES)&&files.reduce((sum,f)=>sum+f.size,0)<=MAX_COLLAGE_TOTAL_BYTES;
}
function resetResult(){if(busy)return;revoke();info('');$('collageFileInfo').textContent=$('collageFiles').files.length?t.selected($('collageFiles').files.length):'';}
$('collageFiles').addEventListener('change',resetResult);
for(const id of ['collageColumns','collageGap','collageBg'])$(id).addEventListener('change',resetResult);
$('collageClear').addEventListener('click',()=>{if(busy)return;$('collageFiles').value='';resetResult();});
async function decodePhoto(file){
 const bitmap=await createImageBitmap(file);
 if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>35_000_000){bitmap.close();throw Error('COLLAGE_IMAGE');}
 return bitmap;
}
$('collageCreate').addEventListener('click',async()=>{
 if(busy)return;revoke();
 const files=Array.from($('collageFiles').files);
 if(!validFiles(files)){info(t.invalid);return;}
 const generation=++collageGeneration;
 busy=true;setCollageControlsBusy(true);info(t.busy);
 let canvas=null;
 try{
  const columns=Number($('collageColumns').value),gap=Number($('collageGap').value);
  const geom=collageGeometry(files.length,columns,gap);
  canvas=document.createElement('canvas');canvas.width=geom.width;canvas.height=geom.height;
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('COLLAGE_CANVAS');
  ctx.fillStyle=$('collageBg').value;ctx.fillRect(0,0,geom.width,geom.height);
  for(let i=0;i<files.length;i++){
   const image=await decodePhoto(files[i]);
   try{
    if(generation!==collageGeneration)throw Error('COLLAGE_CANCELLED');
    const col=i%geom.columns,row=Math.floor(i/geom.columns),x=Math.round(geom.gap+col*(geom.cell+geom.gap)),y=Math.round(geom.gap+row*(geom.cell+geom.gap));
    const size=Math.ceil(geom.cell),crop=centerCrop(image.width,image.height,size,size);
    ctx.drawImage(image,crop.sx,crop.sy,crop.sw,crop.sh,x,y,size,size);
   }finally{
    // Free each decoded source immediately, not after all nine photos/PNG export.
    image.close();
   }
  }
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(generation!==collageGeneration)throw Error('COLLAGE_CANCELLED');
  if(!blob||!blob.size)throw Error('COLLAGE_EXPORT');
  previewUrl=URL.createObjectURL(blob);
  $('collagePreview').src=previewUrl;$('collageDownload').href=previewUrl;
  $('collageDownload').hidden=false;$('collageResult').hidden=false;
  $('collageResultInfo').textContent=t.ready(geom.width,geom.height);info(t.ready(geom.width,geom.height));
 }catch(error){
  if(generation===collageGeneration){revoke();info(error.message==='COLLAGE_EXPORT'?t.export:t.fail);}
 }finally{
  if(canvas)canvas.width=canvas.height=1;

  if(generation===collageGeneration){busy=false;setCollageControlsBusy(false);}
 }
});
window.addEventListener('pagehide',()=>{
 ++collageGeneration;revoke();
 $('collageFiles').value='';$('collageFileInfo').textContent='';info('');
 busy=false;setCollageControlsBusy(false);
});
