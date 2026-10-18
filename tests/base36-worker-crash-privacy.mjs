import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Privacy acceptance for BASE #36. The actual Worker module is intentionally
// not imported: importing it would start database/recovery and production signals.
test('fatal worker errors do not serialize provider exceptions, prompts, URLs or secrets',async()=>{
 const code=await readFile(new URL('../server/generation-worker.js',import.meta.url),'utf8');
 const crashes=[
  ['uncaughtException','uncaught exception'],
  ['unhandledRejection','unhandled rejection']
 ];
 for(const [kind,label] of crashes){
  const handler=code.split("process.on('"+kind+"',")[1]?.split('\n')[0]||'';
  assert.ok(handler,'missing worker crash handler: '+kind);
  assert.match(handler,/^\(\)=>\{console\.error\('\[generation worker\] /);
  assert.ok(handler.includes(label+' (details redacted)'),'must provide only static operator context');
  assert.ok(handler.includes("void shutdown('"+kind+"')"),'must still shut down after a fatal failure');
  assert.doesNotMatch(handler,/[,(\s](?:e|err|error|reason|payload)(?:[,)\s.]|$)|\.message|JSON\.stringify|String\(|\.stack/,'fatal handler must never serialize the rejection reason');
 }
 assert.doesNotMatch(code,/console\.(?:error|log)\([^\n]*(?:e\?\.message|error\?\.message|e\.stack|reason\?\.message)/);
});
