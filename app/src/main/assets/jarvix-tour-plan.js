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
 ['Video Uniquifier','index.html',64,'#mode,#aspectRatio,#startBtn'],
 ['Pricing','pricing.html',62,'#plans'],
 ...['trial','basic','pro','business','lifetime'].map(key=>[key,'pricing.html',null,`.price-plan.price-${key}`]),
 ['Home','deepsyq.html',60,'#homeQuickBar']
 ];
 return rows.map(([title,url,id,target])=>({title,url,target,...(id?{audio:`media/jarvix/clips/jarvix_${lang}_${String(id).padStart(2,'0')}.mp3`}:{narration:'plan'})}));
}
export function planNarration(card,language='en') {
 const parts=[card.name,card.price,card.summary,...(card.features||[]).slice(0,3),card.note].filter(Boolean);
 return parts.join('. ').replace(/\s+/g,' ').slice(0,650);
}
export function tourAction(state,action) {
 if(!state)return null;
 if(action==='stop')return null;
 if(action==='pause')return {...state,phase:'paused'};
 if(action==='continue')return {...state,phase:'playing'};
 if(action==='ended'&&state.phase==='playing')return state.index+1<tourPlan(state.language).length?{...state,index:state.index+1,position:0}:null;
 return state;
}
