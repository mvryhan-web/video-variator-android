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
 ~ExIok(!out.includes(~A7G),'must never serialize~DCI'+~AnH~F6Kok~ErI.length<=20~D_Orecord of ~FVI~H-Iok(Buffer.byteLength(~FMP~A-G),'utf8')<=200~G5c~AwH);}~CkI~J3H(s);
};

test('W5.6 normal path: UN~MkHD -> REVIEW_PENDING -> ~LkHD_FOR_MANUAL_~AmG only, always ~KhJ,()~IoL~NLK~LjPp~K0I~orV.~CJO~A8RreasonCode,'~ArHREQUIRED~MiM~AvK~USH1~FFM/^lite-cand-[0-9a-f]{24}$/.test(p.candidateId~M4K~BVI~IAM,1~B2Taudit[0].from,'~FqK~OiK~ArRto~DRJ~D8H');~FNIa=~SDa~DlK),START~SNH~CWPa~QrJ~HZa~CfQa~FvN~PNG~CkH~BFJ~SgU~A-I~FGL,~FUO~BoQ~FTN2~CHT~HHH2~BmTrequiresOwnerAction,true,'Manual review is NOT a send~DrJSafe(a);
});~MsHrechecking prepared/~Y1I state is deterministic, no duplicate transitions~MXa, first~HbSRECHECK',1~HSdfirst~HWJ~I8R~AsT~MOT~AfM~LYf~BEI~OBMADY_UNCHANG~OBOdeep~akGfirst,~Dlo~L0m~EZR~tjH~AzIa~BnS2~AzI2~FMUb~Mezb~K2XSafe(b~JSPpeated~ndHs and bad ~GSI~aDHappend audit, prevents replay~Vhb~Z6Iplay~E3S~kMI~JQf~A_G~HhNDUPLICATE_ACTION~EDQ~AzJ~JYX~AgH~JZS~Hj5dupe~HmS~A2J~Hmedupe~Dgt~AxH~R9K~AeS~IEQ~CpIconcurren~PhJ~KVT~DlJ~CvV~BDK~C1NCONCURRENT~C2H_CONFLIC~oBL~BBR~LfH~YGI~Bse~DwX~AkL~D2YnoE~yVH~D2K{type:'CANCEL'}~Dyc~A_K~DyNINVALID~GlX~A1L~CXR~ODK~2rI cancellation is ~XGGal and does not ~ZVH fresh ~ymJ~OEhc~D4H~0Xd:~LwI:~ISI~EdH,1)~0oR~16I,
 ~CIK:null~0tH~MnK}~HXS~TYJ~BiGL~iESc~JdO~AnI_BY_OWNER~AwU~dxS~zNH~B_R~Ujbc~I3Kr~IuIc~S1S~PTP~RgO~Dfir~DfNTERMINAL_STATE'~IiWrevoc~IgWcannot pretend to ~2wH mail~IePa=~5rJ~WjJv~Igl~QrI~IgJREVOK~ENG~Ig32~IgVrv~hBMOK~FATv~t0QOK~Iebrv~Ifr~H1Hrv~XJS3~H2I3000)~ClZSafe(rv~HINmissing/invalid ~ExI owner ID fails closed without prior~nfHdisclosure~Pxb~31Mbad of [undefined,null,'','owner@\nattacker','x'.~gSG(150)~8aKabc def']){
 ~MbP~RRv~dIM~IyQbad,
  ~IvM~AKJAt(~d3L~RiW~HFP~GdJBLOC~JCU~xGTUNVERIFI~o1H~BSQ~w5Mnull~BSR~RXN~QWJ~IOG);
 }~IQLother~H9H~PAH~OYH,~YNH or inspect existing a~FlG~IBntype of [~F6K~XVJ~O-J~f5J~HhNesul~wGStype~kFO,~GlY'user-b-uid~FOUesul~woK~GlY~AmG~GqMFOREIG