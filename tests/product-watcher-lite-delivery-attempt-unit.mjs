import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLiteDeliveryReadiness } from '../server/product-watcher/lite-delivery-policy.js';
import {
  reduceLiteDeliveryAttempt, LITE_ATTEMPT_STATUSES, LITE_ATTEMPT_REASONS
} from '../server/product-watcher/lite-delivery-attempt.js';

const START = Date.parse('2026-11-08T10:00:00.000Z');
const OWNER_ID = 'trusted-owner-01';
const OWNER_EMAIL = 'owner@example.test';
const checks = { http: { status: 'critical', code: 'HTTP_UNAVAILABLE' } };
const env = { ADMIN_EMAIL: OWNER_EMAIL, PRODUCT_WATCHER_OWNER_EMAIL: OWNER_EMAIL,
  PRODUCT_WATCHER_LITE_DELIVERY_ENABLED: 'true' };
const settings = { liteEmailDeliveryEnabled: true, ownerOptIn: true, recipientEmail: OWNER_EMAIL };

function readinessAt(nowMs = START, opts = {}) {
  const checkSet = opts.checks ?? checks;
  const who = opts.ownerId ?? OWNER_ID;
  const ownerIdentity = {userId:who,email:OWNER_EMAIL,role:'owner',provider:'google',serverVerified:true};
  const bare = {now:new Date(nowMs).toISOString(),checks:checkSet,env,settings,ownerIdentity,
    observedAt:new Date(nowMs-60_000).toISOString(), approval:null};
  const fingerprint = evaluateLiteDeliveryReadiness(bare).alertFingerprint;
  return evaluateLiteDeliveryReadiness({...bare,
    approval: {approvalId:'verified-approval-01',approvedByUserId:who,
      recipientEmail:OWNER_EMAIL,alertFingerprint:fingerprint,
      approvedAt:new Date(nowMs-30_000).toISOString(),explicitConsent:true,serverVerified:true},
    ...(opts.override||{})
  });
}
const action=(type,revision=0,extra={})=>({type,expectedRevision:revision,...extra});
function reduce(previous,act,when=START,ready=readinessAt(when),owner=OWNER_ID){
 return reduceLiteDeliveryAttempt({previous,action:act,verifiedOwnerId:owner,readiness:ready,nowMs:when});
}
function pending(when=START){return reduce(null,action('PREPARE'),when);}
function approved(when=START){const p=pending(when);return reduce(p,action('APPROVE',1),when+1000);}
const assertNotSent=s=>{assert.equal(s.sent,false);assert.equal(s.deliveryStatus,'NOT_SENT');
 assert.notEqual(s.status,'SENT');assert.ok(Object.isFrozen(s));assert.ok(Object.isFrozen(s.audit));};
const assertSafe=s=>{
 const out=JSON.stringify(s);
 for(const secret of [OWNER_EMAIL,'sk_live_sensitive','whsec_secret','smtp-password','postgresql://','Bearer totallysecret','Hello private prompt'])
  assert.ok(!out.includes(secret),'must never serialize secret '+secret);
 assert.ok(s.audit.length<=20);
 for(const record of s.audit){assert.ok(Buffer.byteLength(JSON.stringify(record),'utf8')<=200);assert.ok(Object.isFrozen(record));}
 assertNotSent(s);
};

test('W5.6 normal path: UNPREPARED -> REVIEW_PENDING -> APPROVED_FOR_MANUAL_REVIEW only, always NOT_SENT',()=>{
 const p=pending();assert.equal(p.status,LITE_ATTEMPT_STATUSES.REVIEW_PENDING);assert.equal(p.reasonCode,'REVIEW_REQUIRED');
 assert.equal(p.revision,1);assert.ok(/^lite-cand-[0-9a-f]{24}$/.test(p.candidateId));assert.equal(p.audit.length,1);
 assert.equal(p.audit[0].from,'UNPREPARED');assert.equal(p.audit[0].to,'REVIEW_PENDING');
 const a=reduce(p,action('APPROVE',p.revision),START+1000);
 assert.equal(a.status,'APPROVED_FOR_MANUAL_REVIEW');assert.equal(a.reasonCode,'OWNER_REVIEW_APPROVED_NOT_SENT');
 assert.equal(a.candidateId,p.candidateId);assert.equal(a.audit.length,2);assert.equal(a.revision,2);
 assert.equal(a.requiresOwnerAction,true,'Manual review is NOT a send');assertSafe(a);
});
test('rechecking prepared/approved state is deterministic, no duplicate transitions',()=>{
 const p=pending(), first=reduce(p,action('RECHECK',1),START+1000);
 assert.equal(first.status,'REVIEW_PENDING');assert.equal(first.revision,1);assert.equal(first.audit.length,1);
 assert.equal(first.reasonCode,'READY_UNCHANGED');
 assert.deepEqual(first,reduce(p,action('RECHECK',1),START+1000));
 const a=reduce(p,action('APPROVE',1),START+1000);
 const b=reduce(a,action('RECHECK',2),START+2000);
 assert.equal(b.status,'APPROVED_FOR_MANUAL_REVIEW');assert.equal(b.audit.length,2);assertSafe(b);
});
test('repeated actions and bad revision never append audit, prevents replay',()=>{
 const p=pending();const replay=reduce(p,action('PREPARE',1),START+1000);
 assert.equal(replay.reasonCode,'DUPLICATE_ACTION');assert.equal(replay.revision,1);assert.equal(replay.audit.length,1);
 const a=reduce(p,action('APPROVE',1),START+1000);
 const dupe=reduce(a,action('APPROVE',2),START+2000);
 assert.equal(dupe.reasonCode,'DUPLICATE_ACTION');assert.equal(dupe.revision,2);assert.equal(dupe.audit.length,2);
 const concurrent=reduce(a,action('RECHECK',1),START+2000);
 assert.equal(concurrent.reasonCode,'CONCURRENT_ACTION_CONFLICT');assert.equal(concurrent.status,a.status);
 assert.equal(concurrent.revision,2);assert.equal(concurrent.audit.length,2);
 const noExpected=reduce(a,{type:'CANCEL'},START+2000);
 assert.equal(noExpected.reasonCode,'INVALID_ACTION');assert.equal(noExpected.audit.length,2);
});
test('explicit cancellation is terminal and does not require fresh readiness',()=>{
 const p=pending();const c=reduceLiteDeliveryAttempt({previous:p,action:action('CANCEL',1),verifiedOwnerId:OWNER_ID,
  readiness:null,nowMs:START+1000});
 assert.equal(c.status,'CANCELLED');assert.equal(c.reasonCode,'CANCELLED_BY_OWNER');assert.equal(c.requiresOwnerAction,false);
 assert.equal(c.audit.length,2);assertSafe(c);
 const r=reduce(c,action('PREPARE',2),START+2000);assert.equal(r.status,'CANCELLED');assert.equal(r.reasonCode,'TERMINAL_STATE');
});
test('explicit revocation is terminal and cannot pretend to deliver mail',()=>{
 const a=approved();const rv=reduceLiteDeliveryAttempt({previous:a,action:action('REVOKE',2),verifiedOwnerId:OWNER_ID,
  readiness:null,nowMs:START+2000});
 assert.equal(rv.status,'REVOKED');assert.equal(rv.reasonCode,'REVOKED_BY_OWNER');assert.equal(rv.requiresOwnerAction,false);
 assert.equal(reduce(rv,action('APPROVE',3),START+3000).status,'REVOKED');assertSafe(rv);
});
test('missing/invalid verified owner ID fails closed without prior state disclosure',()=>{
 const p=pending();
 for(const bad of [undefined,null,'','owner@\nattacker','x'.repeat(150),'sk_live_abc def']){
  const r=reduceLiteDeliveryAttempt({previous:p,action:action('APPROVE',1),verifiedOwnerId:bad,
    readiness:readinessAt(START+1000),nowMs:START+1000});
  assert.equal(r.status,'BLOCKED');assert.equal(r.reasonCode,'OWNER_UNVERIFIED');
  assert.equal(r.candidateId,null);assert.equal(r.audit.length,0);assertSafe(r);
 }
});
test('other owner cannot approve, cancel or inspect existing attempt',()=>{
 const p=pending();
 for(const type of ['APPROVE','CANCEL','REVOKE','RECHECK']){
  const result=reduce(p,action(type,1),START+1000,readinessAt(START+1000),'user-b-uid');
  assert.equal(result.status,'BLOCKED');assert.equal(result.reasonCode,'FOREIGN_OWNER_DENIED');
  assert.equal(result.candidateId,null);assert.equal(result.audit.length,0);assertSafe(result);
 }
 const r=reduce(null,action('PREPARE'),START,readinessAt(START,{ownerId:'user-b-uid'}));
 assert.equal(r.status,'BLOCKED');assert.equal(r.reasonCode,'FOREIGN_OWNER_DENIED');assertSafe(r);
});
test('invalid now, stale clock, stale W5.5 result are rejected',()=>{
 for(const now of [null,0,-1,NaN,Infinity,'2026-11-08',1.5]){
  const x=reduceLiteDeliveryAttempt({previous:null,action:action('PREPARE'),verifiedOwnerId:OWNER_ID,readiness:readinessAt(),nowMs:now});
  assert.equal(x.reasonCode,'INVALID_CLOCK');assertSafe(x);
 }
 const p=pending();
 assert.equal(reduce(p,action('APPROVE',1),START-1).reasonCode,'INVALID_CLOCK');
 const stale=reduce(p,action('APPROVE',1),START+1000,readinessAt(START));
 assert.equal(stale.status,'BLOCKED');assert.equal(stale.reasonCode,'READINESS_STALE');assertSafe(stale);
});
test('blocked/stale W5.5 output cannot approve or prepare; retains exact reason code safely',()=>{
 const candidate=readinessAt(START);assert.equal(candidate.ready,true);
 const disabled=evaluateLiteDeliveryReadiness({now:new Date(START).toISOString(),env:{ADMIN_EMAIL:OWNER_EMAIL},
  settings:{liteEmailDeliveryEnabled:false,ownerOptIn:false},checks,ownerIdentity:null,approval:null});
 const res=reduce(null,action('PREPARE'),START,disabled);
 assert.equal(res.status,'BLOCKED');assert.equal(res.reasonCode,'FEATURE_DISABLED');assertSafe(res);
 const p=pending();const bad=reduce(p,action('APPROVE',1),START,disabled);
 assert.equal(bad.status,'BLOCKED');assert.equal(bad.candidateId,p.candidateId);assert.equal(bad.reasonCode,'FEATURE_DISABLED');assertSafe(bad);
});
test('verified W5.5 approval that becomes stale or fingerprint changes revokes an approved attempt',()=>{
 const a=approved();
 const badReadiness=readinessAt(START+3000,{override:{approval:{approvalId:'approval',serverVerified:false}}});
 assert.equal(badReadiness.ready,false);
 const revoked=reduce(a,action('RECHECK',2),START+3000,badReadiness);
 assert.equal(revoked.status,'REVOKED');assert.equal(revoked.reasonCode,'APPROVAL_UNVERIFIED');assertSafe(revoked);
 const otherCheck=readinessAt(START+3000,{checks:{billing:{status:'critical',code:'AI_REFUND_LEDGER_INCONSISTENT'}}});
 assert.equal(otherCheck.ready,true);
 const drift=reduce(a,action('RECHECK',2),START+3000,otherCheck);
 assert.equal(drift.status,'REVOKED');assert.equal(drift.reasonCode,'CANDIDATE_CHANGED');assertSafe(drift);
});
test('changed recipient/fingerprint/candidate never gets silent acceptance or relabeling',()=>{
 const p=pending(),different=readinessAt(START+1000,{checks:{webhookConfig:{status:'critical',code:'AI_STRIPE_WEBHOOK_SECRET_MISSING'}}});
 assert.notEqual(different.candidateId,p.candidateId);
 const x=reduce(p,action('APPROVE',1),START+1000,different);
 assert.equal(x.status,'BLOCKED');assert.equal(x.reasonCode,'CANDIDATE_CHANGED');assert.equal(x.candidateId,p.candidateId);
 const malformed={...readinessAt(),candidateId:'lite-cand-'+'f'.repeat(24)};
 const forged=reduce(null,action('PREPARE'),START,malformed);
 assert.equal(forged.status,'BLOCKED');assert.equal(forged.reasonCode,'CANDIDATE_MISMATCH');assertSafe(forged);
 const mismatched=reduce(null,action('PREPARE',0,{candidateId:'lite-cand-'+'e'.repeat(24)}));
 assert.equal(mismatched.reasonCode,'CANDIDATE_MISMATCH');assertSafe(mismatched);
});
test('forged readiness, missing data, unexpected status, malformed action and previous are rejected',()=>{
 for(const readiness of [undefined,null,{},[],{status:'SENT',sent:true},
  {...readinessAt(),sent:true}, {...readinessAt(),status:'SENT'}, {...readinessAt(),ownerId:'other'},
  {...readinessAt(),readiness:'ready',reasonCode:'sk_live_secret'}]){
  const x=reduceLiteDeliveryAttempt({previous:null,action:action('PREPARE'),verifiedOwnerId:OWNER_ID,readiness,nowMs:START});
  assert.equal(x.status,'BLOCKED');assertSafe(x);
 }
 const p=pending();
 for(const bad of [{...p,status:'SENT'}, {...p,sent:true}, {...p,audit:[{at:'bad',from:'SENT',to:'REVIEW_PENDING',reasonCode:'BOGUS'}]}, {...p,candidateId:'not-id'}]){
  const x=reduce(bad,action('APPROVE',1),START+1000);assert.equal(x.status,'BLOCKED');assert.equal(x.reasonCode,'INVALID_PREVIOUS');assertSafe(x);
 }
 for(const actionInput of [null,'APPROVE',{}, {type:'SEND',expectedRevision:0}, {type:'APPROVE',expectedRevision:-1},
  {type:'PREPARE',expectedRevision:'0'}]){
  const x=reduce(null,actionInput);assert.equal(x.status,'BLOCKED');assertSafe(x);
 }
});
test('secret-bearing arbitrary fields in action, previous and readiness never leak to audit/output',()=>{
 const p=pending();const poisoned={...p,secret:'sk_live_sensitive',
  audit:p.audit.map(x=>({...x,credential:'smtp-password',prompt:'Hello private prompt'}))};
 const input={...readinessAt(START+1000),secret:'whsec_secret', draft:{...readinessAt(START+1000).draft,password:'postgresql://private@db'}};
 const output=reduceLiteDeliveryAttempt({previous:poisoned,
  action:{...action('APPROVE',1),secret:'Bearer totallysecret'},
  verifiedOwnerId:OWNER_ID,readiness:input,nowMs:START+1000});
 assert.equal(output.status,'APPROVED_FOR_MANUAL_REVIEW');assertSafe(output);
 assert.deepEqual(p.audit,[{...p.audit[0]}], 'input audit remains unmodified');
 assert.notStrictEqual(output.audit,poisoned.audit);
});
test('audit caps at 20 entries, each <=200 bytes, no mutation; stable through repeated checks',()=>{
 let state=pending();const frozen=structuredClone(state);
 for(let i=1;i<=30;i++){
  const time=START+1000*i;
  // Append only on actual transition: force explicit approval/revoke after a
  // series of mock pending states representing a persisted multi-step history.
  const next=reduce(state,action('RECHECK',state.revision),time);
  assert.equal(next.audit.length,state.audit.length);
  state=next;
 }
 assert.deepEqual(pending(),frozen);
 const audit=[];
 for(let i=0;i<20;i++)audit.push({at:new Date(START+i*1000).toISOString(),from:'REVIEW_PENDING',to:'REVIEW_PENDING',reasonCode:'READY_UNCHANGED'});
 const p=pending();const prior={...p,updatedAtMs:START+20000,revision:20,audit,
  reasonCode:'READY_UNCHANGED'};
 const rechecked=reduce(prior,action('APPROVE',20),START+21000);
 assert.equal(rechecked.status,'APPROVED_FOR_MANUAL_REVIEW');assert.equal(rechecked.audit.length,20);
 assert.deepEqual(prior.audit,audit);assertSafe(rechecked);
});
test('approval is time-bounded even when caller tries to inject an artificially fresh readiness',()=>{
 const a=approved();const later=START+16*60*1000;
 const x=reduce(a,action('RECHECK',2),later,readinessAt(later));
 assert.equal(x.status,'REVOKED');assert.equal(x.reasonCode,'APPROVAL_EXPIRED');assertSafe(x);
});
test('no network or send API is imported: pure policy module remains owner-only manual',async()=>{
 const fs=await import('node:fs');
 const source=fs.readFileSync(new URL('../server/product-watcher/lite-delivery-attempt.js',import.meta.url),'utf8');
 for(const forbidden of [/\bfetch\s*\(/, /\baxios\b/, /\bSMTP\s*\(/, /\btelegram\.send/i,
   /\bstripe\./i, /\bcreateTransport\s*\(/, /\bnode:net\b/]){
  assert.doesNotMatch(source,forbidden);
 }
});
