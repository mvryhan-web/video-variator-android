import test from 'node:test';
import assert from 'node:assert/strict';
import {watcherTelegramConfig,deliverCriticalWatcherAlertsOnce,listWatcherNotificationStatus} from '../server/product-watcher/telegram-alerts.js';

const env={PRODUCT_WATCHER_ENABLED:'true',PRODUCT_WATCHER_TELEGRAM_ALERTS_ENABLED:'true',
 TELEGRAM_BOT_TOKEN:'1234567:EXAMPLE_TEST_TOKEN_NEVER_REAL_ABCDEFG',
 PRODUCT_WATCHER_OWNER_TELEGRAM_CHAT_ID:'123456789'};
function fake({paused=false,alerts=[{id:'8',source:'http',code:'HTTP_UNAVAILABLE'}]}={}){
 const queries=[],events=new Map();
 const client={async query(sql,args=[]){
  queries.push([sql,args]);
  if(sql==='SELECT paused FROM vv_product_watcher_control WHERE id=1')return{rows:[{paused}]};
  if(sql.includes('FROM vv_product_watcher_alerts a')){
    const unclaimed=sql.includes('NOT EXISTS')
      ? alerts.filter(a=>!events.has(String(a.id)))
      : alerts;
    return{rows:unclaimed.slice(0,3)};
  }
  if(sql.startsWith('INSERT INTO vv_product_watcher_notifications')){
    if(events.has(String(args[0])))return{rows:[]};
    const id=events.size+1;events.set(String(args[0]),{id,alert_id:args[0],status:'sending'});
    return{rows:[{id}]};
  }
  if(sql.startsWith('UPDATE vv_product_watcher_notifications')){
    for(const entry of events.values())if(entry.id===args[0])entry.status=args[1];
    return{rows:[]};
  }
  if(sql.startsWith('SELECT n.id,n.status,n.created_at')){
    return{rows:[...events.values()].map(x=>({
     id:x.id,status:x.status,source:'http',code:'HTTP_UNAVAILABLE',
     created_at:'2026-10-15',checked_at:null,delivered_at:null}))};
  }
  throw Error('UNEXPECTED_SQL '+sql);
 },release(){}};
 return{pool:{connect:async()=>client,query:client.query},queries,events};
}
test('alerts are disabled by default, and owner destination is mandatory',async()=>{
 const d=fake(),r=await deliverCriticalWatcherAlertsOnce({pool:d.pool,env:{}});
 assert.equal(r.status,'disabled');assert.equal(d.queries.length,0);
 assert.throws(()=>watcherTelegramConfig({...env,PRODUCT_WATCHER_OWNER_TELEGRAM_CHAT_ID:''}),
  /WATCHER_TELEGRAM_NOT_CONFIGURED/);
 assert.throws(()=>watcherTelegramConfig({...env,PRODUCT_WATCHER_OWNER_TELEGRAM_CHAT_ID:'-123456'}),
  /WATCHER_TELEGRAM_NOT_CONFIGURED/);
 assert.equal(watcherTelegramConfig(env).enabled,true);
});
test('no messages are sent when watcher owner pauses',async()=>{
 const d=fake({paused:true}),r=await deliverCriticalWatcherAlertsOnce({pool:d.pool,env,
  fetchFn:async()=>{throw Error('never')}});
 assert.equal(r.status,'paused');assert.equal(d.events.size,0);
});
test('critical alerts go to explicit owner only, sending at most once even after restart',async()=>{
 const d=fake(),messages=[];
 const fetchFn=async(url,request)=>{
  assert.match(url,/^https:\/\/api\.telegram\.org\/bot/);assert.equal(request.redirect,'error');
  const body=JSON.parse(request.body);messages.push(body);
  assert.equal(body.chat_id,env.PRODUCT_WATCHER_OWNER_TELEGRAM_CHAT_ID);
  assert.equal(body.text.includes('HTTP_UNAVAILABLE'),true);
  assert.equal(body.text.includes('customer'),false);
  return{status:200,json:async()=>({ok:true})};
 };
 const one=await deliverCriticalWatcherAlertsOnce({pool:d.pool,env,fetchFn});
 assert.deepEqual([one.attempted,one.sent],[1,1]);assert.equal(d.events.get('8').status,'sent');
 const repeat=await deliverCriticalWatcherAlertsOnce({pool:d.pool,env,fetchFn});
 assert.deepEqual([repeat.attempted,repeat.sent],[0,0]);
 assert.equal(messages.length,1);
});
test('uncertain delivery is never automatically retried or marked delivered',async()=>{
 const d=fake(),first=await deliverCriticalWatcherAlertsOnce({pool:d.pool,env,
  fetchFn:async()=>{throw Error('SECRET FROM NETWORK')}});
 assert.equal(first.status,'partial');assert.equal(first.sent,0);
 assert.equal(d.events.get('8').status,'delivery_unknown');
 const again=await deliverCriticalWatcherAlertsOnce({pool:d.pool,env,fetchFn:async()=>{throw Error('must not retry')}});
 assert.equal(again.attempted,0);
 assert.ok(!JSON.stringify(again).includes('SECRET'));
});
test('notification owner status never returns Telegram credentials or target chat',async()=>{
 const d=fake();await deliverCriticalWatcherAlertsOnce({pool:d.pool,env,
  fetchFn:async()=>({status:200,json:async()=>({ok:true})})});
 const listed=await listWatcherNotificationStatus(d.pool,{limit:300});
 assert.equal(listed.length,1);assert.equal(listed[0].code,'HTTP_UNAVAILABLE');
 assert.equal(JSON.stringify(listed).includes(env.TELEGRAM_BOT_TOKEN),false);
 assert.equal(JSON.stringify(listed).includes(env.PRODUCT_WATCHER_OWNER_TELEGRAM_CHAT_ID),false);
});

test('critical notification backlog drains after initial three without re-sending claimed alerts',async()=>{
 const alerts=Array.from({length:5},(_,i)=>({
  id:String(i+10),source:'http',code:'HTTP_UNAVAILABLE'
 }));
 const d=fake({alerts});let sent=0;
 const fetchFn=async()=>{sent++;return{status:200,json:async()=>({ok:true})};};
 const first=await deliverCriticalWatcherAlertsOnce({pool:d.pool,env,fetchFn});
 assert.deepEqual([first.attempted,first.sent],[3,3]);
 const second=await deliverCriticalWatcherAlertsOnce({pool:d.pool,env,fetchFn});
 assert.deepEqual([second.attempted,second.sent],[2,2]);
 const third=await deliverCriticalWatcherAlertsOnce({pool:d.pool,env,fetchFn});
 assert.deepEqual([third.attempted,third.sent],[0,0]);
 assert.equal(sent,5);assert.equal(d.events.size,5);
 assert.ok([...d.events.values()].every(x=>x.status==='sent'));
 const query=d.queries.find(([sql])=>sql.includes('FROM vv_product_watcher_alerts a'));
 assert.match(query[0],/NOT EXISTS/);
 assert.match(query[0],/LIMIT 3/);
});

test('uncertain claimed delivery does not block later undelivered critical events',async()=>{
 const alerts=Array.from({length:4},(_,i)=>({
  id:String(i+20),source:'http',code:'HTTP_UNAVAILABLE'
 }));
 const d=fake({alerts});let attempted=0;
 const failed=await deliverCriticalWatcherAlertsOnce({pool:d.pool,env,
  fetchFn:async()=>{attempted++;throw Error('network receipt unavailable');}});
 assert.deepEqual([failed.attempted,failed.sent],[3,0]);
 const later=await deliverCriticalWatcherAlertsOnce({pool:d.pool,env,
  fetchFn:async()=>{attempted++;return{status:200,json:async()=>({ok:true})};}});
 assert.deepEqual([later.attempted,later.sent],[1,1]);
 assert.equal(attempted,4);
 assert.equal(d.events.get('20').status,'delivery_unknown');
 assert.equal(d.events.get('23').status,'sent');
});
