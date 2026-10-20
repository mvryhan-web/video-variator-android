/* Versioned, explicit, account-scoped first-use acceptance.
   No default checkbox, provider call, purchase or hidden approval. */
const apiPath='/api/studio/consent';
const storageLocale=()=>{try{return localStorage.getItem('deepsyq_home_language')||'en';}catch(_){return'en';}};
const token=()=>{try{return localStorage.getItem('vv_token');}catch(_){return null;}};
const wording={
 en:{
  title:'Welcome to Deepsyq',intro:'Before using the platform, review these terms and choose how your creative content may be processed.',
  terms:'I accept the Terms of Service',privacy:'I have read the Privacy Policy',
  provider:'I agree that prompts and reference photos I choose to submit for AI generation may be sent to the selected external provider (such as Google or BytePlus).',
  note:'AI generation requires this separate permission. You can still use local tools without it. Provider processing may occur outside your country; see the AI Privacy notice.',
  accept:'Save my choices',later:'Later',error:'Could not save your choices. Nothing was sent to an AI provider.',
  required:'Please accept the Terms and confirm you have read the Privacy Policy.'
 },
 fr:{
  title:'Bienvenue sur Deepsyq',intro:'Avant d’utiliser la plateforme, consultez les conditions et choisissez comment vos créations pourront être traitées.',
  terms:'J’accepte les Conditions d’utilisation',privacy:'J’ai lu la Politique de confidentialité',
  provider:'J’accepte que les demandes et les photos de référence que je choisis d’envoyer pour la génération IA soient transmises au fournisseur externe sélectionné (comme Google ou BytePlus).',
  note:'Cette autorisation distincte est nécessaire pour la génération IA. Les outils locaux restent accessibles sans elle. Consultez la notice de confidentialité IA pour les transferts internationaux.',
  accept:'Enregistrer mes choix',later:'Plus tard',error:'Impossible d’enregistrer les choix. Aucune donnée n’a été transmise au fournisseur IA.',
  required:'Acceptez les conditions et confirmez la lecture de la politique de confidentialité.'
 },
 ru:{
  title:'Добро пожаловать в Deepsyq',intro:'Перед использованием платформы ознакомьтесь с правилами и выберите, как могут обрабатываться ваши материалы.',
  terms:'Я принимаю Условия использования',privacy:'Я ознакомился с Политикой конфиденциальности',
  provider:'Я согласен, что мои запросы и выбранные фотографии для AI-генерации могут передаваться выбранному внешнему провайдеру (например, Google или BytePlus).',
  note:'Для AI-генерации требуется отдельное согласие. Без него доступны локальные инструменты. О международной передаче данных читайте в политике AI.',
  accept:'Сохранить выбор',later:'Позже',error:'Не удалось сохранить согласие. AI-провайдеру ничего не отправлено.',
  required:'Примите условия и подтвердите ознакомление с политикой конфиденциальности.'
 }
};
let inFlight=null;
function serverBase(){let b='';try{b=window.AndroidBridge?.getApiBase?.()||'';}catch(_){}return String(b||window.VV_API_BASE||location.origin).replace(/\/$/,'');}
export async function readConsent(){
 const t=token();if(!t)return {termsAccepted:false,providerAccepted:false,authenticated:false};
 const response=await fetch(serverBase()+apiPath,{headers:{Authorization:'Bearer '+t},cache:'no-store'});
 if(!response.ok)throw Error('CONSENT_UNAVAILABLE');
 const data=await response.json();
 if(t!==token())throw Error('ACCOUNT_CHANGED');
 return {...data,authenticated:true};
}
function styledModal(){
 if(!document.querySelector('link[href="studio-consent-ui.css"]')){const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='studio-consent-ui.css';document.head.append(sheet);}
 const dialog=document.createElement('dialog');dialog.className='ds-consent-modal';dialog.setAttribute('aria-labelledby','dsConsentTitle');
 const content=document.createElement('section');const title=document.createElement('h2');title.id='dsConsentTitle';
 const intro=document.createElement('p');const legal=document.createElement('div');legal.className='ds-consent-legal';
 const termsLink=document.createElement('a');termsLink.href='terms.html';termsLink.target='_blank';termsLink.rel='noopener';termsLink.textContent='Terms · Conditions';
 const privacyLink=document.createElement('a');privacyLink.href='ai-privacy.html';privacyLink.target='_blank';privacyLink.rel='noopener';privacyLink.textContent='AI Privacy';
 const cookiesLink=document.createElement('a');cookiesLink.href='cookie.html';cookiesLink.target='_blank';cookiesLink.rel='noopener';cookiesLink.textContent='Cookies';
 legal.append(termsLink,privacyLink,cookiesLink);
 const form=document.createElement('form');form.noValidate=true;
 function check(){const label=document.createElement('label'),field=document.createElement('input'),span=document.createElement('span');field.type='checkbox';field.checked=false;label.append(field,span);form.append(label);return {field,span};}
 const terms=check(),privacy=check(),provider=check();
 const note=document.createElement('p');note.className='ds-consent-note';
 const status=document.createElement('p');status.className='ds-consent-status';status.setAttribute('role','status');
 const controls=document.createElement('div');controls.className='ds-consent-actions';
 const save=document.createElement('button');save.type='submit';save.className='ds-consent-primary';
 const later=document.createElement('button');later.type='button';later.className='ds-consent-later';
 controls.append(save,later);form.append(note,status,controls);content.append(title,intro,legal,form);dialog.append(content);
 const w=wording[storageLocale()]||wording.en;title.textContent=w.title;intro.textContent=w.intro;
 terms.span.textContent=w.terms;privacy.span.textContent=w.privacy;provider.span.textContent=w.provider;
 note.textContent=w.note;save.textContent=w.accept;later.textContent=w.later;
 return {dialog,form,terms,privacy,provider,save,later,status,w};
}
export async function presentConsent({force=false}={}){
 if(inFlight)return inFlight;
 const t=token();if(!t)return {authenticated:false,providerAccepted:false,shown:false};
 let state;
 try{state=await readConsent();}
 catch(_){return {authenticated:true,providerAccepted:false,storageUnavailable:true,shown:false};}
 if(!force&&(state.providerAccepted||state.termsAccepted))return {...state,shown:false};
 inFlight=new Promise(resolve=>{
  const ui=styledModal(),close=result=>{if(ui.dialog.open)ui.dialog.close();ui.dialog.remove();inFlight=null;resolve(result);};
  document.body.append(ui.dialog);ui.dialog.showModal();
  ui.later.onclick=()=>close({...state,shown:true,dismissed:true});
  ui.dialog.addEventListener('cancel',event=>{event.preventDefault();close({...state,shown:true,dismissed:true});});
  ui.form.onsubmit=async event=>{
   event.preventDefault();if(!ui.terms.field.checked||!ui.privacy.field.checked){ui.status.textContent=ui.w.required;return;}
   ui.save.disabled=true;ui.later.disabled=true;ui.status.textContent='';
   try{
    if(t!==token())throw Error('ACCOUNT_CHANGED');
    const response=await fetch(serverBase()+apiPath,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify({
     version:state.version,termsAccepted:true,privacyAcknowledged:true,providerAccepted:ui.provider.field.checked
    })});
    if(!response.ok||t!==token())throw Error('CONSENT_UNAVAILABLE');
    const saved=await response.json();
    close({...saved,authenticated:true,termsAccepted:true,shown:true});
   }catch(_){ui.status.textContent=ui.w.error;ui.save.disabled=false;ui.later.disabled=false;}
  };
 });
 return inFlight;
}
