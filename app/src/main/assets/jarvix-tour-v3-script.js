// Owner-approved concise 19-stage JARVIX Tour V3, 2026-11-07.
// This file defines speech and READ-ONLY UI targets. No model/voice changes.
// Voice pack generation must use the existing owner VoxCPM2 worker and voice profile.
import {tourPlan as legacyTourPlan} from './jarvix-tour-plan.js';
export const TOUR_V3_VERSION='v3-20261107';
export const TOUR_V3_DATA=Object.freeze([
 {
  "key": "Home",
  "nav": null,
  "op": [
   [
    "#homeQuickBar",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Привет! Я JARVIX. Смотрите, что я умею."
   ],
   "en": [
    "Hi! I'm JARVIX. Let me show you what I can do."
   ],
   "fr": [
    "Salut ! Je suis JARVIX. Regardez ce que je sais faire."
   ],
   "es": [
    "¡Hola! Soy JARVIX. Mira lo que puedo hacer."
   ]
  }
 },
 {
  "key": "Image",
  "nav": {
   "ru": "Изображения.",
   "en": "Images.",
   "fr": "Images.",
   "es": "Imágenes."
  },
  "op": [
   [
    "#creator,#referenceBox",
    "focus"
   ],
   [
    "#modelButton",
    "openModel"
   ],
   [
    "#settingsButton,#ratio,#imageResolution,#imageQuantity",
    "openSettings"
   ],
   [
    "#generate",
    "closeSettings"
   ]
  ],
  "texts": {
   "ru": [
    "Создавайте по описанию или добавьте фотографию.",
    "Выбор AI-модели.",
    "Формат, разрешение и количество изображений.",
    "Генерация — здесь."
   ],
   "en": [
    "Create from a description or add a photo.",
    "Choose an AI model.",
    "Format, resolution, and number of images.",
    "Generate here."
   ],
   "fr": [
    "Créez à partir d'une description ou ajoutez une photo.",
    "Choisissez le modèle IA.",
    "Format, résolution et nombre d'images.",
    "Lancez la génération ici."
   ],
   "es": [
    "Crea con una descripción o añade una foto.",
    "Elige un modelo de IA.",
    "Formato, resolución y cantidad de imágenes.",
    "Genera aquí."
   ]
  }
 },
 {
  "key": "Video",
  "nav": {
   "ru": "Видео.",
   "en": "Video.",
   "fr": "Vidéo.",
   "es": "Vídeo."
  },
  "op": [
   [
    "#creator,#referenceBox",
    "focus"
   ],
   [
    "#modelButton",
    "openModel"
   ],
   [
    "#settingsButton,#videoResolution,#videoDuration,#ratio",
    "openSettings"
   ],
   [
    "#showHistory,#generate",
    "closeSettings"
   ]
  ],
  "texts": {
   "ru": [
    "Создавайте ролики по описанию или из фотографий.",
    "Здесь выбирается видеомодель.",
    "Формат, качество и длительность.",
    "Готовый результат — в My Results."
   ],
   "en": [
    "Create videos from text or photos.",
    "Choose your video model here.",
    "Format, quality, and duration.",
    "Finished work appears in My Results."
   ],
   "fr": [
    "Créez des vidéos à partir d'un texte ou de photos.",
    "Choisissez le modèle vidéo ici.",
    "Format, qualité et durée.",
    "Vos résultats sont dans My Results."
   ],
   "es": [
    "Crea vídeos con texto o fotografías.",
    "Aquí eliges el modelo de vídeo.",
    "Formato, calidad y duración.",
    "Tus resultados están en My Results."
   ]
  }
 },
 {
  "key": "Audio",
  "nav": {
   "ru": "Аудио.",
   "en": "Audio.",
   "fr": "Audio.",
   "es": "Audio."
  },
  "op": [
   [
    "#creator",
    "focus"
   ],
   [
    "#modelButton",
    "openModel"
   ],
   [
    "#musicMode,#musicOptions",
    "openSettings"
   ],
   [
    "#generate",
    "closeSettings"
   ]
  ],
  "texts": {
   "ru": [
    "Создавайте музыку по своему описанию.",
    "Здесь выбирается музыкальная модель.",
    "Песня с вокалом или инструментальная музыка.",
    "Настройте звучание и запускайте создание."
   ],
   "en": [
    "Create music from your own description.",
    "Choose a music model here.",
    "A song with vocals or instrumental music.",
    "Adjust the sound and create."
   ],
   "fr": [
    "Créez de la musique à partir de votre description.",
    "Choisissez le modèle musical ici.",
    "Une chanson avec voix ou une musique instrumentale.",
    "Réglez le son et lancez la création."
   ],
   "es": [
    "Crea música a partir de tu descripción.",
    "Aquí eliges el modelo musical.",
    "Una canción con voz o música instrumental.",
    "Ajusta el sonido y crea."
   ]
  }
 },
 {
  "key": "AI Apps",
  "nav": {
   "ru": "AI Apps.",
   "en": "AI Apps.",
   "fr": "AI Apps.",
   "es": "AI Apps."
  },
  "op": [
   [
    ".app-card:first-child,main",
    "focus"
   ],
   [
    ".app-card:first-child,main",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Каталог творческих шаблонов.",
    "Выбирайте доступный шаблон и продолжайте в Студии."
   ],
   "en": [
    "A catalog of creative templates.",
    "Pick an available template and continue in Studio."
   ],
   "fr": [
    "Un catalogue de modèles créatifs.",
    "Choisissez un modèle disponible et poursuivez dans le Studio."
   ],
   "es": [
    "Un catálogo de plantillas creativas.",
    "Elige una plantilla disponible y continúa en Studio."
   ]
  }
 },
 {
  "key": "Canvas",
  "nav": {
   "ru": "Canvas.",
   "en": "Canvas.",
   "fr": "Canvas.",
   "es": "Canvas."
  },
  "op": [
   [
    "#quickCreatePrompt,#quickCreateDropzone",
    "focus"
   ],
   [
    "#quickCreateSubmit",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Собирайте идеи из текста и фотографий.",
    "Готовую идею переносите в Студию."
   ],
   "en": [
    "Combine ideas from text and photos.",
    "Continue your idea in Studio."
   ],
   "fr": [
    "Assemblez vos idées avec du texte et des photos.",
    "Poursuivez votre idée dans le Studio."
   ],
   "es": [
    "Combina ideas con texto y fotografías.",
    "Continúa tu idea en Studio."
   ]
  }
 },
 {
  "key": "Tools",
  "nav": {
   "ru": "Everyday Tools.",
   "en": "Everyday Tools.",
   "fr": "Everyday Tools.",
   "es": "Everyday Tools."
  },
  "op": [
   [
    "#etGallery",
    "focus"
   ],
   [
    "#etGallery a[href*='photo-compress'],#etGallery",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Сжатие фото и видео, обработка звука, PDF, коллажи и удаление фона.",
    "Посмотрим несколько инструментов."
   ],
   "en": [
    "Compress photos and videos, work with audio and PDF, make collages, and remove backgrounds.",
    "Let's look at a few tools."
   ],
   "fr": [
    "Compressez photos et vidéos, travaillez sur l'audio et les PDF, créez des collages et retirez les fonds.",
    "Voyons quelques outils."
   ],
   "es": [
    "Comprime fotos y vídeos, edita audio y PDF, crea collages y elimina fondos.",
    "Veamos algunas herramientas."
   ]
  }
 },
 {
  "key": "Compress photos",
  "nav": {
   "ru": "Сжатие фото.",
   "en": "Compress Photos.",
   "fr": "Compresser les photos.",
   "es": "Comprimir fotos."
  },
  "op": [
   [
    "#utilityFiles,#utilityRun",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Выберите файл, настройте качество, сохраните результат."
   ],
   "en": [
    "Choose a file, adjust quality, and save the result."
   ],
   "fr": [
    "Choisissez un fichier, réglez la qualité et enregistrez le résultat."
   ],
   "es": [
    "Elige un archivo, ajusta la calidad y guarda el resultado."
   ]
  }
 },
 {
  "key": "Trim video",
  "nav": {
   "ru": "Обрезка видео.",
   "en": "Trim Video.",
   "fr": "Découper la vidéo.",
   "es": "Recortar vídeo."
  },
  "op": [
   [
    "#utilityFiles,#utilityStart,#utilityEnd",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Выберите ролик, начало и конец фрагмента."
   ],
   "en": [
    "Choose your video and set the start and end of the clip."
   ],
   "fr": [
    "Choisissez la vidéo et indiquez le début et la fin de l'extrait."
   ],
   "es": [
    "Elige un vídeo y define el inicio y el final del fragmento."
   ]
  }
 },
 {
  "key": "Trim audio",
  "nav": {
   "ru": "Обрезка аудио.",
   "en": "Trim Audio.",
   "fr": "Découper l'audio.",
   "es": "Recortar audio."
  },
  "op": [
   [
    "#utilityFiles,#utilityStart,#utilityEnd",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Выберите запись и нужный отрезок."
   ],
   "en": [
    "Choose a recording and the section you need."
   ],
   "fr": [
    "Choisissez un enregistrement et le passage souhaité."
   ],
   "es": [
    "Elige una grabación y el fragmento que necesitas."
   ]
  }
 },
 {
  "key": "Video Uniquifier",
  "nav": {
   "ru": "Video Uniquifier.",
   "en": "Video Uniquifier.",
   "fr": "Video Uniquifier.",
   "es": "Video Uniquifier."
  },
  "op": [
   [
    "#fileInput,#dashboardView",
    "focus"
   ],
   [
    "#mode",
    "focus"
   ],
   [
    "#aspectRatio,#quality",
    "focus"
   ],
   [
    "#startBtn",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Создавайте варианты собственного видео.",
    "Выберите режим Gentle, Balance или Dynamic.",
    "Настройте формат и качество.",
    "Запустите обработку здесь."
   ],
   "en": [
    "Create variations of your own video.",
    "Choose Gentle, Balance, or Dynamic.",
    "Set the format and quality.",
    "Start processing here."
   ],
   "fr": [
    "Créez des variantes de vos propres vidéos.",
    "Choisissez Gentle, Balance ou Dynamic.",
    "Réglez le format et la qualité.",
    "Lancez le traitement ici."
   ],
   "es": [
    "Crea versiones de tus propios vídeos.",
    "Elige Gentle, Balance o Dynamic.",
    "Configura el formato y la calidad.",
    "Inicia el proceso aquí."
   ]
  }
 },
 {
  "key": "Inspiration",
  "nav": {
   "ru": "Inspiration.",
   "en": "Inspiration.",
   "fr": "Inspiration.",
   "es": "Inspiration."
  },
  "op": [
   [
    "#inspirationPreview",
    "focus"
   ],
   [
    "#inspirationPreview",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Идеи для новых проектов.",
    "Выбирайте пример, изучайте промпт и создавайте своё."
   ],
   "en": [
    "Ideas for your next project.",
    "Choose an example, explore its prompt, and create your own."
   ],
   "fr": [
    "Des idées pour vos prochains projets.",
    "Choisissez un exemple, découvrez son prompt et créez le vôtre."
   ],
   "es": [
    "Ideas para nuevos proyectos.",
    "Elige un ejemplo, estudia el prompt y crea el tuyo."
   ]
  }
 },
 {
  "key": "Pricing",
  "nav": {
   "ru": "Тарифы и AI-кредиты.",
   "en": "Plans and AI credits.",
   "fr": "Offres et crédits IA.",
   "es": "Planes y créditos de IA."
  },
  "op": [
   [
    "#plans",
    "focus"
   ],
   [
    "#credits",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Выбирайте план доступа к инструментам.",
    "AI-генерация оплачивается отдельными кредитами."
   ],
   "en": [
    "Choose a plan for the tools you need.",
    "AI generation uses separately purchased credits."
   ],
   "fr": [
    "Choisissez un forfait pour les outils dont vous avez besoin.",
    "La génération IA utilise des crédits achetés séparément."
   ],
   "es": [
    "Elige el plan de herramientas que necesitas.",
    "La generación de IA utiliza créditos comprados por separado."
   ]
  }
 },
 {
  "key": "trial",
  "nav": null,
  "op": [
   [
    ".price-plan.price-trial",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Trial — ознакомительное предложение, пока недоступно."
   ],
   "en": [
    "Trial — an introductory offer, not available yet."
   ],
   "fr": [
    "Trial — une offre de découverte, pas encore disponible."
   ],
   "es": [
    "Trial — una oferta de prueba, todavía no disponible."
   ]
  }
 },
 {
  "key": "basic",
  "nav": null,
  "op": [
   [
    ".price-plan.price-basic",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Basic — основные инструменты и режим Gentle."
   ],
   "en": [
    "Basic — essential tools and Gentle mode."
   ],
   "fr": [
    "Basic — outils essentiels et mode Gentle."
   ],
   "es": [
    "Basic — herramientas esenciales y modo Gentle."
   ]
  }
 },
 {
  "key": "pro",
  "nav": null,
  "op": [
   [
    ".price-plan.price-pro",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Pro — больше возможностей, до 1080p."
   ],
   "en": [
    "Pro — more options, up to 1080p."
   ],
   "fr": [
    "Pro — plus de possibilités, jusqu'à 1080p."
   ],
   "es": [
    "Pro — más funciones, hasta 1080p."
   ]
  }
 },
 {
  "key": "business",
  "nav": null,
  "op": [
   [
    ".price-plan.price-business",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Business — расширенные режимы и до 4K."
   ],
   "en": [
    "Business — advanced modes and up to 4K."
   ],
   "fr": [
    "Business — modes avancés, jusqu'à 4K."
   ],
   "es": [
    "Business — modos avanzados y hasta 4K."
   ]
  }
 },
 {
  "key": "lifetime",
  "nav": null,
  "op": [
   [
    ".price-plan.price-lifetime",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Lifetime — разовая покупка доступа к включённым инструментам."
   ],
   "en": [
    "Lifetime — a one-time purchase of access to the included tools."
   ],
   "fr": [
    "Lifetime — un achat unique pour accéder aux outils inclus."
   ],
   "es": [
    "Lifetime — una compra única para acceder a las herramientas incluidas."
   ]
  }
 },
 {
  "key": "Home",
  "nav": null,
  "op": [
   [
    "#homeQuickBar",
    "focus"
   ]
  ],
  "texts": {
   "ru": [
    "Готово! Теперь вы знакомы с DEEPSYQ. Я JARVIX — ваш помощник в творчестве. Просто скажите, что хотите создать."
   ],
   "en": [
    "All set! You know DEEPSYQ. I'm JARVIX, your creative assistant. Just tell me what you want to make."
   ],
   "fr": [
    "Voilà ! Vous connaissez DEEPSYQ. Je suis JARVIX, votre assistant créatif. Dites-moi ce que vous voulez créer."
   ],
   "es": [
    "¡Listo! Ya conoces DEEPSYQ. Soy JARVIX, tu asistente creativo. Dime qué quieres crear."
   ]
  }
 }
]);
export function tourV3Plan(language='en'){
 const lang=['ru','en','fr','es'].includes(language)?language:'en';
 const routes=legacyTourPlan(lang);
 if(routes.length!==TOUR_V3_DATA.length)throw Error('Tour V3 route mismatch');
 return routes.map((route,i)=>{
  const stage=TOUR_V3_DATA[i];
  if(stage.key!==route.title)throw Error('Tour V3 order mismatch at '+i);
  return {...route,narration:'v3',navText:stage.nav?.[lang]||null,
   beats:stage.texts[lang].map((text,j)=>({text,target:stage.op[j][0],action:stage.op[j][1]}))};
 });
}
export function tourV3AllPhrases(){
 const result=[];
 for(const stage of TOUR_V3_DATA)for(const language of ['ru','en','fr','es']){
  if(stage.nav?.[language])result.push({language,text:stage.nav[language]});
  for(const text of stage.texts[language])result.push({language,text});
 }
 return [...new Map(result.map(x=>[x.language+'\\0'+x.text,x])).values()];
}