import {createHash,randomUUID} from 'node:crypto';
// Scope the existing brain memory; a caller-supplied session ID is never ownership.
export function jarvixSessionScope(req,res,clientId){
 const cookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>/^ds_jarvix_visitor=[a-f0-9-]{36}$/i.test(x));
 let visitor=cookie?.split('=')[1];
 if(!visitor){visitor=randomUUID();const secure=req.secure||String(req.headers['x-forwarded-proto']||'').split(',')[0].trim()==='https';res.append('Set-Cookie',`ds_jarvix_visitor=${visitor}; HttpOnly; SameSite=Lax; Path=/api/jarvix; Max-Age=86400${secure?'; Secure':''}`);}
 const sid=typeof clientId==='string'&&/^[\w-]{1,80}$/.test(clientId)?clientId:'jarvix-'+randomUUID();
 const identity=req.user?.id?`user:${req.user.id}`:`visitor:${visitor}:auth:${String(req.headers.authorization||'')}`;
 return {clientId:sid,privateId:createHash('sha256').update(identity+'\0'+sid).digest('hex')};
}
