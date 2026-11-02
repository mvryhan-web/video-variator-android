/* DEEPSYQ F8 Living Companion — isolated no-spend policy.
 * This is presentation policy, NOT an authorization/billing/quote layer.
 * All S01-S16 are registered; only five mock previews have demo capability.
 * Real non-demo routes remain gated until actual verified integrations exist.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DeepsyqLivingPet=api;
})(typeof globalThis!=='undefined'?globalThis:typeof window!=='undefined'?window:null,function(){
 'use strict';
 const SCENARIOS=Object.freeze([
    {id:'S01',title:'Количество изображений и проверенная смета',group:'credits',stage:'demo'},
    {id:'S02',title:'Защита от повторного Create',group:'credits',stage:'demo'},
    {id:'S03',title:'Совместимая альтернативная модель',group:'ai',stage:'gated'},
    {id:'S04',title:'Вертикальный формат Shorts/Reels',group:'creative',stage:'demo'},
    {id:'S05',title:'Разрешение и качество печати',group:'creative',stage:'gated'},
    {id:'S06',title:'Забытый референс',group:'creative',stage:'gated'},
    {id:'S07',title:'Несовместимые настройки модели',group:'ai',stage:'gated'},
    {id:'S08',title:'Восстановление сохранённого черновика',group:'workspace',stage:'demo'},
    {id:'S09',title:'Сохранение перед удалением',group:'workspace',stage:'gated'},
    {id:'S10',title:'Готовый результат своего аккаунта',group:'workspace',stage:'demo'},
    {id:'S11',title:'Навигация по своей истории',group:'workspace',stage:'gated'},
    {id:'S12',title:'Бесплатный инструмент вместо AI',group:'creative',stage:'gated'},
    {id:'S13',title:'Режим вокала в музыке',group:'creative',stage:'gated'},
    {id:'S14',title:'Уход со страницы при выполнении',group:'workspace',stage:'gated'},
    {id:'S15',title:'Личный лимит кредитов',group:'credits',stage:'gated'},
    {id:'S16',title:'Мягкое знакомство с платформой',group:'workspace',stage:'gated'}
 ].map(row=>Object.freeze(row)));
 const BY_ID=Object.fromEntries(SCENARIOS.map(s=>[s.id,s]));
 const DEMO_IDS=new Set(SCENARIOS.filter(s=>s.stage==='demo').map(s=>s.id));
 const DEFAULT_COOLDOWN_MS=10*60*1000;
 const MAX_OPTIONAL_PER_SESSION=3;
 const CONFIRMED_SOURCES=new Set(['mock-preview','server-verified']);
 function normalizeSettings(raw={}){
  const s=raw&&typeof raw==='object'?raw:{};
  const movement=['gentle','playful','still'].includes(s.movement)?s.movement:'gentle';
  const side=['auto','left','right'].includes(s.side)?s.side:'auto';
  const size=['small','medium','large'].includes(s.size)?s.size:'medium';
  const face=['expressive','subtle'].includes(s.face)?s.face:'expressive';
  const enabledByScenario={};
  for(const rule of SCENARIOS)enabledByScenario[rule.id]=s.enabledByScenario?.[rule.id]!==false;
  return {movement,side,size,face,tipsEnabled:s.tipsEnabled!==false,
   voiceEnabled:false,enabledByScenario}; // voice not implemented: never claim activation
 }
 function canAmbientWalk({settings={},width=1200,hidden=false,reducedMotion=false,
  inputFocused=false,dialogOpen=false,busy=false}={}){
  const s=normalizeSettings(settings);
  return width>=769&&!hidden&&!reducedMotion&&!inputFocused&&!dialogOpen&&!busy&&
   settings?.enabled!==false&&settings?.mode!=='off'&&s.movement!=='still';
 }
 // Every source event must come from an authenticated/real system or an
 // explicitly labeled isolated mock preview; never trust a typed prompt as proof.
 function evidenceValid(rule,event){
  if(!event||event.verified!==true||!CONFIRMED_SOURCES.has(event.source))return false;
  if(rule.stage==='demo'&&event.source==='mock-preview'){
   if(rule.id==='S01')return event.quantity===2&&event.quoteVerified===true;
   if(rule.id==='S02')return typeof event.jobId==='string'&&event.jobId.length>0&&event.queued===true;
   if(rule.id==='S04')return event.platform==='short-video'&&event.ratio==='16:9';
   if(rule.id==='S08')return event.draftSaved===true;
   if(rule.id==='S10')return typeof event.jobId==='string'&&event.jobId.length>0&&event.status==='READY'&&event.owned===true;
  }
  if(event.source==='server-verified'){
   // A server flag is not a substitute for per-user ownership/quote checking.
   if(!event.ownerVerified)return false;
   if(rule.id==='S01')return event.quoteVerified===true&&Number.isInteger(event.quantity)&&event.quantity>1;
   if(rule.id==='S02')return !!event.jobId&&event.queued===true;
   if(rule.id==='S10')return !!event.jobId&&event.status==='READY'&&event.owned===true;
   if(rule.id==='S08')return event.draftSaved===true;
   if(rule.id==='S04')return event.platform==='short-video'&&event.ratio==='16:9';
   return event.capabilityVerified===true;
  }
  return false;
 }
 function createController(){
  const lastByKey=new Map();
  const ignoredTypes=new Set();
  let lastOptionalAt=-Infinity,optionalCount=0;
  const reject=reason=>({show:false,reason});
  function evaluate({id,event={},settings={},state={},now=Date.now(),userInitiated=false}={}){
   const rule=BY_ID[id];
   if(!rule)return reject('UNKNOWN');
   const prefs=normalizeSettings(settings);
   if(settings?.mode==='off'||settings?.enabled===false||!prefs.tipsEnabled)return reject('OFF');
   if(!prefs.enabledByScenario[id]||ignoredTypes.has(id))return reject('DISMISSED');
   if(state.inputFocused||state.dialogOpen||state.checkoutOpen||state.overlayOpen||state.hidden||state.busy)return reject('BUSY');
   if(state.bubbleVisible)return reject('ONE_AT_A_TIME');
   if(rule.stage==='gated'&&event.capabilityVerified!==true)return reject('NOT_IMPLEMENTED');
   if(!evidenceValid(rule,event))return reject('UNVERIFIED');
   const isDemo=event.source==='mock-preview';
   if(isDemo&&!DEMO_IDS.has(id))return reject('NOT_IMPLEMENTED');
   // Never automatically show real-world tips from isolated mock data.
   if(isDemo&&!userInitiated)return reject('MOCK_MANUAL_ONLY');
   const key=id+':'+String(event.signature||event.jobId||event.ratio||event.quantity||'event').slice(0,128);
   if(lastByKey.has(key))return reject('DUPLICATE');
   const priority=(id==='S01'||id==='S02'||id==='S09'||id==='S15')?'critical':'optional';
   if(!userInitiated&&priority!=='critical'&&(optionalCount>=MAX_OPTIONAL_PER_SESSION||
      now-lastOptionalAt<DEFAULT_COOLDOWN_MS))return reject('QUIET');
   return {show:true,id,priority,stage:rule.stage,key};
  }
  function offer(args={}){
   const result=evaluate(args);
   if(!result.show)return result;
   lastByKey.set(result.key,Number.isFinite(args.now)?args.now:Date.now());
   if(result.priority!=='critical'&&!args.userInitiated){
    optionalCount+=1;lastOptionalAt=Number.isFinite(args.now)?args.now:Date.now();
   }
   return result;
  }
  return Object.freeze({evaluate,offer,ignoreType:(id)=>{if(BY_ID[id])ignoredTypes.add(id);},
   resetSession:()=>{lastByKey.clear();ignoredTypes.clear();lastOptionalAt=-Infinity;optionalCount=0;},
   snapshot:()=>({optionalCount,seenCount:lastByKey.size,ignored:[...ignoredTypes]})});
 }
 return Object.freeze({SCENARIOS,DEMO_IDS:Object.freeze([...DEMO_IDS]),normalizeSettings,
  canAmbientWalk,createController});
});
