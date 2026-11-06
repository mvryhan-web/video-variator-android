/**
 * Read-only design preview for Deepsyq. Serves the exact existing frontend assets
 * without importing production auth, billing, database or AI provider modules.
 * Run as a SEPARATE Render service, never instead of the production entrypoint.
 */
import express from 'express';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {MODEL_CATALOG} from '../app/src/main/assets/generate-models.js';
import {buildJarvixSiteKnowledge,clearSession,getOrCreateSession,processTurnWithMockBrain,getJarvixRuntimeStatus} from './jarvix-brain.js';
import {generateFreeImage,generateTrialVideo,generateFreeAudio,checkDailyQuota,incrementDailyQuota,studioJobs} from './free-ai-provider.js';

import {installLocalVoice} from './jarvix-local-voice.js';

const app=express();
const port=Number(process.env.PORT||31990);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets=path.join(root,'app','src','main','assets');
const ffmpegUmd=path.join(root,'node_modules','@ffmpeg','ffmpeg','dist','umd');
const ffmpegCore=path.join(root,'node_modules','@ffmpeg','core','dist','esm');
const disabled={error:'PREVIEW_ONLY',message:'This is a design preview. Accounts, payments and paid AI generation are disabled.'};
// Anonymous visitor cookie acts as a bearer token for temporary preview-only jobs.
// Never publish the shared in-memory jobs list or other visitors' prompts/media.
function studioVisitorSession(req,res){
 const raw=String(req.headers.cookie||'');
 const named=raw.split(';').map(part=>part.trim()).find(part=>/^ds_preview_session=[0-9a-f-]{36}$/i.test(part));
 if(named)return named.split('=')[1];
 const id=randomUUID();
 const secure=req.secure||String(req.headers['x-forwarded-proto']||'').split(',')[0].trim()==='https';
 res.append('Set-Cookie','ds_preview_session='+id+'; HttpOnly; SameSite=Lax; Path=/api/studio; Max-Age=86400'+(secure?'; Secure':''));
 return id;
}

app.disable('x-powered-by');
app.use(express.json({limit:'8kb'}));
app.use((_req,res,next)=>{
 res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 next();
});
app.get('/robots.txt',(_req,res)=>res.type('text/plain').send('User-agent: *\nDisallow: /\n'));
// The standalone Video Uniquifier must load its real browser-local FFmpeg
// from the SAME origin in the isolated preview, as in server/server.js.
// Only these three public package assets are served; other APIs stay disabled.
app.get('/vendor/ffmpeg/ffmpeg.js',(_req,res)=>res.type('application/javascript').sendFile(path.join(ffmpegUmd,'ffmpeg.js')));
app.get('/vendor/ffmpeg/ffmpeg-core.js',(_req,res)=>res.type('application/javascript').sendFile(path.join(ffmpegCore,'ffmpeg-core.js')));
app.get('/vendor/ffmpeg/ffmpeg-core.wasm',(_req,res)=>res.type('application/wasm').sendFile(path.join(ffmpegCore,'ffmpeg-core.wasm')));
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'deepsyq-design-preview',paymentsEnabled:false,aiGenerationEnabled:false}));
app.get('/api/config',(_req,res)=>res.json({
 googleClientId:'',appleClientId:'',emailAuth:false,billingConfigured:false,trialLimit:0,
 features:{aiApps:true,inspiration:true,onboarding:false},
 plans:{
  basic:{price:9,limit:750},pro:{price:24,limit:2250},
  business:{price:99,limit:15000},lifetime:{price:2999,currency:'eur'}
 }
}));
const isFreeStudioActive = process.env.FREE_AI_STUDIO_ENABLED === 'true' || Boolean(process.env.RENDER) || process.env.NODE_ENV === 'production' || process.env.PORT !== '31896';
const isLegacyTest = !isFreeStudioActive;

const freeStudioModels = MODEL_CATALOG.map(m => {
  if (['image', 'video', 'music', 'voice'].includes(m.kind)) {
    return { ...m, enabled: true, adapter: true };
  }
  return { ...m, enabled: false };
});

app.get('/api/studio/config', (_req, res) => {
  if (isLegacyTest) {
    return res.json({
      enabled: false, ownerOnly: true, publicGenerationEnabled: false, pricingConfigured: false,
      models: [], catalog: MODEL_CATALOG.map(m => ({ ...m, enabled: false })), translation: { enabled: false, reason: 'PREVIEW_ONLY' }
    });
  }
  res.json({
    enabled: true,
    ownerOnly: false,
    publicGenerationEnabled: true,
    pricingConfigured: true,
    models: freeStudioModels.filter(m => m.enabled),
    catalog: freeStudioModels,
    freeTier: true,
    previewOnly: true,
    outputMode: 'local-demo',
    translation: { enabled: false, reason: 'PREVIEW_ONLY' }
  });
});

app.get('/api/studio/access', (req, res) => {
  if (isLegacyTest) return res.status(503).json(disabled);
  studioVisitorSession(req,res);
  const quota = checkDailyQuota(req.ip || 'guest');
  res.json({
    ok: true,
    eligible: quota.allowed,
    dailyRemaining: quota.remaining,
    dailyLimit: quota.limit,
    freeTier: true,
    message: 'Free Developer & Test Mode active'
  });
});

app.post('/api/studio/estimate', (req, res) => {
  if (isLegacyTest) return res.status(503).json(disabled);
  const {kind,model,quantity=1} = req.body || {};
  const valid = freeStudioModels.some(m => m.enabled && m.id === model && (m.kind === kind || (kind === 'music' && m.kind === 'voice')));
  if (!valid) return res.status(400).json({error:'AI_MODEL_NOT_AVAILABLE'});
  if (quantity !== 1) return res.status(400).json({error:'IMAGE_BATCH_NOT_ENABLED'});
  res.json({
    ok: true,
    kind,model,quantity:1,
    previewOnly: true,
    outputMode: 'local-demo',
    credits: 0,
    cost: 0,
    unitPrice: 0,
    marginRatio: 2.0,
    freeTier: true,
    currency: 'USD',
    note: 'Free Test Generation (Zero-Spend Safe)'
  });
});

app.post('/api/studio/jobs', async (req, res) => {
  if (isLegacyTest) return res.status(503).json(disabled);
  const visitor=studioVisitorSession(req,res);
  const quota = checkDailyQuota(req.ip || 'guest');
  if (!quota.allowed) {
    return res.status(429).json({ error: 'DAILY_QUOTA_EXCEEDED', message: 'Дневной лимит бесплатных тестов исчерпан (20/день).' });
  }

  const { kind = 'image', model, prompt = 'Cosmic nebula' } = req.body || {};
  const id = 'job_' + randomUUID().replace(/-/g, '').slice(0, 16);
  
  incrementDailyQuota(req.ip || 'guest');

  const jobRecord = {
    id,
    visitor,
    kind,
    model: model || (kind === 'image' ? 'flux-schnell' : 'veo-lite'),
    prompt,
    status: 'processing',
    progress: 15,
    created_at: new Date().toISOString(),
    media: null,
    mime: null
  };
  studioJobs.set(id, jobRecord);

  (async () => {
    try {
      jobRecord.progress = 50;
      let result;
      if (kind === 'video') {
        result = await generateTrialVideo({ prompt, model, duration: req.body?.videoDuration || 5, allowExternal: false });
      } else if (['music','voice','audio'].includes(kind)) {
        // Free TEST audio is a WAV chime, not an image mislabeled as audio.
        result = await generateFreeAudio({ prompt, text: prompt, model });
      } else {
        result = await generateFreeImage({ prompt, model, ratio: req.body?.ratio || '1:1', allowExternal: false });
      }
      jobRecord.status = 'ready';
      jobRecord.progress = 100;
      jobRecord.media = result.buffer;
      jobRecord.mime = result.mime;
      jobRecord.provider = result.provider;
    } catch (err) {
      jobRecord.status = 'failed';
      jobRecord.error = err.message || 'GENERATION_FAILED';
    }
  })();

  res.json({
    ok: true,
    id,
    jobId: id,
    status: 'processing',
    progress: 15
  });
});

app.get('/api/studio/jobs/:id', (req, res) => {
  if (isLegacyTest) return res.status(503).json(disabled);
  const job = studioJobs.get(req.params.id);
  if (!job || job.visitor !== studioVisitorSession(req,res)) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({
    ok: true,
    id: job.id,
    status: job.status,
    progress: job.progress || (job.status === 'ready' ? 100 : 50),
    kind: job.kind,
    prompt: job.prompt,
    created_at: job.created_at,
    provider: job.provider,
    mime: job.mime || null,
    previewOnly: true,
    mediaUrl: job.status === 'ready' ? ('/api/studio/jobs/' + job.id + '/media') : null
  });
});

app.get('/api/studio/jobs/:id/media', (req, res) => {
  if (isLegacyTest) return res.status(503).json(disabled);
  const job = studioJobs.get(req.params.id);
  if (!job || job.visitor !== studioVisitorSession(req,res) || job.status !== 'ready' || !job.media) {
    return res.status(404).json({ error: 'RESULT_UNAVAILABLE' });
  }
  res.set('Content-Type', job.mime || 'image/svg+xml');
  res.set('Cache-Control', 'private, no-store');
  res.send(job.media);
});

app.get('/api/studio/jobs', (req, res) => {
  if (isLegacyTest) return res.status(503).json(disabled);
  const visitor=studioVisitorSession(req,res);
  const filter=String(req.query.filter||'all');
  const list = Array.from(studioJobs.values())
    .filter(j => j.visitor === visitor && (filter==='all'||(filter==='audio'?['audio','music','voice'].includes(j.kind):filter==='failed'?j.status==='failed':filter==='processing'?['queued','processing','finalizing'].includes(j.status):j.kind===filter)))
    .map(j => ({
      id: j.id,
      kind: j.kind,
      model: j.model,
      prompt: j.prompt,
      status: j.status,
      created_at: j.created_at,
      previewUrl: j.status === 'ready' ? ('/api/studio/jobs/' + j.id + '/media') : null
    }))
    .reverse()
    .slice(0, 30);
  res.json({ ok: true, jobs: list, items: list });
});
// Jarvix's DEV-preview brain is deterministic and local-only. It has no provider
// credentials, external AI calls, paid generation, or persistent user profile.
const jarvixRequests=new Map();
function allowJarvixRequest(req){
 const now=Date.now(),key=String(req.ip||req.socket?.remoteAddress||'unknown').slice(0,80);
 for(const [ip,state] of jarvixRequests)if(now-state.startedAt>60_000)jarvixRequests.delete(ip);
 let state=jarvixRequests.get(key);
 if(!state||now-state.startedAt>60_000){state={startedAt:now,count:0};jarvixRequests.set(key,state);}
 state.count+=1;
 return state.count<=20;
}
function validSessionId(value){return typeof value==='string'&&/^[\w-]{1,80}$/.test(value);}
app.post('/api/jarvix/chat',(req,res)=>{
 if(!allowJarvixRequest(req))return res.status(429).json({error:'JARVIX_RATE_LIMIT'});
 const body=req.body||{},message=typeof body.message==='string'?body.message.trim():'';
 if(!message||message.length>2000)return res.status(400).json({error:'INVALID_MESSAGE'});
 const sessionId=validSessionId(body.sessionId)?body.sessionId:validSessionId(body.conversationId)?body.conversationId:`preview-${randomUUID()}`;
 const language=['ru','en','es','fr'].includes(body.language)?body.language:'ru';
 const session=getOrCreateSession(sessionId);
 const result=processTurnWithMockBrain(message,session,language);
 res.json({ok:true,reply:result.reply,action:result.action,entities:result.entities,compiledPrompt:result.compiledPrompt,studioHandoff:result.studioHandoff,sessionId:session.id,conversationId:session.id,language,provider:result.provider,audioUrl:null});
});
app.post('/api/jarvix/reset',(req,res)=>{
 const sid=req.body?.sessionId||req.body?.conversationId;
 if(!validSessionId(sid))return res.status(400).json({error:'INVALID_SESSION'});
 clearSession(sid);res.json({ok:true});
});
installLocalVoice(app);
app.get('/api/jarvix/status',(_req,res)=>res.json(getJarvixRuntimeStatus({previewOnly:true})));
app.get('/api/jarvix/site-map',(_req,res)=>res.json({ok:true,pages:buildJarvixSiteKnowledge()}));
// Read-only preview of the owner's approved bundled media. This is the same
// Inspiration response consumed by Home, without production DB/admin writes.
const ownerMedia=JSON.parse(await readFile(path.join(assets,'media/home/owner-20261018/manifest.json'),'utf8'));
const imageMedia=JSON.parse(await readFile(path.join(assets,'media/inspiration/openai-20261021/manifest.json'),'utf8'));
const approvedPreview=ownerMedia.previewPublicationApproved===true&&ownerMedia.commercialRightsConfirmed===true;
const approvedImagePreview=imageMedia.previewPublicationApproved===true&&imageMedia.commercialRightsConfirmed===true;
// Owner-provided image-only media, explicitly requested for DEV preview. Keep
// these separate from rights-cleared production/commercial collections.
const ownerInspiration=JSON.parse(await readFile(path.join(assets,'media/inspiration/owner-20261031/manifest.json'),'utf8'));
const ownerPreviewReady=ownerInspiration.previewPublicationApproved===true&&ownerInspiration.ownerRequestedPublication===true&&ownerInspiration.publishedScope==='isolated_dev_preview_only'&&ownerInspiration.productionPublicationApproved===false;
// The owner's additional visually distinct examples live only in this inert
// read-only DEV preview. They do not enter the rights-gated production DB.
const ownerNext=JSON.parse(await readFile(path.join(assets,'media/inspiration/owner-next-20261031/manifest.json'),'utf8'));
const ownerNextPreviewReady=ownerNext.previewPublicationApproved===true&&ownerNext.ownerRequestedPublication===true&&ownerNext.publishedScope==='isolated_dev_preview_only'&&ownerNext.productionPublicationApproved===false;
const approvedItems=[...(approvedPreview?ownerMedia.items:[]),...(approvedImagePreview?imageMedia.items:[]),...(ownerPreviewReady?ownerInspiration.items:[]),...(ownerNextPreviewReady?ownerNext.items:[])];
const previewItems=approvedItems.map(({slug,title,kind,category,description,previewUrl,previewPosterUrl,prompt,defaultModel,displayModel,previewDimensions,sourceAspectRatio,sourceSeed,advancedParameters,advancedParametersStatus,aspectRatio,requiredInputTypes,defaultSettings,actionTarget,featured,sortOrder})=>({id:slug,slug,title,kind,category,description,previewUrl,previewPosterUrl,prompt,defaultModel,displayModel,previewDimensions,aspectRatio,requiredInputTypes,defaultSettings,actionTarget,featured,sortOrder}));
app.get('/api/inspiration',(req,res)=>{
 const q=req.query;
 let items=previewItems.filter(item=>(q.featured!=='true'||item.featured)&&(!q.kind||q.kind==='all'||item.kind===q.kind)&&(!q.target||item.actionTarget===q.target)&&(!q.category||item.category===q.category)&&(!q.ratio||item.aspectRatio===q.ratio)&&(!q.q||item.title.toLowerCase().includes(String(q.q).toLowerCase()))).sort((a,b)=>a.sortOrder-b.sortOrder);
 const total=items.length,limit=Math.min(60,Math.max(1,Number(q.limit)||12));
 const page=Math.max(1,Number(q.page)||1);
 const offset=Math.max(0,Math.min(5000,Number(q.offset)||((page-1)*limit)));
 items=items.slice(offset,offset+limit);
 res.json({items,categories:[...new Set(previewItems.map(item=>item.category).filter(Boolean))].sort(),ratios:[...new Set(previewItems.map(item=>item.aspectRatio).filter(Boolean))].sort(),pagination:{page,limit,total,offset,nextOffset:offset+limit<total?offset+limit:null,hasMore:offset+limit<total}});
});
const creativeMedia=JSON.parse(await readFile(path.join(assets,'media/creative/creative50-20261021/manifest.json'),'utf8'));
const creativeTemplates=creativeMedia.previewPublicationApproved===true?creativeMedia.items.filter(item=>item.placement==='apps'&&item.active).map(item=>({id:item.id,title:item.title,description:item.description,category:item.category,generationType:'image',thumbnail:item.previewUrl,promptTemplate:item.prompt,defaultModel:null,defaultSettings:item.defaultSettings,requiredInputTypes:[],featured:true,active:true})):[];
app.get('/api/templates',(_req,res)=>res.json({items:creativeTemplates}));
app.get('/api/auth/email/status',(_req,res)=>res.json({configured:false}));
app.use('/api',(_req,res)=>res.status(503).json(disabled));
const banner='';
async function homepage(_req,res){
 try{
  const html=await readFile(path.join(assets,'deepsyq.html'),'utf8');
  res.type('html').send(html);
 }catch(_){res.status(503).type('text/plain').send('Preview assets are unavailable');}
}
app.get(['/','/dashboard','/deepsyq.html'],homepage);
// The deleted owner-cancelled workflow is never reachable in this preview.
app.get(['/product-video','/product-video.html'],(_req,res)=>res.status(404).type('text/plain').send('Not found'));
app.get(['/inspiration','/inspiration.html'],(_req,res)=>res.redirect(302,'/deepsyq.html#inspirationPreview'));
// F8 retired by owner: do not expose the former pet page, scripts, or model assets.
app.use((req,res,next)=>{
  if(/^\/virtual-pet(?=\/|\.|$)/i.test(req.path))return res.status(404).set('Cache-Control','no-store').type('text/plain').send('Not found');
  next();
});
// Public media may be cached briefly on repeat preview visits. This server
// keeps private and changing JSON/HTML/API content no-store; UI code revalidates
// using ETag/304 to avoid re-sending its entire body on every navigation.
// Byte-range (206) support for genuine MP4s stays with Express static.
app.use(express.static(assets,{
 extensions:['html'],index:false,fallthrough:true,
 setHeaders(res,filePath){
  const relative=path.relative(assets,filePath).split(path.sep).join('/');
  if(relative.startsWith('media/')&&/\.(?:avif|gif|jpe?g|png|svg|webp|m4a|mp3|mp4|wav|webm)$/i.test(relative)){
   res.setHeader('Cache-Control','public, max-age=3600, must-revalidate');
  }else if(/\.(?:css|js|mjs)$/i.test(relative)){
   res.setHeader('Cache-Control','no-cache');
  }else{
   res.setHeader('Cache-Control','no-store');
  }
 }
}));
app.use((req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).type('text/plain').send('PREVIEW_READ_ONLY');
 res.status(404).type('text/plain').send('Not found');
});
app.listen(port,()=>console.log('Deepsyq design preview running on port '+port));
