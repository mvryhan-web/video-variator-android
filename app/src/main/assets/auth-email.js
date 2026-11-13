(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const locale=(()=>{
    let selected;
    try{selected=localStorage.getItem('deepsyq_lang');}catch(_){}
    return (selected||navigator.languages?.[0]||navigator.language||'en').toLowerCase().split('-')[0];
  })();
  const copy={
    en:{title:'Sign in to your account',sub:'Use Google or email. Your plan, credits, and history stay connected across devices.',divider:'or continue with email',email:'Email',password:'Password',name:'Name (optional)',login:'Continue with email',create:'Create account',have:'Already have an account? Sign in',new:'Create an account with email',creating:'Creating account…',signing:'Signing in…',done:'Signed in. Reloading…',bad:'Check your email and password and try again.',exists:'An account with this email already exists. Sign in instead.',passwordRule:'Use at least 8 characters.',status:'Email sign-in is available. Google sign-in works when Google OAuth is configured.',storagePending:'Email sign-in is installed, but account storage still needs to be connected.'},
    fr:{title:'Connectez-vous à votre compte',sub:'Utilisez Google ou votre e-mail. Votre offre, vos crédits et votre historique restent synchronisés.',divider:'ou continuer avec l’e-mail',email:'E-mail',password:'Mot de passe',name:'Nom (facultatif)',login:'Continuer avec l’e-mail',create:'Créer un compte',have:'Déjà un compte ? Se connecter',new:'Nouveau ? Créer un compte',creating:'Création du compte…',signing:'Connexion…',done:'Connecté. Rechargement…',bad:'Vérifiez votre e-mail et votre mot de passe.',exists:'Un compte existe déjà avec cet e-mail. Connectez-vous.',passwordRule:'Utilisez au moins 8 caractères.',status:'La connexion par e-mail est disponible. Google fonctionne dès que OAuth Google est configuré.',storagePending:'La connexion par e-mail est installée, mais le stockage des comptes doit encore être connecté.'},
    ru:{title:'Войти в аккаунт',sub:'Используй Google или email. Тариф, кредиты и история будут связаны между устройствами.',divider:'или продолжить через email',email:'Email',password:'Пароль',name:'Имя (необязательно)',login:'Продолжить через email',create:'Создать аккаунт',have:'Уже есть аккаунт? Войти',new:'Создать аккаунт по email',creating:'Создаём аккаунт…',signing:'Входим…',done:'Готово. Перезагружаю…',bad:'Проверь email и пароль и попробуй ещё раз.',exists:'Аккаунт с таким email уже есть. Войди в него.',passwordRule:'Минимум 8 символов.',status:'Вход по email доступен. Google заработает после настройки Google OAuth.',storagePending:'Вход по email уже установлен, но ещё нужно подключить хранилище аккаунтов.'},
    uk:{title:'Увійти в акаунт',sub:'Використовуй Google або email. Тариф, кредити та історія будуть пов’язані між пристроями.',divider:'або продовжити через email',email:'Email',password:'Пароль',name:'Ім’я (необов’язково)',login:'Продовжити через email',create:'Створити акаунт',have:'Вже є акаунт? Увійти',new:'Немає акаунта? Створити',creating:'Створюємо акаунт…',signing:'Входимо…',done:'Готово. Перезавантажую…',bad:'Перевір email і пароль та спробуй ще раз.',exists:'Акаунт з таким email уже є. Увійди в нього.',passwordRule:'Мінімум 8 символів.',status:'Вхід через email доступний. Google запрацює після налаштування Google OAuth.',storagePending:'Вхід через email уже встановлено, але ще потрібно підключити сховище акаунтів.'}
  };
  copy.es={title:'Inicia sesión',sub:'Usa Google o tu correo electrónico.',divider:'o continúa con tu correo',email:'Correo electrónico',password:'Contraseña',name:'Nombre (opcional)',login:'Iniciar sesión',create:'Crear cuenta',have:'Ya tengo cuenta',new:'Crear cuenta con correo',creating:'Creando cuenta…',signing:'Iniciando sesión…',done:'Sesión iniciada.',bad:'Revisa tu correo y contraseña.',exists:'Ya existe una cuenta con ese correo. Inicia sesión.',passwordRule:'Usa al menos 8 caracteres.',storagePending:'El acceso por correo no está disponible.'};
  const c=copy[locale]||copy.en;

  function apiBase(){
    try{const native=window.AndroidBridge?.getApiBase?.();if(native)return String(native).replace(/\/$/,'');}catch(_){ }
    return String(window.VV_API_BASE||location.origin||'').replace(/\/$/,'');
  }
  function messageFor(error){
    if(error==='EMAIL_ALREADY_REGISTERED')return c.exists;
    if(error==='INVALID_PASSWORD_LENGTH')return c.passwordRule;
    if(error==='ACCOUNT_STORAGE_NOT_CONFIGURED')return c.storagePending;
    return c.bad;
  }
  function setAvailability(configured){
    const wrap=document.querySelector('#authModal .emailAuthWrap');
    if(!wrap)return;
    wrap.hidden=!configured;
    wrap.querySelectorAll('input,button').forEach(el=>el.disabled=!configured);
  }
  async function refreshAvailability(){
    try{
      const r=await fetch(apiBase()+'/api/auth/email/status',{cache:'no-store'}),data=await r.json().catch(()=>({}));
      setAvailability(r.ok&&data.configured===true);
    }catch(_){setAvailability(false);}
  }

  function install(){
    const apple=$('appleButton');if(apple)apple.remove();
    const card=document.querySelector('#authModal .authCard');if(!card||$('emailAuthForm'))return;
    const heading=card.querySelector('h2'),intro=card.querySelector('h2 + p');if(heading)heading.textContent=c.title;if(intro)intro.textContent=c.sub;
    const privacy=Array.from(document.querySelectorAll('.privacyPoint span')).find(el=>/Google and Apple identity tokens/i.test(el.textContent));
    if(privacy)privacy.textContent='Google identity tokens are verified on the server. Email passwords are securely hashed and are never stored in plain text.';
    card.querySelector('.authSetupStatus')?.remove();

    const privacyLink=document.createElement('a');
    privacyLink.className='authPrivacyLink';
    privacyLink.href='/cookie.html';
    privacyLink.textContent=({ru:'Cookie и данные браузера',fr:'Cookies et données du navigateur',es:'Cookies y datos del navegador',uk:'Cookie та дані браузера'})[locale]||'Cookies and browser data';
    card.append(privacyLink);

    const google=$('googleButton');
    const wrap=document.createElement('div');wrap.className='emailAuthWrap';wrap.hidden=true;
    wrap.innerHTML=`
      <div class="authDivider"><span>${c.divider}</span></div>
      <form id="emailAuthForm" class="emailAuthForm" novalidate>
        <label id="emailNameLabel" hidden><span>${c.name}</span><input id="emailAuthName" name="name" autocomplete="name" maxlength="80"></label>
        <label><span>${c.email}</span><input id="emailAuthEmail" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254"></label>
        <label><span>${c.password}</span><input id="emailAuthPassword" name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="128"></label>
        <small id="emailAuthHint" class="muted" hidden>${c.passwordRule}</small>
        <button id="emailAuthSubmit" class="primaryBtn" type="submit">${c.login}</button>
        <button id="emailAuthToggle" class="authTextButton" type="button">${c.new}</button>
        <div id="emailAuthMessage" class="emailAuthMessage" role="status" aria-live="polite"></div>
      </form>`;
    if(google)google.insertAdjacentElement('afterend',wrap);else card.appendChild(wrap);

    let creating=false;
    const hint=$('emailAuthHint');
    const form=$('emailAuthForm'),nameLabel=$('emailNameLabel'),password=$('emailAuthPassword'),submit=$('emailAuthSubmit'),toggle=$('emailAuthToggle'),msg=$('emailAuthMessage');
    toggle.addEventListener('click',()=>{
      creating=!creating;nameLabel.hidden=!creating;hint.hidden=!creating;password.autocomplete=creating?'new-password':'current-password';submit.textContent=creating?c.create:c.login;toggle.textContent=creating?c.have:c.new;msg.textContent='';
    });
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const email=$('emailAuthEmail').value.trim(),pass=password.value,name=$('emailAuthName').value.trim();
      if(!email||pass.length<8){msg.textContent=c.passwordRule;return;}
      submit.disabled=true;toggle.disabled=true;msg.textContent=creating?c.creating:c.signing;
      try{
        const endpoint=creating?'/api/auth/email/register':'/api/auth/email/login';
        const response=await fetch(apiBase()+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass,name})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok||!data.token)throw new Error(data.error||'EMAIL_AUTH_FAILED');
        localStorage.setItem('vv_token',data.token);if(data.newAccount===true)localStorage.setItem('deepsyq_onboarding_pending','1');msg.textContent=c.done;
        if(window.openLuminaTermsModal && !window.isLuminaTermsAccepted?.()){
          window.openLuminaTermsModal(()=>{ setTimeout(()=>location.reload(), 200); });
        } else {
          setTimeout(()=>location.reload(), 250);
        }
      }catch(err){msg.textContent=messageFor(err.message);submit.disabled=false;toggle.disabled=false;}
    });
    const modal=$('authModal');
    const updateCopy=()=>{
      const current=(()=>{
        try{return localStorage.getItem('deepsyq_lang')?.split('-')[0];}catch(_){}
      })();
      if(heading)heading.textContent=(copy[current]||c).title;
      if(intro)intro.hidden=wrap.hidden;
    };
    updateCopy();
    refreshAvailability().then(updateCopy);
    new MutationObserver(updateCopy).observe(modal,{attributes:true,attributeFilter:['hidden']});
  }

  install();
  const modal=$('authModal');if(modal)new MutationObserver(install).observe(modal,{subtree:true,childList:true});
})();
