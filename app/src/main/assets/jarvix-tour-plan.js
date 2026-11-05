// Read-only tour. Audio is the owner's existing four-language voice catalogue.
export const TOUR_KEY='deepsyq_guided_tour_v3';
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
 ['Home','deepsyq.html',60,'#homeQuickBar']
 ];
 return rows.map(([title,url,id,target])=>({title,url,target,audio:`media/jarvix/clips/jarvix_${lang}_${String(id).padStart(2,'0')}.mp3`}));
}
export function tourAction(state,action) {
 if(!state)return null;
 if(action==='stop')return null;
 if(action==='pause')return {...state,phase:'paused'};
 if(action==='continue')return {...state,phase:'playing'};
 if(action==='ended'&&state.phase==='playing')return state.index+1<8?{...state,index:state.index+1,position:0}:null;
 return state;
}
