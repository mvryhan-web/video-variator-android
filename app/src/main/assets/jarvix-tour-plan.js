// Read-only tour; cached owner clips plus current plan-card narration.
export const TOUR_KEY='deepsyq_guided_tour_v4';
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
 ['Video Uniquifier','index.html',64,'#mode,#aspectRatio,#startBtn'],
 ['Inspiration','deepsyq.html#inspirationPreview',null,'#inspirationPreview'],
 ['Pricing','pricing.html',62,'#plans'],
 ...['trial','basic','pro','business','lifetime'].map(key=>[key,'pricing.html',null,`.price-plan.price-${key}`]),
 ['Home','deepsyq.html',60,'#homeQuickBar']
 ];
 return rows.map(([title,url,id,target])=>({title,url,target,...(id?{audio:`media/jarvix/clips/jarvix_${lang}_${String(id).padStart(2,'0')}.mp3`}:{narration:['trial','basic','pro','business','lifetime'].includes(title)?'plan':'section'})}));
}
export function planNarration(card,language='en') {
 const conditional=/proposed|unavailable|not.*active|pending/i.test((card.price||'')+' '+(card.summary||''));
 const detail=conditional&&card.summary?[card.summary]:(card.features||[]).slice(0,12);
 const parts=[card.name,card.price,...detail,conditional&&!card.summary?card.note:null].filter(Boolean);
 return parts.join('. ').replace(/\s+/g,' ');
}
export function tourAction(state,action) {
 if(!state)return null;
 if(action==='stop')return null;
 if(action==='pause')return {...state,phase:'paused'};
 if(action==='continue')return {...state,phase:'playing'};
 if(action==='ended'&&state.phase==='playing')return state.index+1<tourPlan(state.language).length?{...state,index:state.index+1,position:0}:null;
 return state;
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
