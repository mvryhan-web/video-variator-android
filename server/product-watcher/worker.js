import 'dotenv/config';
import { pool } from '../db.js';
import { productWatcherTick } from './scheduler.js';
import { runOfficialSourcesOnce } from './official-sources.js';
import { runBriefsIfDue } from './briefs.js';
import { runContentTasksIfDue } from './content-tasks.js';
import { deliverCriticalWatcherAlertsOnce } from './telegram-alerts.js';

if (process.env.PRODUCT_WATCHER_ENABLED !== 'true' ||
    process.env.PRODUCT_WATCHER_SCHEDULER_ENABLED !== 'true') {
  console.error('[product watcher] disabled: explicit flags required');
  process.exit(1);
}
if (!pool) {
  console.error('[product watcher] database not configured');
  process.exit(1);
}

let busy=false,stopping=false;
async function tick(){
  if (busy || stopping) return;
  busy=true;
  try {
    const report=await productWatcherTick({pool,env:process.env});
    // Never print database URLs, credentials, account identifiers or raw errors.
    console.log('[product watcher] '+JSON.stringify({
      status:report.status,checked:report.checked,runId:report.runId||null
    }));
  } catch {
    console.error('[product watcher] WATCHER_TICK_FAILED');
  }
  try {
    // Independent opt-in 6-hour official source check with durable last-check state.
    const sources=await runOfficialSourcesOnce({pool,env:process.env});
    if(sources.status!=='disabled' && sources.attempted>0){
      console.log('[product watcher] official-source '+JSON.stringify({
        status:sources.status,attempted:sources.attempted,changed:sources.changed
      }));
    }
  } catch {
    console.error('[product watcher] WATCHER_OFFICIAL_SOURCE_TICK_FAILED');
  }
  try {
    const morning=await runContentTasksIfDue({pool,env:process.env});
    if(morning.generated?.length){
      console.log('[product watcher] content '+JSON.stringify({status:morning.status,
        generated:morning.generated.map(x=>({kind:x.kind,periodKey:x.periodKey}))}));
    }
  } catch {
    console.error('[product watcher] WATCHER_CONTENT_TICK_FAILED');
  }
  try {
    const briefs=await runBriefsIfDue({pool,env:process.env});
    if(briefs.generated?.length){
      console.log('[product watcher] briefs '+JSON.stringify({status:briefs.status,
        generated:briefs.generated.map(x=>({kind:x.kind,periodKey:x.periodKey}))}));
    }
  } catch {
    console.error('[product watcher] WATCHER_BRIEFS_TICK_FAILED');
  }
  try {
    const delivery=await deliverCriticalWatcherAlertsOnce({pool,env:process.env});
    if(delivery.attempted){
      console.log('[product watcher] owner alert delivery '+JSON.stringify({
        status:delivery.status,attempted:delivery.attempted,sent:delivery.sent
      }));
    }
  } catch {
    console.error('[product watcher] WATCHER_OWNER_DELIVERY_FAILED');
  } finally { busy=false; }
}

const timer=setInterval(()=>{void tick();},60_000);
await tick();

async function shutdown(signal){
  if (stopping) return;
  stopping=true;
  console.log('[product watcher] stopping: '+signal);
  clearInterval(timer);
  const limit=Date.now()+20_000;
  while (busy && Date.now()<limit) await new Promise(resolve=>setTimeout(resolve,100));
  await pool.end().catch(()=>{});
  process.exit(0);
}
process.once('SIGTERM',()=>{void shutdown('SIGTERM');});
process.once('SIGINT',()=>{void shutdown('SIGINT');});
