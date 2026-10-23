/* Owner-supplied Studio compositions. Presentation adapter only: existing
   model, settings, upload, consent, wallet and generation handlers stay authoritative. */
(() => {
 const $=id=>document.getElementById(id), body=document.body;
 body.classList.add('reference-studio');
 const base='media/approved-design-20261023/';
 const sheets={image:'01_Image_Studio.png',video:'02_Video_Studio.png',music:'03_Audio.png'};
 function art(kind,box,label){
  const [x,y,w,h]=box,el=document.createElement('span');el.className='reference-art';el.role='img';el.setAttribute('aria-label',label);
  el.style.backgroundImage=`url("${base+sheets[kind]}")`;el.style.backgroundSize=`${1448/w*100}% ${1086/h*100}%`;
  el.style.backgroundPosition=`${x/(1448-w)*100}% ${y/(1086-h)*100}%`;return el;
 }
 const prompts=[
  'An ethereal portrait with translucent crystal flowers woven through dark hair, warm golden rim light, luminous blue reflections, delicate skin detail, editorial fantasy photography.',
  'A transparent crystal flower with liquid glass petals, electric blue and violet reflections, tiny golden highlights, dark cinematic background, exquisite macro photography.',
  'An ocean sunset contained inside a perfect glass sphere, miniature islands and rolling waves, glowing clouds reflected in crystal, cinematic light, photorealistic detail.',
  'A dreamy portrait surrounded by luminous jellyfish, violet and electric blue light, sparkling underwater atmosphere, cinematic editorial photography.',
  'A solitary traveller beneath a glowing circular portal in a crystal landscape, reflective water, floating islands, blue and violet starlight, wide cinematic composition.',
  'A woman with delicate golden blossoms in her hair, warm backlight, magical forest bokeh, soft skin texture, fine art portrait.',
  'Bioluminescent jellyfish floating through a deep blue dream ocean, translucent glowing tentacles and violet coral, magical cinematic lighting.',
  'A magnificent floating castle above pink sunset clouds, golden spires, cascading waterfalls, cinematic fantasy environment.',
  'A close-up portrait with crystal reflections, blue eyes, luminous flower petals and warm golden sunlight, premium editorial photography.',
  'A futuristic city reflected in still water, vivid violet towers, cyan light trails, dramatic midnight sky, cinematic wide shot.',
  'A fluffy white cat with sparkling blue eyes and delicate crystal blossoms, luminous soft light, whimsical photorealistic portrait.'
 ];
 const preview=document.createElement('dialog');preview.id='referencePreview';preview.innerHTML='<div class="dialog-head"><h2>Inspiration</h2><button type="button" aria-label="Close inspiration">×</button></div><div class="reference-preview-art"></div><video controls playsinline hidden></video><h3>Prompt</h3><p></p><button type="button" class="primary">Use prompt →</button>';
 body.append(preview);let selectedPrompt='';
 preview.querySelector('.dialog-head button').onclick=()=>preview.close();
 preview.addEventListener('close',()=>{preview.querySelector('video').pause();});
 preview.querySelector('.primary').onclick=()=>{
  if($('prompt').value.trim()&&$('prompt').value!==selectedPrompt&&!confirm('Replace your current prompt with this example?'))return;
  $('showCreate').click();$('prompt').value=selectedPrompt;$('consent').checked=false;$('prompt').dispatchEvent(new Event('input',{bubbles:true}));preview.close();$('prompt').focus();
 };
 function card(kind,box,label,prompt,video){
  const b=document.createElement('button');b.type='button';b.className='reference-card';b.setAttribute('aria-label',label);b.append(art(kind,box,label));
  b.onclick=()=>{selectedPrompt=prompt;preview.querySelector('p').textContent=prompt;preview.querySelector('.reference-preview-art').replaceChildren(art(kind,box,label));const v=preview.querySelector('video');v.hidden=!video;if(video){v.src=video;v.load();}else{v.pause();v.removeAttribute('src');}preview.showModal();};return b;
 }
 const hero=document.createElement('section');hero.id='referenceHero';hero.setAttribute('aria-label','Creative examples');
 $('empty').append(hero);
 const gallery=document.createElement('section');gallery.id='referenceGallery';gallery.setAttribute('aria-label','Inspiration');$('creator').after(gallery);
 const topLinks=document.createElement('nav');topLinks.className='reference-top-links';topLinks.setAttribute('aria-label','Studio links');topLinks.innerHTML='<a href="free-tools.html">Help</a><a href="ai-pricing.html#toolPlans">Credits</a><a href="ai-pricing.html">♛ Pricing</a><a href="index.html#profile">Account</a>';
 document.querySelector('.topbar').append(topLinks);
 const chips=document.createElement('div');chips.className='reference-setting-chips';
 for(const [id,label] of [['ratio','Format'],['imageResolution','Resolution'],['videoResolution','Resolution'],['videoDuration','Duration']]){
  const b=document.createElement('button');b.type='button';b.dataset.source=id;b.onclick=()=>{$('settingsButton').click();$(id).focus();};chips.append(b);
 }
 $('settingsButton').after(chips);
 const voice=document.createElement('a');voice.href='audio-studio.html';voice.className='reference-voice-link';voice.textContent='Open voice & text tools →';document.querySelector('.stage-tabs').append(voice);
 const imageBoxes=[[218,78,435,380],[671,78,371,380],[1058,78,374,380]];
 const galleryBoxes=[[218,698,289,171],[521,698,284,171],[819,698,289,171],[1122,698,308,171],[218,882,289,170],[521,882,284,170],[819,882,289,170],[1122,882,308,170]];
 let previous='';
 function sync(){
  const mode=document.querySelector('.studio-nav [aria-pressed="true"]')?.dataset.kind||'image';
  body.dataset.referenceMode=mode;
  const history=$('showHistory').getAttribute('aria-pressed')==='true';gallery.hidden=history;
  chips.querySelectorAll('button').forEach(b=>{const s=$(b.dataset.source);b.hidden=mode==='music'||(b.dataset.source.startsWith('image')&&mode!=='image')||(b.dataset.source.startsWith('video')&&mode!=='video');b.textContent=(s?.selectedOptions[0]?.textContent||'Settings')+' ⌄';});
  if(previous===mode)return;previous=mode;hero.replaceChildren();gallery.replaceChildren();
  if(mode==='image'){
   imageBoxes.forEach((box,i)=>hero.append(card('image',box,'Image example '+(i+1),prompts[i])));
   galleryBoxes.forEach((box,i)=>gallery.append(card('image',box,'Use image inspiration '+(i+1),prompts[i+3])));
  }else if(mode==='video'){
   const titles=['Ethereal Portal','Neon Rider','Sky Whale'];
   [[213,81,777,417],[1009,86,192,410],[1218,82,213,414]].forEach((box,i)=>{
    const prompt=['A woman in a flowing midnight gown approaches a luminous crystal portal above reflective water. Slow cinematic camera push, flowing fabric, sparkling blue and violet light.','A futuristic motorcycle races through a rainy neon city, cyan and magenta reflections, dynamic cinematic tracking shot.','A gigantic whale glides above golden cloud castles, slow majestic camera movement, luminous fantasy sky.'][i];
    const file=['02-futuristic-portal.mp4','04-neon-motorcycle.mp4','05-sky-whale.mp4'][i];
    const c=card('video',box,'Play '+titles[i],prompt,'media/home/owner-20261018/'+file);const caption=document.createElement('span');caption.className='reference-video-caption';caption.textContent='▷ '+titles[i];c.append(caption);hero.append(c);
   });
   const h=document.createElement('h2');h.textContent='Inspiration';gallery.append(h);
   [[215,844,286,202],[520,844,286,202],[825,844,286,202],[1134,844,293,202]].forEach((box,i)=>gallery.append(card('video',box,'Video inspiration '+(i+1),prompts[i+3],'media/home/owner-20261018/'+['03-underwater-woman.mp4','02-futuristic-portal.mp4','06-golden-forest.mp4','05-sky-whale.mp4'][i])));
  }else if(mode==='music'){
   hero.append(art('music',[212,63,1220,311],'Audio generation studio — turn your ideas into music with AI'));
   const sample=document.createElement('section');sample.className='reference-audio-sample';
   sample.innerHTML='<h2>Example track</h2><span>Original synthesized ambient demo · 30 seconds</span><audio controls preload="none" src="media/studio-reference/ambient-piano-demo.mp3" aria-label="Play ambient example track"></audio>';
   gallery.append(sample);
   const h=document.createElement('h2');h.textContent='Explore by style';gallery.append(h);
   [[214,796,390,250],[624,796,389,250],[1038,796,390,250]].forEach((box,i)=>gallery.append(card('music',box,['Cinematic','Ambient','Instrumental'][i],['An epic cinematic instrumental soundtrack with sweeping strings, deep percussion and an uplifting finale.','A relaxing ambient soundscape with soft evolving pads, delicate textures and a peaceful spacious atmosphere.','A gentle instrumental piano melody with soft strings, warm intimate sound and a reflective mood.'][i])));
  }
 }
 new MutationObserver(sync).observe(document.querySelector('.studio-nav'),{subtree:true,attributes:true,attributeFilter:['aria-pressed']});
 new MutationObserver(sync).observe($('showHistory'),{attributes:true,attributeFilter:['aria-pressed']});
 for(const id of ['ratio','imageResolution','videoResolution','videoDuration'])new MutationObserver(sync).observe($(id),{childList:true,subtree:true});
 document.addEventListener('change',sync);sync();
})();
