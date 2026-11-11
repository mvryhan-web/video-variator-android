/**
 * DEEPSYQ — GO Stage 04.
 * One visual source for the existing Home and inner-page sidebar icons.
 * Changes only icon glyphs, never navigation labels, routes or handlers.
 * JARVIX orb is intentionally excluded: its approved asset is stage 07.
 */
const namespace='http://www.w3.org/2000/svg';
const paths=Object.freeze({
 home:'<path d="m3 11 9-8 9 8v10h-6v-7H9v7H3z"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="1"/><path d="m3 15 5-5 5 5 3-3 5 5"/><circle cx="16" cy="8" r="1"/>',
 video:'<path d="m6 3 15 9-15 9z"/>',
 audio:'<path d="M9 19V5l12-2v14"/><circle cx="6" cy="19" r="3"/><circle cx="18" cy="17" r="3"/>',
 apps:'<path d="m12 2 9 10-9 10L3 12z"/>',
 canvas:'<path d="m4 20 5-.8L20 8a2 2 0 0 0-4-4L5 15z"/><path d="m14 6 4 4"/>',
 tools:'<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M12 3v18M3 12h18"/>',
 legacy:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h8M8 11h8M8 15h8"/>',
 history:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 4V2h8v2"/><rect x="9" y="9" width="6" height="7" rx="1"/>',
 inspiration:'<circle cx="12" cy="12" r="7"/><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>',
 pricing:'<path d="m3 16 2-9 4.5 4.5L12 5l2.5 6.5L19 7l2 9z"/>'
});
export const iconKeys=Object.freeze(Object.keys(paths));
export function createCanonicalIcon(key){
 if(!paths[key])return null;
 const svg=document.createElementNS(namespace,'svg');
 svg.setAttribute('viewBox','0 0 24 24');
 svg.setAttribute('width','20');svg.setAttribute('height','20');
 svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
 svg.setAttribute('stroke-width','1.75');svg.setAttribute('stroke-linecap','round');
 svg.setAttribute('stroke-linejoin','round');svg.setAttribute('focusable','false');
 svg.setAttribute('aria-hidden','true');
 // Static checked-in SVG paths: never user-controlled markup.
 svg.innerHTML=paths[key];
 return svg;
}

const keyFor=href=>{
 if(!href)return null;
 let u;try{u=new URL(href,document.baseURI);}catch{return null;}
 if(u.origin!==location.origin)return null;
 const name=u.pathname.split('/').pop(),kind=u.searchParams.get('studio');
 if(name==='deepsyq.html'&&!u.hash)return 'home';
 if(name==='generate-studio.html')return kind==='video'?'video':(kind==='audio'||kind==='music')?'audio':'image';
 return ({
  'ai-apps.html':'apps','canvas.html':'canvas','free-tools.html':'tools',
  'index.html':'legacy','my-creations.html':'history','pricing.html':'pricing',
  'ai-pricing.html':'pricing'
 })[name]|| (name==='deepsyq.html'&&u.hash==='#inspirationPreview'?'inspiration':null);
};
/** Deterministic fixed-outline vectors, independent of fonts, locale and page. */
export function applyCanonicalNavIcons(root=document){
 let count=0;
 for(const sidebar of root.querySelectorAll('#sidebar,#dsSiteSidebar')){
  for(const link of sidebar.querySelectorAll('nav a[href]')){
   if(link.closest('.sidebar-social'))continue;
   const key=keyFor(link.getAttribute('href'));
   if(!key||!paths[key])continue;
   const holder=link.querySelector(':scope > .nav-icon,:scope > .ds-icon');
   // Never replace or rebuild navigation: only the old ornamental text glyph.
   if(!holder)continue;
   if(holder.dataset.canonicalIcon===key)continue;
   const svg=createCanonicalIcon(key);
   holder.replaceChildren(svg);
   holder.dataset.canonicalIcon=key;
   holder.style.display='inline-flex';
   holder.style.alignItems='center';
   holder.style.justifyContent='center';
   holder.style.flexShrink='0';
   count++;
  }
 }
 return count;
}
