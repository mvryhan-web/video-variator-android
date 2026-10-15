const $=id=>document.getElementById(id);
let all=[];
async function load(){
 try{
  const r=await fetch('/api/templates',{cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'TEMPLATES_UNAVAILABLE');all=Array.isArray(d.items)?d.items:[];renderCategories();render();
 }catch(e){$('status').textContent='Active templates are temporarily unavailable.';$('apps').replaceChildren();}
}
function renderCategories(){const select=$('category'),current=select.value,cats=[...new Set(all.map(x=>x.category).filter(Boolean))].sort();select.replaceChildren(new Option('All categories',''));for(const c of cats)select.add(new Option(c,c));if(cats.includes(current))select.value=current;}
function supported(t){return ['image','video','product_video','audio'].includes(t.generationType);}
function destination(t){return t.generationType==='image'?'image':t.generationType==='audio'?'audio':'video';}
function useTemplate(t){
 if(!supported(t))return;
 const payload={id:t.id,title:t.title,generationType:t.generationType,promptTemplate:t.promptTemplate||'',defaultModel:t.defaultModel||null,requiredInputTypes:Array.isArray(t.requiredInputTypes)?t.requiredInputTypes:[],defaultSettings:t.defaultSettings&&typeof t.defaultSettings==='object'?t.defaultSettings:{}};
 sessionStorage.setItem('deepsyq_template_start',JSON.stringify(payload));location.assign('generate-studio.html?studio='+destination(t)+'&from=template');
}
function render(){
 const root=$('apps'),category=$('category').value,items=all.filter(t=>!category||t.category===category);root.replaceChildren();
 $('status').textContent=items.length?items.length+' active template'+(items.length===1?'':'s')+'.':'No active templates in this view.';
 if(!items.length){const p=document.createElement('div');p.className='empty';p.textContent='No owner-activated templates yet. Start from Image or Video Studio instead.';root.append(p);return;}
 for(const t of items){
  const card=document.createElement('article');card.className='app-card';
  const visual=document.createElement('div');visual.className='app-thumb';
  if(t.thumbnail){const img=document.createElement('img');img.src=t.thumbnail;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';visual.append(img);}else visual.textContent=t.generationType==='image'?'✧':t.generationType==='audio'?'♫':'▷';
  const body=document.createElement('div');body.className='app-body';const h=document.createElement('h3');h.textContent=t.title;const p=document.createElement('p');p.textContent=t.description||'Open this workflow with its saved prompt and settings.';
  const meta=document.createElement('div');meta.className='app-meta';for(const v of [t.category,String(t.generationType||'').replace('_',' '),...(t.requiredInputTypes||[]).slice(0,3)]){const span=document.createElement('span');span.textContent=v;meta.append(span);}
  const b=document.createElement('button');b.type='button';b.textContent=supported(t)?'Use template':'Workflow pending';b.disabled=!supported(t);b.onclick=()=>useTemplate(t);
  body.append(h,p,meta,b);card.append(visual,body);root.append(card);
 }
}
$('category').onchange=render;load();