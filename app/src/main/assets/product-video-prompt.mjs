// BASE #20: source-photo-first product video brief. No provider call is made here.
// An internal prompt cannot guarantee exact frame-level visual fidelity.
const styles=new Set(['clean studio','lifestyle','cinematic','social UGC']);
const formats=new Set(['9:16','1:1','16:9']);
const durations=new Set(['selected model duration','about 5 seconds','about 8 seconds']);

export function buildProductVideoPrompt({productName='',style='clean studio',ratio='9:16',duration='selected model duration',hasLogo=false,photoCount=1}={}){
 const name=String(productName).replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,120);
 const visualStyle=styles.has(style)?style:'clean studio';
 const format=formats.has(ratio)?ratio:'9:16';
 const time=durations.has(duration)?duration:'selected model duration';
 const count=Number.isInteger(photoCount)?Math.max(1,Math.min(3,photoCount)):1;
 const parts=[
  'Create a premium photorealistic Etsy/e-commerce ad for the EXACT product in the uploaded product photo(s). These photos are the ONLY source of truth for product appearance, not inspiration for a redesign.',
  name?'Customer-entered product name: '+JSON.stringify(name)+'. This name does not prove a visible label or brand.':'',
  'Preserve the exact visible color, pattern, print/graphic, silhouette, proportions, stitching, pockets, seams, buttons, zippers, logos and labels. Never alter, add, remove, redraw, replace or morph product details across frames.',
  'A humorous or anatomical-looking print on clothing is a PRINT ON FABRIC, not a real body part; preserve that original graphic exactly.',
  'Show only angles and details supported by the source photos. OMIT any unseen back, side, inside or detail shot instead of inventing it. Do not infer fabric type, softness, comfort, waterproofing, durability, certificates or product claims.',
  'Suggested sequence, only where source images support it: immediate sharp product hero; realistic model wearing this identical garment when appropriate, or a clean product setting; subtle natural movement; close-up of the ACTUAL visible print; supported alternative view; clean final product frame.',
  'Natural light, realistic anatomy/hands, restrained camera motion, sharp focus. No stock substitute, invented accessories/text/logo, distorted fabric, inconsistent print or product transformations.',
  count>1?'Keep the same exact product consistent across all '+count+' uploaded product-photo references.':'Keep the source photo product consistent in every frame.',
  hasLogo?'A separately uploaded optional logo is for a distinct ad overlay only if used; never add it to the garment or alter an existing print.':'No logos or brand names may be invented.',
  'Art direction: '+visualStyle+'. Frame: '+format+'. Duration preference: '+time+'. User must review real model settings and each generated frame before publishing; prompt guidance cannot guarantee exact SKU fidelity.'
 ];
 const result=parts.filter(Boolean).join(' ');
 if(result.length>2000)throw new Error('PRODUCT_BRIEF_TOO_LONG');
 return result;
}
