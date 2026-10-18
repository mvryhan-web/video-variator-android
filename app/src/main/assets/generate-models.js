// Public capability catalog only. Credentials and provider endpoints stay on the server.
function durationSeconds(value){const n=Number(String(value||'').match(/\d+/)?.[0]||0);return Number.isFinite(n)&&n>0?n:null;}
function capability(model){
 const maxReferences=Number(model.references||0),ratios=Array.isArray(model.ratios)?[...model.ratios]:[];
 const inputKinds=['text',...(maxReferences>0?['image']:[])];
 return Object.freeze({
  inputKinds:Object.freeze(inputKinds),
  outputKind:model.kind==='music'||model.kind==='voice'?'audio':model.kind,
  ratios:Object.freeze(ratios),
  resolutions:Object.freeze(['image','video'].includes(model.kind)?[...(model.resolutions||[model.quality||'1K'])]:[]),
  durations:Object.freeze(model.kind==='video'?[...(model.durations||[durationSeconds(model.duration)])]:[]),
  videoInputModes:Object.freeze(model.kind==='video'?[...(model.videoInputModes||['text','first_frame'])]:[]),
  outputFormats:Object.freeze(model.kind==='image'?[...(model.outputFormats||['auto'])]:[]),
  maxReferences,
  async:model.kind==='video',
  quality:model.quality||null,
  durationSeconds:durationSeconds(model.duration),
  supportsPrompt:true,
  supportsImageReferences:maxReferences>0,
  // Truthful public API/UI metadata. Provider-side video/audio reference
  // transport and watermark controls are NOT connected for customers yet.
  supportsTextToVideo:model.kind==='video'&&(model.videoInputModes||['text','first_frame']).includes('text'),
  supportsImageToVideo:model.kind==='video'&&maxReferences>0&&
   (model.videoInputModes||['text','first_frame']).some(x=>['first_frame','first_last','reference_image'].includes(x)),
  supportsVideoReferences:false,
  supportsAudioReferences:false,
  maxDurationSeconds:model.kind==='video'?
   (Math.max(0,...(model.durations||[durationSeconds(model.duration)]).filter(v=>Number.isSafeInteger(v)&&v>0))||null):
   (model.kind==='music'?durationSeconds(model.duration):null),
  watermarkOptions:Object.freeze([]),
  supportsWatermarkControl:false,
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
 {...MODELS.video,kind:'video',provider:'Google',adapter:true,description:'Text or a photo into a short video.',descriptionRu:'Короткое видео из текста или фотографии.',quality:'720p',duration:'8 seconds',resolutions:['720p','1080p'],durations:[4,6,8]},
 {id:'veo-3.1-fast-generate-preview',label:'Veo 3.1 Fast',kind:'video',provider:'Google',adapter:true,ratios:['16:9','9:16'],references:1,description:'A second Google video model to compare results.',descriptionRu:'Другая модель Google для сравнения результатов.',quality:'720p',duration:'8 seconds',resolutions:['720p','1080p'],durations:[4,6,8]},
 {id:'byteplus-seedance-2',label:'Seedance 2.0',kind:'video',provider:'BytePlus',adapter:true,ratios:['16:9','9:16','1:1'],references:3,videoInputModes:['text','first_frame','first_last','reference_image'],description:'Text or up to three image references into a short video.',descriptionRu:'Видео из текста, первого/последнего кадра или референсных фотографий.',quality:'720p',duration:'5 seconds',resolutions:['720p','1080p'],durations:[4,5,8,10,15]},
 {...MODELS.image,kind:'image',provider:'Google',adapter:true,description:'Create or edit an image with reference photos.',descriptionRu:'Создание изображений с фотографиями для примера.',quality:'1K',resolutions:['1K','2K','4K']},
 {id:'byteplus-seedream-4-5',label:'Seedream 4.5',kind:'image',provider:'BytePlus',adapter:true,ratios:['1:1','2:3','3:2','9:16','16:9'],references:3,description:'Create an image with optional reference photos.',descriptionRu:'Создание изображения с фотографиями для примера.',quality:'2K',resolutions:['2K','4K']},
 {id:'byteplus-seedream-5-lite',label:'Seedream 5.0 Lite',kind:'image',provider:'BytePlus',adapter:true,ratios:['1:1','2:3','3:2','9:16','16:9'],references:3,description:'Another image model prepared for connection.',descriptionRu:'Ещё одна модель изображений для будущего подключения.',quality:'2K',resolutions:['2K','3K','4K'],outputFormats:['png','jpeg']},
 {...MODELS.music,kind:'music',provider:'Google',adapter:true,description:'A 30-second song with vocals or an instrumental.',descriptionRu:'30 секунд песни с вокалом или инструментальной музыки.',duration:'30 seconds'},
 {id:'google-tts-preview',label:'Google AI Voice',kind:'voice',provider:'Google',adapter:false,ratios:[],references:0,description:'Voiceover controls. This studio connection is pending.',descriptionRu:'Настройки озвучки. Подключение этой студии ещё готовится.'},
 {id:'byteplus-seed-speech-2',label:'Seed Speech 2.0',kind:'voice',provider:'BytePlus',adapter:false,ratios:[],references:0,description:'BytePlus speech. API connection pending.',descriptionRu:'Озвучка BytePlus. API пока не подключён.'},
 {id:'byteplus-seed-audio-1',label:'Seed Audio 1.0',kind:'voice',provider:'BytePlus',adapter:false,ratios:[],references:0,description:'Audio model prepared for connection.',descriptionRu:'Модель аудио для будущего подключения.'}
];
export const MODEL_CATALOG=Object.freeze(RAW_MODEL_CATALOG.map(withCapabilities));
