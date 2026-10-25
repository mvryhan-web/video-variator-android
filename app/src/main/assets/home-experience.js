// Deepsyq Home: owner-approved genuine-video carousel and local Quick Create.
// This is presentation-only and reuses the existing Inspiration feed and Studio handoff.
import {saveStudioHandoff} from './studio-handoff.js';
import {ownerHomeShowcase} from './owner-home-hero-headings.js';
const $=id=>document.getElementById(id);
// WebKit can round a demuxed EOF up to the next millisecond.
const EOF_ROUNDING_SECONDS=.001;
const video=$('inspirationHeroVideo');
const carousel=$('homeHeroCarousel');
const neighborVideos=[$('homeHeroPreviousVideo'),$('homeHeroNextVideo')].filter(Boolean);
// Thin phone-side previews use their real poster frames. Keep the single
// main decoder available for smooth iOS playback, especially higher bitrate clips.
const compactPreview=window.matchMedia?.('(max-width: 760px)');
let slides=[],index=0,visible=false,userPaused=false,observer=null,failedSlides=new Set();
let completionTimer=null,startupTimer=null,startupRecoveries=0,playbackSerial=0;
function resetCompletion(){clearTimeout(completionTimer);clearTimeout(startupTimer);completionTimer=null;startupTimer=null;startupRecoveries=0;playbackSerial++;}
function advanceCompletedSlide(){if(!ambientAllowed())return;if(slides.length>1)setSlide(index+1);else if(slides.length===1){resetCompletion();video.currentTime=0;ambientPlay();}}
function ambientAllowed(){return !document.hidden&&visible&&!userPaused&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&!navigator.connection?.saveData;}
function pauseFilms(){clearTimeout(startupTimer);startupTimer=null;video?.pause();neighborVideos.forEach(v=>v.pause());}
function recoverStartupClock(){
 if(startupTimer||!ambientAllowed()||!video?.getAttribute('src')||video.currentTime>=.1)return;
 const serial=playbackSerial;
 startupTimer=setTimeout(()=>{
  startupTimer=null;
  if(serial!==playbackSerial||!ambientAllowed()||video.ended||video.currentTime>=.1)return;
  if(video.readyState<2){recoverStartupClock();return;}
  // Real iOS WebKit evidence: loaded/playing, readyState4, paused=false,
  // but clock remains at ~0.003s. Toggle pause/play at the SAME position.
  // Never seek, skip a film, reset a running clip, or override a user pause.
  if(startupRecoveries>=2){userPaused=true;pauseFilms();setPlayLabel();return;}
  startupRecoveries++;video.pause();
  void video.play().catch(error=>{if(serial!==playbackSerial||error.name==='AbortError')return;userPaused=true;pauseFilms();setPlayLabel();});
  recoverStartupClock();
 },1800);
}
function ambientPlay(){
 if(!video?.getAttribute('src')||!ambientAllowed())return;
 const serial=playbackSerial;
 void video.play().catch(error=>{if(serial!==playbackSerial||error.name==='AbortError')return;userPaused=true;pauseFilms();setPlayLabel();});
 neighborVideos.forEach(v=>{if(compactPreview?.matches)v.pause();else if(v.getAttribute('src'))void v.play().catch(()=>{});});
 recoverStartupClock();
}
compactPreview?.addEventListener?.('change',()=>{pauseFilms();ambientPlay();});
function updateNeighbors(){
 neighborVideos.forEach((v,side)=>{
  const direction=side===0?-1:1;
  let at=(index+direction+slides.length)%slides.length;
  for(let n=0;n<slides.length&&failedSlides.has(at);n++)at=(at+direction+slides.length)%slides.length;
  const item=slides[at];
  v.parentElement.hidden=!item||at===index;
  if(!item||at===index){v.pause();v.removeAttribute('src');v.load();return;}
  if(v.getAttribute('src')!==item.previewUrl){v.pause();v.src=item.previewUrl;if(item.previewPosterUrl)v.poster=item.previewPosterUrl;else v.removeAttribute('poster');v.muted=true;v.load();}
 });
}
function renderCredit(item){
 const showcase=ownerHomeShowcase(item);
 const model=String(item?.defaultSettings?.creationModel||'').trim();
 const provider=String(item?.defaultSettings?.creationProvider||'').trim();
 $('homeHeroCreditLabel').textContent=showcase?.title?String(showcase.label||'EXPLORE'):model?'CREATED WITH':provider?'CREATED IN':'';
 $('homeHeroModel').textContent=String(showcase?.title||model||provider);
 $('homeHeroModel').title=showcase?.title?String(showcase.note||'Feature showcase, not generation attribution.'):'';
}
function setPlayLabel(){carousel?.classList.toggle('needs-play',userPaused);const b=$('homeHeroPlay');if(!b)return;b.textContent=userPaused?'Play video':'Pause video';b.setAttribute('aria-label',userPaused?'Play video':'Pause video');}
function showHeroFallback(){
 resetCompletion();
 // Owner-approved Home keeps the real gallery region visible even when no
 // rights-cleared video can play. Do not invent a clip, thumbnail or Play UI.
 pauseFilms();video.removeAttribute('src');video.removeAttribute('poster');video.load();
 neighborVideos.forEach(v=>{v.removeAttribute('src');v.load();v.parentElement.hidden=true;});renderCredit(null);
 carousel.hidden=false;carousel.classList.add('is-empty');$('inspirationHeroFeature').hidden=true;
 observer?.disconnect();observer=null;visible=false;userPaused=true;
 $('homeHeroPrevious').disabled=true;$('homeHeroNext').disabled=true;
 $('homeHeroPlay').disabled=true;
 $('homeHeroEmpty').hidden=false;
 $('homeHeroStatus').textContent='No approved playable featured video is available. The original Home gallery remains visible.';
}
function syncSlideControls(){
 // A broken source is not a navigable slide. One remaining usable
 // item must not show active previous/next buttons that go nowhere.
 const canNavigate=slides.length-failedSlides.size>1;
 $('homeHeroPrevious').disabled=!canNavigate;
 $('homeHeroNext').disabled=!canNavigate;

}
function setSlide(next,direction=1){
 if(!slides.length||!video||failedSlides.size===slides.length)return;
 let selected=((next%slides.length)+slides.length)%slides.length;
 for(let n=0;n<slides.length&&failedSlides.has(selected);n++)selected=(selected+direction+slides.length)%slides.length;
 resetCompletion();index=selected;
 const item=slides[index];
 const link='deepsyq.html#inspirationPreview';
 video.pause();video.src=item.previewUrl;
 if(item.previewPosterUrl)video.poster=item.previewPosterUrl;else video.removeAttribute('poster');
 video.load();
 const showcase=ownerHomeShowcase(item);
 const destinations=['canvas.html','#agentFeature','generate-studio.html?studio=video','generate-studio.html?studio=image','generate-studio.html?studio=audio'];
 const destination=showcase?.href==='#quickCreateForm'||showcase?.href==='#canvasFeature'?'canvas.html':showcase?.href;
 $('inspirationHeroFeature').href=destinations.includes(destination)?destination:link;
 $('inspirationHeroFeature').setAttribute('aria-label',showcase?.title?'Explore '+String(showcase.title):'Explore featured Inspiration video');
 renderCredit(item);updateNeighbors();
 carousel.setAttribute('aria-label','Featured Deepsyq creative gallery, video '+(index+1)+' of '+slides.length);
 $('homeHeroStatus').textContent='Featured video '+(index+1)+' of '+slides.length+': '+(item.title||'Original video');
 ambientPlay();
}
export function renderHomeCarousel(items){
 if(!carousel||!video||!Array.isArray(items))return;
 slides=items.filter(x=>x.kind==='video'&&x.actionTarget==='studio'&&typeof x.previewUrl==='string'&&x.previewUrl.trim()).slice(0,6);
 userPaused=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||!!navigator.connection?.saveData;index=0;failedSlides=new Set();video.pause();video.muted=true;observer?.disconnect();observer=null;
 if(!slides.length){showHeroFallback();return;}
 video.loop=false;
 carousel.hidden=false;carousel.classList.remove('is-empty');$('inspirationHeroFeature').hidden=false;
 $('homeHeroEmpty').hidden=true;
 $('homeHeroPlay').disabled=false;
 setPlayLabel();
 syncSlideControls();
 visible=!('IntersectionObserver'in window);
 if('IntersectionObserver'in window){observer=new IntersectionObserver(entries=>{for(const e of entries){visible=e.isIntersecting;if(visible)ambientPlay();else pauseFilms();}},{threshold:.25});observer.observe(carousel);}
 setSlide(0);
}
if(video&&carousel){
 carousel.addEventListener('keydown',e=>{
  if(e.target!==carousel)return;
  if(e.key==='ArrowLeft'){e.preventDefault();setSlide(index-1,-1);}
  else if(e.key==='ArrowRight'){e.preventDefault();setSlide(index+1,1);}
  else if(e.key===' '){e.preventDefault();$('homeHeroPlay').click();}
 });
 let touchStart=null;
 carousel.addEventListener('touchstart',e=>{const t=e.changedTouches[0];touchStart={x:t.clientX,y:t.clientY};},{passive:true});
 carousel.addEventListener('touchend',e=>{if(!touchStart)return;const t=e.changedTouches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)setSlide(index+(dx<0?1:-1),dx<0?1:-1);},{passive:true});
 $('homeHeroPrevious')?.addEventListener('click',()=>setSlide(index-1,-1));
 $('homeHeroNext')?.addEventListener('click',()=>setSlide(index+1,1));
 $('homeHeroPlay')?.addEventListener('click',()=>{
  userPaused=!userPaused;setPlayLabel();
  if(userPaused)pauseFilms();
  else if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&!document.hidden&&visible)void video.play().catch(()=>{userPaused=true;setPlayLabel();});
  else ambientPlay();
 });
 video.addEventListener('ended',advanceCompletedSlide);
 video.addEventListener('timeupdate',()=>{
  // Real WebKit: fully played 7.958333s MP4 reports duration7.959s,
  // paused=false and ended=false. Bound recovery to <1ms demuxer rounding,
  // never a missing frame, buffering stall or user pause. Give the
  // native ended task first chance; a source change invalidates this timer.
  const remaining=video.duration-video.currentTime;
  if(completionTimer!==null||!ambientAllowed()||video.paused||video.ended||video.readyState<2||!Number.isFinite(remaining)||remaining<=0||remaining>EOF_ROUNDING_SECONDS)return;
  const serial=playbackSerial;
  completionTimer=setTimeout(()=>{
   completionTimer=null;
   const left=video.duration-video.currentTime;
   if(serial===playbackSerial&&!video.paused&&!video.ended&&Number.isFinite(left)&&left>=0&&left<=EOF_ROUNDING_SECONDS)advanceCompletedSlide();
  },50);
 });
 video.addEventListener('loadeddata',ambientPlay);
 video.addEventListener('error',()=>{
  if(!slides.length||!video.getAttribute('src'))return;
  failedSlides.add(index);
  if(failedSlides.size>=slides.length){showHeroFallback();return;}
  syncSlideControls();
  $('homeHeroStatus').textContent='This video is unavailable. Showing the next available creation.';
  setSlide(index+1);
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseFilms();else ambientPlay();});
}
// Quick Create is not a new generator. It opens the existing Studio with a local, unpaid draft.
const ideas={
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
 for(const b of document.querySelectorAll('[data-home-kind]'))b.setAttribute('aria-current',b.dataset.homeKind===kind?'true':'false');
 $('homeQuickSubmitLabel').textContent=kind==='agent'?'See Agent preview ↗':'Open in Studio ↗';
 $('homeQuickSubmit').setAttribute('aria-label',kind==='agent'?'See Agent preview':'Open in Studio');
}
if($('homeQuickForm')){
 window.addEventListener('pageshow',()=>{busy=false;$('homeQuickSubmit').disabled=false;});
 const preferredRatio='';
 document.querySelectorAll('[data-home-kind]').forEach(link=>link.addEventListener('click',async event=>{
  // Real links still work without JavaScript and with modifier/new-tab clicks.
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const kind=link.dataset.homeKind;
  choose(kind);
  if(kind==='agent'){
   $('homeQuickStatus').classList.add('is-visible');
   $('homeQuickStatus').textContent='AI Agent execution is not available yet. Explore the preview below.';
   return;
  }
  const prompt=$('homeQuickPrompt').value.trim();
  if(!prompt)return;
  event.preventDefault();
  if(busy)return;
  busy=true;
  try{
   await saveStudioHandoff({kind,prompt,settings:{},source:'home-quick-create'});
   location.assign(link.href);
  }catch(_){
   busy=false;
   $('homeQuickStatus').classList.add('is-visible');
   $('homeQuickStatus').textContent='Could not prepare the draft in this browser. Your text remains here; please try again.';
  }
 }));
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
  status.classList.add('is-visible');
  if(chosen==='agent'){status.textContent='AI Agent execution is not available yet. Explore the preview below.';$('agentFeature').scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(!prompt||prompt.length>2000){status.textContent='Enter a description of up to 2,000 characters.';return;}
  const studio=modeToStudio[chosen];if(!studio){status.textContent='Choose Image, Video or Audio.';return;}
  busy=true;button.disabled=true;status.textContent='Preparing your existing Studio draft locally…';
  try{await saveStudioHandoff({kind:chosen,prompt,settings:preferredRatio?{ratio:preferredRatio}:{},source:'home-quick-create'});location.assign('generate-studio.html?studio='+studio+'&from=home');}
  catch(_){status.textContent='Could not prepare the draft in this browser. Your text remains here; please try again.';busy=false;button.disabled=false;}
 });
}
