import test,{after} from 'node:test';
import assert from 'node:assert/strict';

// All MP3 texts below are test fixtures; they do NOT approve any unreviewed
// owner MP3 on the website. This checks only the reply selector in TEST.
const langs=['ru','en','fr','es'];
const question={ru:'Как открыть Canvas?',en:'How can I open Canvas?',fr:'Comment ouvrir Canvas ?',es:'¿Cómo abrir Canvas?'};
const followup={ru:'Скажи иначе',en:'Say it differently',fr:'Autrement',es:'Dilo de otra manera'};
const answers={
  ru:['Откройте Canvas через инструменты.','Перейдите к холсту Canvas.'],
  en:['Open Canvas from the tools menu.','Go to your Canvas workspace.'],
  fr:['Ouvrez Canvas depuis les outils.','Accédez à votre espace Canvas.'],
  es:['Abre Canvas desde las herramientas.','Entra a tu espacio Canvas.']
};
const files=langs.flatMap(lang=>[1,2].map(n=>({
  language:lang,filename:'jarvix_'+lang+'_s'+String(n).padStart(3,'0')+'.mp3',scenarioId:'TEST-'+n,
  text:answers[lang][n-1],question:question[lang]
})));
const scenarios=[1,2].map(n=>({
  id:'TEST-'+n,
  qa:Object.fromEntries(langs.map(lang=>[lang,{question:question[lang],answer:answers[lang][n-1]}])),
  triggers:Object.fromEntries(langs.map(lang=>[lang,[question[lang]]])),
  audio:Object.fromEntries(langs.map(lang=>[lang,'jarvix_'+lang+'_s'+String(n).padStart(3,'0')+'.mp3']))
}));
const physicalPaths=files.map(f=>'/media/jarvix/clips/'+f.filename);
const fixtures=new Map([
  ['/media/jarvix/jarvix-unified-500-master.json',{scenarios}],
  ['/media/jarvix/clips/manifest-500.json',{clips:files}],
  ['/media/jarvix/tour-v3/manifest.json',{format:'mp3',engine:'VoxCPM2',clips:[],previewApproved:true}],
  ['/jarvix-new-physical-audio-index.json',{schema:'jarvix-new-physical-audio-index/v1',count:physicalPaths.length,paths:physicalPaths}],
  ['/media/jarvix/jarvix-phrases.json',{phrases:{}}],
  ['/media/jarvix/clips/reviewed-scenarios.json',{
    schema:'jarvix-reviewed-scenarios/v1',clips:files.map(f=>({
      filename:f.filename,scenarioId:f.scenarioId,approved:true,spokenText:f.text
    }))
  }]
]);
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url)=>{
  const value=fixtures.get(String(url));
  return {ok:value!==undefined,json:async()=>value||{}};
};
const {recordedConversationReply}=await import('../app/src/main/assets/jarvix-new-recorded-dialog.js');
// Physical index and reviewed-transcript loaders fetch lazily, inside the tests.
after(()=>{globalThis.fetch=originalFetch;});

for(const lang of langs){
  test('JARVIX NEW '+lang+' rephrases with another VERIFIED MP3, never invented text',async()=>{
    const first=await recordedConversationReply(question[lang],lang);
    assert.equal(first?.text,answers[lang][0]);
    assert.match(first.audioUrl,new RegExp('jarvix_'+lang+'_s001\\.mp3$'));
    const history=[{role:'user',content:question[lang]},{role:'assistant',content:first.text}];
    const different=await recordedConversationReply(followup[lang],lang,history);
    assert.equal(different?.text,answers[lang][1]);
    assert.match(different.audioUrl,new RegExp('jarvix_'+lang+'_s002\\.mp3$'));
    assert.notEqual(different.text,first.text);
    const exhausted=[...history,{role:'user',content:followup[lang]},{role:'assistant',content:different.text}];
    assert.equal(await recordedConversationReply(followup[lang],lang,exhausted),null);
  });
}

test('Rephrasing without previous user question does not guess or use an unrelated recording',async()=>{
  assert.equal(await recordedConversationReply('Скажи иначе','ru',[]),null);
  assert.equal(await recordedConversationReply('Скажи иначе','ru',[
    {role:'user',content:'Как приготовить пиццу?'},
    {role:'assistant',content:'Откройте Canvas через инструменты.'}
  ]),null);
});

test('Original audio bytes and Google OAuth are outside scope of this change',async()=>{
  const fs=await import('node:fs');
  const source=fs.readFileSync('app/src/main/assets/jarvix-new-recorded-dialog.js','utf8');
  assert.match(source,/REPHRASE/);
  assert.doesNotMatch(source,/speechSynthesis|voiceClone|google\.accounts/);
});
