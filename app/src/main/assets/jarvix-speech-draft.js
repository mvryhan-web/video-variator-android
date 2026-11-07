// Browser result lists are evolving snapshots, not append-only chunks.
export function createSpeechDraft(base='') {
 const slots=new Map();
 return event=>{
  for(let i=event.resultIndex||0;i<event.results.length;i++)slots.set(i,String(event.results[i]?.[0]?.transcript||'').trim());
  for(const index of slots.keys())if(index>=event.results.length)slots.delete(index);
  const pieces=[];let previous='';
  for(const [,text] of [...slots].sort((a,b)=>a[0]-b[0])){const key=text.replace(/\s+/g,' ').toLocaleLowerCase();if(key&&key!==previous)pieces.push(text);if(key)previous=key;}
  return [base.trim(),...pieces].filter(Boolean).join(' ').trim();
 };
}
