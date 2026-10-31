// Reuse the existing Telegram bot token. No new bot, webhook or customer messaging.
export function watcherTelegramConfig(env={}){
  if(env.PRODUCT_WATCHER_ENABLED!=='true'||env.PRODUCT_WATCHER_TELEGRAM_ALERTS_ENABLED!=='true')
    return{enabled:false};
  const token=String(env.TELEGRAM_BOT_TOKEN||'').trim();
  const chatId=String(env.PRODUCT_WATCHER_OWNER_TELEGRAM_CHAT_ID||'').trim();
  if(!token||!/^[1-9][0-9]{0,18}$/.test(chatId))throw Error('WATCHER_TELEGRAM_NOT_CONFIGURED');
  return{enabled:true,token,chatId};
}

export async function deliverCriticalWatcherAlertsOnce({pool,env={},fetchFn=globalThis.fetch}={}){
  const config=watcherTelegramConfig(env);
  if(!config.enabled)return{status:'disabled',attempted:0,sent:0};
  if(!pool?.connect)throw Error('WATCHER_DATABASE_NOT_CONFIGURED');
  const client=await pool.connect();
  let attempted=0,sent=0;
  try{
    const owner=await client.query('SELECT paused FROM vv_product_watcher_control WHERE id=1');
    if(owner.rows?.length!==1)throw Error('WATCHER_SCHEMA_NOT_READY');
    if(owner.rows[0].paused)return{status:'paused',attempted:0,sent:0};
    // Only unacknowledged CRITICAL events. No user IDs, account data, prompts or external links.
    // Filter already claimed alert/channel pairs BEFORE LIMIT. Otherwise the
    // same newest three notifications can hide older undelivered critical alerts
    // forever, even though the ON CONFLICT claim avoids duplicate sends.
    const found=await client.query([
      "SELECT a.id,a.source,a.code,a.provider FROM vv_product_watcher_alerts a",
      "WHERE a.severity='critical' AND a.acknowledged_at IS NULL",
      "AND NOT EXISTS (SELECT 1 FROM vv_product_watcher_notifications n",
      "WHERE n.alert_id=a.id AND n.channel='telegram')",
      'ORDER BY a.last_seen_at DESC,a.id DESC LIMIT 3'
    ].join(' '));
    for(const a of found.rows){
      const claimed=await client.query([
        "INSERT INTO vv_product_watcher_notifications(alert_id,channel,status)",
        "VALUES($1,'telegram','sending')",
        'ON CONFLICT(alert_id,channel) DO NOTHING RETURNING id'
      ].join(' '),[a.id]);
      // Claim is committed before calling Telegram; ambiguous delivery is not retried.
      if(!claimed.rows?.length)continue;
      attempted++;
      const message=[
        'Deepsyq Product Watcher: critical alert',
        'Source: '+String(a.source||'system').slice(0,40),
        'Code: '+String(a.code||'CHECK_FAILED').slice(0,80),
        'Open the private Owner Product Watcher panel to investigate.',
        'No automatic repair or payment action was taken.'
      ].join('\n');
      let ok=false;
      try{
        const response=await fetchFn('https://api.telegram.org/bot'+encodeURIComponent(config.token)+'/sendMessage',{
          method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({chat_id:config.chatId,text:message,disable_web_page_preview:true}),
          signal:AbortSignal.timeout(10000)
        });
        // A network 200 without Telegram's ok=true is NOT confirmation.
        if(response.status===200){
          const receipt=await response.json();
          ok=receipt?.ok===true;
        }
      }catch{ /* Telegram failures can be ambiguous. Do not retry automatically. */ }
      await client.query(
        "UPDATE vv_product_watcher_notifications SET status=$2,checked_at=NOW(),delivered_at=CASE WHEN $2='sent' THEN NOW() ELSE NULL END WHERE id=$1",
        [claimed.rows[0].id,ok?'sent':'delivery_unknown']
      );
      if(ok)sent++;
    }
    return{status:attempted===sent?'ok':'partial',attempted,sent};
  }finally{client.release();}
}

export async function listWatcherNotificationStatus(pool,{limit=30}={}){
  const safe=Math.max(1,Math.min(50,Number(limit)||30));
  const {rows}=await pool.query([
    'SELECT n.id,n.status,n.created_at,n.checked_at,n.delivered_at,a.source,a.code',
    'FROM vv_product_watcher_notifications n JOIN vv_product_watcher_alerts a ON a.id=n.alert_id',
    'ORDER BY n.created_at DESC,n.id DESC LIMIT $1'
  ].join(' '),[safe]);
  return rows.map(x=>({id:Number(x.id),status:x.status,source:x.source,code:x.code,
    createdAt:x.created_at,checkedAt:x.checked_at,deliveredAt:x.delivered_at}));
}
