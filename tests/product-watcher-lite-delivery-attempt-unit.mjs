import test from 'node:test';
~AeHasser~AgN~ASG/stric~ApL{ evaluateLiteDeliveryReadiness }~BEH../server/product-watcher/lite-d~A5H-policy.js~BjL
  reduc~BjNAttempt, LITE_ATTEMPT_STATUSES~AXPREASONS
~COwa~BlG~CPG
const START = Date.parse('2026-11-08T10:00:00.000Z');~A2HOWNER_ID = 'trusted-owner-01'~AlOEMAIL = 'owner@example.~GhH~AqGchecks = { http: { status: 'critical', code: 'HTTP_UNAVAILABLE' } }~BLIenv = { ADMIN~B9G:~CKM, PRODUCT_WATCHER_~AdL~AqO
 ~AsRLITE_DELIVERY_ENABLED: 'true'~CFKsetting~DSGliteEmail~HsIEnabled: true, ownerOptIn~ASIrecipientEmail~CVN };

function r~KZIAt(nowMs =~HRG, opts = {}) {
  ~FoLSet = opts.~F4H??~GCH;~AqJwho~AlIownerId ??~H3J~AoK~AdHentity = {userId:who,email:~FSMrole:~IJG',provider:'google',~LFGVerified:true}~BrKbare = {now:new Date~D2G).toISOString(),~DNG:~DuI,env,~GTI,~CyN,
    observedAt~BZP-60_000~BgQ approval:null~CjLfingerprint =~RLe(bare).alertF~A3K;
  return~A_f{...bare~DCG~CRJ {~ALIId:'v~FLH-~AVI-01',~ANGedByU~GtK
     ~J7Q~G9M~CrQ:~DuL~A_I~BbI~FKS3~FKVexplicitConsent:true~IHV~BhG...(~KUGverride||{})
  });
}~N9Haction=(type,revision=0,extra={})=>({type,expectedR~AlH:~AuI,...extra});~NuMduce(previous,act,when=~NzGready=~OTMwhen)~JxG=~M7I){
~HhI~YGZ({~BkMion:act,~HNIO~LBG:owner,~BwJ:ready,nowMs:when~EUG~C-Jpending(~CyK){~CJN(null~BxH('PREPARE'),when);~BKL~HlI~BLN~F8Gp=~BnM);~BhOp~BeJAPPROVE',1~BgG+1000);~HDJssertNotSent=s=>{~ASG.equal(s.sent,false);~AbP~buIStatus,'NOT_SENT');
~BZH.notE~BKI~AnH~AjH~AhHok(Object.isFrozen(s)~Aed.audit));~YFJ~AtGSafe=s=>{
~UyIut=JSON.stringify(s);
 for(~Y-Icret of [~OAM'sk_live_sensitive','whsec_~AyG','smtp-password','postgresql://','Bearer totally~A3JHello private prompt'])
 ~ExIok(!out.includes(~A7G),'must never serialize~DCI'+~AnH~F6Kok~ErI.length<=20~D_Orecord of ~FVI~H-Iok(Buffer.byteLength(~FMP~A-