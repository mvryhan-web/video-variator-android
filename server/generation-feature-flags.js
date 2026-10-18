// BASE #50: reversible kill switches over the EXISTING Studio model catalog.
// Compatibility rule: unset flags preserve historical operator configuration.
// When explicitly configured, ONLY the literal "true" enables a category.
// Do not gate historical results, settlement or polling of an already-paid job.
const switchEnabled=(env,key)=>
 !Object.prototype.hasOwnProperty.call(env,key)||env[key]==='true';

export function generationFeatureSwitches(env={}){
 return {
  image:switchEnabled(env,'AI_IMAGE_ENABLED'),
  video:switchEnabled(env,'AI_VIDEO_ENABLED'),
  byteplus:switchEnabled(env,'BYTEPLUS_ENABLED')
 };
}

export function generationFeatureEnabled(kind,provider,env={}){
 const flags=generationFeatureSwitches(env);
 if(kind==='image'&&!flags.image)return false;
 if(kind==='video'&&!flags.video)return false;
 if(provider==='BytePlus'&&!flags.byteplus)return false;
 return true;
}
