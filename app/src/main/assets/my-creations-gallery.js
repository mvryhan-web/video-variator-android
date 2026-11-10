/* My Creations gallery: works with the existing private Workspace API.
   Showcase entries are labelled samples, never real user records. */
const $ = (id) => document.getElementById(id);
const sourceArt = 'media/approved-design-20261023/08_My_Creations.png';
const assetFolder = 'media/my-creations/showcase/';
const showcase = [
 {id:'crystal-bloom',fallback:'media/creative/creative50-20261021/01-crystal-orchard.webp',title:'Crystal Bloom',type:'image',crop:[13,143,273,233],prompt:'Ethereal woman with crystalline flowers surrounding her, illuminated by soft blue light, water droplets, cinematic glow, ultra detailed, dreamlike atmosphere.'},
 {id:'eclipse-portal',fallback:'media/inspiration/owner-next-20261031/04-glass-hourglass-two-worlds.webp',title:'Eclipse Portal',type:'image',crop:[300,143,271,233],prompt:'A solitary traveler faces an enormous glowing eclipse portal on a mirror-like shore, floating rocks, golden clouds, dramatic cinematic fantasy landscape.'},
 {id:'velvet-rain',fallback:'media/creative/creative50-20261021/10-bottle-of-weather.webp',title:'Velvet Rain',type:'image',crop:[585,143,273,233],prompt:'A luxurious deep magenta perfume bottle resting among pink flowers, glittering rain, warm golden light and city bokeh, premium nighttime product photography.'},
 {id:'bioluminescent-tide',fallback:'media/inspiration/openai-20261021/vertical-20-jellyfish-lanterns.webp',title:'Bioluminescent Tide',type:'image',crop:[14,456,434,173],wide:true,prompt:'A diver explores a vivid underwater reef among glowing blue and violet jellyfish, luminous coral, sparkling sunbeams and cinematic ocean life.'},
 {id:'skyward-citadel',fallback:'media/inspiration/owner-next-20261031/07-storybook-miniature-kingdom.webp',title:'Skyward Citadel',type:'image',crop:[463,456,395,173],wide:true,prompt:'A majestic castle city floating among pastel clouds and islands, cascading waterfalls, gardens, luminous sunset and breathtaking high-fantasy architecture.'},
 {id:'porcelain-grace',fallback:'media/creative/creative50-20261021/13-liquid-porcelain.webp',title:'Porcelain Grace',type:'image',crop:[14,700,272,222],prompt:'Elegant portrait of a woman in ivory couture surrounded by luminous white blossoms, pearl and gold details, warm spring light, refined editorial atmosphere.'},
 {id:'neon-rider',fallback:'media/inspiration/openai-20261021/image-20-city-pop.webp',title:'Neon Rider',type:'video',crop:[300,700,272,222],prompt:'A futuristic motorcycle rider races through a vibrant neon metropolis at night, magenta and cyan reflections on wet roads, cinematic cyberpunk action.'},
 {id:'sculpted-sound',fallback:'media/creative/creative50-20261021/15-botanical-audio.webp',title:'Sculpted Sound',type:'audio',crop:[586,700,272,222],prompt:'An elegant music cover with luxurious silver and gold headphones surrounded by delicate blossom flowers, dark premium studio background.'}
].map(s => ({...s,kind:'sample',status:'completed',model:'Creative showcase',preview:null}));
const icons={
 image:'▧',video:'▷',audio:'♫',processing:'◌',
 download:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/></svg>',
 copy:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>',
 star:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6 6.5.9-4.7 4.7 1.1 6.5-5.9-3.1-5.9 3.1 1.1-6.5L2.5 8.9 9 8z"/></svg>',
 trash:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 4h6m3 3-1 14H7L6 7m4 4v6m4-6v6"/></svg>'
};
const state={filter:'all',items:[],selectedId:'sample:crystal-bloom',userItems:[],showcaseFav:new Set(),hiddenSamples:new Set(),mediaCache:new Map(),loading:false};
const safeStorage=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}};
state.showcaseFav=new Set(safeStorage('deepsyq_showcase_favorites_v1'));
state.hiddenSamples=new Set(safeStorage('deepsyq_showcase_hidden_v1'));
const persist=(key,value)=>{try{localStorage.setItem(key,JSON.stringify([...value]))}catch{}};
const nameOf=(item)=>item?.title||'Untitled creation';
function say(message){$('mcNotice').textContent=message||'';const alert=$('mcStatus');if(alert)alert.textContent=message||'';}
function authHeaders(){const token=localStorage.getItem('vv_token');return token?{'Authorization':'Bearer '+token,'Content-Type':'application/json'}:{'Content-Type':'application/json'};}
function allItems(){
 return [...state.userItems,...showcase.filter(x=>!state.hiddenSamples.has(x.id)).map(x=>({...x,isFavorite:state.showcaseFav.has(x.id)}))];
}
function selected(){return state.items.find(x=>x.key===state.selectedId)||null;}
function filteredItems(){
 const all=allItems().map(x=>({...x,key:x.kind==='sample'?'sample:'+x.id:'own:'+x.id}));
 if(state.filter==='all')return all;
 if(state.filter==='processing')return all.filter(x=>['processing','queued'].includes(x.status));
 return all.filter(x=>x.type===state.filter);
}
function cropImage(img,x,y,w,h){
 const canvas=document.createElement('canvas');
 const sx=img.naturalWidth/1243,sy=img.naturalHeight/1022;
 canvas.width=Math.round(w*2);canvas.height=Math.round(h*2);
 const context=canvas.getContext('2d');
 context.drawImage(img,Math.round(x*sx),Math.round(y*sy),Math.round(w*sx),Math.round(h*sy),0,0,canvas.width,canvas.height);
 return new Promise(resolve=>canvas.toBlob(blob=>resolve(blob?URL.createObjectURL(blob):canvas.toDataURL('image/png')),'image/webp',.93));
}
async function imageAvailable(src){
 return new Promise(resolve=>{
  const img=new Image();
  img.onload=()=>resolve(true);
  img.onerror=()=>resolve(false);
  img.src=src;
 });
}
async function loadSamples(){
 await Promise.all(showcase.map(async item=>{
  const generated=assetFolder+item.id+'.webp';
  // Automatically use the final full-resolution artwork when this file is deployed.
  // Until then show an existing standalone gallery image, not a crop of another website UI.
  item.preview=await imageAvailable(generated)?generated:item.fallback;
 }));
 render();
}

async function fetchMyCards(){
 const token=localStorage.getItem('vv_token');
 if(!token){state.userItems=[];render();return}
 try{
  const response=await fetch('/api/studio/workspace/cards?',{headers:authHeaders(),cache:'no-store',credentials:'same-origin'});
  if(!response.ok)throw Error('Workspace request: '+response.status);
  const json=await response.json();
  state.userItems=(Array.isArray(json.sections?.recent)?json.sections.recent:[])
   .filter(x=>x&&typeof x.id==='string'&&['image','video','audio'].includes(x.type))
   .map(x=>({...x,kind:'own',model:x.model||'DEEPSYQ Studio',prompt:x.prompt||null,preview:state.mediaCache.get(x.id)||null}));
  render();
 }catch(err){say('Личные работы пока недоступны. Демонстрационная коллекция остаётся открытой.');console.warn('My Creations:',err)}
}
function thumb(item){
 const node=document.createElement('div');node.className='mc-card-image';
 if(item.preview){const image=new Image();image.src=item.preview;image.alt='';image.loading='lazy';node.append(image)}
 else {
  const block=document.createElement('div');block.className='mc-placeholder';block.innerHTML='<span aria-hidden="true">'+(icons[item.type]||'✦')+'</span><span>'+(item.kind==='own'?'Saved creation':'Preview loading…')+'</span>';
  node.append(block);
 }
 return node;
}
async function tryOwnMedia(item){
 if(item.kind!=='own')return item.preview||null;
 if(state.mediaCache.has(item.id))return state.mediaCache.get(item.id);
 try{
  // Fetches use the same existing authenticated Studio API. A missing media endpoint never fabricates a result.
  const response=await fetch('/api/studio/jobs/'+encodeURIComponent(item.id)+'/media',{headers:{Authorization:authHeaders().Authorization||''},credentials:'same-origin'});
  if(!response.ok)throw Error('MEDIA_NOT_AVAILABLE');
  const blob=await response.blob();
  if(!/^(image\/|video\/|audio\/)/.test(blob.type))throw Error('UNSUPPORTED_MEDIA');
  const url=URL.createObjectURL(blob);state.mediaCache.set(item.id,url);
  return url;
 }catch{state.mediaCache.set(item.id,null);return null}
}
function compactBtn(title,svg,onClick,pressed=false){
 const b=document.createElement('button');b.type='button';b.className='mc-icon-btn';b.title=title;b.setAttribute('aria-label',title);
 if(pressed)b.setAttribute('aria-pressed','true');
 b.innerHTML=svg;b.addEventListener('click',event=>{event.stopPropagation();onClick()});return b;
}
function showOne(item){
 state.selectedId=item.key;
 const detail=$('mcDetail');
 const header=document.querySelector('.ws-site-header');
 if(window.matchMedia('(max-width:820px)').matches&&header){
  detail.style.setProperty('--mc-header-bottom',Math.max(0,Math.ceil(header.getBoundingClientRect().bottom))+'px');
 }
 detail.hidden=false;render();
}
function buildCard(item){
 const el=document.createElement('article');el.className='mc-card'+(item.wide?' mc-wide':'');el.dataset.key=item.key;
 el.setAttribute('aria-selected',String(item.key===state.selectedId));
 const media=document.createElement('button');media.type='button';media.className='mc-card-image';media.setAttribute('aria-label','View '+nameOf(item));
 const imageBox=thumb(item);while(imageBox.firstChild)media.append(imageBox.firstChild);
 media.addEventListener('click',()=>showOne(item));
 if(item.kind==='own'&&!item.preview&&!state.mediaCache.has(item.id)){
  tryOwnMedia(item).then(url=>{
   if(url){const original=state.userItems.find(x=>x.id===item.id);if(original&&original.preview!==url){original.preview=url;render()}}
  });
 }
 const foot=document.createElement('div');foot.className='mc-card-foot';
 const title=document.createElement('span');title.className='mc-card-title';title.textContent=nameOf(item);
 const type=document.createElement('span');type.className='mc-type';type.innerHTML='<span class="mc-type-icon" aria-hidden="true">'+(icons[item.type]||'✦')+'</span>';type.append(document.createTextNode(item.type==='audio'?'Audio':item.type==='video'?'Video':'Image'));
 const actions=document.createElement('div');actions.className='mc-card-actions';
 actions.append(compactBtn('Download',icons.download,()=>download(item)),compactBtn('Copy prompt',icons.copy,()=>copyPrompt(item)),compactBtn(item.isFavorite?'Remove favorite':'Add favorite',icons.star,()=>favorite(item),item.isFavorite));
 foot.append(title,type,actions);el.append(media,foot);return el;
}
function render(){
 const grid=$('mcGrid');if(!grid)return;
 state.items=filteredItems();grid.replaceChildren();
 const current=state.items.find(x=>x.key===state.selectedId);
 if(!current&&state.items.length)state.selectedId=state.items[0].key;
 if(!state.items.length){const e=document.createElement('div');e.className='mc-empty';e.innerHTML='<strong>No matching creations yet</strong><span>Try another filter or create a new work.</span><a href="jarvix-chat.html">Open JARVIX Studio</a>';grid.append(e)}
 for(const item of state.items)grid.append(buildCard(item));
 renderDetail();
 $('mcCollectionTag').textContent=state.userItems.length?'My workspace + showcase':'Sample collection';
 $('mcLibraryNote').textContent=state.userItems.length?'Your saved creations appear first. Example artwork is identified as a sample.':'Example artwork is shown below. Sign in to see your saved creations.';
 document.querySelectorAll('.mc-filter').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===state.filter)));
}
function renderDetail(){
 const d=$('mcDetail');if(d.hidden)return;
 const item=selected();if(!item){d.hidden=true;return}
 const visual=$('mcDetailTop');visual.querySelectorAll('img,video').forEach(n=>n.remove());
 if(item.preview){
  if(item.kind==='own'&&item.type==='video'){
   const v=document.createElement('video');v.controls=true;v.preload='metadata';v.src=item.preview;visual.prepend(v);
  }else{
   const img=new Image();img.src=item.preview;img.alt=nameOf(item);visual.prepend(img);
  }
 }
 $('mcDetailTitle').textContent=nameOf(item);
 $('mcDetailType').textContent=item.type==='audio'?'♫  Audio':item.type==='video'?'▷  Video':'▧  Image';
 $('mcDetailPrompt').textContent=item.prompt||'Open this creation in Studio to view its original prompt.';
 $('mcDetailModel').textContent=item.model||'DEEPSYQ Studio';
 $('mcRemove').textContent=item.kind==='sample'?'♧  Hide sample':'▤  Archive';
 $('mcReference').textContent=item.type==='audio'?'♫  Create similar audio':item.type==='video'?'▷  Create similar video':'▧  Use as reference';
}
async function copyPrompt(item){
 if(!item?.prompt){say('Prompt available inside Studio for this creation.');return}
 try{await navigator.clipboard.writeText(item.prompt);say('Prompt copied.')}catch{say('Cannot access clipboard in this browser.')}
}
async function download(item){
 let url=item.preview||await tryOwnMedia(item);
 if(!url){say('Download is not available yet. Open this creation in Studio.');return}
 if(item.kind==='sample'&&item.type!=='image')say('Downloading the showcase cover image; no audio/video was generated for this sample.');
 const link=document.createElement('a');link.href=url;link.download=(item.title||'deepsyq-creation').toLowerCase().replace(/[^a-z0-9]+/g,'-')+(item.kind==='sample'?'.webp':'');
 document.body.append(link);link.click();link.remove();
}
async function favorite(item){
 if(item.kind==='sample'){
  if(state.showcaseFav.has(item.id))state.showcaseFav.delete(item.id);else state.showcaseFav.add(item.id);
  persist('deepsyq_showcase_favorites_v1',state.showcaseFav);render();return;
 }
 try{await patchOwn(item.id,{action:'favorite',isFavorite:!item.isFavorite});say('Favorite updated.')}
 catch(e){say('Could not update favorite.')}
}
async function patchOwn(id,payload){
 const resp=await fetch('/api/studio/workspace/cards/'+encodeURIComponent(id),{method:'PATCH',headers:authHeaders(),credentials:'same-origin',body:JSON.stringify(payload)});
 if(!resp.ok)throw Error('Workspace update: '+resp.status);
 await fetchMyCards();
}
async function remove(item){
 if(item.kind==='sample'){
  if(!confirm('Hide this showcase example from this browser?'))return;
  state.hiddenSamples.add(item.id);persist('deepsyq_showcase_hidden_v1',state.hiddenSamples);render();say('Example hidden on this device.');return;
 }
 if(!confirm('Move this creation to the archive? This does not permanently delete the file.'))return;
 try{await patchOwn(item.id,{action:'archive'});say('Creation moved to archive.')}catch{say('Unable to archive this creation.')}
}
async function share(item){
 if(!item){return}
 // Sharing a personal creation never exposes private media to strangers.
 const text=item.kind==='sample'?'Explore this creative concept: '+item.title+'\n'+item.prompt:'My DEEPSYQ creation: '+item.title;
 try{
  if(navigator.share){await navigator.share({title:item.title,text});say('Shared text description; no private media was published.')}
  else {await navigator.clipboard.writeText(text);say('Description copied for sharing. No private media was published.')}
 }catch(e){if(e.name!=='AbortError')say('Sharing is not available in this browser.')}
}
async function useReference(item){
 if(item.prompt)try{await navigator.clipboard.writeText(item.prompt)}catch{}
 say('Opening JARVIX. The prompt is copied; attach your reference file inside Studio.');
 const mode=item.type==='audio'?'audio':item.type==='video'?'video':'image';
 window.open('jarvix-chat.html?mode='+mode,'_blank','noopener');
}
document.querySelectorAll('.mc-filter').forEach(button=>button.addEventListener('click',()=>{state.filter=button.dataset.filter;render()}));
$('mcDetailClose').addEventListener('click',()=>{$('mcDetail').hidden=true;});
$('mcCopyPrompt').addEventListener('click',()=>copyPrompt(selected()));
$('mcDownload').addEventListener('click',()=>download(selected()));
$('mcShare').addEventListener('click',()=>share(selected()));
$('mcReference').addEventListener('click',()=>useReference(selected()));
$('mcRemove').addEventListener('click',()=>remove(selected()));
document.addEventListener('keydown',event=>{if(event.key==='Escape')$('mcDetail').hidden=true});
if(window.matchMedia('(max-width:820px)').matches)$('mcDetail').hidden=true;
render();void loadSamples();void fetchMyCards();
