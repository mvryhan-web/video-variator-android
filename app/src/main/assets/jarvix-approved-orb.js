// GO stage07: reuse approved JARVIX orb SVG from PR #559.
// Visual elements only. No new buttons, voices, routes, paid AI jobs.
// Original owner-uploaded JARVIX sphere; no legacy SVG or backup artwork.
const OWNER_SPHERE_TEST_URL='https://d2ol7oe51mr4n9.cloudfront.net/user_3DohHzQ92OwE6TBQr5M2fYm2CwS/760ea0b9-ba7d-4982-97f2-9bb59a6b0979.png';
function decorate(slot){
 // Owner-only orb slot: remove legacy JARVIX artwork instead of hiding it.
 slot.querySelectorAll('svg, .ds-reference-orb, .jarvis-core, .jarvis-ring').forEach(node=>node.remove());
 slot.classList.add('jv-approved-orb');
 const header=slot.closest('#topJarvisBtn');
 if(header)header.classList.add('jv-approved-orb-button');
 // Never resurrect the rejected sphere if the original PNG fails to load.
 if(slot.classList.contains('jv-owner-photo-unavailable'))return;
 const parts=['base','inner','cyan','orange','pink'];
 const photoNodes=Array.from(slot.querySelectorAll(':scope > img.jv-owner-upload-orb'));
 if(photoNodes.length===parts.length && parts.every(part=>photoNodes.some(img=>img.classList.contains('jv-owner-layer-'+part))))return;
 photoNodes.forEach(node=>node.remove());
 slot.classList.remove('jv-owner-photo-test');
 const layers=parts.map(part=>{
  const photo=document.createElement('img');
  photo.className='jv-owner-upload-orb jv-owner-layer-'+part;
  photo.alt='';
  photo.setAttribute('aria-hidden','true');
  photo.decoding='async';
  photo.referrerPolicy='no-referrer';
  return photo;
 });
 const fail=()=>{
  slot.classList.remove('jv-owner-photo-test');
  slot.classList.add('jv-owner-photo-unavailable');
  for(const photo of layers)photo.remove();
 };
 layers[0].addEventListener('load',()=>{
  if(layers[0].naturalWidth===1254&&layers[0].naturalHeight===1254){
   slot.classList.add('jv-owner-photo-test');
  }else fail();
 },{once:true});
 layers[0].addEventListener('error',fail,{once:true});
 for(const photo of layers){
  photo.src=OWNER_SPHERE_TEST_URL;
  slot.append(photo);
 }
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
  css.rel='stylesheet';css.href='jarvix-approved-orb.css?v=owner-original-only-20261107';
  document.head.append(css);
 }
 mountApprovedJarvixOrb();
 const observer=new MutationObserver(records=>{
  if(records.some(record=>record.type==='childList'&&(
   record.target.closest?.('.jarvis-mini-orb')||
   [...record.addedNodes].some(node=>node.nodeType===Node.ELEMENT_NODE&&!node.closest?.('.jv-approved-orb'))
  ))){
   mountApprovedJarvixOrb();
  }
 });
 observer.observe(document.body,{subtree:true,childList:true});
 return observer;
}
