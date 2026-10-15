const $=id=>document.getElementById(id);
const TYPES=new Set(['image','video','audio']);
let all=[];

function supported(template){
 return ['image','video','product_video','audio'].includes(template.generationType);
}
function destination(template){
 return template.generationType==='image'?'image':template.generationType==='audio'?'audio':'video';
}
function templateKind(template){
 return template.generationType==='product_video'?'video':template.generationType;
}
function renderCategories(){
 const select=$('category'),current=select.value;
 const categories=[...new Set(all.map(item=>item.category).filter(category=>typeof category==='string'&&category))].sort();
 select.replaceChildren(new Option('All categories',''),...categories.map(category=>new Option(category,category)));
 select.value=categories.includes(current)?current:'';
}
function restoreFiltersFromUrl(){
 const params=new URLSearchParams(location.search);
 $('search').value=(params.get('q')||'').slice(0,100);
 const type=params.get('type')||'';
 $('type').value=TYPES.has(type)?type:'';
 const category=params.get('category')||'';
 $('category').value=[...$('category').options].some(option=>option.value===category)?category:'';
 render();
}
function updateUrl(){
 const url=new URL(location.href);
 for(const [key,value] of [['q',$('search').value.trim().slice(0,100)],['type',$('type').value],['category',$('category').value]]){
  if(value)url.searchParams.set(key,value);
  else url.searchParams.delete(key);
 }
 history.replaceState(history.state,'',url.pathname+url.search+url.hash);
}
function changed(){
 updateUrl();
 render();
}
function useTemplate(template){
 if(!supported(template))return;
 const payload={
  id:template.id,title:template.title,generationType:template.generationType,
  promptTemplate:template.promptTemplate||'',defaultModel:template.defaultModel||null,
  requiredInputTypes:Array.isArray(template.requiredInputTypes)?template.requiredInputTypes:[],
  defaultSettings:template.defaultSettings&&typeof template.defaultSettings==='object'&&!Array.isArray(template.defaultSettings)?template.defaultSettings:{}
 };
 try{
  sessionStorage.setItem('deepsyq_template_start',JSON.stringify(payload));
 }catch(_){
  $('status').textContent='Your browser could not prepare this template. Check your storage permissions and try again.';
  return;
 }
 location.assign('generate-studio.html?studio='+destination(template)+'&from=template');
}
function empty(message){
 const box=document.createElement('div');
 box.className='empty';
 const p=document.createElement('p');p.textContent=message;
 const a=document.createElement('a');a.href='generate-studio.html?studio=image';a.textContent='Open Image Studio ↗';
 box.append(p,a);$('apps').append(box);
}
function render(){
 const term=$('search').value.trim().toLocaleLowerCase();
 const type=$('type').value,category=$('category').value;
 const items=all.filter(item=>{
  if(category&&item.category!==category)return false;
  if(type&&templateKind(item)!==type)return false;
  const searchable=[item.title,item.description,item.category,item.generationType].filter(v=>typeof v==='string').join(' ').toLocaleLowerCase();
  return !term||searchable.includes(term);
 });
 const root=$('apps');root.replaceChildren();
 $('clearFilters').disabled=!(term||type||category);
 if(!all.length){
  $('status').textContent='No active AI Apps templates are published yet.';
  empty('Browse Studio while new workflows are being prepared. No templates or results are being invented.');
  return;
 }
 $('status').textContent=items.length+' of '+all.length+' active template'+(all.length===1?'':'s')+' shown.';
 if(!items.length){
  empty('No matching workflows. Try another search, format or category.');
  return;
 }
 for(const item of items){
  const card=document.createElement('article');card.className='app-card';
  const visual=document.createElement('div');visual.className='app-thumb';
  if(item.thumbnail){
   const img=document.createElement('img');img.src=item.thumbnail;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';
   img.onerror=()=>{img.remove();visual.textContent=templateKind(item)==='image'?'✧':templateKind(item)==='audio'?'♫':'▷';};
   visual.append(img);
  }else visual.textContent=templateKind(item)==='image'?'✧':templateKind(item)==='audio'?'♫':'▷';
  const body=document.createElement('div');body.className='app-body';
  const h=document.createElement('h3');h.textContent=item.title||'Untitled workflow';
  const p=document.createElement('p');p.textContent=item.description||'Open this workflow with its saved prompt and settings.';
  const meta=document.createElement('div');meta.className='app-meta';
  for(const value of [item.category,String(item.generationType||'').replace('_',' '),...(Array.isArray(item.requiredInputTypes)?item.requiredInputTypes:[]).slice(0,3)]){
   if(!value)continue;
   const span=document.createElement('span');span.textContent=value;meta.append(span);
  }
  const button=document.createElement('button');button.type='button';
  button.textContent=supported(item)?'Use template':'Workflow pending';button.disabled=!supported(item);
  button.addEventListener('click',()=>useTemplate(item));
  body.append(h,p,meta,button);card.append(visual,body);root.append(card);
 }
}
async function load(){
 try{
  const response=await fetch('/api/templates',{cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error('TEMPLATES_UNAVAILABLE');
  all=Array.isArray(data.items)?data.items:[];
  renderCategories();restoreFiltersFromUrl();
 }catch(_){
  $('clearFilters').disabled=true;
  $('status').textContent='Active templates are temporarily unavailable. No generation was started.';
  $('apps').replaceChildren();
  empty('Please try again later, or use Studio without a template.');
 }
}
$('search').addEventListener('input',changed);
$('type').addEventListener('change',changed);
$('category').addEventListener('change',changed);
$('clearFilters').addEventListener('click',()=>{
 $('search').value='';$('type').value='';$('category').value='';
 changed();$('search').focus();
});
addEventListener('popstate',restoreFiltersFromUrl);
load();
