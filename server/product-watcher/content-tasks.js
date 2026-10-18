import {parisBriefSlots} from './briefs.js';
import {checkContentAssetReachability} from './link-reachability.js';
// Owner-only checks of EXISTING approved-content metadata, not modifications
// or external media fetches. 06:00 readiness, 07:00 internal opportunities.
const LOCK=[455033,8];

export function contentTasksEnabled(env={}){
  return env.PRODUCT_WATCHER_ENABLED==='true'&&env.PRODUCT_WATCHER_CONTENT_TASKS_ENABLED==='true';
}
async function scanExistingContent(client){
  try{
    const schema=await client.query("SELECT to_regclass('public.vv_ai_template') AS templates,to_regclass('public.vv_ai_inspiration') AS inspiration");
    const registered=!!schema.rows?.[0]?.templates,hasInspiration=!!schema.rows?.[0]?.inspiration;
    if(!registered||!hasInspiration)return{status:'not_ready',code:'CONTENT_SCHEMA_MISSING',
      templates:registered?'available':'missing',inspiration:hasInspiration?'available':'missing'};
    // Syntax only. SQL returns counts, never private URLs; no HTTP/SSRF.
    const localUrl="'^/[^/[:space:]][^[:space:]]*$'";
    const httpsUrl="'^https://[^/@:[:space:]?#]+(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'";
    const invalidUrl=column=>`NOT (btrim(${column}) ~ ${localUrl} OR btrim(${column}) ~ ${httpsUrl})`;
    // Read only counts of active workflow metadata; never read prompt bodies.
    const allowedInputs="'[\"image\",\"video\",\"audio\",\"logo\",\"product_name\",\"text\"]'::jsonb";
    const invalidInputs=`(required_input_types IS NULL OR jsonb_typeof(required_input_types)<>'array' OR NOT (required_input_types <@ ${allowedInputs}))`;
    const invalidSettings="(default_settings IS NULL OR jsonb_typeof(default_settings)<>'object')";
    const [templates,inspiration]=await Promise.all([
      client.query([
        'SELECT COUNT(*) FILTER(WHERE active)::int AS active,',
        "COUNT(*) FILTER(WHERE active AND (thumbnail IS NULL OR btrim(thumbnail)=''))::int AS missing_thumbnail,",
        "COUNT(*) FILTER(WHERE active AND btrim(prompt_template)='')::int AS missing_prompt,",
        `COUNT(*) FILTER(WHERE active AND thumbnail IS NOT NULL AND btrim(thumbnail)<>'' AND ${invalidUrl('thumbnail')})::int AS invalid_thumbnail_urls,`,
        "COUNT(*) FILTER(WHERE active AND generation_type NOT IN ('image','video','product_video','avatar','audio'))::int AS invalid_generation_types,",
        `COUNT(*) FILTER(WHERE active AND ${invalidInputs})::int AS invalid_input_types,`,
        `COUNT(*) FILTER(WHERE active AND ${invalidSettings})::int AS invalid_default_settings`,
        'FROM vv_ai_template'
      ].join(' ')),
      client.query([
        'SELECT COUNT(*) FILTER(WHERE active)::int AS active,',
        "COUNT(*) FILTER(WHERE active AND kind='image')::int AS images,",
        "COUNT(*) FILTER(WHERE active AND kind='video')::int AS videos,",
        "COUNT(*) FILTER(WHERE active AND (btrim(rights_note)='' OR rights_basis NOT IN ('owned','licensed')))::int AS rights_gaps,",
        "COUNT(*) FILTER(WHERE active AND btrim(preview_url)='')::int AS missing_previews,",
        `COUNT(*) FILTER(WHERE active AND btrim(preview_url)<>'' AND ${invalidUrl('preview_url')})::int AS invalid_preview_urls,`,
        `COUNT(*) FILTER(WHERE active AND preview_poster_url IS NOT NULL AND btrim(preview_poster_url)<>'' AND ${invalidUrl('preview_poster_url')})::int AS invalid_poster_urls,`,
        "COUNT(*) FILTER(WHERE active AND action_target NOT IN ('studio','agent'))::int AS invalid_action_targets,",
        `COUNT(*) FILTER(WHERE active AND ${invalidInputs})::int AS invalid_input_types,`,
        `COUNT(*) FILTER(WHERE active AND ${invalidSettings})::int AS invalid_default_settings`,
        'FROM vv_ai_inspiration'
      ].join(' '))
    ]);
    const asInt=(r,k)=>Math.max(0,Number(r?.[k])||0);
    const t=templates.rows?.[0]||{},i=inspiration.rows?.[0]||{};
    const result={templates:{active:asInt(t,'active'),missingThumbnail:asInt(t,'missing_thumbnail'),
      missingPrompt:asInt(t,'missing_prompt'),invalidThumbnailUrls:asInt(t,'invalid_thumbnail_urls'),
      invalidGenerationTypes:asInt(t,'invalid_generation_types'),invalidInputTypes:asInt(t,'invalid_input_types'),
      invalidDefaultSettings:asInt(t,'invalid_default_settings')},
      inspiration:{active:asInt(i,'active'),images:asInt(i,'images'),videos:asInt(i,'videos'),
        rightsGaps:asInt(i,'rights_gaps'),missingPreviews:asInt(i,'missing_previews'),
        invalidPreviewUrls:asInt(i,'invalid_preview_urls'),invalidPosterUrls:asInt(i,'invalid_poster_urls'),
        invalidActionTargets:asInt(i,'invalid_action_targets'),invalidInputTypes:asInt(i,'invalid_input_types'),
        invalidDefaultSettings:asInt(i,'invalid_default_settings')}};
    const problems=Object.values(result.templates).slice(1).some(x=>x>0)||
      result.inspiration.rightsGaps>0||result.inspiration.missingPreviews>0||
      result.inspiration.invalidPreviewUrls>0||result.inspiration.invalidPosterUrls>0||
      result.inspiration.invalidActionTargets>0||result.inspiration.invalidInputTypes>0||
      result.inspiration.invalidDefaultSettings>0;
    return{status:problems?'attention':'ready',code:problems?'CONTENT_METADATA_GAPS':'CONTENT_METADATA_READ',
      ...result,linkCheck:'syntax_only',workflowMetadata:'schema_shape_only',skills:'not_checked',workflows:'not_checked',
      mediaPlayback:'not_checked',urlReachability:'not_checked',
      limitations:'Metadata and URL shape only. No network/media fetching; no proof links load, licenses are valid, workflows execute or skills work.'};
  }catch{return{status:'unavailable',code:'CONTENT_CHECK_UNAVAILABLE'};}
}

export function internalContentRecommendations(result){
  if(!result||result.status==='unavailable')return[{code:'CONTENT_CHECK_UNAVAILABLE',priority:'high',
    text:'Inspect owner-only content schema and readiness checks.'}];
  if(result.status==='not_ready')return[{code:'CONTENT_SCHEMA_MISSING',priority:'medium',
    text:'Review and approve required content migrations before enabling public media.'}];
  const suggestions=[],add=(code,priority,text)=>suggestions.push({code,priority,text});
  if(result.inspiration.images===0)add('NO_APPROVED_IMAGE_EXAMPLE','medium','Prepare original owned/licensed image inspiration with rights evidence.');
  if(result.inspiration.videos===0)add('NO_APPROVED_VIDEO_EXAMPLE','medium','Prepare a genuine owned/licensed video preview and verify its playback.');
  if(result.templates.active===0)add('NO_ACTIVE_TEMPLATES','low','Review approved AI App templates and publish only verified workflows.');
  if(result.templates.missingThumbnail>0)add('TEMPLATE_THUMBNAIL_GAPS','medium','Check public template previews before publication.');
  if(result.templates.invalidThumbnailUrls>0)add('TEMPLATE_THUMBNAIL_URL_INVALID','high','Repair invalid thumbnail URL metadata before public release.');
  if(result.templates.invalidGenerationTypes>0)add('TEMPLATE_GENERATION_TYPE_INVALID','high','Review invalid active template generation-type metadata.');
  if(result.templates.invalidInputTypes>0)add('TEMPLATE_INPUT_SCHEMA_INVALID','high','Review active template input-list schema; do not execute unverified workflows.');
  if(result.templates.invalidDefaultSettings>0)add('TEMPLATE_SETTINGS_SCHEMA_INVALID','high','Review active template settings schema before use.');
  if(result.inspiration.rightsGaps>0)add('INSPIRATION_RIGHTS_GAPS','high','Review inspiration rights evidence before any public release.');
  if(result.inspiration.missingPreviews>0)add('INSPIRATION_PREVIEW_GAPS','high','Review missing inspiration preview metadata.');
  if(result.inspiration.invalidPreviewUrls>0)add('INSPIRATION_PREVIEW_URL_INVALID','high','Review invalid inspiration preview URL metadata.');
  if(result.inspiration.invalidPosterUrls>0)add('INSPIRATION_POSTER_URL_INVALID','medium','Review invalid optional video poster URL metadata.');
  if(result.inspiration.invalidActionTargets>0)add('INSPIRATION_TARGET_INVALID','high','Review invalid inspiration studio/agent target metadata.');
  if(result.inspiration.invalidInputTypes>0)add('INSPIRATION_INPUT_SCHEMA_INVALID','high','Review inspiration input-list schema before publishing.');
  if(result.inspiration.invalidDefaultSettings>0)add('INSPIRATION_SETTINGS_SCHEMA_INVALID','high','Review inspiration default-settings schema.');
  if(result.templates.missingPrompt>0)add('TEMPLATE_PROMPT_GAPS','medium','Review template prompt completeness.');
  return suggestions;
}

export async function runContentTasksIfDue({pool,env={},now=()=>new Date(),fetchFn=globalThis.fetch}={}){
  if(!contentTasksEnabled(env))return{status:'disabled',generated:[]};
  if(!pool?.connect)throw Error('WATCHER_DATABASE_NOT_CONFIGURED');
  const snapshot=now(),local=parisBriefSlots(snapshot);
  const due=[...(local.localHour>=6?['content']:[]),...(local.localHour>=7?['opportunities']:[])];
  if(!due.length)return{status:'not_due',generated:[]};
  const client=await pool.connect();let locked=false;
  try{
    const lock=await client.query('SELECT pg_try_advisory_lock($1,$2) AS acquired',LOCK);
    locked=lock.rows?.[0]?.acquired===true;
    if(!locked)return{status:'skipped',generated:[]};
    const state=await client.query('SELECT paused FROM vv_product_watcher_control WHERE id=1');
    if(state.rows?.length!==1)throw Error('WATCHER_SCHEMA_NOT_READY');
    if(state.rows[0].paused)return{status:'paused',generated:[]};
    const result={status:'not_due',generated:[]};
    for(const kind of due){
      const exists=await client.query('SELECT id FROM vv_product_watcher_content_tasks WHERE kind=$1 AND period_key=$2',[kind,local.periodKey]);
      if(exists.rows?.length)continue;
      const data=await scanExistingContent(client);
      // A real network probe is an optional daily content check, not a paid workflow.
      // Do not probe missing schemas or run again for the 07:00 opportunities task.
      const reachability=kind==='content'
        ? (data.status==='ready'||data.status==='attention'
          ? await checkContentAssetReachability({client,env,fetchFn})
          : {status:'not_checked',code:'CONTENT_METADATA_UNAVAILABLE'})
        : null;
      const content=kind==='content'?{
        kind,periodKey:local.periodKey,timezone:'Europe/Paris',checkedAt:snapshot.toISOString(),
        ...data,
        assetReachability:reachability
      }:{
        kind,periodKey:local.periodKey,timezone:'Europe/Paris',checkedAt:snapshot.toISOString(),
        status:data.status,
        recommendations:internalContentRecommendations(data),
        scope:'Internal content gaps only. No market trend, user demand or external competitor claims.'
      };
      await client.query('BEGIN');
      try{
        const inserted=await client.query(
          'INSERT INTO vv_product_watcher_content_tasks(kind,period_key,content) VALUES($1,$2,$3::jsonb) ON CONFLICT(kind,period_key) DO NOTHING RETURNING id',
          [kind,local.periodKey,JSON.stringify(content)]
        );
        await client.query('COMMIT');
        if(inserted.rows?.length)result.generated.push({kind,periodKey:local.periodKey,id:Number(inserted.rows[0].id)});
      }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}
    }
    result.status=result.generated.length?'generated':'not_due';
    return result;
  }finally{
    if(locked)await client.query('SELECT pg_advisory_unlock($1,$2)',LOCK).catch(()=>{});
    client.release();
  }
}

export async function listContentTasks(pool,{limit=20}={}){
  const safe=Math.max(1,Math.min(30,Number(limit)||20));
  const {rows}=await pool.query('SELECT id,kind,period_key,content,created_at FROM vv_product_watcher_content_tasks ORDER BY created_at DESC,id DESC LIMIT $1',[safe]);
  return rows.map(r=>({id:Number(r.id),kind:r.kind,periodKey:r.period_key,content:r.content,createdAt:r.created_at}));
}
