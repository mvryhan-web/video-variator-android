/* DEEPSYQ page locale adapter. Translation data is bundled locally.
   Exact-English-source text only; never changes billing, user-input values,
   image assets, links, prices in APIs, checkout parameters or app state. */
(() => {
 'use strict';
 const langs=new Set(['en','ru','fr','es']);
 const localKey='deepsyq_home_language',altKey='deepsyq_lang';
 const page=location.pathname.split('/').pop()||'index.html';
 const dictionaries=new Map();
 let dictionary=Object.create(null),ready=false,current='en',pending=false,watcher=null;
 const originalText=new WeakMap(),originalAttrs=new WeakMap(),changed=new Set();
 const attrs=['title','placeholder','aria-label','aria-description','alt'];
 const excluded='script,style,pre,code,textarea,[contenteditable="true"],[data-no-translate],[translate="no"]';
 function language(){
   let name='';
   try{name=localStorage.getItem(localKey)||localStorage.getItem(altKey)||''}catch{}
   if(!name)name=document.documentElement.lang||navigator.languages?.[0]||navigator.language||'en';
   name=String(name).toLowerCase().slice(0,2);
   return langs.has(name)?name:'en';
 }
 function entry(key){return dictionary[key]||null}
 function originalOf(text){
   const m=/^(\s*)([\s\S]*?)(\s*)$/.exec(text);
   return {leading:m?.[1]||'',key:(m?.[2]||'').replace(/\s+/g,' ').trim(),ending:m?.[3]||''};
 }
 function translateNode(n){
   if(n.nodeType!==Node.TEXT_NODE||!n.parentElement||n.parentElement.closest(excluded))return;
   const before=n.nodeValue||'',info=originalOf(before);
   if(!info.key)return;
   let base=originalText.get(n);
   const known=entry(info.key);
   if(known){base=info.key;originalText.set(n,base);}
   if(!base)return;
   const tr=entry(base);
   if(!tr)return;
   const translated=current==='en'?base:tr[current]||base;
   const desired=info.leading+translated+info.ending;
   if(before!==desired&&[base,tr.ru,tr.fr,tr.es].includes(info.key))n.nodeValue=desired;
 }
 function translateAttrs(el){
   if(!el.hasAttributes?.()||el.closest(excluded))return;
   let original=originalAttrs.get(el);
   if(!original){original=new Map();originalAttrs.set(el,original);}
   for(const attr of attrs){
     const now=el.getAttribute(attr);
     if(!now)continue;
     const key=now.replace(/\s+/g,' ').trim(),known=entry(key);
     if(known)original.set(attr,key);
     const base=original.get(attr),tr=entry(base);
     if(!tr)continue;
     const desired=current==='en'?base:tr[current]||base;
     if(now!==desired&&[base,tr.ru,tr.fr,tr.es].includes(key))el.setAttribute(attr,desired);
   }
 }
 function walk(root){
   if(root.nodeType===Node.TEXT_NODE){translateNode(root);return}
   if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;
   if(root.nodeType===Node.ELEMENT_NODE&&root.closest(excluded))return;
   if(root.nodeType===Node.ELEMENT_NODE)translateAttrs(root);
   const it=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
   for(let node=it.nextNode();node;node=it.nextNode()){
     if(node.nodeType===Node.TEXT_NODE)translateNode(node);
     else translateAttrs(node);
   }
 }
 function apply(all=false){
   if(!ready)return;
   const next=language(),switched=next!==current;current=next;
   document.documentElement.lang=next==='en'?'en-US':next;
   if(all||switched){changed.clear();walk(document.documentElement);}
   else {const items=[...changed];changed.clear();for(const item of items)if(item.isConnected)walk(item);}
 }
 function enqueue(node){
   if(!ready)return;
   changed.add(node.nodeType===Node.TEXT_NODE?node:node);
   if(pending)return;pending=true;
   queueMicrotask(()=>{pending=false;apply(false);});
 }
 function observe(){
   watcher=new MutationObserver(records=>{
     for(const r of records){
       if(r.type==='characterData')enqueue(r.target);
       else if(r.type==='attributes')enqueue(r.target);
       else for(const n of r.addedNodes)enqueue(n);
     }
   });
   watcher.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attrs});
 }
 function onLanguage(){apply(true)}
 async function load(){
   const base='i18n/';
   const pageFile=encodeURIComponent(page)+'.json';
   try{
     const [shared,local]=await Promise.all([
       fetch(base+'shared.json',{cache:'force-cache'}),
       fetch(base+pageFile,{cache:'force-cache'})
     ]);
     if(!shared.ok||!local.ok)throw new Error('Missing approved locale catalog: '+page);
     const [s,p]=await Promise.all([shared.json(),local.json()]);
     for(const [k,v] of Object.entries(s.strings||{}))dictionaries.set(k,v);
     for(const [k,v] of Object.entries(p.strings||{}))dictionaries.set(k,v);
     dictionary=Object.fromEntries(dictionaries);
     ready=true;current=language();apply(true);observe();
     window.addEventListener('deepsyq:lang',onLanguage);
     window.addEventListener('storage',e=>{
       if(e.key===localKey||e.key===altKey||e.key===null)onLanguage();
     });
     window.addEventListener('pageshow',onLanguage);
     window.deepsyqLocale={get language(){return language()},refresh:onLanguage,
       get catalogSize(){return dictionaries.size}};
   }catch(error){console.warn('DEEPSYQ page language catalog unavailable:',error?.message||error)}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void load(),{once:true});
 else void load();
})();
