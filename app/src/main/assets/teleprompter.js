(()=>{
'use strict';
const $=id=>document.getElementById(id);
const locale=(navigator.language||'en').slice(0,2);
const texts={
 en:{title:'Teleprompter',hint:'Write or paste your script. It stays on this page and is not uploaded.',script:'Your script',placeholder:'Write your lines here...',speed:'Scroll speed',size:'Text size',start:'Start',pause:'Pause',reset:'Reset scroll',ready:'Ready to read.',running:'Scrolling. Press Pause to stop.',stopped:'Paused.',empty:'Enter your script before starting.',privacy:'This tool only displays your own text locally. No camera, microphone, AI generation or credits.',fallback:'Your script will appear here.'},
 ru:{title:'Телесуфлёр',hint:'Напишите или вставьте текст. Он остаётся в браузере и не загружается на сервер.',script:'Ваш текст',placeholder:'Введите свой текст...',speed:'Скорость прокрутки',size:'Размер текста',start:'Начать',pause:'Пауза',reset:'В начало',ready:'Готово к чтению.',running:'Текст прокручивается.',stopped:'Пауза.',empty:'Сначала введите текст.',privacy:'Только локальный показ вашего текста. Без камеры, микрофона, AI-генерации и кредитов.',fallback:'Здесь появится ваш текст.'},
 fr:{title:'Téléprompteur',hint:'Écrivez ou collez votre texte. Il reste dans ce navigateur.',script:'Votre texte',placeholder:'Écrivez ici...',speed:'Vitesse du défilement',size:'Taille du texte',start:'Démarrer',pause:'Pause',reset:'Recommencer',ready:'Prêt.',running:'Défilement en cours.',stopped:'En pause.',empty:'Saisissez du texte.',privacy:'Votre texte reste local. Sans caméra, micro, génération IA ni crédits.',fallback:'Votre texte apparaîtra ici.'},
 uk:{title:'Телесуфлер',hint:'Введіть текст. Він залишається у браузері.',script:'Ваш текст',placeholder:'Напишіть тут...',speed:'Швидкість прокрутки',size:'Розмір тексту',start:'Почати',pause:'Пауза',reset:'На початок',ready:'Готово.',running:'Прокрутка увімкнена.',stopped:'Пауза.',empty:'Спочатку введіть текст.',privacy:'Локальний текст без камери, мікрофона, AI чи кредитів.',fallback:'Тут буде ваш текст.'}
};
const t=texts[locale]||texts.en;
for(const [id,key] of [['teleTitle','title'],['teleHint','hint'],['teleScriptLabel','script'],['teleSpeedLabel','speed'],['teleSizeLabel','size'],['telePlay','start'],['teleReset','reset'],['telePrivacy','privacy']])$(id).textContent=t[key];
$('teleScript').placeholder=t.placeholder;document.title=t.title+' · Deepsyq Tools';
const viewport=$('teleViewport'),preview=$('telePreview');
let running=false,frame=0,last=0;
function setStatus(message){$('teleStatus').textContent=message}
function pause(){running=false;cancelAnimationFrame(frame);frame=0;last=0;$('telePlay').textContent=t.start}
function update(){preview.textContent=$('teleScript').value||t.fallback;}
function tick(timestamp){
 if(!running)return;
 if(last){viewport.scrollTop+=(timestamp-last)*Number($('teleSpeed').value)/1000;}
 last=timestamp;
 if(viewport.scrollTop>=viewport.scrollHeight-viewport.clientHeight-1){pause();setStatus(t.ready);return;}
 frame=requestAnimationFrame(tick);
}
$('teleScript').addEventListener('input',()=>{pause();viewport.scrollTop=0;update();setStatus('')});
$('teleSpeed').addEventListener('input',()=>$('teleSpeedValue').textContent=$('teleSpeed').value+' px/s');
$('teleSize').addEventListener('input',()=>{$('teleSizeValue').textContent=$('teleSize').value+' px';preview.style.fontSize=$('teleSize').value+'px';});
$('telePlay').addEventListener('click',()=>{
 if(running){pause();setStatus(t.stopped);return;}
 if(!$('teleScript').value.trim()){setStatus(t.empty);return;}
 running=true;last=0;$('telePlay').textContent=t.pause;setStatus(t.running);frame=requestAnimationFrame(tick);
});
$('teleReset').addEventListener('click',()=>{pause();viewport.scrollTop=0;setStatus(t.ready)});
window.addEventListener('pagehide',pause);
update();setStatus(t.ready);
})();
