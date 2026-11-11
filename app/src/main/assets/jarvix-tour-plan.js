// Read-only tour; cached owner clips plus current plan-card narration.
export const TOUR_KEY='deepsyq_guided_tour_v6';
export function tourPlan(language='en') {
 const lang=['ru','en','fr','es'].includes(language)?language:'en';
 const rows=[
 ['Home','deepsyq.html',1,'#homeQuickBar'],
 ['Image','generate-studio.html?studio=image',52,'#creator,#modelButton,#settingsButton,#generate'],
 ['Video','generate-studio.html?studio=video',53,'#creator,#modelButton,#settingsButton,#generate'],
 ['Audio','generate-studio.html?studio=audio',63,'#creator,#modelButton,#settingsButton,#generate'],
 ['AI Apps','ai-apps.html',72,'.app-card:first-child'],
 ['Canvas','canvas.html',70,'#quickCreateForm,#quickCreateSubmit'],
 ['Tools','free-tools.html',84,'#etGallery>a:first-child'],
 ['Compress photos','mobile-utility.html?tool=photo-compress',null,'#utilityFiles,#utilityRun'],
 ['Trim video','mobile-utility.html?tool=video-trim',null,'#utilityFiles,#utilityRun'],
 ['Trim audio','mobile-utility.html?tool=audio-trim',null,'#utilityFiles,#utilityRun'],
 ['Video Uniquifier','video-uniquifier.html',64,'#mode,#aspectRatio,#startBtn'],
 ['Inspiration','deepsyq.html#inspirationPreview',null,'#inspirationPreview'],
 ['Pricing','pricing.html',62,'#plans'],
 ...['trial','basic','pro','business','lifetime'].map(key=>[key,'pricing.html',null,`.price-plan.price-${key}`]),
 ['Home','deepsyq.html',60,'#homeQuickBar']
 ];
 return rows.map(([title,url,id,target])=>({title,url,target,...(id?{audio:`media/jarvix/clips/jarvix_${lang}_${String(id).padStart(2,'0')}.mp3`}:{narration:['trial','basic','pro','business','lifetime'].includes(title)?'plan':'section'})}));
}
// Each spotlight is tied to the *actual recorded narration position*.
// We never click Create, Generate, checkout, consent or upload controls in a tour.
const RECORDED_CUES=Object.freeze({
 Home:[{at:0,target:'#homeQuickBar'}],
 Image:[{at:0,target:'#creator'},{at:.46,target:'#modelButton',action:'showSettings'},{at:.78,target:'#settingsButton',action:'showSettings'}],
 Video:[{at:0,target:'#referenceBox,#creator'},{at:.43,target:'#modelButton',action:'showSettings'},{at:.74,target:'#creator',action:'hideSettings'}],
 Audio:[{at:0,target:'#creator'},{at:.48,target:'#modelButton',action:'showSettings'},{at:.77,target:'#settingsButton',action:'showSettings'}],
 'AI Apps':[{at:0,target:'.app-card:first-child'}],
 Canvas:[{at:0,target:'#quickCreateForm'},{at:.70,target:'#quickCreateSubmit'}],
 Tools:[{at:0,target:'#etGallery>a:first-child'}],
 'Video Uniquifier':[{at:0,target:'#mode'},{at:.52,target:'#aspectRatio'},{at:.84,target:'#startBtn'}],
 Pricing:[{at:0,target:'#plans'}]
});
export function tourCues(title) { return RECORDED_CUES[title]||[{at:0,target:'.jarvis-tour-spotlight'}]; }
export function cueAt(cues,time,duration) {
 if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(time)||time<0)return 0;
 const part=Math.min(1,time/duration);
 let i=0;for(let j=1;j<cues.length;j++)if(part>=cues[j].at)i=j;
 return i;
}
// Existing owner-recorded short navigation clips announce the action before the click.
// Generic "One moment, preparing" is used when no truthful destination-specific clip exists.
export function tourNavigationClip(title,index,language='en') {
 const lang=['ru','en','fr','es'].includes(language)?language:'en';
 const id=index===0?null:title==='Home'?13:
  ['Image','Video','Audio'].includes(title)?11:
  title==='Tools'?15:title==='Inspiration'?14:title==='Pricing'?12:9;
 return id===null?null:`media/jarvix/clips/jarvix_${lang}_${String(id).padStart(2,'0')}.mp3`;
}
export function planNarrationBeats(card) {
 const conditional=/proposed|unavailable|not.*active|pending/i.test((card.price||'')+' '+(card.summary||''));
 const parts=[
  [card.name,'.price-plan-name'],
  [card.price,'.price-plan-price'],
  [conditional?card.summary:(card.billingNotice||card.summary),conditional?'.price-plan-summary':'.price-plan-facts'],
  ...(conditional&&card.summary?[]:(card.features||[]).slice(0,2).map((x,i)=>[x,`.price-features li:nth-child(${i+1})`])),
  [conditional&&!card.summary?card.note:null,'.price-plan-note']
 ];
 return parts.filter(([text])=>Boolean(text)).map(([text,target])=>({text:String(text),target}));
}
export function planNarration(card,language='en') {
 return planNarrationBeats(card).map(beat=>beat.text).join('. ').replace(/\s+/g,' ');
}
export function tourAction(state,action) {
 if(!state)return null;
 if(action==='stop')return null;
 if(action==='pause')return {...state,phase:'paused'};
 if(action==='continue')return {...state,phase:'playing'};
 if(action==='ended'&&state.phase==='playing')return state.index+1<tourPlan(state.language).length?{...state,index:state.index+1,position:0,beat:0,narrationPart:0,narrationStep:null}:null;
 return state;
}

// New speech is split into small, action-matched beats. Each spoken line gets
// exactly one highlighted control; the guide only *shows* potentially paid actions.
const SECTION_BEATS={
 'Compress photos':{
  ru:[['Здесь можно уменьшить размер фотографий.','#utilityFiles'],['Сначала выбирают снимки.','#utilityFiles'],['После выбора нажимают обработку. Во время экскурсии файлы не изменяются.','#utilityRun']],
  en:[['Here you can reduce image file sizes.','#utilityFiles'],['First choose your images.','#utilityFiles'],['Then use the processing button. No files are changed during the tour.','#utilityRun']],
  fr:[['Ici, vous pouvez réduire la taille des photos.','#utilityFiles'],['Choisissez vos images.','#utilityFiles'],['Ensuite, utilisez le bouton de traitement. La visite ne modifie aucun fichier.','#utilityRun']],
  es:[['Aquí puedes reducir el tamaño de tus fotos.','#utilityFiles'],['Primero elige tus imágenes.','#utilityFiles'],['Después usa el botón de proceso. La visita no modifica archivos.','#utilityRun']]},
 'Trim video':{
  ru:[['Это инструмент обрезки видео.','#utilityFiles'],['Здесь выбирают исходный ролик.','#utilityFiles'],['После выбора файла можно запустить обрезку. Экскурсия ничего не обрабатывает.','#utilityRun']],
  en:[['This is the video trimming tool.','#utilityFiles'],['Choose a source video here.','#utilityFiles'],['After selection, you can trim it. The tour does not process files.','#utilityRun']],
  fr:[['Voici l’outil de découpe vidéo.','#utilityFiles'],['Choisissez votre vidéo ici.','#utilityFiles'],['Ensuite, vous pourrez la découper. La visite ne traite aucun fichier.','#utilityRun']],
  es:[['Esta es la herramienta para recortar vídeos.','#utilityFiles'],['Elige aquí tu vídeo.','#utilityFiles'],['Después podrás recortarlo. La visita no procesa archivos.','#utilityRun']]},
 'Trim audio':{
  ru:[['Это инструмент обрезки аудио.','#utilityFiles'],['Здесь выбирают звуковую запись.','#utilityFiles'],['Затем запускают обработку выбранного фрагмента. В экскурсии файл не изменяется.','#utilityRun']],
  en:[['This is the audio trimming tool.','#utilityFiles'],['Choose an audio recording here.','#utilityFiles'],['Then process the selected section. The tour does not modify the file.','#utilityRun']],
  fr:[['Voici l’outil de découpe audio.','#utilityFiles'],['Choisissez votre enregistrement ici.','#utilityFiles'],['Puis traitez le passage sélectionné. La visite ne modifie pas le fichier.','#utilityRun']],
  es:[['Esta es la herramienta para recortar audio.','#utilityFiles'],['Elige aquí tu grabación.','#utilityFiles'],['Después procesa el fragmento. La visita no modifica el archivo.','#utilityRun']]},
 Inspiration:{
  ru:[['Перед вами галерея Вдохновения с изображениями и видео.','#inspirationPreview'],['Здесь можно открыть пример, прочитать его промпт и начать собственный проект.','#inspirationPreview']],
  en:[['Here is Inspiration, with image and video examples.','#inspirationPreview'],['Open an example to see its prompt and start your own project.','#inspirationPreview']],
  fr:[['Voici la galerie Inspiration, avec des exemples d’images et de vidéos.','#inspirationPreview'],['Ouvrez un exemple pour découvrir son prompt et commencer votre projet.','#inspirationPreview']],
  es:[['Esta es la galería de Inspiración, con imágenes y vídeos.','#inspirationPreview'],['Abre un ejemplo para ver su prompt y empezar tu proyecto.','#inspirationPreview']]}
};
export function sectionNarrationBeats(title,language='en') {
 const lines=SECTION_BEATS[title]?.[language]||SECTION_BEATS[title]?.en;
 return lines?lines.map(([text,target])=>({text,target})):[{text:sectionNarration(title,language),target:tourPlan(language).find(x=>x.title===title)?.target||'main'}];
}
export function sectionNarration(title,language='en') {
 const texts={
 'Compress photos':{ru:'Сжатие фотографий. Добавьте снимок и уменьшите размер файла для отправки или публикации.',en:'Compress photos. Add an image and reduce its file size for sharing or publishing.',fr:'Compressez vos photos pour réduire leur taille avant de les partager.',es:'Comprime tus fotos para reducir su tamaño antes de compartirlas.'},
 'Trim video':{ru:'Обрезка видео. Выберите ролик и оставьте нужный фрагмент.',en:'Trim video. Choose a video and keep the part you need.',fr:'Découpez une vidéo pour conserver le passage souhaité.',es:'Recorta un vídeo y conserva la parte que necesitas.'},
 'Trim audio':{ru:'Обрезка аудио. Выберите запись и укажите начало и конец фрагмента.',en:'Trim audio. Choose a recording and set the start and end of your clip.',fr:'Découpez un enregistrement en choisissant son début et sa fin.',es:'Recorta una grabación eligiendo el inicio y el final.'},
 'Inspiration':{ru:'Во Вдохновении есть видео и изображения. Откройте пример, посмотрите его промпт и используйте как основу собственной идеи.',en:'Inspiration includes videos and images. Open an example, explore its prompt and use it as the starting point for your own idea.',fr:'Inspiration réunit des vidéos et des images. Ouvrez un exemple et utilisez son prompt pour votre propre idée.',es:'Inspiración incluye vídeos e imágenes. Abre un ejemplo y utiliza su prompt como punto de partida.'}
 };return texts[title]?.[language]||texts[title]?.en||title;
}

export function narrationChunks(text,limit=220){
 const chunks=[];let current='';for(const word of String(text).split(/\s+/)){if(current&&current.length+word.length+1>limit){chunks.push(current);current='';}current+=(current?' ':'')+word;}if(current)chunks.push(current);return chunks;
}
