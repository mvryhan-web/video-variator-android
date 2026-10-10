(() => {
  'use strict';
  const toggle=document.getElementById('wowMontage'),container=document.getElementById('wowMontageOption');
  if(!toggle||!container||!window.VUWowMontage?.ready)return;
  const locale=(navigator.languages?.[0]||navigator.language||'en-US').slice(0,2);
  const copies={
    en:{status:'Optional',help:'Subtle camera movement based on motion and scene changes in the first 12 seconds. Keeps your mode’s audio and timing.',analyze:'Analyzing the first 12 seconds…',summary:(a,s,f)=>`WOW: ${a} applied · ${s} skipped · ${f} standard fallbacks. Skips protect uncertain or already strongly framed footage.`},
    ru:{status:'Дополнительно',help:'Мягкие движения камеры по движению и сменам сцен в первых 12 секундах. Звук и длительность выбранного режима сохраняются.',analyze:'Анализ первых 12 секунд…',summary:(a,s,f)=>`WOW: применён — ${a}, пропущен — ${s}, стандартный результат — ${f}. При неуверенном анализе или сильном кадрировании эффект пропускается.`},
    fr:{status:'En option',help:'Mouvements de caméra discrets selon le mouvement et les changements de scène des 12 premières secondes. Le son et la durée du mode restent inchangés.',analyze:'Analyse des 12 premières secondes…',summary:(a,s,f)=>`WOW : ${a} appliqués · ${s} ignorés · ${f} résultats standard. Les séquences incertaines ou déjà fortement recadrées restent protégées.`},
    uk:{status:'Додатково',help:'М’які рухи камери за рухом і змінами сцен у перших 12 секундах. Звук і тривалість обраного режиму зберігаються.',analyze:'Аналіз перших 12 секунд…',summary:(a,s,f)=>`WOW: застосовано — ${a}, пропущено — ${s}, стандартний результат — ${f}. Непевний аналіз або сильне кадрування залишаються без ефекту.`},
  };
  const copy=copies[locale]||copies.en;
  for(const [id,value] of [['wowMontageStatus',copy.status],['wowMontageHelp',copy.help]]){
    const el=document.getElementById(id);el.removeAttribute('data-i18n');el.textContent=value;
  }
  const note=document.createElement('p');note.id='wowMontageResult';note.setAttribute('role','status');note.hidden=true;container.append(note);
  let applied=0,skipped=0,fallback=0;
  const reset=()=>{applied=skipped=fallback=0;note.hidden=true;note.textContent='';};
  window.VUWowMontageUI=Object.freeze({
    analyzeText:copy.analyze,reset,
    record(result){if(result.status==='applied')applied++;else if(result.status==='fallback')fallback++;else skipped++;note.textContent=copy.summary(applied,skipped,fallback);note.hidden=false;},
  });
  toggle.checked=false;toggle.disabled=false;toggle.addEventListener('change',reset);
})();
