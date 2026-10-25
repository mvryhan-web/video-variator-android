/* Owner screenshot-faithful Video Uniquifier presentation, DEV 2026-10-25.
 * Presentation only: preserves all original media-processing, consent, credit,
 * account and history handlers. No network requests or video uploads. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const R={
 hero:[525,66,340,232],preview:[805,372,610,268],
 film1:[865,74,147,183],film2:[1030,89,169,170],film3:[1213,96,210,169],
 gentle:[218,557,180,67],balance:[401,557,176,67],dynamic:[589,557,169,67],
 uploadstep:[219,967,120,87],settingsstep:[585,968,111,86],savestep:[957,968,114,86],
 uploader:[469,398,45,54],promo:[125,881,60,160],
 queue1:[806,769,48,40],queue2:[806,811,48,40]};
const file='media/approved-design-20261023/20_Video_Uniquifier.png';
// The approved screenshot is the original artwork reference; crops are purely
// decorative and do not alter or spoof user-generated media or download state.

function image(key,extra=''){
 const [x,y,w,h]=R[key],esc=key.replace(/[^a-z0-9]/gi,'');
 const el=document.createElement('span');el.className='vu-art vu-art-'+esc+(extra?' '+extra:'');
 el.setAttribute('aria-hidden','true');
 const img=document.createElement('img');img.src=file;img.alt='';img.loading=(key==='hero'?'eager':'lazy');img.decoding='async';
 Object.assign(img.style,{position:'absolute',maxWidth:'none',width:(1447/w*100)+'%',height:(1087/h*100)+'%',
 left:(-x/w*100)+'%',top:(-y/h*100)+'%',pointerEvents:'none'});
 el.append(img);return el;
}
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el}
function makeNav(shell){
 const bar=node('header','vu-appbar');
 const logo=node('a','vu-logo');logo.href='deepsyq.html';logo.setAttribute('aria-label','Deepsyq Home');
 logo.innerHTML='<span class="vu-brandmark">✦</span><strong>Deepsyq</strong>';
 const menu=node('button','vu-nav-toggle','☷');menu.type='button';menu.setAttribute('aria-label','Toggle navigation');
 const search=node('form','vu-search');
 search.innerHTML='<span aria-hidden="true">⌕</span><input type="search" aria-label="Search Deepsyq pages" placeholder="Search anything..." autocomplete="off"><kbd>⌘ K</kbd>';
 const tools=node('div','vu-top-tools');
 tools.innerHTML='<a href="index.html?view=faq">ⓘ &nbsp;Help</a><span>◎ &nbsp;English</span><span class="vu-promo-pill">♔ &nbsp;Promo Code</span><span>♧ &nbsp;Invite Friend</span><span>◉ &nbsp;Credits</span><a href="index.html?view=plans">♛ &nbsp;Pricing</a>';
 const user=node('div','vu-top-user');
 const sign=$('signInBtn');if(sign)user.append(sign);
 bar.append(logo,menu,search,tools,user);shell.prepend(bar);
 const side=shell.querySelector('.sidebar');if(!side)return;
 const nav=node('div','vu-side-nav');
 const sections=[
  ['','Home',[['⌂','Home','deepsyq.html']]],
  ['Creation','', [['▧','Image','generate-studio.html?studio=image'],['▶','Video','index.html'],['✧','Agent','ai-agents.html'],['≋','Audio','audio-studio.html']]],
  ['Tools','', [['⊞','AI Apps','ai-apps.html'],['◩','Canvas','canvas.html'],['⌗','All Tools','free-tools.html']]],
  ['Library','', [['▢','Assets','generate-studio.html?view=history'],['▤','My Creations','generate-studio.html?view=history'],['♡','Favorites',null]]],
  ['Community','', [['♧','Inspiration','deepsyq.html#inspiration'],['◇','Challenges',null],['♧','Affiliate',null]]]];
 sections.forEach(([heading,_unused,links])=>{
  const group=node('div','vu-nav-group');
  if(heading)group.append(node('p','vu-nav-heading',heading));
  links.forEach(([glyph,label,href])=>{
   const item=node(href?'a':'span','vu-side-link'+(label==='Video'?' active':'')+(!href?' disabled':''));
   if(href)item.href=href;item.innerHTML='<span class="vu-nav-icon" aria-hidden="true">'+glyph+'</span><span>'+label+'</span>';
   if(!href)item.setAttribute('aria-disabled','true');
   group.append(item);
  });nav.append(group);
 });
 const upgrade=node('button','vu-upgrade');
 upgrade.type='button';upgrade.innerHTML='<span class="vu-upgrade-art"></span><span class="vu-upgrade-content"><b>♛ &nbsp;Upgrade to<br>Deepsyq Pro</b><small>Unlock more power and create without limits.</small><strong>Upgrade Now →</strong></span>';
 upgrade.querySelector('.vu-upgrade-art').append(image('promo'));
 upgrade.addEventListener('click',()=>{side.querySelector('[data-view="plans"]')?.click();});
 side.append(nav,upgrade);
 menu.addEventListener('click',()=>document.body.classList.toggle('vu-nav-open'));
 nav.addEventListener('click',event=>{if(event.target.closest('a'))document.body.classList.remove('vu-nav-open')});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')document.body.classList.remove('vu-nav-open')});
 const known=[['image','generate-studio.html?studio=image'],['video','index.html'],['audio','audio-studio.html'],['canvas','canvas.html'],['tools','free-tools.html'],['history','index.html?view=history'],['pricing','index.html?view=plans']];
 search.addEventListener('submit',event=>{event.preventDefault();const value=search.querySelector('input').value.trim().toLowerCase();const hit=known.find(([key])=>value.includes(key));if(hit)location.href=hit[1];else search.querySelector('input').setCustomValidity('Search Image, Video, Audio, Canvas, Tools, History or Pricing.');search.reportValidity();});
 search.querySelector('input').addEventListener('input',e=>e.target.setCustomValidity(''));
}
function build(){
 const dash=$('dashboardView'),shell=document.querySelector('.shell'),workspace=dash?.querySelector('.workspace'),hero=dash?.querySelector('.hero');
 if(!dash||!shell||!workspace||!hero||document.body.classList.contains('vu-reference'))return;
 document.body.classList.add('vu-reference');
 makeNav(shell);
 const title=$('heroTitle'),p=hero.querySelector('[data-i18n="heroText"]');
 if(title){title.removeAttribute('data-i18n');title.textContent='Video Uniquifier';}
 if(p){p.removeAttribute('data-i18n');p.textContent='Create unique variations of your videos with professional local processing.';}
 const intro=hero.firstElementChild;
 if(intro){
  const trust=node('div','vu-trust');
  trust.innerHTML='<span>▣ &nbsp;<b>Local processing</b><small>Your videos stay on your device</small></span><span>♢ &nbsp;<b>Your privacy</b><small>No raw-video uploads for processing</small></span>';
  intro.append(trust);
 }
 hero.prepend(image('hero','vu-hero-image'));
 const frames=node('div','vu-hero-films');
 frames.innerHTML='<div class="vu-workflow-tag">Example workflow ↘</div>';
 ['film1','film2','film3'].forEach((name,i)=>{const f=node('div','vu-film');f.append(image(name));f.insertAdjacentHTML('beforeend','<span class="vu-film-play">▶</span>');frames.append(f);if(i<2)frames.append(node('span','vu-film-arrow','›'));});
 hero.append(frames);
 // All original functional file and processing nodes stay attached to this exact workspace.
 const grid=node('div','vu-content-grid'),left=node('div','vu-left'),right=node('div','vu-right');
 hero.after(grid);grid.append(left,right);left.append(workspace);
 const sh=workspace.querySelector('.sectionHead h3'),sub=workspace.querySelector('.sectionHead p');
 if(sh){sh.removeAttribute('data-i18n');sh.textContent='Upload your video';}
 if(sub){sub.removeAttribute('data-i18n');sub.textContent='Select a video file from your device to create unique variants.';}
 const picker=workspace.querySelector('.picker');
 if(picker){const t=picker.querySelector('[data-i18n="chooseVideos"]'),s=picker.querySelector('[data-i18n="chooseVideosSub"]');
  if(t){t.removeAttribute('data-i18n');t.textContent='Drag and drop a video file here';}
  if(s){s.removeAttribute('data-i18n');s.textContent='or click to browse · MP4, MOV, AVI, MKV, WEBM';}
  picker.prepend(image('uploader','vu-upload-icon'));
  picker.addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('Files')){event.preventDefault();picker.classList.add('vu-dragover')}});
  picker.addEventListener('dragleave',()=>picker.classList.remove('vu-dragover'));
  picker.addEventListener('drop',event=>{
   picker.classList.remove('vu-dragover');
   const original=$('fileInput');if(!original||!event.dataTransfer?.files?.length)return;
   event.preventDefault();const incoming=[...event.dataTransfer.files].filter(f=>f.type.startsWith('video/')||/\.(mp4|mov|avi|mkv|webm)$/i.test(f.name));
   if(!incoming.length){$('fileSummary').textContent='Please choose a video file.';return;}
   const transferred=new DataTransfer();incoming.forEach(f=>transferred.items.add(f));original.files=transferred.files;
   original.dispatchEvent(new Event('change',{bubbles:true}));
  });
 }
 const types=node('section','vu-mode-group');types.innerHTML='<h4>Choose transformation mode</h4>';
 const cards=node('div','vu-mode-cards'),modes=[['gentle','Gentle','Subtle changes that preserve the original style and composition.','♧'],['balanced','Balance','A balanced blend of changes for a fresh, unique result.','⚖'],['dynamic','Dynamic','Stronger creative transformations for a distinctive look.','ϟ']];
 const select=$('mode');
 modes.forEach(([v,label,description,icon])=>{
  const btn=node('button','vu-mode-card');btn.type='button';btn.dataset.mode=v;btn.setAttribute('aria-pressed','false');
  btn.append(image(v==='balanced'?'balance':v));
  const txt=node('span','vu-mode-copy');txt.innerHTML='<strong><span aria-hidden="true">'+icon+'</span> '+label+'</strong><small>'+description+'</small>';btn.append(txt);
  btn.append(node('span','vu-radio','◯'));cards.append(btn);
 });
 types.append(cards);
 const summary=$('fileSummary');(summary||workspace.querySelector('.pickerGrid'))?.after(types);
 function refreshMode(){
  cards.querySelectorAll('.vu-mode-card').forEach(b=>{const op=[...select.options].find(o=>o.value===b.dataset.mode);
    b.classList.toggle('selected',select.value===b.dataset.mode);
    b.setAttribute('aria-pressed',String(select.value===b.dataset.mode));
    b.disabled=!!(select.disabled||op?.disabled);
  });
 }
 cards.addEventListener('click',e=>{const b=e.target.closest('button[data-mode]');if(!b||b.disabled)return;select.value=b.dataset.mode;select.dispatchEvent(new Event('change',{bubbles:true}));refreshMode()});
 select.addEventListener('change',refreshMode);new MutationObserver(refreshMode).observe(select,{attributes:true,childList:true,subtree:true,attributeFilter:['disabled']});
 refreshMode();
 const params=node('section','vu-parameters');
 const count=node('div','vu-count-params');count.innerHTML='<b>Number of variants</b><span class="vu-counter"><button type="button" data-step="-1" aria-label="Decrease variants">−</button><output id="vuCurrentCount">2</output><button type="button" data-step="1" aria-label="Increase variants">+</button></span>';
 const qualityBox=node('div','vu-quality-params');qualityBox.innerHTML='<b>Output quality</b><div class="vu-quality-options"></div>';
 const qual=$('quality'),num=$('variantCount');
 function refreshCount(){count.querySelector('output').textContent=num.value;count.querySelector('[data-step="-1"]').disabled=Number(num.value)<=1;}
 count.addEventListener('click',e=>{const b=e.target.closest('button[data-step]');if(!b)return;const wanted=Number(num.value)+Number(b.dataset.step);
  const option=[...num.options].find(o=>Number(o.value)===wanted&&!o.disabled);if(!option)return;
  num.value=option.value;num.dispatchEvent(new Event('change',{bubbles:true}));refreshCount();});
 num.addEventListener('change',refreshCount);refreshCount();
 const qopts=qualityBox.querySelector('.vu-quality-options');
 [['720','720p'],['1080','1080p'],['2160','4K']].forEach(([val,label])=>{
  const b=node('button','vu-quality-button');b.type='button';b.dataset.quality=val;b.innerHTML='<strong>'+label+'</strong><small>All plans</small>';
  b.addEventListener('click',()=>{const option=[...qual.options].find(o=>o.value===val);if(!option||option.disabled)return;qual.value=val;qual.dispatchEvent(new Event('change',{bubbles:true}));refreshQuality()});
  qopts.append(b);
 });
 function refreshQuality(){qopts.querySelectorAll('button').forEach(btn=>{const opt=[...qual.options].find(o=>o.value===btn.dataset.quality);
  btn.disabled=!!(!opt||opt.disabled||qual.disabled);btn.setAttribute('aria-pressed',String(btn.dataset.quality===qual.value));
  btn.querySelector('small').textContent=btn.disabled?'Plan locked':btn.dataset.quality===qual.value?'Selected':'Available';
 });}
 qual.addEventListener('change',refreshQuality);new MutationObserver(refreshQuality).observe(qual,{attributes:true,childList:true,subtree:true,attributeFilter:['disabled']});refreshQuality();
 params.append(count,qualityBox);types.after(params);
 const advanced=node('details','vu-advanced');advanced.innerHTML='<summary>More settings · aspect ratio and plan access</summary>';
 [workspace.querySelector('.settingsGrid'),workspace.querySelector('.formatGrid'),$('planAccessHint'),workspace.querySelector('.creditEstimate')].forEach(item=>{if(item)advanced.append(item)});
 params.after(advanced);
 const btn=$('startBtn');if(btn){btn.removeAttribute('data-i18n');btn.innerHTML='✦ &nbsp;Create variants &nbsp; →';}
 const preview=node('section','vu-panel vu-preview');
 preview.innerHTML='<div class="vu-panel-head"><h3>Example preview</h3><p>See an example of how video variants can look with different styles.</p></div>';
 const scene=node('div','vu-preview-scene');scene.append(image('preview'));scene.insertAdjacentHTML('beforeend','<span class="vu-preview-play" aria-label="Illustrative preview image">▶</span><span class="vu-preview-controls">▶ &nbsp; 0:00 / — <span class="vu-timeline"></span> ◖ ◱</span>');preview.append(scene);right.append(preview);
 const queue=node('section','vu-panel vu-output');queue.innerHTML='<div class="vu-panel-head vu-output-head"><div><h3>Output queue</h3><p>Your generated variants will appear here.</p></div><button type="button" class="vu-queue-clear">Clear all</button></div>';
 const lines=node('div','vu-output-lines');queue.append(lines);
 for(let i=0;i<3;i++){const row=node('div','vu-output-row');row.innerHTML='<span class="vu-output-thumb"></span><b>Variant '+(i+1)+'</b><span class="vu-output-dash">–</span><span class="vu-progress-line"></span><span class="vu-output-dash">–</span><button type="button" disabled>⇩ &nbsp;Download</button>';row.querySelector('.vu-output-thumb').append(image(i%2?'queue2':'queue1'));lines.append(row);}
 const clear=queue.querySelector('.vu-queue-clear');clear.addEventListener('click',()=>{if(confirm('Clear your existing locally saved video history?'))$('clearHistoryBtn')?.click();});
 [$('progressCard'),$('resultsCard'),$('errorCard')].forEach(el=>{if(el)queue.append(el)});
 right.append(queue);
 // Keep real history and download links in their original controls, not simulated results.
 const how=node('section','vu-how');
 how.innerHTML='<div class="vu-how-head"><h3>How it works</h3><p>Create unique video variants in three simple steps.</p><button type="button" class="vu-history-button">◷ &nbsp; View video history &nbsp; →</button></div>';
 const steps=node('div','vu-how-steps');
 [['uploadstep','1','Upload your video','Select a video file from your device. Your video stays on your device with local processing.'],
 ['settingsstep','2','Choose settings','Pick a transformation mode, set the number of variants and output quality.'],
 ['savestep','3','Save variants','Generate and download your unique video variants when processing is complete.']].forEach(([img,n,title,copy],i)=>{
 const part=node('div','vu-how-step');part.append(image(img));
 const text=node('span','vu-step-text');text.innerHTML='<em>'+n+'</em><span><b>'+title+'</b><small>'+copy+'</small></span>';part.append(text);steps.append(part);
 if(i!==2)steps.append(node('span','vu-how-arrow','→'));
 });
 how.append(steps);grid.after(how);how.querySelector('button').addEventListener('click',()=>$('dashboardView')?.closest('.main')?.querySelector('.sidebar button[data-view="history"]')?.click()||document.querySelector('.sidebar button[data-view="history"]')?.click());
 const origProgress=$('progressCard'),origResults=$('resultsCard');
 function refreshQueue(){
  const busy=!!(origProgress&&!origProgress.hidden),done=!!(origResults&&!origResults.hidden);
  lines.hidden=done;queue.classList.toggle('has-outputs',done||busy);
 }
 if(origProgress)new MutationObserver(refreshQueue).observe(origProgress,{attributes:true,attributeFilter:['hidden']});
 if(origResults)new MutationObserver(refreshQueue).observe(origResults,{attributes:true,attributeFilter:['hidden']});
 refreshQueue();
 const paramsUrl=new URLSearchParams(location.search).get('view');
 if(paramsUrl&&['history','plans','faq','profile','analytics'].includes(paramsUrl))document.querySelector('.sidebar button[data-view="'+paramsUrl+'"]')?.click();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(build),{once:true});
else requestAnimationFrame(build);
})();