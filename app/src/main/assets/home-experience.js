// Deepsyq Home: owner-approved genuine-video carousel and local Quick Create.
// This is presentation-only and reuses the existing Inspiration feed and Studio handoff.
import {saveStudioHandoff} from './studio-handoff.js';
import {ownerHomeShowcase} from './owner-home-hero-headings.js';
const $=id=>typeof document !== 'undefined' ? document.getElementById(id) : null;
// WebKit can round a demuxed EOF up to the next millisecond.
const EOF_ROUNDING_SECONDS=.001;
const video=typeof document !== 'undefined' ? $('inspirationHeroVideo') : null;
const carousel=typeof document !== 'undefined' ? $('homeHeroCarousel') : null;
const neighborVideos=(typeof document !== 'undefined' ? [$('homeHeroPreviousVideo'),$('homeHeroNextVideo')] : []).filter(Boolean);
// At most one active film at a time. Adjacent films and inactive spotlight cards
// display the existing approved poster, never prefetch full MP4s.
const spotlightVideos=typeof document!=='undefined'?[...document.querySelectorAll('.home-spotlight-video[data-src]')]:[];
let spotlightPlaybackActive=false;
// Thin phone-side previews use their real poster frames. Keep the single
// main decoder available for smooth iOS playback, especially higher bitrate clips.
const compactPreview=typeof window !== 'undefined' ? window.matchMedia?.('(max-width: 760px)') : null;
let slides=[],index=0,visible=false,userPaused=false,observer=null,failedSlides=new Set();
let completionTimer=null,startupTimer=null,startupRecoveries=0,playbackSerial=0;
function resetCompletion(){clearTimeout(completionTimer);clearTimeout(startupTimer);completionTimer=null;startupTimer=null;startupRecoveries=0;playbackSerial++;}
function advanceCompletedSlide(){if(!ambientAllowed())return;if(slides.length>1)setSlide(index+1);else if(slides.length===1){resetCompletion();video.currentTime=0;ambientPlay();}}
function ambientAllowed(){return !document.hidden&&visible&&!userPaused&&!spotlightPlaybackActive&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&!navigator.connection?.saveData;}
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
function ensureSelectedVideoSource(){
 const selected=slides[index];
 if(!video||!selected?.previewUrl)return false;
 if(video.getAttribute('src')!==selected.previewUrl){video.src=selected.previewUrl;video.load();}
 return true;
}
function ambientPlay(){
 if(!ambientAllowed()||!ensureSelectedVideoSource())return;
 const serial=playbackSerial;
 void video.play().catch(error=>{if(serial!==playbackSerial||error.name==='AbortError')return;userPaused=true;pauseFilms();setPlayLabel();});
 recoverStartupClock();
}
compactPreview?.addEventListener?.('change',()=>{pauseFilms();ambientPlay();});
function updateNeighbors(){
 neighborVideos.forEach((v,side)=>{
  const direction=side===0?-1:1;
  let at=(index+direction+slides.length)%slides.length;
  for(let n=0;n<slides.length&&failedSlides.has(at);n++)at=(at+direction+slides.length)%slides.length;
  const item=slides[at];
  v.pause();
  // Never attach a movie URL to the neighboring frames. Reuse only the
  // separately approved still-frame poster until selected as the main film.
  if(v.hasAttribute('src')){v.removeAttribute('src');v.load();}
  v.parentElement.hidden=!item||at===index;
  if(item?.previewPosterUrl)v.poster=item.previewPosterUrl;
  else v.removeAttribute('poster');
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
 video.pause();
 // Keep offscreen or user-paused films poster-only until an actual play request.
 if(video.hasAttribute('src')){video.removeAttribute('src');video.load();}
 if(item.previewPosterUrl)video.poster=item.previewPosterUrl;else video.removeAttribute('poster');
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
// Spotlight cards retain their original WebP posters by default.
// Desktop with a precise mouse: play only while the pointer is OVER a visible card.
// Touch/coarse devices: play only while a card is visible during scrolling.
// Keep a single active MP4; do not change the owner-approved main carousel.
if(spotlightVideos.length&&'IntersectionObserver' in window){
 const desktopHover=window.matchMedia?.('(hover: hover) and (pointer: fine)');
 function syncSpotlightPlayback(){
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const allowed=!document.hidden&&!reduced&&!navigator.connection?.saveData;
  const visibleSpotlight=spotlightVideos.find(v=>v.__spotlightVisible);
  const active=allowed?(desktopHover?.matches
   ?spotlightVideos.find(v=>v.__spotlightVisible&&v.__spotlightHovered)
   :visibleSpotlight):null;
  const wasActive=spotlightPlaybackActive;
  spotlightPlaybackActive=!!active;
  if(active)pauseFilms();
  for(const v of spotlightVideos){
   if(v!==active){
    v.pause();
    if(v.hasAttribute('src')){v.removeAttribute('src');v.load();}
    continue;
   }
   if(v.getAttribute('src')!==v.dataset.src){v.src=v.dataset.src;v.load();}
   if(v.paused)void v.play().catch(()=>{v.pause();});
  }
  if(wasActive&&!active)ambientPlay();
 }
 const spotlightObserver=new IntersectionObserver(entries=>{
  for(const e of entries){
   const v=e.target.querySelector('.home-spotlight-video[data-src]');
   if(v)v.__spotlightVisible=e.isIntersecting&&e.intersectionRatio>=.6;
  }
  syncSpotlightPlayback();
 },{threshold:[0,.6,1]});
 for(const v of spotlightVideos){
  const card=v.closest('.home-feature-spotlight');
  card.addEventListener('pointerenter',()=>{v.__spotlightHovered=true;syncSpotlightPlayback();});
  card.addEventListener('pointerleave',()=>{v.__spotlightHovered=false;syncSpotlightPlayback();});
  spotlightObserver.observe(card);
 }
 desktopHover?.addEventListener?.('change',syncSpotlightPlayback);
 document.addEventListener('visibilitychange',syncSpotlightPlayback);
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
  else if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&!document.hidden&&visible&&ensureSelectedVideoSource())void video.play().catch(()=>{userPaused=true;setPlayLabel();});
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

export function detectIntent(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/(?:ai[\s-]?агент|агент|эйай[\s-]?агент|ассистент|сценари|кампани|ai[\s-]?agent|agent|workflow|assistant)/i.test(t)) {
    return 'agent';
  }
  if (/(?:видео|ролик|анимац|клип|фильм|сними|оживи|кинематограф|video|movie|animation|clip|motion|animate|cinematic)/i.test(t)) {
    return 'video';
  }
  if (/(?:аудио|музык|песн|трек|звук|мелоди|озвуч|бит|голос|саунд|audio|music|song|track|sound|melody|beat|voiceover)/i.test(t)) {
    return 'music';
  }
  if (/(?:изображен|картинк|фот|нарисуй|портрет|арт|рисунок|иллюстрац|пейзаж|image|picture|photo|photograph|draw|paint|illustration|portrait|wallpaper)/i.test(t)) {
    return 'image';
  }
  return null;
}

export function initHomeVoiceInput(chooseFn) {
  const voiceBtn = $('homeQuickVoiceBtn');
  const waves = $('homeVoiceWaves');
  const promptEl = $('homeQuickPrompt');
  const micDialog = $('micPermissionDialog');
  const grantMicBtn = $('grantMicBtn');
  if (!voiceBtn || !promptEl) return;

  const SpeechRec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  let recognition = null;
  let shouldBeListening = false;
  let isListening = false;
  let baseText = '';

  document.querySelectorAll('[data-close]').forEach(b => {
    b.addEventListener('click', () => {
      const d = $(b.dataset.close);
      if (d && typeof d.close === 'function') d.close();
    });
  });

  if (micDialog) {
    micDialog.addEventListener('click', e => {
      if (e.target === micDialog) micDialog.close();
    });
  }

  function stopListening() {
    shouldBeListening = false;
    isListening = false;
    if (recognition) {
      try {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.stop();
      } catch (_) {}
      recognition = null;
    }
    voiceBtn.classList.remove('is-listening');
    if (waves) waves.hidden = true;
    voiceBtn.title = 'Голосовой ввод (нажмите, чтобы говорить)';
  }

  function launchInstance() {
    if (!shouldBeListening) return;
    try {
      if (recognition) {
        try {
          recognition.onend = null;
          recognition.onerror = null;
          recognition.stop();
        } catch (_) {}
      }
      recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = (typeof document !== 'undefined' && (document.documentElement.lang === 'ru' || navigator.language?.startsWith('ru'))) ? 'ru-RU' : 'en-US';

      recognition.onstart = () => {
        isListening = true;
        voiceBtn.classList.add('is-listening');
        if (waves) waves.hidden = false;
        voiceBtn.title = 'Слушаю… Нажмите Enter для отправки или кликните для остановки';
        if ($('homeQuickStatus')) {
          $('homeQuickStatus').classList.add('is-visible');
          $('homeQuickStatus').textContent = '🎙 Микрофон включён и слушает постоянно. Говорите свободно, для завершения нажмите Enter или «Отослать».';
        }
      };

      recognition.onresult = (e) => {
        let currentTranscript = '';
        for (let i = 0; i < e.results.length; ++i) {
          currentTranscript += e.results[i][0].transcript;
        }
        const fullText = (baseText + currentTranscript).trim();
        promptEl.value = fullText;
        promptEl.dispatchEvent(new Event('input', { bubbles: true }));

        const detected = detectIntent(fullText);
        if (detected && typeof chooseFn === 'function') {
          chooseFn(detected);
        }
      };

      recognition.onerror = (e) => {
        console.warn('[HomeVoice] Speech error:', e?.error);
        if (e?.error === 'not-allowed') {
          localStorage.removeItem('deepsyq_mic_permitted');
          stopListening();
          if (micDialog && typeof micDialog.showModal === 'function') {
            micDialog.showModal();
          } else {
            alert('Доступ к микрофону заблокирован. Разрешите микрофон в настройках браузера (значок замка в адресной строке).');
          }
          return;
        }
        // Silence timeouts or network hiccups: keep listening if shouldBeListening
      };

      recognition.onend = () => {
        // If silence stopped the session but user has not pressed Enter / toggled off, keep listening!
        if (shouldBeListening) {
          baseText = promptEl.value.trim();
          if (baseText.length > 0) baseText += ' ';
          setTimeout(() => {
            if (shouldBeListening) launchInstance();
          }, 150);
        } else {
          stopListening();
        }
      };

      recognition.start();
    } catch (err) {
      console.warn('[HomeVoice] Failed to start:', err);
      if (shouldBeListening) {
        setTimeout(() => {
          if (shouldBeListening) launchInstance();
        }, 400);
      } else {
        stopListening();
      }
    }
  }

  function startRecognition() {
    if (!SpeechRec) {
      const msg = 'Распознавание речи не поддерживается в этом браузере. Рекомендуем Google Chrome, Edge или Safari.';
      if ($('homeQuickStatus')) {
        $('homeQuickStatus').classList.add('is-visible');
        $('homeQuickStatus').textContent = msg;
      }
      alert(msg);
      return;
    }
    shouldBeListening = true;
    baseText = promptEl.value.trim();
    if (baseText.length > 0) baseText += ' ';
    launchInstance();
  }

  function requestMicPermissionAndStart() {
    if (!navigator.mediaDevices?.getUserMedia) {
      startRecognition();
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(t => t.stop());
        localStorage.setItem('deepsyq_mic_permitted', 'true');
        if (micDialog && micDialog.open) micDialog.close();
        startRecognition();
      })
      .catch(err => {
        console.warn('[HomeVoice] getUserMedia error:', err);
        if (micDialog && !micDialog.open) {
          micDialog.showModal();
        } else {
          alert('Для голосового ввода нужен доступ к микрофону. Пожалуйста, разрешите доступ в настройках браузера.');
        }
        stopListening();
      });
  }

  if (grantMicBtn) {
    grantMicBtn.onclick = () => {
      requestMicPermissionAndStart();
    };
  }

  voiceBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (shouldBeListening || isListening) {
      stopListening();
      if ($('homeQuickStatus')) {
        $('homeQuickStatus').textContent = 'Голосовой ввод остановлен.';
      }
    } else {
      if (navigator.mediaDevices?.getUserMedia && localStorage.getItem('deepsyq_mic_permitted') !== 'true') {
        requestMicPermissionAndStart();
      } else {
        startRecognition();
      }
    }
  });

  // Stop listening when user presses Enter in prompt
  promptEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      stopListening();
    }
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', stopListening);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') stopListening();
    });
  }
}

const ideas={
 short:{kind:'video',prompt:'Create an original short cinematic scene with clear visual storytelling, gentle camera motion and atmospheric lighting.'},
 image:{kind:'image',prompt:'Create an original high-quality editorial photograph with expressive styling and realistic lighting.'},
 music:{kind:'music',prompt:'Create an original cinematic music track with a clear rhythm, uplifting atmosphere and carefully layered instruments.'}
};
const modeToStudio={image:'image',video:'video',music:'audio',agent:'agent'};
let chosen='image',busy=false;

export function choose(kind){
 if(!['image','video','music','agent'].includes(kind))return;
 chosen=kind;
 if($('homeQuickPrompt')) $('homeQuickPrompt').required=kind!=='agent';
 for(const b of document.querySelectorAll('[data-home-kind]')){
   const isMatch = b.dataset.homeKind===kind;
   b.setAttribute('aria-current', isMatch ? 'true' : 'false');
   b.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
 }
 const isAgent = kind === 'agent';
 if($('homeQuickSubmitLabel')) $('homeQuickSubmitLabel').textContent = isAgent ? 'Open AI Agents ↗' : 'Open in Studio ↗';
 if($('homeQuickSubmit')) $('homeQuickSubmit').setAttribute('aria-label', isAgent ? 'Open AI Agents' : 'Open in Studio');
}

if($('homeQuickForm')){
 const draftOwner=localStorage.getItem('vv_token')||'guest';
 function guardHomeDraft(){
  if((localStorage.getItem('vv_token')||'guest')===draftOwner)return true;
  $('homeQuickPrompt').value='';busy=false;$('homeQuickSubmit').disabled=false;
  $('homeQuickStatus').classList.add('is-visible');
  $('homeQuickStatus').textContent='Account changed. Reload to start a private draft for this account.';
  return false;
 }
 window.addEventListener('storage',event=>{if(event.key==='vv_token'||event.key===null)guardHomeDraft();});
 for(const type of ['pointerdown','keydown','focusin'])document.addEventListener(type,guardHomeDraft,true);
 window.addEventListener('focus',guardHomeDraft);
 document.addEventListener('visibilitychange',guardHomeDraft);
 window.addEventListener('pageshow',()=>{guardHomeDraft();busy=false;$('homeQuickSubmit').disabled=false;});
 const preferredRatio='';

 // Initialize voice input and bind to button immediately
 initHomeVoiceInput(choose);

 // Auto-detect intent on typing
 $('homeQuickPrompt')?.addEventListener('input', () => {
   const val = $('homeQuickPrompt').value;
   const detected = detectIntent(val);
   if (detected) choose(detected);
 });

 // Enter key submits
 $('homeQuickPrompt')?.addEventListener('keydown', e => {
   if (e.key === 'Enter' && !e.shiftKey) {
     e.preventDefault();
     if ($('homeQuickForm').requestSubmit) $('homeQuickForm').requestSubmit();
     else $('homeQuickSubmit').click();
   }
 });

 document.querySelectorAll('[data-home-kind]').forEach(link=>link.addEventListener('click',async event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  if(!guardHomeDraft()){event.preventDefault();return;}
  const kind=link.dataset.homeKind;
  choose(kind);
  const prompt=$('homeQuickPrompt').value.trim();
  if(kind==='agent'){
   event.preventDefault();
   location.assign(prompt ? 'ai-agents.html?topic=' + encodeURIComponent(prompt) : 'ai-agents.html');
   return;
  }
  if(!prompt)return;
  event.preventDefault();
  if(busy)return;
  busy=true;
  try{
   await saveStudioHandoff({kind,prompt,settings:{},source:'home-quick-create'});
   if(!guardHomeDraft())return;
   location.assign(link.href);
  }catch(_){
   if(!guardHomeDraft())return;
   busy=false;
   $('homeQuickStatus').classList.add('is-visible');
   $('homeQuickStatus').textContent='Could not prepare the draft in this browser. Your text remains here; please try again.';
  }
 }));

 document.querySelectorAll('[data-home-idea]').forEach(b=>b.addEventListener('click',()=>{
  if(!guardHomeDraft())return;
  const idea=ideas[b.dataset.homeIdea];if(!idea)return;
  const prompt=$('homeQuickPrompt');
  if(prompt.value.trim()&&prompt.value.trim()!==idea.prompt&&!confirm('Replace the current description?'))return;
  choose(idea.kind);prompt.value=idea.prompt;prompt.focus();
  $('homeQuickStatus').textContent='Editable idea prepared. Nothing generated or charged.';
 }));

 $('homeQuickForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!guardHomeDraft()||busy)return;
  const prompt=$('homeQuickPrompt').value.trim(),status=$('homeQuickStatus'),button=$('homeQuickSubmit');
  status.classList.add('is-visible');

  // Detect intent from spoken or typed text
  const detected = detectIntent(prompt);
  const targetKind = detected || chosen;

  if(targetKind==='agent'){
    busy=true;button.disabled=true;status.textContent='Opening AI Agents workspace…';
    const targetUrl = prompt ? 'ai-agents.html?topic=' + encodeURIComponent(prompt) : 'ai-agents.html';
    location.assign(targetUrl);
    return;
  }

  if(!prompt||prompt.length>2000){status.textContent='Enter a description of up to 2,000 characters.';return;}
  const studio=modeToStudio[targetKind]||'image';
  busy=true;button.disabled=true;status.textContent='Preparing your Studio draft locally…';
  try{
    await saveStudioHandoff({kind:targetKind,prompt,settings:preferredRatio?{ratio:preferredRatio}:{},source:'home-quick-create'});
    if(!guardHomeDraft())return;
    location.assign('generate-studio.html?studio='+studio+'&from=home');
  }catch(_){
    if(!guardHomeDraft())return;
    status.textContent='Could not prepare the draft in this browser. Your text remains here; please try again.';
    busy=false;
    button.disabled=false;
  }
 });
}
