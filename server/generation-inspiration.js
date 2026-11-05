import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {recordAdminAudit} from './admin-audit.js';

const KINDS=new Set(['image','video']);
const RATIOS=new Set(['1:1','16:9','9:16','2:3','3:2','4:3','3:4']);
const INPUTS=new Set(['image','video','audio','logo','product_name','text']);
const TARGETS=new Set(['studio','agent']);
const RIGHTS=new Set(['owned','licensed']);
const initByPool=new WeakMap();

function featureEnabled(env){const v=env.AI_INSPIRATION_ENABLED;return v==='true'||(env.NODE_ENV!=='production'&&v!=='false');}
function agentPath(env){const p=String(env.AI_INSPIRATION_AGENT_PATH||'').trim();if(!p||p==='/'||!/^\/[A-Za-z0-9][A-Za-z0-9._\/-]*$/.test(p)||p.includes('..')||p.includes('//'))return null;return p;}
function agentTargetsEnabled(env){return env.AI_INSPIRATION_AGENT_TARGETS_ENABLED==='true'&&!!agentPath(env);}
function owner(user,env){return !!(user&&env.ADMIN_EMAIL&&user.provider==='google'&&String(user.email||'').trim().toLowerCase()===String(env.ADMIN_EMAIL).trim().toLowerCase());}
function txt(v,max,{required=false}={}){const s=String(v??'').trim();if((required&&!s)||s.length>max)throw Error('INVALID_INSPIRATION');return s;}
function slug(v){const s=String(v??'').trim().toLowerCase();if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)||s.length>100)throw Error('INVALID_INSPIRATION');return s;}
function model(v){if(v==null||v==='')return null;const s=String(v).trim();if(!/^[A-Za-z0-9._:-]{1,120}$/.test(s))throw Error('INVALID_INSPIRATION');return s;}
function safeUrl(v,{required=false}={}){const s=String(v??'').trim();if(!s){if(required)throw Error('INVALID_INSPIRATION');return null;}if(s.length>500||s.includes('\\'))throw Error('INVALID_INSPIRATION');if(s.startsWith('/')&&!s.startsWith('//'))return s;try{const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password)throw Error();return u.toString();}catch(_){throw Error('INVALID_INSPIRATION');}}
function array(v){if(v==null)return [];if(!Array.isArray(v)||v.length>10||v.some(x=>!INPUTS.has(x))||new Set(v).size!==v.length)throw Error('INVALID_INSPIRATION');return v;}
function object(v){if(v==null)return {};if(typeof v!=='object'||Array.isArray(v)||JSON.stringify(v).length>5000)throw Error('INVALID_INSPIRATION');return v;}
function bool(v,def=false){if(v==null)return def;if(typeof v!=='boolean')throw Error('INVALID_INSPIRATION');return v;}
function order(v,def=100){if(v==null)return def;if(!Number.isInteger(v)||v<0||v>100000)throw Error('INVALID_INSPIRATION');return v;}


let fallbackInspirationItems = null;
async function getManifestInspirationItems() {
  if (fallbackInspirationItems) return fallbackInspirationItems;
  try {
    const assetsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../app/src/main/assets');
    const ownerMedia = JSON.parse(await readFile(path.join(assetsPath, 'media/home/owner-20261018/manifest.json'), 'utf8'));
    const imageMedia = JSON.parse(await readFile(path.join(assetsPath, 'media/inspiration/openai-20261021/manifest.json'), 'utf8'));
    const ownerInspiration = JSON.parse(await readFile(path.join(assetsPath, 'media/inspiration/owner-20261031/manifest.json'), 'utf8'));
    const ownerNext = JSON.parse(await readFile(path.join(assetsPath, 'media/inspiration/owner-next-20261031/manifest.json'), 'utf8'));

    const all = [
      ...(ownerMedia.items || []),
      ...(imageMedia.items || []),
      ...(ownerInspiration.items || []),
      ...(ownerNext.items || [])
    ];
    fallbackInspirationItems = all.map(item => ({
      id: item.slug,
      slug: item.slug,
      title: item.title,
      kind: item.kind,
      category: item.category,
      description: item.description || '',
      previewUrl: item.previewUrl,
      previewPosterUrl: item.previewPosterUrl || null,
      prompt: item.prompt,
      defaultModel: item.defaultModel || null,
      displayModel: item.displayModel || null,
      previewDimensions: item.previewDimensions || null,
      aspectRatio: item.aspectRatio || '16:9',
      requiredInputTypes: item.requiredInputTypes || [],
      defaultSettings: item.defaultSettings || {},
      actionTarget: item.actionTarget || 'studio',
      active: item.active === true,
      featured: !!item.featured,
      sortOrder: item.sortOrder || 100
    })).filter(x => !x.previewUrl?.includes('logo') && !x.previewPosterUrl?.includes('logo'));
  } catch (err) {
    fallbackInspirationItems = [];
  }
  return fallbackInspirationItems;
}

export async function initInspiration(pool,env=process.env){
 if(!pool)throw Error('DATABASE_NOT_CONFIGURED');
 let promise=initByPool.get(pool);
 if(!promise){
  promise=(async()=>{
   if(env.NODE_ENV==='production'){
    // Production schema changes run only through the approved, backed-up AI migration workflow.
    const {rows}=await pool.query("SELECT to_regclass('public.vv_ai_inspiration') AS table_name");
    if(!rows?.[0]?.table_name)throw Error('INSPIRATION_MIGRATION_REQUIRED');
   }else{
    const sql=await readFile(new URL('./migrations/20261015-ai-inspiration.sql',import.meta.url),'utf8');
    await pool.query(sql);
   }
  })().catch(e=>{initByPool.delete(pool);throw e;});
  initByPool.set(pool,promise);
 }
 await promise;
}
export function validateInspiration(value,current={}){
 const kind=value.kind??current.kind,ratio=value.aspectRatio??current.aspectRatio,target=value.actionTarget??current.actionTarget??'studio',rights=value.rightsBasis??current.rightsBasis;
 if(!KINDS.has(kind)||!RATIOS.has(ratio)||!TARGETS.has(target)||!RIGHTS.has(rights))throw Error('INVALID_INSPIRATION');
 const active=bool(value.active,current.active??false),rightsNote=txt(value.rightsNote??current.rightsNote??'',300);
 if(active&&rightsNote.length<3)throw Error('INSPIRATION_RIGHTS_NOTE_REQUIRED');
 return {title:txt(value.title??current.title,120,{required:true}),slug:slug(value.slug??current.slug),kind,category:txt(value.category??current.category,80,{required:true}),description:txt(value.description??current.description??'',600),previewUrl:safeUrl(value.previewUrl===undefined?current.previewUrl:value.previewUrl,{required:true}),previewPosterUrl:safeUrl(value.previewPosterUrl===undefined?current.previewPosterUrl:value.previewPosterUrl),prompt:txt(value.prompt??current.prompt,4000,{required:true}),defaultModel:model(value.defaultModel===undefined?current.defaultModel:value.defaultModel),aspectRatio:ratio,requiredInputTypes:array(value.requiredInputTypes===undefined?current.requiredInputTypes:value.requiredInputTypes),defaultSettings:object(value.defaultSettings===undefined?current.defaultSettings:value.defaultSettings),actionTarget:target,rightsBasis:rights,rightsNote,active,featured:bool(value.featured,current.featured??false),sortOrder:order(value.sortOrder,current.sortOrder??100)};
}
function row(r,{ownerView=false,agentActionPath=null}={}){
 const item={id:r.id,title:r.title,slug:r.slug,kind:r.kind,category:r.category,description:r.description||'',previewUrl:r.preview_url,previewPosterUrl:r.preview_poster_url||null,prompt:r.prompt,defaultModel:r.default_model||null,aspectRatio:r.aspect_ratio,requiredInputTypes:r.required_input_types||[],defaultSettings:r.default_settings||{},actionTarget:r.action_target,active:!!r.active,featured:!!r.featured,sortOrder:Number(r.sort_order||0),createdAt:r.created_at,updatedAt:r.updated_at};
 if(r.action_target==='agent'&&agentActionPath)item.actionPath=agentActionPath;if(ownerView){item.rightsBasis=r.rights_basis;item.rightsNote=r.rights_note||'';}return item;
}
function publicTargetSql(env){return agentTargetsEnabled(env)?'':" AND action_target='studio'";}

// Static manifest cards obey the same public active/agent policy as DB records.
// Do not turn a disabled Home showcase asset into a discoverable Inspiration card.
export function publicManifestInspirationItem(item,env={}){
 if(!item||item.active!==true)return null;
 if(item.actionTarget==='studio')return item;
 if(item.actionTarget!=='agent'||!agentTargetsEnabled(env))return null;
 return {...item,actionPath:agentPath(env)};
}

export function installInspiration(app,{auth,pool,env=process.env}){
  app.get('/api/inspiration',async(req,res)=>{
    if(!featureEnabled(env))return res.status(503).json({error:'INSPIRATION_NOT_ENABLED'});
    try{
      await initInspiration(pool,env);
      const manifestItems = (await getManifestInspirationItems())
        .map(item=>publicManifestInspirationItem(item,env)).filter(Boolean);

      const q = req.query;
      let items = manifestItems.filter(item => 
        !item.previewUrl?.includes('logo') && 
        !item.previewPosterUrl?.includes('logo') &&
        (q.featured !== 'true' || item.featured) &&
        (!q.kind || q.kind === 'all' || item.kind === q.kind) &&
        (!q.target || item.actionTarget === q.target) &&
        (!q.category || item.category === q.category) &&
        (!q.ratio || item.aspectRatio === q.ratio) &&
        (!q.q || item.title.toLowerCase().includes(String(q.q).toLowerCase()) || (item.prompt && item.prompt.toLowerCase().includes(String(q.q).toLowerCase())))
      ).sort((a,b) => (a.sortOrder || 100) - (b.sortOrder || 100));

      const total = items.length;
      const limit = Math.max(1, Math.min(60, Number.parseInt(q.limit || '24', 10) || 24));
      const page = Math.max(1, Number.parseInt(q.page || '1', 10) || 1);
      const offset = Math.max(0, Math.min(5000, Number.parseInt(q.offset || '0', 10) || ((page - 1) * limit)));
      const visible = items.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      const categories = [...new Set(manifestItems.map(item => item.category).filter(Boolean))].sort();
      const ratios = [...new Set(manifestItems.map(item => item.aspectRatio).filter(Boolean))].sort();

      res.json({
        items: visible,
        categories,
        ratios,
        pagination: {
          page,
          limit,
          total,
          offset,
          nextOffset: hasMore ? offset + limit : null,
          hasMore
        }
      });
    }catch(_){res.status(503).json({error:'INSPIRATION_UNAVAILABLE'});}
  });
  app.get('/api/inspiration/:slug',async(req,res)=>{
    if(!featureEnabled(env))return res.status(503).json({error:'INSPIRATION_NOT_ENABLED'});
    try{
      await initInspiration(pool,env);
      const manifestItems = await getManifestInspirationItems();
      const match = manifestItems.find(x => x.slug === req.params.slug);
      if (match){
        const visible = publicManifestInspirationItem(match,env);
        if(!visible)return res.status(404).json({error:'INSPIRATION_NOT_FOUND'});
        return res.json({item:visible});
      }
      const {rows}=await pool.query(`SELECT * FROM vv_ai_inspiration WHERE slug=$1 AND active=true AND rights_basis IN ('owned','licensed') AND length(trim(rights_note))>=3${publicTargetSql(env)}`,[req.params.slug]);
      if(!rows.length)return res.status(404).json({error:'INSPIRATION_NOT_FOUND'});
      res.json({item:row(rows[0],{agentActionPath:agentPath(env)})});
    }catch(_){res.status(503).json({error:'INSPIRATION_UNAVAILABLE'});}
  });
 const onlyOwner=(req,res,next)=>owner(req.user,env)?next():res.status(403).json({error:'OWNER_ONLY'});
 app.get('/api/studio/admin/inspiration-readiness',auth,onlyOwner,async(_req,res)=>{try{
  await initInspiration(pool,env);const {rows}=await pool.query('SELECT kind,category,aspect_ratio,action_target,rights_basis,rights_note,active,featured FROM vv_ai_inspiration');
  const rightsOk=r=>['owned','licensed'].includes(r.rights_basis)&&String(r.rights_note||'').trim().length>=3;
  const active=rows.filter(r=>r.active),rightsBlocked=active.filter(r=>!rightsOk(r));
  const publicRows=active.filter(r=>rightsOk(r)&&(r.action_target==='studio'||agentTargetsEnabled(env)));
  const studio=publicRows.filter(r=>r.action_target==='studio'),images=studio.filter(r=>r.kind==='image'),videos=studio.filter(r=>r.kind==='video'),featured=studio.filter(r=>r.featured);
  const blockers=[];if(!studio.length)blockers.push('NO_PUBLISHED_STUDIO_EXAMPLES');if(!images.length)blockers.push('NO_PUBLISHED_IMAGE_EXAMPLES');if(!videos.length)blockers.push('NO_PUBLISHED_VIDEO_EXAMPLES');if(!featured.length)blockers.push('NO_FEATURED_INSPIRATION');if(rightsBlocked.length)blockers.push('ACTIVE_ITEMS_MISSING_RIGHTS_EVIDENCE');
  res.json({ready:blockers.length===0,featureEnabled:featureEnabled(env),agentTargetsEnabled:agentTargetsEnabled(env),counts:{total:rows.length,active:active.length,publishable:publicRows.length,studio:studio.length,images:images.length,videos:videos.length,featured:featured.length,rightsBlocked:rightsBlocked.length,agentGated:active.filter(r=>r.action_target==='agent').length},categories:[...new Set(studio.map(r=>r.category).filter(Boolean))].sort(),ratios:[...new Set(studio.map(r=>r.aspect_ratio).filter(Boolean))].sort(),blockers});
 }catch(_){res.status(503).json({error:'INSPIRATION_READINESS_UNAVAILABLE'});}});
 app.get('/api/studio/admin/inspiration',auth,onlyOwner,async(_req,res)=>{try{await initInspiration(pool,env);const {rows}=await pool.query('SELECT * FROM vv_ai_inspiration ORDER BY sort_order ASC,created_at DESC');res.json({items:rows.map(r=>row(r,{ownerView:true}))});}catch(_){res.status(503).json({error:'INSPIRATION_UNAVAILABLE'});}});
 app.post('/api/studio/admin/inspiration',auth,onlyOwner,async(req,res)=>{try{await initInspiration(pool,env);const item=validateInspiration(req.body),id=randomUUID();const {rows}=await pool.query(`INSERT INTO vv_ai_inspiration(id,title,slug,kind,category,description,preview_url,preview_poster_url,prompt,default_model,aspect_ratio,required_input_types,default_settings,action_target,rights_basis,rights_note,active,featured,sort_order,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,[id,item.title,item.slug,item.kind,item.category,item.description,item.previewUrl,item.previewPosterUrl,item.prompt,item.defaultModel,item.aspectRatio,JSON.stringify(item.requiredInputTypes),JSON.stringify(item.defaultSettings),item.actionTarget,item.rightsBasis,item.rightsNote,item.active,item.featured,item.sortOrder,req.user.id]);const created=row(rows[0],{ownerView:true});await recordAdminAudit(pool,{actorUserId:req.user.id,action:'inspiration.create',targetType:'inspiration',targetId:id,details:{slug:created.slug,kind:created.kind,category:created.category,rightsBasis:created.rightsBasis,active:created.active,featured:created.featured}});res.status(201).json({item:created});}catch(e){res.status(e?.code==='23505'?409:['INVALID_INSPIRATION','INSPIRATION_RIGHTS_NOTE_REQUIRED'].includes(e.message)?400:503).json({error:e?.code==='23505'?'INSPIRATION_SLUG_EXISTS':['INVALID_INSPIRATION','INSPIRATION_RIGHTS_NOTE_REQUIRED'].includes(e.message)?e.message:'INSPIRATION_UNAVAILABLE'});}});
 app.patch('/api/studio/admin/inspiration/:id',auth,onlyOwner,async(req,res)=>{try{await initInspiration(pool,env);const current=await pool.query('SELECT * FROM vv_ai_inspiration WHERE id=$1',[req.params.id]);if(!current.rows.length)return res.status(404).json({error:'INSPIRATION_NOT_FOUND'});const item=validateInspiration(req.body,row(current.rows[0],{ownerView:true}));const {rows}=await pool.query(`UPDATE vv_ai_inspiration SET title=$2,slug=$3,kind=$4,category=$5,description=$6,preview_url=$7,preview_poster_url=$8,prompt=$9,default_model=$10,aspect_ratio=$11,required_input_types=$12::jsonb,default_settings=$13::jsonb,action_target=$14,rights_basis=$15,rights_note=$16,active=$17,featured=$18,sort_order=$19,updated_at=NOW() WHERE id=$1 RETURNING *`,[req.params.id,item.title,item.slug,item.kind,item.category,item.description,item.previewUrl,item.previewPosterUrl,item.prompt,item.defaultModel,item.aspectRatio,JSON.stringify(item.requiredInputTypes),JSON.stringify(item.defaultSettings),item.actionTarget,item.rightsBasis,item.rightsNote,item.active,item.featured,item.sortOrder]);const updated=row(rows[0],{ownerView:true});await recordAdminAudit(pool,{actorUserId:req.user.id,action:'inspiration.update',targetType:'inspiration',targetId:req.params.id,details:{slug:updated.slug,kind:updated.kind,category:updated.category,rightsBasis:updated.rightsBasis,active:updated.active,featured:updated.featured}});res.json({item:updated});}catch(e){res.status(e?.code==='23505'?409:['INVALID_INSPIRATION','INSPIRATION_RIGHTS_NOTE_REQUIRED'].includes(e.message)?400:503).json({error:e?.code==='23505'?'INSPIRATION_SLUG_EXISTS':['INVALID_INSPIRATION','INSPIRATION_RIGHTS_NOTE_REQUIRED'].includes(e.message)?e.message:'INSPIRATION_UNAVAILABLE'});}});
}
