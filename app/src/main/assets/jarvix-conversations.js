// Private browser persistence for the existing JARVIX session, never raw tokens.
export function makeId(){return crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');}
const DB='deepsyq-jarvix-conversations-v1',STORE='conversations';
export async function ownerScope(token=localStorage.getItem('vv_token')||'guest'){
 if(!crypto.subtle){if(token==='guest')return 'guest-local-preview';throw Error('Private account history requires HTTPS.');}
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
export function resolveMode(text,selected='auto'){
 if(['text','image','video','audio'].includes(selected))return selected;
 if(/видео|ролик|ожив|video|vidéo|vídeo|animat/i.test(text))return 'video';
 if(/музык|песн|аудио|озвуч|music|audio|song|musique|música|voix|voz/i.test(text))return 'audio';
 if(/фото|картин|нарис|изображ|image|photo|draw|picture|imagen|foto/i.test(text))return 'image';
 return 'text';
}
function open(){return new Promise((yes,no)=>{const r=indexedDB.open(DB,2);r.onupgradeneeded=()=>{const store=r.result.objectStoreNames.contains(STORE)?r.transaction.objectStore(STORE):r.result.createObjectStore(STORE,{keyPath:'id'});if(!store.indexNames.contains('owner'))store.createIndex('owner','owner');};r.onsuccess=()=>yes(r.result);r.onerror=()=>no(Error('LOCAL_STORAGE_UNAVAILABLE'));});}
async function transaction(mode,run){const db=await open();try{return await new Promise((yes,no)=>{const t=db.transaction(STORE,mode),r=run(t.objectStore(STORE));t.oncomplete=()=>yes(r.result);t.onabort=t.onerror=()=>no(Error('LOCAL_STORAGE_UNAVAILABLE'));});}finally{db.close();}}
export async function conversationStore(){
 const token=localStorage.getItem('vv_token')||'guest';let identity=token;
 if(token!=='guest'){try{const response=await fetch('/api/me',{headers:{Authorization:'Bearer '+token},cache:'no-store'});if(response.ok){const data=await response.json();if(data.user?.id)identity='user:'+data.user.id;}}catch{}}
 const scope=await ownerScope(identity);
 const guard=()=>{if((localStorage.getItem('vv_token')||'guest')!==token)throw Error('ACCOUNT_CHANGED');};
 return {
  guard,scope,
  async list(){guard();const rows=await transaction('readonly',s=>s.index('owner').getAll(scope));guard();return rows.filter(r=>r.owner===scope).sort((a,b)=>b.updatedAt-a.updatedAt);},
  async get(id){guard();if(!id)return null;const r=await transaction('readonly',s=>s.get(id));guard();return r?.owner===scope?r:null;},
  async save(record){guard();if(record.owner&&record.owner!==scope)throw Error('ACCOUNT_CHANGED');const next={...record,owner:scope,updatedAt:Date.now()};await transaction('readwrite',s=>s.put(next));guard();return next;},
  async removeCachedResult(jobId){
   guard();
   await transaction('readwrite',s=>{
    const cursor=s.index('owner').openCursor(scope);
    cursor.onsuccess=()=>{
     guard();
     const row=cursor.result;
     if(!row)return;
     const record=row.value;
     let changed=false;
     for(const message of record.messages||[]){
      if(message.jobId!==jobId||!(message.resultFile instanceof Blob))continue;
      delete message.resultFile;
      message.mediaExpired=true;
      message.mediaUrl=null;
      changed=true;
     }
     if(changed)row.update(record);
     row.continue();
    };
   });
   guard();
  },
  create(sessionId){guard();return {id:makeId(),sessionId,owner:scope,title:'New conversation',messages:[],updatedAt:Date.now()};}
 };
}
const ALLOWED_EXTS = /\.(png|jpe?g|webp|gif|heic|heif|svg|mp4|mov|webm|avi|mkv|m4v|3gp|mp3|wav|m4a|aac|ogg|flac|txt|pdf|md)$/i;

export function isAllowedAttachment(f) {
 if (!f || typeof f.size !== 'number') return false;
 if (f.size > 100 * 1024 * 1024) return false;
 const type = String(f.type || '').toLowerCase();
 if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/') || type === 'text/plain' || type === 'application/pdf' || type === 'application/octet-stream') {
  return true;
 }
 const name = String(f.name || '').toLowerCase();
 return ALLOWED_EXTS.test(name);
}

export function validateAttachments(files){
 const list=Array.from(files||[]);
 if(list.length>10){
  let lang='ru';try{lang=(localStorage.getItem('deepsyq_home_language')||document.documentElement.lang||'ru').slice(0,2)}catch{}
  throw Error(lang==='ru'?'Максимум 10 файлов за один раз.':'Up to 10 files per message.');
 }
 for(const f of list){
  if(!isAllowedAttachment(f)){
   let lang='ru';try{lang=(localStorage.getItem('deepsyq_home_language')||document.documentElement.lang||'ru').slice(0,2)}catch{}
   if (f && f.size > 100 * 1024 * 1024) {
    throw Error(lang==='ru'?'Файл слишком большой (максимум 100 МБ).':'File is too large (100 MB max).');
   }
   throw Error(lang==='ru'?'Поддерживаются фото, видео, аудио и текстовые файлы до 100 МБ.':'Supported formats: photos, videos, audio and text files up to 100 MB.');
  }
 }
 return list;
}
