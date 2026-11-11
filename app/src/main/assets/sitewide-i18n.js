/**
 * DEEPSYQ shared page translation runtime — visual text only.
 * No network translation, no paid APIs, no checkout/account side effects.
 * Installed on all public HTML entrypoints. Locale dictionaries are prebuilt
 * from owner-approved source strings and reviewed overrides.
 */
(() => {
  'use strict';
  if (window.__deepsyqPageI18n) return;
  const languages = new Set(['en','ru','fr','es']);
  const storageKeys = ['deepsyq_home_language','deepsyq_lang'];
  const origText = new WeakMap(), lastText = new WeakMap();
  const origAttr = new WeakMap(), lastAttr = new WeakMap();
  const attrs = ['placeholder','title','aria-label','alt'];
  const ignored = 'script,style,svg,noscript,code,pre,kbd,samp,textarea,[contenteditable],[data-no-i18n],[data-user-content],[data-private],[data-role="user"],[data-message-role="user"],.jarvix-user-message,.jarvis-user-message,.chat-user-message';
  const cached = new Map([['en',{}]]), counters = {translated:0,missing:new Set()};
  let locale = 'en', revision = 0, observer, scheduled = false, pending = new Set();
  function getLang(){
    let saved = '';
    try{saved = storageKeys.map(k=>localStorage.getItem(k)).find(Boolean)||'';}catch{}
    if(saved){const key=saved.toLowerCase().split(/[-_]/)[0];if(languages.has(key))return key;}
    const browser = String(navigator.languages?.[0]||navigator.language||'en').toLowerCase();
    if (/^(ru|uk|be)/.test(browser)) return 'ru';
    const key=browser.split(/[-_]/)[0];return languages.has(key)?key:'en';
  }
  function normalized(s){return String(s).replace(/\s+/g,' ').trim();}
  const numberSuffixes = {
    ru:{' tool credits / month':' кредитов инструментов / месяц',' AI credits':' AI-кредитов',' / month':' / месяц',' / year':' / год',' available':' доступно',' held':' удержано',' debt':' задолженность'},
    fr:{' tool credits / month':" crédits d’outils / mois",' AI credits':' crédits IA',' / month':' / mois',' / year':' / an',' available':' disponibles',' held':' réservés',' debt':' dette'},
    es:{' tool credits / month':' créditos de herramientas / mes',' AI credits':' créditos IA',' / month':' / mes',' / year':' / año',' available':' disponibles',' held':' retenidos',' debt':' deuda'}
  };
  function lookup(value){
    const key=normalized(value),dict=cached.get(locale);
    if(!key||!/[A-Za-z]{2}/.test(key)||locale==='en'||!dict)return null;
    if(Object.hasOwn(dict,key))return dict[key];
    // Dynamic numerical counters keep their exact amounts; only text suffixes change.
    if (/^[+-]?\d[\d\s,.]*\s+[A-Za-z]/.test(key)) {
      const suffixes=numberSuffixes[locale];
      for(const [from,to] of Object.entries(suffixes)){
        if(key.endsWith(from))return key.slice(0,-from.length)+to;
      }
    }
    return null;
  }
  function allowed(node){
    if(!node || !node.parentElement) return false;
    return !node.parentElement.closest(ignored);
  }
  function translateNode(node){
    if(node.nodeType!==Node.TEXT_NODE||!allowed(node))return;
    const seen=lastText.get(node),current=node.nodeValue;
    // A page component may regenerate its own text while we are translating.
    // Treat new source text as authoritative instead of overwriting it with old copy.
    if(!origText.has(node)||seen!==current)origText.set(node,current);
    const original=origText.get(node),text=normalized(original);
    if(!text)return;
    const dest=lookup(text);
    if(dest===null){
      if(locale!=='en'&&/[A-Za-z]{3}/.test(text)&&text.length>3)counters.missing.add(text);
      if(current!==original){lastText.set(node,original);node.nodeValue=original;}
      return;
    }
    if(dest!==text){
      const lead=original.match(/^\s*/)?.[0]||'',tail=original.match(/\s*$/)?.[0]||'';
      const translated=lead+dest+tail;
      if(current!==translated){lastText.set(node,translated);node.nodeValue=translated;counters.translated++;}
    }
  }
  function translateAttrs(el){
    if(el.matches(ignored)||el.closest(ignored))return;
    let base=origAttr.get(el),prev=lastAttr.get(el);
    if(!base){base={};prev={};origAttr.set(el,base);lastAttr.set(el,prev);}
    for(const attr of attrs){
      if(!el.hasAttribute(attr))continue;
      const current=el.getAttribute(attr);
      if(!Object.hasOwn(base,attr)||prev[attr]!==current)base[attr]=current;
      const original=base[attr],found=lookup(original),updated=found===null?original:found;
      if(current!==updated){prev[attr]=updated;el.setAttribute(attr,updated);}
    }
  }
  function visit(start){
    if(start.nodeType===Node.TEXT_NODE){translateNode(start);return;}
    if(start.nodeType!==Node.ELEMENT_NODE||start.matches(ignored))return;
    translateAttrs(start);
    const iterator=document.createTreeWalker(start,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{
      acceptNode:n=>{
        if(n.nodeType===Node.ELEMENT_NODE&&n.matches(ignored))return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while(iterator.nextNode()){
      const item=iterator.currentNode;
      if(item.nodeType===Node.TEXT_NODE)translateNode(item);
      else translateAttrs(item);
    }
  }
  function flush(){
    scheduled=false;
    if(!document.body)return;
    const items=[...pending];pending.clear();
    if(items.length>100){visit(document.body);return;}
    for(const element of items){if(element.isConnected)visit(element);}
  }
  function schedule(element){
    if(!element)return;
    pending.add(element);
    if(!scheduled){scheduled=true;queueMicrotask(flush);}
  }
  async function setLocale(){
    const wanted=getLang(),now=++revision;
    if(wanted!=='en'&&!cached.has(wanted)){
      try{
        const response=await fetch('i18n/catalog-'+wanted+'.json?v=20261111',{credentials:'same-origin',cache:'force-cache'});
        if(!response.ok)throw new Error('Missing catalog '+wanted);
        const catalog=await response.json();
        if(!catalog||catalog.language!==wanted||typeof catalog.entries!=='object')throw new Error('Invalid locale catalog');
        cached.set(wanted,catalog.entries);
      }catch(error){
        console.warn('DEEPSYQ language catalog unavailable:',wanted,error?.message);
        return;
      }
    }
    if(now!==revision)return;
    locale=wanted;
    document.documentElement.lang=locale==='en'?'en-US':locale;
    counters.translated=0;counters.missing.clear();
    schedule(document.body);
    window.dispatchEvent(new CustomEvent('deepsyq:i18n-applied',{detail:{language:locale}}));
  }
  function start(){
    observer=new MutationObserver(records=>{
      for(const record of records){
        if(record.type==='childList')for(const item of record.addedNodes)if(item.nodeType===1||item.nodeType===3)schedule(item);
        if(record.type==='characterData')schedule(record.target);
        if(record.type==='attributes')schedule(record.target);
      }
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attrs});
    void setLocale();
  }
  window.__deepsyqPageI18n={get language(){return locale;},setLocale,report:()=>({language:locale,translated:counters.translated,unmatched:[...counters.missing]})};
  window.addEventListener('deepsyq:lang',()=>{void setLocale();});
  window.addEventListener('storage',e=>{if(!e.key||storageKeys.includes(e.key))void setLocale();});
  window.addEventListener('pageshow',()=>{void setLocale();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
