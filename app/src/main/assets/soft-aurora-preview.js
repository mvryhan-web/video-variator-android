/* Preview-only DEEPSYQ comfort theme selector.
   Does not touch app navigation, account logic, JARVIX state or generation. */
(()=>{
  const root=document.documentElement;
  const modes=['dark','warm','focus'];
  const labels={dark:'Soft Dark',warm:'Warm Light',focus:'Focus'};
  const name='deepsyq-soft-aurora-preview-mode';
  let initial='dark';
  try{const saved=localStorage.getItem(name);if(modes.includes(saved))initial=saved;}catch{}
  root.dataset.softAurora='on';
  root.dataset.saMode=initial;
  let button=null;
  const apply=(mode)=>{
    if(!modes.includes(mode))return;
    root.dataset.saMode=mode;
    try{localStorage.setItem(name,mode);}catch{}
    if(!button)return;
    button.dataset.mode=mode;
    button.setAttribute('aria-label','DEEPSYQ comfort design: '+labels[mode]+'. Change appearance');
    button.setAttribute('title','Soft Aurora — '+labels[mode]+' · Нажмите, чтобы сменить оформление');
    const text=button.querySelector('.sa-mode-text');
    if(text)text.textContent=labels[mode];
  };
  const install=()=>{
    if(button?.isConnected)return;
    const target=document.querySelector('.top-actions')
      || document.querySelector('header.ds-unified-header .ds-header-actions')
      || document.querySelector('.price-topbar nav')
      || document.querySelector('header.topbar')
      || document.querySelector('header.top')
      || document.querySelector('body>header');
    if(!target)return;
    button=document.createElement('button');
    button.id='saThemeSwitch';
    button.type='button';
    button.dataset.mode=root.dataset.saMode;
    button.innerHTML='<span class="sa-dot" aria-hidden="true"></span><span class="sa-mode-text"></span>';
    button.addEventListener('click',()=>{
      const i=modes.indexOf(root.dataset.saMode);
      apply(modes[(i+1)%modes.length]);
    });
    // Insert into existing header; do not replace any original element.
    target.insertBefore(button,target.firstChild);
    apply(root.dataset.saMode);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  window.addEventListener('load',install,{once:true});
})();
