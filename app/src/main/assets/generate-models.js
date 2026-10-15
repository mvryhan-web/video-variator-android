// Public capability catalog only. Credentials and provider endpoints stay on the server.
function durationSeconds(value){const n=Number(String(value||'').match(/\d+/)?.[0]||0);return Number.isFinite(n)&&n>0?n:null;}
function capability(model){
 const maxReferences=Number(model.references||0),ratios=Array.isArray(model.ratios)?[...model.ratios]:[];
 const inputKinds=['text',...(maxReferences>0?['image']:[])];
 return Object.freeze({
  inputKinds:Object.freeze(inputKinds),
  outputKind:model.kind==='music'||model.kind==='voice'?'audio':model.kind,
  ratios:Object.freeze(ratios),
  resolutions:Object.freeze(model.kind==='image'?[...(model.resolutions||[model.quality||'1K'])]:[]),
  outputFormats:Object.freeze(model.kind==='image'?[...(model.outputFormats||['auto'])]:[]),
  maxReferences,
  async:model.kind==='video',
  quality:model.quality||null,
  durationSeconds:durationSeconds(model.duration),
  supportsPrompt:true,
  supportsImageReferences:maxReferences>0,
  supportsSeed:false,
  supportsNegativePrompt:false
 });
}
function withCapabilities(model){return Object.freeze({...model,capabilities:capability(model)});}
export const MODELS={
 image:{id:'gemini-3.1-flash-image',label:'Nano Banana 2',ratios:['1:1','2:3','3:2','9:16','16:9'],references:3},
 video:{id:'veo-3.1-lite-generate-preview',label:'Veo 3.1 Lite',ratios:['16:9','9:16'],references:1},
 music:{id:'lyria-3-clip-preview',label:'Lyria · 30 seconds',ratios:[],references:0}
};
const RAW_MODEL_CATALOG=[
 {...MODELS.video,kind:'video',provider:'Google',adapter:true,description:'Text or a photo into a short video.',descriptionRu:'Короткое видео из текста или фотографии.',quality:'720p',duration:'8 seconds'},
 {id:'veo-3.1-fast-generate-preview',label:'Veo 3.1 Fast',kind:'video',provider:'Google',adapter:true,ratios:['16:9','9:16'],references:1,description:'A second Google video model to compare results.',descriptionRu:'Другая модель Google для сравнения результатов.',quality:'720p',duration:'8 seconds'},
 {id:'byteplus-seedance-2',label:'Seedance 2.0',kind:'video',provider:'BytePlus',adapter:true,ratios:['16:9','9:16','1:1'],references:1,description:'Text or a first-frame photo into a short video.',descriptionRu:'Видео из текста или первого кадра.',quality:'720p',duration:'5 seconds'},
 {...MODELS.image,kind:'image',provider:'Google',adapter:true,description:'Create or edit an image with reference photos.',descriptionRu:'Создание изображений с фотографиями для примера.',quality:'1K',resolutions:['1K','2K','4K']},
 {id:'byteplus-seedream-4-5',label:'Seedream 4.5',kind:'image',provider:'BytePlus',adapter:true,ratios:['1:1','2:3','3:2','9:16','16:9'],references:3,description:'Create an image with optional reference photos.',descriptionRu:'Создание изображения с фотографиями для примера.',quality:'2K',resolutions:['2K','4K']},
 {id:'byteplus-seedream-5-lite',label:'Seedream 5.0 Lite',kind:'image',provider:'BytePlus',adapter:true,ratios:['1:1','2:3','3:2','9:16','16:9'],references:3,description:'Another image model prepared for connection.',descriptionRu:'Ещё одна модель изображений для будущего подключения.',quality:'2K',resolutions:['2K','3K','4K'],outputFormats:['png','jpeg']},
 {...MODELS.music,kind:'music',provider:'Google',adapter:true,description:'A 30-second song with vocals or an instrumental.',descriptionRu:'30 секунд песни с вокалом или инструментальной музыки.',duration:'30 seconds'},
 {id:'google-tts-preview',label:'Google AI Voice',kind:'voice',provider:'Google',adapter:false,ratios:[],references:0,description:'Voiceover controls. This studio connection is pending.',descriptionRu:'Настройки озвучки. Подключение этой студии ещё готовится.'},
 {id:'byteplus-seed-speech-2',label:'Seed Speech 2.0',kind:'voice',provider:'BytePlus',adapter:false,ratios:[],references:0,description:'BytePlus speech. API connection pending.',descriptionRu:'Озвучка BytePlus. API пока не подключён.'},
 {id:'byteplus-seed-audio-1',label:'Seed Audio 1.0',kind:'voice',provider:'BytePlus',adapter:false,ratios:[],references:0,description:'Audio model prepared for connection.',descriptionRu:'Модель аудио для будущего подключения.'}
];
export const MODEL_CATALOG=Object.freeze(RAW_MODEL_CATALOG.map(withCapabilities));
