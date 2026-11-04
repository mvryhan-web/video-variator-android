// Explicit navigation takes priority over dialogue and never submits generation.
export function resolveJarvixPageCommand(text, allowChoice=false) {
 const input=String(text).toLowerCase().replace(/[.,!?«»"']/g,' ').replace(/\s+/g,' ').trim();
 if(!allowChoice&&!/(?:откро|откры|открой|перейди|покажи|зайди|open|show|go to|ouvre|ouvrez|montre|va sur|abre|abrir|muestra|ir a)/iu.test(input))return null;
 const targets=[
 [/уникализ|video.?uniqu|uniquifier|unificateur|uniqueur/u,'index.html'],
 [/инструмент|everyday|\btools?\b|outil|herramient/u,'free-tools.html'],
 [/\bcanvas\b|канва|кано|холст|lienzo/u,'canvas.html'],
 [/прайс|тариф|цен[ыау]|pricing|\bprice\b|tarif|precio|plans|subscription/u,'pricing.html'],
 [/вдохнов|inspiration|inspiración/u,'deepsyq.html#inspirationPreview'],
 [/истори|мои работы|assets|history|creations|créations/u,'generate-studio.html?view=history'],
 [/главн|домой|\bhome\b|accueil|inicio/u,'deepsyq.html'],
 [/ai.?apps|приложен|aplicacion|applications/u,'ai-apps.html'],
 [/видео|vid[eé]o|vídeo/u,'generate-studio.html?studio=video&from=jarvix'],
 [/аудио|музык|audio|music|musique|música/u,'generate-studio.html?studio=audio&from=jarvix'],
 [/фото|изображ|картин|photo|image|imagen/u,'generate-studio.html?studio=image&from=jarvix']
 ];
 return targets.find(([pattern])=>pattern.test(input))?.[1]||null;
}
