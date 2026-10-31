const DB='deepsyq-studio-handoff-v1',STORE='handoffs',KEY='deepsyq_studio_handoff_id',TTL=30*60*1000;
// The tab-global handoff pointer is NOT proof of ownership. Bind each
// IndexedDB record to the browser session that prepared its local files.
// Never store the raw bearer token. A legacy unscoped record fails closed.
function sessionToken(){return localStorage.getItem('vv_token')||'guest';}
async function sessionFingerprint(token){
 try{
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
 }catch(_){throw Error('LOCAL_HANDOFF_UNAVAILABLE');}
}
function sameSession(token){return sessionToken()===token;}
function openDb(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window))return reject(Error('LOCAL_HANDOFF_UNAVAILABLE'));const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('LOCAL_HANDOFF_UNAVAILABLE'));});}
function tx(db,mode,run){return new Promise((resolve,reject)=>{const t=db.transaction(STORE,mode),s=t.objectStore(STORE);let req;try{req=run(s);}catch(e){reject(e);return;}t.oncomplete=()=>resolve(req?.result);t.onerror=()=>reject(Error('LOCAL_HANDOFF_UNAVAILABLE'));t.onabort=()=>reject(Error('LOCAL_HANDOFF_UNAVAILABLE'));});}
function safeSettings(v){if(!v||typeof v!=='object'||Array.isArray(v))return{};const raw=JSON.stringify(v);if(raw.length>2000)throw Error('INVALID_HANDOFF');return v;}
function safeFiles(files){const list=Array.from(files||[]);if(list.length>4)throw Error('TOO_MANY_REFERENCES');for(const f of list)if(!(f instanceof Blob)||!['image/png','image/jpeg'].includes(f.type)||f.size>1024*1024)throw Error('INVALID_REFERENCE');return list;}
async function cleanupExpired(db,now=Date.now()){await new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readwrite'),s=t.objectStore(STORE),r=s.openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return;if(Number(c.value?.expiresAt||0)<now)c.delete();c.continue();};r.onerror=()=>reject(Error('LOCAL_HANDOFF_UNAVAILABLE'));t.oncomplete=()=>resolve();t.onerror=()=>reject(Error('LOCAL_HANDOFF_UNAVAILABLE'));});}
export async function saveStudioHandoff({kind,prompt,defaultModel=null,settings={},files=[],source='workflow',meta={}}){
 if(!['image','video','music'].includes(kind)||typeof prompt!=='string'||!prompt.trim()||prompt.length>2000)throw Error('INVALID_HANDOFF');
 const ownerToken=sessionToken(),ownerFingerprint=await sessionFingerprint(ownerToken);
 if(!sameSession(ownerToken))throw Error('LOCAL_HANDOFF_SESSION_CHANGED');
 const refs=safeFiles(files),id=crypto.randomUUID?.()||('handoff-'+Date.now()+'-'+Math.random().toString(16).slice(2)),now=Date.now();
 const serializedRefs=await Promise.all(refs.map(async(f,i)=>({name:f.name||('reference-'+(i+1)),type:f.type,lastModified:f.lastModified||now,bytes:await f.arrayBuffer()})));
 if(!sameSession(ownerToken))throw Error('LOCAL_HANDOFF_SESSION_CHANGED');
 const record={id,ownerFingerprint,createdAt:now,expiresAt:now+TTL,kind,prompt:prompt.trim(),defaultModel:defaultModel||null,settings:safeSettings(settings),source:String(source).slice(0,50),meta:safeSettings(meta),files:serializedRefs};
 const db=await openDb();try{
  await cleanupExpired(db,now);
  if(!sameSession(ownerToken))throw Error('LOCAL_HANDOFF_SESSION_CHANGED');
  await tx(db,'readwrite',s=>s.put(record));
  if(!sameSession(ownerToken)){
   await tx(db,'readwrite',s=>s.delete(id));
   throw Error('LOCAL_HANDOFF_SESSION_CHANGED');
  }
 }finally{db.close();}
 sessionStorage.setItem(KEY,id);return id;
}
export async function takeStudioHandoff(){
 const id=sessionStorage.getItem(KEY);if(!id)return null;sessionStorage.removeItem(KEY);
 const ownerToken=sessionToken(),ownerFingerprint=await sessionFingerprint(ownerToken);
 const db=await openDb();try{
  await cleanupExpired(db);
  const record=await tx(db,'readonly',s=>s.get(id));
  // Consume the pointer exactly once, including an old, expired or cross-user entry.
  await tx(db,'readwrite',s=>s.delete(id));
  if(!sameSession(ownerToken)||!record||record.expiresAt<Date.now()||record.ownerFingerprint!==ownerFingerprint)return null;
  return {...record,files:(record.files||[]).map(x=>new File([x.bytes??x.blob],x.name,{type:x.type,lastModified:x.lastModified}))};
 }finally{db.close();}
}
