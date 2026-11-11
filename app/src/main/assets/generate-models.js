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
 music:{id:'lyria-3-clip-preview',label:'Lyria · 30 seconds',labelRu:'Lyria · 30 секунд',ratios:[],references:0}
};
const RAW_MODEL_CATALOG=[
 {...MODELS.video,kind:'video',provider:'Google',adapter:true,description:'Text or a photo into a short video.',descriptionRu:'Короткое видео из текста или фотографии.',quality:'720p',duration:'8 seconds',resolutions:['720p','1080p'],durations:[4,6,8]},
 {id:'veo-3.1-fast-generate-preview',label:'Veo 3.1 Fast',kind:'video',provider:'Google',adapter:true,ratios:['16:9','9:16'],references:1,description:'An alternative video model for comparing results.',descriptionRu:'Альтернативная модель видео для сравнения результатов.',quality:'720p',duration:'8 seconds',resolutions:['720p','1080p'],durations:[4,6,8]},
 {id:'byteplus-seedance-2',label:'Seedance 2.0',kind:'video',provider:'BytePlus',adapter:true,ratios:['16:9','9:16','1:1'],references:3,videoInputModes:['text','first_frame','first_last','reference_image'],description:'Text or up to three image references into a short video.',descriptionRu:'Видео из текста, первого/последнего кадра или референсных фотографий.',quality:'720p',duration:'5 seconds',resolutions:['720p','1080p'],durations:[4,5,8,10,15]},
 {...MODELS.image,kind:'image',provider:'Google',adapter:true,description:'Create or edit an image with reference photos.',descriptionRu:'Создание изображений с фотографиями для примера.',quality:'1K',resolutions:['1K','2K','4K']},
 {id:'byteplus-seedream-4-5',label:'Seedream 4.5',kind:'image',provider:'BytePlus',adapter:true,ratios:['1:1','2:3','3:2','9:16','16:9'],references:3,description:'Create an image with optional reference photos.',descriptionRu:'Создание изображения с фотографиями для примера.',quality:'2K',resolutions:['2K','4K']},
 {id:'byteplus-seedream-5-lite',label:'Seedream 5.0 Lite',kind:'image',provider:'BytePlus',adapter:true,ratios:['1:1','2:3','3:2','9:16','16:9'],references:3,description:'Another image model prepared for connection.',descriptionRu:'Ещё одна модель изображений для будущего подключения.',quality:'2K',resolutions:['2K','3K','4K'],outputFormats:['png','jpeg']},
 {...MODELS.music,kind:'music',provider:'Google',adapter:true,description:'A 30-second song with vocals or an instrumental.',descriptionRu:'30 секунд песни с вокалом или инструментальной музыки.',duration:'30 seconds'},
 {id:'google-tts-preview',label:'AI Voice Preview',labelRu:'Озвучка AI · скоро',kind:'voice',provider:'Google',adapter:false,ratios:[],references:0,description:'Voiceover controls. This studio connection is pending.',descriptionRu:'Настройки озвучки. Подключение готовится.'},
 {id:'byteplus-seed-speech-2',label:'Seed Speech 2.0',kind:'voice',provider:'BytePlus',adapter:false,ratios:[],references:0,description:'Speech generation. API connection pending.',descriptionRu:'Создание речи. Подключение готовится.'},
 {id:'byteplus-seed-audio-1',label:'Seed Audio 1.0 Beta',kind:'music',provider:'BytePlus',adapter:false,ratios:[],references:0,description:'Audio model prepared for connection.',descriptionRu:'Модель аудио для будущего подключения.'},
 // Catalog-only entries remain visible in the picker but cannot be enabled or
 // dispatched until a verified provider adapter and its safeguards exist.
 {id:'gpt-image-2.5-sunburst',label:'ChatGPT Image 2.5',kind:'image',provider:'OpenAI',adapter:true,ratios:['1:1','3:2','2:3'],references:3,description:'OpenAI GPT Image 2.5 API adapter is ready. Activation requires an OpenAI server key and approved price.',descriptionRu:'Адаптер OpenAI GPT Image 2.5 готов. Для включения нужны серверный ключ OpenAI и утверждённая цена.',quality:'1K',resolutions:['1K'],outputFormats:['auto','png','jpeg']},
 {id:'gpt-image-2.5-flare',label:'ChatGPT Image 2.5 Flare',kind:'image',provider:'OpenAI',adapter:true,ratios:['1:1','3:2','2:3'],references:3,description:'OpenAI fast GPT Image 2.5 API adapter is ready. Activation requires an OpenAI server key and approved price.',descriptionRu:'Адаптер OpenAI быстрой GPT Image 2.5 готов. Для включения нужны серверный ключ OpenAI и утверждённая цена.',quality:'1K',resolutions:['1K'],outputFormats:['auto','png','jpeg']},
 {id:'gpt-image-2',label:'GPT Image 2',kind:'image',provider:'OpenAI',adapter:true,ratios:['1:1','3:2','2:3'],references:3,description:'OpenAI GPT Image 2 API adapter is ready. Activation requires an OpenAI server key and approved price.',descriptionRu:'Адаптер OpenAI GPT Image 2 готов. Для включения нужны серверный ключ OpenAI и утверждённая цена.',quality:'1K',resolutions:['1K'],outputFormats:['auto','png','jpeg']},
 {id:'gemini-nano-banana-2.1',label:'Nano Banana 2.1',kind:'image',provider:'Google',adapter:true,ratios:['1:1','2:3','3:2','9:16','16:9'],references:3,description:'Google Gemini Interactions API adapter is ready. Activation requires a server key and approved price.',descriptionRu:'Адаптер Google Gemini Interactions API готов. Для включения нужны серверный ключ и утверждённая цена.',quality:'1K',resolutions:['1K','2K','4K']},
 {id:'gemini-3-pro-image',label:'Nano Banana Pro',kind:'image',provider:'Google',adapter:true,ratios:['1:1','2:3','3:2','9:16','16:9'],references:3,description:'Google Gemini Interactions API adapter is ready. Activation requires a server key and approved price.',descriptionRu:'Адаптер Google Gemini Interactions API готов. Для включения нужны серверный ключ и утверждённая цена.',quality:'1K',resolutions:['1K','2K','4K']},
 {id:'byteplus-seedream-5-pro',label:'Seedream 5.0 Pro',kind:'image',provider:'BytePlus',adapter:true,ratios:['1:1','2:3','3:2','9:16','16:9'],references:3,description:'Official Seedream 5.0 Pro ModelArk API adapter. Activation still requires an approved price and provider key.',descriptionRu:'Официальный адаптер Seedream 5.0 Pro для ModelArk. Для включения нужны утверждённая цена и ключ провайдера.',quality:'2K',resolutions:['2K'],outputFormats:['png','jpeg']},
 {id:'byteplus-seedream-4',label:'Seedream 4.0',kind:'image',provider:'BytePlus',adapter:true,ratios:['1:1','2:3','3:2','9:16','16:9'],references:3,description:'Official Seedream 4.0 ModelArk API adapter. Activation still requires an approved price and provider key.',descriptionRu:'Официальный адаптер Seedream 4.0 для ModelArk. Для включения нужны утверждённая цена и ключ провайдера.',quality:'2K',resolutions:['2K','4K']},
 {id:'byteplus-seedream-3',label:'Seedream 3.0',kind:'image',provider:'BytePlus',adapter:true,ratios:['1:1','2:3','3:2','9:16','16:9'],references:0,description:'Official Seedream 3.0 text-to-image ModelArk API adapter. Activation still requires an approved price and provider key.',descriptionRu:'Официальный адаптер Seedream 3.0 text-to-image для ModelArk. Для включения нужны утверждённая цена и ключ провайдера.',quality:'2K',resolutions:['2K']},
 {id:'byteplus-seedream-3-art-catalog',label:'Seedream 3.0 Art Edition',kind:'image',provider:'BytePlus · unverified edition',adapter:false,ratios:['1:1','2:3','3:2','9:16','16:9'],references:1,description:'The Art Edition name and API model ID are not verified yet.',descriptionRu:'Название Art Edition и ID модели для API пока не подтверждены.'},
 {id:'byteplus-seedance-2.5',label:'Seedance 2.5',kind:'video',provider:'BytePlus',adapter:true,ratios:['16:9','9:16','1:1'],references:3,videoInputModes:['text','first_frame','first_last','reference_image'],description:'Official Seedance 2.5 ModelArk API adapter. Activation still requires approved video storage, price and provider key.',descriptionRu:'Официальный адаптер Seedance 2.5 для ModelArk. Для включения нужны хранилище видео, утверждённая цена и ключ провайдера.',quality:'720p',duration:'5 seconds',resolutions:['720p'],durations:[5]},
 {id:'byteplus-seedance-2-mini',label:'Seedance 2.0 Mini',kind:'video',provider:'BytePlus',adapter:true,ratios:['16:9','9:16','1:1'],references:3,videoInputModes:['text','first_frame','first_last','reference_image'],description:'Official Seedance 2.0 Mini ModelArk API adapter. Activation still requires approved video storage, price and provider key.',descriptionRu:'Официальный адаптер Seedance 2.0 Mini для ModelArk. Для включения нужны хранилище видео, утверждённая цена и ключ провайдера.',quality:'720p',duration:'5 seconds',resolutions:['720p'],durations:[5]},
 {id:'byteplus-seedance-2-fast',label:'Seedance 2.0 Fast',kind:'video',provider:'BytePlus',adapter:true,ratios:['16:9','9:16','1:1'],references:3,videoInputModes:['text','first_frame','first_last','reference_image'],description:'Official Seedance 2.0 Fast ModelArk API adapter. Activation still requires approved video storage, price and provider key.',descriptionRu:'Официальный адаптер Seedance 2.0 Fast для ModelArk. Для включения нужны хранилище видео, утверждённая цена и ключ провайдера.',quality:'720p',duration:'5 seconds',resolutions:['720p'],durations:[5]},
 {id:'byteplus-seedance-1.5-pro',label:'Seedance 1.5 Pro',kind:'video',provider:'BytePlus',adapter:true,ratios:['16:9','9:16'],references:2,videoInputModes:['text','first_frame','first_last'],description:'Official Seedance 1.5 Pro ModelArk API adapter. Activation still requires approved video storage, price and provider key.',descriptionRu:'Официальный адаптер Seedance 1.5 Pro для ModelArk. Для включения нужны хранилище видео, утверждённая цена и ключ провайдера.',quality:'720p',duration:'5 seconds',resolutions:['720p'],durations:[5]},
 {id:'byteplus-seedance-1-pro',label:'Seedance 1.0 Pro',kind:'video',provider:'BytePlus',adapter:true,ratios:['16:9','9:16'],references:2,videoInputModes:['text','first_frame','first_last'],description:'Official Seedance 1.0 Pro ModelArk API adapter. Activation still requires approved video storage, price and provider key.',descriptionRu:'Официальный адаптер Seedance 1.0 Pro для ModelArk. Для включения нужны хранилище видео, утверждённая цена и ключ провайдера.',quality:'720p',duration:'5 seconds',resolutions:['720p'],durations:[5]},
 {id:'byteplus-seedance-1-fast',label:'Seedance 1.0 Pro Fast',kind:'video',provider:'BytePlus',adapter:true,ratios:['16:9','9:16'],references:1,videoInputModes:['text','first_frame'],description:'Official Seedance 1.0 Pro Fast ModelArk API adapter. Activation still requires approved video storage, price and provider key.',descriptionRu:'Официальный адаптер Seedance 1.0 Pro Fast для ModelArk. Для включения нужны хранилище видео, утверждённая цена и ключ провайдера.',quality:'720p',duration:'5 seconds',resolutions:['720p'],durations:[5]},
 {id:'byteplus-seedance-1-dreamer-catalog',label:'Seedance 1.0 Dreamer',kind:'video',provider:'BytePlus · unverified model',adapter:false,ratios:['16:9','9:16'],references:1,description:'The Dreamer edition name and API model ID are not verified yet.',descriptionRu:'Название Dreamer и ID модели для API пока не подтверждены.',quality:'720p',duration:'5 seconds',resolutions:['720p'],durations:[5]},
 {id:'arcto-video-catalog',label:'Arcto',kind:'video',provider:'Provider · unverified',adapter:false,ratios:['16:9','9:16'],references:0,description:'Requested model name; provider, API model ID and capabilities are unverified.',descriptionRu:'Модель добавлена по запросу. Провайдер, ID API и параметры пока не подтверждены.',quality:'720p',duration:'5 seconds',resolutions:['720p'],durations:[5]},
 {id:'byteplus-seedance-speed-2-catalog',label:'Seedance Speed 2.0',kind:'voice',provider:'BytePlus · unverified model',adapter:false,ratios:[],references:0,description:'Requested audio model name; provider API mapping needs verification.',descriptionRu:'Запрошенная аудиомодель. Нужно проверить сопоставление с API провайдера.'},
 {id:'suno-voice-catalog',label:'Suno Voice',kind:'voice',provider:'Suno · API unverified',adapter:false,ratios:[],references:0,description:'Catalog entry only. Official API access and commercial terms are not verified.',descriptionRu:'Только каталоговая запись. Официальный API и коммерческие условия не проверены.'}
];
export const MODEL_CATALOG=Object.freeze(RAW_MODEL_CATALOG.map(withCapabilities));
