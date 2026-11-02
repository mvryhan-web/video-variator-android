import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyJulesBotComments,summarizeCheckRuns,commercialGate,formatAudit} from '../scripts/deepsyq-coordinator-signal-audit.mjs';
const bot=(id,body)=>({id,user:{login:'google-labs-jules[bot]'},body});
const human=(id,body)=>({id,user:{login:'mvryhan-web'},body});
test('a bot ACK with "When finished" stays ACK_ONLY, never READY',()=>{
 const status=classifyJulesBotComments([
  bot(4,'Jules is [on it](https://jules.google.com/task/15035598484631377809). When finished, you will see another comment and be able to review a PR.'),
  human(5,'READY; #323 merged')
 ]);
 assert.deepEqual(status,{status:'ACK_ONLY',taskId:'15035598484631377809',commentId:4});
});
test('historical task-creation failure is superseded by later bot ACK, human pings ignored',()=>{
 const status=classifyJulesBotComments([
  bot(1,'Jules has failed to create a task.'),
  human(99,'Jules has finished PR #500!'),
  bot(3,'Jules is [on it](https://jules.google.com/task/15999298883849600168). When finished, you will see another comment.')
 ]);
 assert.equal(status.status,'ACK_ONLY');
 assert.equal(status.taskId,'15999298883849600168');
 assert.equal(status.commentId,3);
});
test('actual latest bot errors fail, not an earlier ACK',()=>{
 const status=classifyJulesBotComments([
  bot(20,'Jules is [on it](https://jules.google.com/task/16747665779119487837).'),
  bot(22,"I apologize, but I encountered an unexpected error and wasn't able to complete the [task](https://jules.google.com/task/16747665779119487837).")
 ]);
 assert.equal(status.status,'TASK_FAILED');
});
test('bot completion is REVIEW_REQUIRED and never automatically DONE',()=>{
 const status=classifyJulesBotComments([
  bot(4,'Jules is [on it](https://jules.google.com/task/2).'),
  bot(7,'Jules has finished work: review PR #401')
 ]);
 assert.equal(status.status,'REVIEW_REQUIRED');
});
test('no bot reply is not presumed running',()=>{
 assert.equal(classifyJulesBotComments([human(1,'Google Jules running')]).status,'NO_BOT_CONFIRMATION');
});
const check=(status,conclusion)=>({status,conclusion});
test('CI only green when every exact check is successful and complete',()=>{
 const good=summarizeCheckRuns([check('completed','success'),check('completed','success')],2);
 assert.equal(good.allSuccess,true);
 assert.equal(good.status,'ALL_SUCCESS');
 for(const bad of [
  [check('completed','success'),check('completed','failure')],
  [check('completed','success'),check('completed','cancelled')],
  [check('completed','success'),check('completed','skipped')],
  [check('completed','success'),check('queued',null)],
  [check('completed','success'),check('completed','neutral')]
 ])assert.equal(summarizeCheckRuns(bad,2).allSuccess,false);
 assert.equal(summarizeCheckRuns([check('completed','success')],2).allSuccess,false);
 assert.equal(summarizeCheckRuns([],0).allSuccess,false);
});
test('real DEV pattern 87 success, five cancelled, one failure is NOT green',()=>{
 const c=[...Array.from({length:87},()=>check('completed','success')),
  ...Array.from({length:5},()=>check('completed','cancelled')),check('completed','failure')];
 const summary=summarizeCheckRuns(c,93);
 assert.equal(summary.count,93);assert.equal(summary.counts.cancelled,5);
 assert.equal(summary.counts.failure,1);assert.equal(summary.allSuccess,false);
});
test('live report never infers commercial GO from CI or bot ACK',()=>{
 const report=formatAudit({repo:'mvryhan-web/video-variator-android',head:'a'.repeat(40),
  checks:summarizeCheckRuns([check('completed','success')],1),
  jules:[{issue:316,step:'W5.5',...classifyJulesBotComments([bot(1,'Jules is [on it](https://jules.google.com/task/7).')])}],
  prs:{323:{state:'open',draft:true,sha:'b'.repeat(40)},333:{state:'open',draft:true,sha:'c'.repeat(40)}}});
 assert.match(report,/NO_GO_REQUIRES_INDEPENDENT_SECURITY/);
 assert.match(report,/ACK_ONLY/);
 assert.match(report,/DRAFT/);
 assert.equal(commercialGate().startsWith('NO_GO'),true);
});
