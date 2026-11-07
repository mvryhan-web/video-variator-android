// GO stage07: reuse approved JARVIX orb SVG from PR #559.
// Visual elements only. No new buttons, voices, routes, paid AI jobs.
let seq=0;
function createOrbSvg(){
 const id='jvApprovedOrb'+(++seq);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 160 160');
 svg.setAttribute('aria-hidden','true');
 svg.setAttribute('focusable','false');
 svg.classList.add('ds-reference-orb');
 // Owner-used source: mountReferenceOrb at 4de99be9, without old UI extras.
 svg.innerHTML='<defs><radialGradient id="'+id+'"><stop stop-color="#fff"/><stop offset=".18" stop-color="#9fffff"/><stop offset=".42" stop-color="#00cfff"/><stop offset=".75" stop-color="#0658bd"/><stop offset="1" stop-color="#061747"/></radialGradient></defs>'
 +'<circle cx="80" cy="80" r="48" fill="url(#'+id+')" stroke="#40eaff" stroke-width="1.2"/><circle cx="80" cy="80" r="58" fill="none" stroke="#087efa"/>'
 +'<g class="ds-orbit-spin"><circle cx="80" cy="80" r="65" fill="none" stroke="#08d7ff" stroke-dasharray="30 6 2 7"/><ellipse cx="80" cy="80" rx="77" ry="20" fill="none" stroke="#04edff" stroke-width="2" transform="rotate(-12 80 80)"/><ellipse cx="80" cy="80" rx="72" ry="24" fill="none" stroke="#d43eff" stroke-width="1.5" transform="rotate(22 80 80)"/></g>'
 +'<g class="ds-orbit-reverse"><ellipse cx="80" cy="80" rx="45" ry="62" fill="none" stroke="#a449ff"/><circle cx="80" cy="18" r="2.5" fill="#fff"/><circle cx="38" cy="111" r="2" fill="#03f2ff"/></g>'
 +'<path d="m80 52 5 22 17 6-17 5-5 23-5-23-17-5 17-6Z" fill="#fff"/><path d="M80 28v104M28 80h104" stroke="#86ffff" opacity=".6"/>';
 // Stage08: separate the approved magenta ellipse from the clockwise group,
 // so its direction never changes when the voice state changes.
 const pink=svg.querySelector('.ds-orbit-spin ellipse[stroke="#d43eff"]');
 const counter=svg.querySelector('.ds-orbit-reverse');
 if(pink&&counter)counter.append(pink);
 const ns='http://www.w3.org/2000/svg';
 const blueBack=document.createElementNS(ns,'g');
 blueBack.classList.add('jv-blue-behind');
 blueBack.innerHTML='<ellipse cx="80" cy="80" rx="22" ry="41" fill="none" stroke="#1474ca" stroke-width="1.2" opacity=".46" transform="rotate(40 80 80)"/>';
 const core=svg.querySelector('circle[cx="80"][cy="80"]');
 if(core)svg.insertBefore(blueBack,core);
 const blueFront=document.createElementNS(ns,'g');
 blueFront.classList.add('jv-blue-front');
 blueFront.innerHTML='<ellipse cx="80" cy="80" rx="24" ry="40" fill="none" stroke="#7eefff" stroke-width="1.15" opacity=".55" transform="rotate(-38 80 80)"/>';
 const star=svg.querySelector('path[d^="m80 52"]');
 if(star)svg.insertBefore(blueFront,star);
 // One gold/orange tint leaking toward the center inside cyan slots and
 // outward at pink slots. No arbitrary new sphere or movement of its shell.
 const gold=document.createElementNS(ns,'g');
 gold.classList.add('jv-orange-light');
 gold.innerHTML='<circle class="jv-warm-in" cx="80" cy="80" r="53" fill="none" stroke="#ff9c2b" stroke-width="2.5" stroke-dasharray="14 10 6 8" opacity=".78"/><circle class="jv-warm-out" cx="80" cy="80" r="68" fill="none" stroke="#ff9c2b" stroke-width="1.25" stroke-dasharray="5 14 8 15" opacity=".46"/>';
 svg.append(gold);
 return svg;
}
function decorate(slot){
 if(slot.classList.contains('jv-approved-orb'))return;
 slot.classList.add('jv-approved-orb');
 slot.append(createOrbSvg());
 const header=slot.closest('#topJarvisBtn');
 if(header)header.classList.add('jv-approved-orb-button');
}
export function mountApprovedJarvixOrb(root=document){
 for(const slot of root.querySelectorAll('.jarvis-mini-orb'))decorate(slot);
 // Stage06: replace only the decorative ◉, preserve the working JARVIX link.
 for(const link of root.querySelectorAll('.j-mode-rail a[href="jarvix-chat.html"]')){
  if(link.querySelector('.jv-approved-orb'))continue;
  const first=link.firstChild;
  if(first?.nodeType===Node.TEXT_NODE&&first.textContent.startsWith('◉ ')){
   first.textContent=first.textContent.slice(2);
  }
  const orb=document.createElement('span');
  orb.className='jarvis-mini-orb jv-rail-mini-orb';
  orb.setAttribute('aria-hidden','true');
  link.prepend(orb);
  decorate(orb);
 }
}
export function installApprovedJarvixOrb(){
 if(!document.getElementById('jvApprovedOrbStyles')){
  const css=document.createElement('link');css.id='jvApprovedOrbStyles';
  css.rel='stylesheet';css.href='jarvix-approved-orb.css?v=stage07';
  document.head.append(css);
 }
 mountApprovedJarvixOrb();
 const observer=new MutationObserver(records=>{
  if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===Node.ELEMENT_NODE&&!node.closest?.('.jv-approved-orb')))){
   mountApprovedJarvixOrb();
  }
 });
 observer.observe(document.body,{subtree:true,childList:true});
 return observer;
}
