// Whitelist the opaque provider task handle before returning it from the
// OWNER-ONLY API. Never echo untrusted legacy URLs, tokens or credentials.
export function ownerProviderTaskId(provider,value){
 if(typeof value!=='string'||value.length>512)return null;
 if(provider==='BytePlus')return /^[-A-Za-z0-9_]{1,160}$/.test(value)?value:null;
 if(provider==='Google')return /^(?:operations\/[A-Za-z0-9_-]+|models\/[a-z0-9.-]+\/operations\/[A-Za-z0-9_-]+)$/.test(value)?value:null;
 return null;
}
