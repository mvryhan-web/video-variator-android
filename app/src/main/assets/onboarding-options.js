// First-run choices are *server-authorized* only. Do not advertise workflows
// merely because a browser route exists: the DB and provider gates remain authoritative.
const copy={
 image:{label:'Image',description:'Create or edit an image with a prompt and references.',target:'/generate-studio.html?studio=image'},
 video:{label:'Video',description:'Create motion from a prompt or a reference image.',target:'/generate-studio.html?studio=video'},
 product_ads:{label:'Product Ads',description:'Prepare a product advertisement from your own photos.',target:'/product-video.html'},
 avatar:{label:'Avatar',description:'Prepare a narrated avatar video with your permitted photos and voice.',target:'/avatar-studio.html'}
};
export function authorizedOnboardingOptions(options,{productVideoEnabled=false}={}){
 if(!Array.isArray(options))return [];
 const seen=new Set(),items=[];
 for(const input of options){
  const id=input?.id,item=Object.hasOwn(copy,id)?copy[id]:null;
  if(!item||seen.has(id)||input.target!==item.target)continue;
  if(id==='product_ads'&&!productVideoEnabled)continue;
  seen.add(id);items.push({id,...item});
 }
 return items;
}
export function onboardingResponseTarget(response,selected,authorized){
 const option=Array.isArray(authorized)?authorized.find(item=>item.id===selected):null;
 return option&&response?.ok===true&&response.goal===selected&&response.target===option.target?option.target:null;
}
