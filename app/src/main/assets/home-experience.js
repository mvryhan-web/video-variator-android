// Deepsyq Home: owner-approved genuine-video carousel and local Quick Create.
// This is presentation-only and reuses the existing Inspiration feed and Studio handoff.
import {saveStudioHandoff} from './studio-handoff.js';
const $=id=>document.getElementById(id);
const video=$('inspirationHeroVideo');
const carousel=$('homeHeroCarousel');
let slides=[],index=0,visible=false,userPaused=false,observer=null;
function ambientAllowed(){return !document.hidden&&visible&&!userPaused&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&!navigator.connection?.saveData;}
function ambientPlay(){if(!video?.getAttribute('src')||!ambientAllowed())return;void video.play().catch(()=>{});}
function setSlide(next){
 if(!slides.length||!video)return;
 index=(next+slides.length)%slides.length;
 const item=slides[index];
 const link='inspiration.html?kind=video&category='+encodeURIComponent(item.category||'')+'&ratio='+encodeURIComponent(item.aspectRatio||'')+'&q='+encodeURIComponent(item.title||'');
 video.pause();video.src=item.previewUrl;
 if(item.previewPosterUrl)video.poster=item.previewPosterUrl;else video.removeAttribute('poster');
 video.load();
 $('inspirationHeroTitle').textContent=item.title||'Original video';
 $('inspirationHeroFeature').href=link;
 $('homeHeroSlideLink').href=link;
 $('homeHeroSlideTitle').textContent=item.title||'Original video';
 $('homeHeroCounter').textContent='Video '+(index+1)+' of '+slides.length;
 $('homeHeroStatus').textContent='Featured video '+(index+1)+' of '+slides.length+': '+(item.title||'Original video');
 for(const dot of $('homeHeroDots').querySelectorAll('button'))dot.setAttribute('aria-current',String(Number(dot.dataset.index)===index));
 ambientPlay();
}
export function renderHomeCarousel(items){
 if(!carousel||!video||!Array.isArray(items))return;
 slides=items.filter(x=>x.kind==='video'&&x.actionTarget==='studio'&&typeof x.previewUrl==='string'&&x.previewUrl.trim()).slice(0,8);
 userPaused=false;index=0;video.pause();observer?.disconnect();observer=null;
 if(!slides.length){
  video.removeAttribute('src');video.removeAttribute('poster');video.load();carousel.hidden=true;$('inspirationHeroFeature').hidden=true;
  $('homeHeroDots').replaceChildren();return;
 }
 video.loop=false;
 carousel.hidden=false;$('inspirationHeroFeature').hidden=false;
 $('homeHeroPrevious').disabled=slides.length<2;$('homeHeroNext').disabled=slides.length<2;
 $('homeHeroPlay').textContent='Pause';$('homeHeroPlay').setAttribute('aria-label','Pause video');
 $('homeHeroDots').replaceChildren();
 slides.forEach((x,i)=>{const b=document.createElement('button');b.type='button';b.dataset.index=String(i);b.setAttribute('aria-label','Show video '+(i+1)+': '+(x.title||'Original video'));b.addEventListener('click',()=>setSlide(i));$('homeHeroDots').append(b);});
 visible=!('IntersectionObserver'in window);
 if('IntersectionObserver'in window){observer=new IntersectionObserver(entries=>{for(const e of entries){visible=e.isIntersecting;if(visible)ambientPlay();else video.pause();}},{threshold:.25});observer.observe(carousel);}
 setSlide(0);
}
if(video&&carousel){
 $('homeHeroPrevious')?.addEventListener('click',()=>setSlide(index-1));
 $('homeHeroNext')?.addEventListener('click',()=>setSlide(index+1));
 $('homeHeroPlay')?.addEventListener('click',()=>{
  userPaused=!userPaused;const b=$('homeHeroPlay');b.textContent=userPaused?'Play':'Pause';b.setAttribute('aria-label',userPaused?'Play video':'Pause video');
  if(userPaused)video.pause();else if(!document.hidden&&visible)void video.play().catch(()=>{$('homeHeroStatus').textContent='Video playback unavailable.';});
 });
 video.addEventListener('ended',()=>{if(!ambientAllowed())return;if(slides.length>1)setSlide(index+1);else if(slides.length===1){video.currentTime=0;ambientPlay();}});
 video.addEventListener('loadeddata',ambientPlay);
 video.addEventListener('error',()=>{$('homeHeroStatus').textContent='Video unavailable. Choose another example.';});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else ambientPlay();});
}
// Quick Create is not a new generator. It opens the existing Studio with a local, unpaid draft.
const ideas={
 product:{kind:'video',prompt:'Create a cinematic product video advertisement with natural camera motion, an appealing opening frame and accurate product shape.'},
 short:{kind:'video',prompt:'Create an original short cinematic scene with clear visual storytelling, gentle camera motion and atmospheric lighting.'},
 image:{kind:'image',prompt:'Create an original high-quality editorial photograph with expressive styling and realistic lighting.'},
 music:{kind:'music',prompt:'Create an original cinematic music track with a clear rhythm, uplifting atmosphere and carefully layered instruments.'}
};
const modeToStudio={image:'image',video:'video',music:'audio'};
let chosen='image',busy=false;
function choose(kind){
 if(!['image','video','music','agent'].includes(kind))return;
 chosen=kind;
 $('homeQuickPrompt').required=kind!=='agent';
 for(const b of document.querySelectorAll('[data-home-kind]'))b.setAttribute('aria-pressed',String(b.dataset.homeKind===kind));
 $('homeQuickSubmit').textContent=kind==='agent'?'See Agent preview ↗':'Open in Studio ↗';
}
if($('homeQuickForm')){
 document.querySelectorAll('[data-home-kind]').forEach(b=>b.addEventListener('click',()=>{choose(b.dataset.homeKind);if(chosen==='agent')$('homeQuickStatus').textContent='Agent execution is coming soon. Explore the preview below.';}));
 document.querySelectorAll('[data-home-idea]').forEach(b=>b.addEventListener('click',()=>{
  const idea=ideas[b.dataset.homeIdea];if(!idea)return;
  const prompt=$('homeQuickPrompt');
  if(prompt.value.trim()&&prompt.value.trim()!==idea.prompt&&!confirm('Replace the current description?'))return;
  choose(idea.kind);prompt.value=idea.prompt;prompt.focus();
  $('homeQuickStatus').textContent='Editable idea prepared. Nothing generated or charged.';
 }));
 $('homeQuickForm').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  const prompt=$('homeQuickPrompt').value.trim(),status=$('homeQuickStatus'),button=$('homeQuickSubmit');
  if(chosen==='agent'){status.textContent='AI Agent execution is not available yet. Explore the preview below.';$('agentFeature').scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(!prompt||prompt.length>2000){status.textContent='Enter a description of up to 2,000 characters.';return;}
  const studio=modeToStudio[chosen];if(!studio){status.textContent='Choose Image, Video or Audio.';return;}
  busy=true;button.disabled=true;status.textContent='Preparing your existing Studio draft locally…';
  try{await saveStudioHandoff({kind:chosen,prompt,source:'home-quick-create'});location.assign('generate-studio.html?studio='+studio+'&from=home');}
  catch(_){status.textContent='Could not prepare the draft in this browser. Your text remains here; please try again.';busy=false;button.disabled=false;}
 });
}
