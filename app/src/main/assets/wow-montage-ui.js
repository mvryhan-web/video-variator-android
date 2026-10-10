(() => {
  'use strict';
  const toggle=document.getElementById('wowMontage'),container=document.getElementById('wowMontageOption');
  if(!toggle||!container||!window.VUWowMontage?.ready)return;
  const locale=(navigator.languages?.[0]||navigator.language||'en-US').slice(0,2);
  const copies={
    en:{status:'Optional',help:'A fast opening and visible zoom/pan accents within the first 12 seconds. No speech or beat recognition. Keeps your mode’s audio and timing.',analyze:'Analyzing the first 12 seconds…',summary:(a,s,f)=>`WOW: ${a} applied · ${s} skipped · ${f} standard fallbacks. Skips protect uncertain or already strongly framed footage.`},
    ru:{status:'Дополнительно',help:'Быстрое вступление и заметные приближения и движения камеры в первых 12 секундах. Без распознавания речи и ритма. Звук и длительность выбранного режима сохраняются.',analyze:'Анализ первых 12 секунд…',summary:(a,s,f)=>`WOW: применён — ${a}, пропущен — ${s}, стандартный результат — ${f}. При неуверенном анализе или сильном кадрировании эффект пропускается.`},
    fr:{status:'En option',help:'Ouverture rapide et mouvements de caméra visibles dans les 12 premières secondes. Sans reconnaissance de parole ou de rythme. Le son et la durée du mode restent inchangés.',analyze:'Analyse des 12 premières secondes…',summary:(a,s,f)=>`WOW : ${a} appliqués · ${s} ignorés · ${f} résultats standard. Les séquences incertaines ou déjà fortement recadrées restent protégées.`},
    uk:{status:'Додатково',help:'Швидкий вступ і помітні наближення та рухи камери в перших 12 секундах. Без розпізнавання мовлення й ритму. Звук і тривалість обраного режиму зберігаються.',analyze:'Аналіз перших 12 секунд…',summary:(a,s,f)=>`WOW: застосовано — ${a}, пропущено — ${s}, стандартний результат — ${f}. Непевний аналіз або сильне кадрування залишаються без ефекту.`},
  };
  const copy=copies[locale]||copies.en;
  const reasons={en:{'low-confidence':'Not enough reliable frames.','no-safe-scene':'No sufficiently long shot.','existing-framing-limit':'Already cropped too strongly.','visual-render-unavailable':'Camera rendering failed; standard video retained.','standard-audio-retry':'Standard video retained after audio retry.'},ru:{'low-confidence':'Недостаточно надёжных кадров для анализа.','no-safe-scene':'Нет достаточно длинного непрерывного кадра.','existing-framing-limit':'Видео уже слишком сильно кадрировано.','visual-render-unavailable':'Ошибка монтажа: сохранён обычный результат.','standard-audio-retry':'После повторной обработки звука сохранён обычный результат.'},fr:{'low-confidence':'Analyse des images insuffisante.','no-safe-scene':'Aucun plan assez long.','existing-framing-limit':'Recadrage déjà trop important.','visual-render-unavailable':'Échec du montage : vidéo standard conservée.','standard-audio-retry':'Vidéo standard conservée après nouvelle tentative audio.'},uk:{'low-confidence':'Недостатньо надійних кадрів для аналізу.','no-safe-scene':'Немає достатньо довгого безперервного кадру.','existing-framing-limit':'Відео вже надто сильно кадроване.','visual-render-unavailable':'Помилка монтажу: збережено звичайний результат.','standard-audio-retry':'Після повторної обробки звуку збережено звичайний результат.'}};
  const details={en:n=>`${n} camera accents in the last video.`,ru:n=>`В последнем видео: ${n} движений камеры.`,fr:n=>`${n} mouvements de caméra dans la dernière vidéo.`,uk:n=>`В останньому відео: ${n} рухів камери.`};
  for(const [id,value] of [['wowMontageStatus',copy.status],['wowMontageHelp',copy.help]]){
    const el=document.getElementById(id);el.removeAttribute('data-i18n');el.textContent=value;
  }
  const note=document.createElement('p');note.id='wowMontageResult';note.setAttribute('role','status');note.hidden=true;container.append(note);
  let applied=0,skipped=0,fallback=0;
  const reset=()=>{applied=skipped=fallback=0;note.hidden=true;note.textContent='';};
  window.VUWowMontageUI=Object.freeze({
    analyzeText:copy.analyze,reset,setBusy(value){toggle.disabled=!!value;},
    record(result){if(result.status==='applied')applied++;else if(result.status==='fallback')fallback++;else skipped++;note.textContent=copy.summary(applied,skipped,fallback)+' '+(result.status==='applied'?(details[locale]||details.en)(result.effectCount||0):((reasons[locale]||reasons.en)[result.reason]||''));note.hidden=false;},
  });
  toggle.checked=false;toggle.disabled=false;toggle.addEventListener('change',reset);
})();
