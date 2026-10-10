/* Additional everyday mobile tools. Each tile leads to a real local workflow. */
(()=>{
'use strict';
const ids=['scan-pdf','pdf-merge','pdf-split','pdf-sign','pdf-compress','photo-convert','photo-resize','video-trim','video-mute','audio-trim','qr','photo-redact','photo-ocr','zip','captions'];
const local={
 en:{
  titles:['Scan to PDF','Combine PDFs','Extract PDF pages','Fill & sign PDF','Optimize PDF','Convert image format','Resize / crop photo','Trim video','Mute video','Trim audio','Create QR code','Hide details on photo','Photo → text (OCR)','Create / unpack ZIP','Automatic subtitles (SRT)'],
  notes:['Images or camera → one PDF','Multiple PDFs → one','Save selected pages','Add text or signature','Re-save PDF efficiently','PNG, JPG, WebP','Choose dimensions / crop','Choose start and end','Remove sound completely','Choose audio fragment','Link, contact or Wi-Fi text','Permanent opaque cover','Copy text from image','Pack files or extract archive','Transcribe locally to SRT'],
  heading:'Documents, images & files',sub:'Everyday essentials. Free to use — no video credits.',
  tip:'Local processing; heavy files can take time. Install no extra app.'
 },
 ru:{
  titles:['Сканер документов → PDF','Объединить PDF','Разделить PDF','Заполнить и подписать PDF','Сжать PDF','Конвертер фотографий','Размер и обрезка фото','Точная обрезка видео','Убрать звук из видео','Обрезать аудио','Создать QR-код','Скрыть данные на фото','Фото → текст (OCR)','ZIP: создать / распаковать','Автосубтитры (SRT)'],
  notes:['Камера или фото → документ','Объединить несколько PDF','Выбрать нужные страницы','Текст и подпись','Уменьшить структуру файла','JPG, PNG и WebP','Свои размеры и кадрирование','Задать начало и конец','Видео без звука','Вырезать нужный фрагмент','Ссылка, контакт, Wi-Fi','Непрозрачно закрыть данные','Распознать и скопировать текст','Архивировать и открывать ZIP','Речь из видео → SRT'],
  heading:'Документы, фото и файлы',sub:'Повседневные инструменты бесплатно, без списания кредитов.',
  tip:'Обработка на телефоне; большие файлы могут обрабатываться долго.'
 },
 fr:{
  titles:['Scanner en PDF','Fusionner des PDF','Extraire des pages PDF','Remplir / signer un PDF','Optimiser un PDF','Convertir une image','Redimensionner / recadrer','Couper une vidéo','Vidéo sans son','Couper un audio','Créer un QR code','Masquer des données','Image → texte (OCR)','Créer / ouvrir un ZIP','Sous-titres auto (SRT)'],
  notes:['Photos → document','Plusieurs fichiers → un','Choisir les pages','Texte ou signature','Optimiser la structure','JPG, PNG et WebP','Choisir les dimensions','Début et fin','Supprimer le son','Extraire un passage','Lien ou Wi-Fi','Masquer définitivement','Reconnaître le texte','Compresser ou extraire','Parole → fichier SRT'],
  heading:'Documents, images et fichiers',sub:'Outils du quotidien gratuits, sans crédits.',tip:'Traitement local. Les gros fichiers peuvent prendre du temps.'
 },
 uk:{
  titles:['Сканування в PDF','Об’єднати PDF','Розділити PDF','Заповнити і підписати PDF','Стиснути PDF','Конвертер фото','Розмір і обрізка фото','Обрізати відео','Прибрати звук з відео','Обрізати аудіо','Створити QR-код','Приховати дані на фото','Фото → текст (OCR)','ZIP: створити / відкрити','Автосубтитри (SRT)'],
  notes:['Фото → документ','Кілька PDF в один','Потрібні сторінки','Текст і підпис','Оптимізувати структуру','JPG, PNG та WebP','Змінити розміри','Початок і кінець','Без звукової доріжки','Зберегти фрагмент','Посилання або Wi-Fi','Приховати безповоротно','Розпізнати текст','Архівувати або витягти','Мовлення → SRT'],
  heading:'Документи, фото та файли',sub:'Безкоштовні корисні інструменти, без кредитів.',tip:'Обробка на пристрої. Великі файли потребують часу.'
 }
};
const lang=(navigator.language||'en').slice(0,2),t=local[lang]||local.en;
const tools=ids.map((id,i)=>({id,title:t.titles[i],note:t.notes[i]}));
window.VUMobileToolsCatalog={tools,labels:t,lang};
const grid=document.getElementById('mobileUtilityGrid');
if(grid){
 document.getElementById('extraToolsTitle').textContent=t.heading;
 document.getElementById('extraToolsNote').textContent=t.sub;
 for(const tool of tools){
  const a=document.createElement('a');a.className='hub-tile mobile-utility-tile';
  a.href='mobile-utility.html?tool='+encodeURIComponent(tool.id);
  const badge=document.createElement('span');badge.className='utility-tile-icon';badge.textContent=tool.title.slice(0,1);
  const strong=document.createElement('strong');strong.textContent=tool.title;
  const small=document.createElement('small');small.textContent=tool.note;
  a.append(badge,strong,small);grid.append(a);
 }
}
})();