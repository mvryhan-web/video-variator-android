import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyTelegramMiniInitData,TELEGRAM_MINI_TRIAL_LIMIT} from '../telegram-mini.js';
const bot='12345:bot_token_fixture';
const now=1781120000;
function payload(userId,authDate=now){
 const input=new URLSearchParams({user:JSON.stringify({id:userId,first_name:'User'}),auth_date:String(authDate),query_id:'demo'});
 const check=[...input].map(([k,v])=>k+'='+v).sort().join('\n');
 const secret=createHmac('sha256','WebAppData').update(bot).digest();
 const hash=createHmac('sha256',secret).update(check).digest('hex');
 input.set('hash',hash);return input.toString();
}
test('trial limit is five',()=>assert.equal(TELEGRAM_MINI_TRIAL_LIMIT,5));
test('accepts signed Telegram initData',()=>assert.deepEqual(verifyTelegramMiniInitData(payload('54321'),bot,now),{id:'54321',firstName:'User'}));
test('rejects changed user after signing',()=>{
 const q=new URLSearchParams(payload('54321'));q.set('user',JSON.stringify({id:99999,first_name:'User'}));
 assert.equal(verifyTelegramMiniInitData(q.toString(),bot,now),null);
});
test('rejects expired and future data',()=>{
 assert.equal(verifyTelegramMiniInitData(payload('54321',now-3601),bot,now),null);
 assert.equal(verifyTelegramMiniInitData(payload('54321',now+61),bot,now),null);
});
test('rejects duplicate identity fields and unknown bot token',()=>{
 const raw=payload('54321');
 assert.equal(verifyTelegramMiniInitData(raw+'&user=%7B%7D',bot,now),null);
 assert.equal(verifyTelegramMiniInitData(raw,'another',now),null);
});
