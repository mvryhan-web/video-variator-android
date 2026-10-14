import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyTelegramInitData,TELEGRAM_FREE_LIMIT} from '../telegram-free-mini.js';
const token='12345:test-secret', now=1790000000;
function signed(id,date=now){
 const p=new URLSearchParams({query_id:'AA12',auth_date:String(date),user:JSON.stringify({id,first_name:'Test'})});
 const check=[...p].map(([k,v])=>k+'='+v).sort().join('\n');
 const h=createHmac('sha256','WebAppData').update(token).digest();
 p.set('hash',createHmac('sha256',h).update(check).digest('hex'));
 return p.toString();
}
test('five free Telegram preview limit',()=>assert.equal(TELEGRAM_FREE_LIMIT,5));
test('signed Telegram identity accepted',()=>assert.deepEqual(verifyTelegramInitData(signed(12345),token,now),{id:'12345'}));
test('tampered identity rejected',()=>{
 const p=new URLSearchParams(signed(12345));p.set('user',JSON.stringify({id:99999}));
 assert.equal(verifyTelegramInitData(p.toString(),token,now),null);
});
test('expired or future Telegram sessions rejected',()=>{
 assert.equal(verifyTelegramInitData(signed(12345,now-3601),token,now),null);
 assert.equal(verifyTelegramInitData(signed(12345,now+61),token,now),null);
});
test('duplicate fields and wrong bot secret rejected',()=>{
 assert.equal(verifyTelegramInitData(signed(12345)+'&user=forged',token,now),null);
 assert.equal(verifyTelegramInitData(signed(12345),'other:token',now),null);
});

