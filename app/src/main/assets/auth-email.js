(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const locale=(()=>{
    let selected='';
    try { selected=localStorage.getItem('deepsyq_home_language')||localStorage.getItem('deepsyq_lang')||''; } catch(_){}
    const raw=(selected||navigator.languages?.[0]||navigator.language||'en-US').toLowerCase();
    if(raw.startsWith('fr'))return'fr';
    if(raw.startsWith('ru'))return'ru';
    if(raw.startsWith('es'))return'es';
    if(raw.startsWith('uk'))return'uk';
    return'en';
  })();
  const copy={
    en:{title:'Sign in to your account',sub:'Use Google or email. Your plan, credits, and history stay connected across devices.',divider:'or continue with email',email:'Email',password:'Password',name:'Name (optional)',login:'Continue with email',create:'Create account',have:'Already have an account? Sign in',new:'New here? Create an account',creating:'Creating account…',signing:'Signing in…',done:'Signed in. Reloading…',bad:'Check your email and password and try again.',exists:'An account with this email already exists. Sign in instead.',passwordRule:'Use at least 8 characters.',status:'Email sign-in is available. Google sign-in works when Google OAuth is configured.',storagePending:'Email sign-in is installed, but account storage still needs to be connected.'},
    fr:{title:'Connectez-vous à votre compte',sub:'Utilisez Google ou votre e-mail. Votre offre, vos crédits et votre historique restent synchronisés.',divider:'ou continuer avec l’e-mail',email:'E-mail',password:'Mot de passe',name:'Nom (facultatif)',login:'Continuer avec l’e-mail',create:'Créer un compte',have:'Déjà un compte ? Se connecter',new:'Nouveau ? Créer un compte',creating:'Création du compte…',signing:'Connexion…',done:'Connecté. Rechargement…',bad:'Vérifiez votre e-mail et votre mot de passe.',exists:'Un compte existe déjà avec cet e-mail. Connectez-vous.',passwordRule:'Utilisez au moins 8 caractères.',status:'La connexion par e-mail est disponible. Google fonctionne dès que OAuth Google est configuré.',storagePending:'La connexion par e-mail est installée, mais le stockage des comptes doit encore être connecté.'},
    ru:{title:'Войти в аккаунт',sub:'Используй Google или email. Тариф, кредиты и история будут связаны между устройствами.',divider:'или продолжить через email',email:'Email',password:'Пароль',name:'Имя (необязательно)',login:'Продолжить через email',create:'Создать аккаунт',have:'Уже есть аккаунт? Войти',new:'Нет аккаунта? Создать',creating:'Создаём аккаунт…',signing:'Входим…',done:'Готово. Перезагружаю…',bad:'Проверь email и пароль и попробуй ещё раз.',exists:'Аккаунт с таким email уже есть. Войди в него.',passwordRule:'Минимум 8 символов.',status:'Вход по email доступен. Google заработает после настройки Google OAuth.',storagePending:'Вход по email уже установлен, но ещё нужно подключить хранилище аккаунтов.'},
    es:{title:'Iniciar sesión en tu cuenta',sub:'Usa Google o tu correo electrónico.',divider:'o continuar con correo',email:'Correo electrónico',password:'Contraseña',name:'Nombre (opcional)',login:'Entrar con correo',create:'Crear cuenta',have:'¿Ya tienes cuenta? Iniciar sesión',new:'¿No tienes cuenta? Regístrate',creating:'Creando cuenta…',signing:'Iniciando sesión…',done:'Sesión iniciada. Recargando…',bad:'Revisa tu correo y contraseña e inténtalo de nuevo.',exists:'Ya existe una cuenta con ese correo. Inicia sesión.',passwordRule:'Usa al menos 8 caracteres.',status:'Acceso con correo disponible.',storagePending:'El inicio de sesión por correo no está configurado en el servidor.'},
    uk:{title:'Увійти в акаунт',sub:'Використовуй Google або email. Тариф, кредити та історія будуть пов’язані між пристроями.',divider:'або продовжити через email',email:'Email',password:'Пароль',name:'Ім’я (необов’язково)',login:'Продовжити через email',create:'Створити акаунт',have:'Вже є акаунт? Увійти',new:'Немає акаунта? Створити',creating:'Створюємо акаунт…',signing:'Входимо…',done:'Готово. Перезавантажую…',bad:'Перевір email і пароль та спробуй ще раз.',exists:'Акаунт з таким email уже є. Увійди в нього.',passwordRule:'Мінімум 8 символів.',status:'Вхід через email доступний. Google запрацює після налаштування Google OAuth.',storagePending:'Вхід через email уже встановлено, але ще потрібно підключити сховище акаунтів.'}
  };
  const c=copy[locale]||copy.en;
  const visualCopy={
    en:{welcome:'Welcome to',intro:'Sign in or create your account',card:'Create your account',open:'Continue with email',or:'or',legal:'By continuing, you agree to our',terms:'Terms of Use',privacy:'Cookie & privacy information',tagline:'AI Creative Platform'},
    ru:{welcome:'Добро пожаловать в',intro:'Войдите или создайте аккаунт',card:'Создайте аккаунт',open:'Войти через Email',or:'или',legal:'Продолжая, вы принимаете',terms:'Условия использования',privacy:'Cookie и конфиденциальность',tagline:'AI Creative Platform'},
    fr:{welcome:'Bienvenue sur',intro:'Connectez-vous ou créez votre compte',card:'Créez votre compte',open:'Continuer avec e-mail',or:'ou',legal:'En continuant, vous acceptez nos',terms:'Conditions d’utilisation',privacy:'Cookies et confidentialité',tagline:'AI Creative Platform'},
    es:{welcome:'Bienvenido a',intro:'Inicia sesión o crea tu cuenta',card:'Crea tu cuenta',open:'Continuar con correo',or:'o',legal:'Al continuar, aceptas nuestros',terms:'Términos de uso',privacy:'Cookies y privacidad',tagline:'AI Creative Platform'},
    uk:{welcome:'Ласкаво просимо до',intro:'Увійдіть або створіть акаунт',card:'Створіть акаунт',open:'Увійти через email',or:'або',legal:'Продовжуючи, ви приймаєте',terms:'Умови використання',privacy:'Cookie та конфіденційність',tagline:'AI Creative Platform'}
  };
  const v=visualCopy[locale]||visualCopy.en;

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
    const form=$('emailAuthForm');if(!form)return;
    form.querySelectorAll('input,button').forEach(el=>el.disabled=!configured);
    const msg=$('emailAuthMessage');if(msg)msg.textContent=configured?'':c.storagePending;
    const setup=document.querySelector('#authModal .authSetupStatus');if(setup)setup.textContent=configured?c.status:c.storagePending;
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
    const heading=card.querySelector('h2'),intro=card.querySelector('h2 + p');
    if(heading){
      heading.innerHTML='<span>'+v.welcome+'</span><span class="authTitleAccent">DEEPSYQ</span>';
      heading.setAttribute('aria-label',v.welcome+' DEEPSYQ');
    }
    if(intro)intro.textContent=v.intro;
    const brand=card.querySelector('.eyebrow');
    if(brand){
      brand.classList.add('authBrand');
      brand.innerHTML='<span class="authBrandName">DEEPSYQ</span><small class="authBrandTagline">'+v.tagline+'</small>';
    }
    const privacy=Array.from(document.querySelectorAll('.privacyPoint span')).find(el=>/Google and Apple identity tokens/i.test(el.textContent));
    if(privacy)privacy.textContent='Google identity tokens are verified on the server. Email passwords are securely hashed and are never stored in plain text.';
    const setup=card.querySelector('.authSetupStatus');if(setup)setup.textContent=c.status;


    // The existing Google Identity Services container is deliberately untouched.
    const google=$('googleButton');
    if(google&&!card.querySelector('.authActionTitle')){
      const title=document.createElement('h3');
      title.className='authActionTitle';
      title.textContent=v.card;
      google.insertAdjacentElement('beforebegin',title);
    }
    const wrap=document.createElement('div');
    wrap.className='emailAuthWrap';
    wrap.innerHTML=`
      <div class="authDivider"><span>${v.or}</span></div>
      <button type="button" class="emailAuthOpen" id="emailAuthOpen" aria-controls="emailAuthForm" aria-expanded="false">
        <span class="emailAuthOpenIcon" aria-hidden="true">✉</span><span>${v.open}</span>
      </button>
      <form id="emailAuthForm" class="emailAuthForm" novalidate hidden>
        <label id="emailNameLabel" hidden><span>${c.name}</span><input id="emailAuthName" name="name" autocomplete="name" maxlength="80"></label>
        <label><span>${c.email}</span><input id="emailAuthEmail" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254"></label>
        <label><span>${c.password}</span><input id="emailAuthPassword" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></label>
        <small id="emailAuthHint" class="muted" hidden>${c.passwordRule}</small>
        <button id="emailAuthSubmit" class="primaryBtn" type="submit">${c.create}</button>
        <button id="emailAuthToggle" class="authTextButton" type="button">${c.have}</button>
        <div id="emailAuthMessage" class="emailAuthMessage" role="status" aria-live="polite"></div>
      </form>`;
    if(google)google.insertAdjacentElement('afterend',wrap);else card.appendChild(wrap);
    if(!card.querySelector('.authLegal')){
      const legal=document.createElement('div');
      legal.className='authLegal';
      legal.innerHTML=v.legal+' <a href="terms.html">'+v.terms+'</a> · <a href="cookie.html">'+v.privacy+'</a>.';
      card.appendChild(legal);
    }
    // Presentation-only registration card. Move existing Google container intact:
    // its element, SDK rendering target and OAuth callbacks are not replaced.
    if(!card.querySelector('.authRegistrationPanel')){
      const panel=document.createElement('div');
      panel.className='authRegistrationPanel';
      const parts=[card.querySelector('.authActionTitle'),google,wrap,card.querySelector('.authLegal')];
      parts.filter(Boolean).forEach(el=>panel.appendChild(el));
      card.appendChild(panel);
    }

    let creating=true;
    const form=$('emailAuthForm'),nameLabel=$('emailNameLabel'),password=$('emailAuthPassword'),submit=$('emailAuthSubmit'),toggle=$('emailAuthToggle'),msg=$('emailAuthMessage');
    const open=$('emailAuthOpen');
    open.addEventListener('click',()=>{
      open.hidden=true;
      open.setAttribute('aria-expanded','true');
      form.hidden=false;
      $('emailAuthEmail')?.focus();
    });
    toggle.addEventListener('click',()=>{
      creating=!creating;nameLabel.hidden=!creating;password.autocomplete=creating?'new-password':'current-password';submit.textContent=creating?c.create:c.login;toggle.textContent=creating?c.have:c.new;msg.textContent='';password.value='';
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
    refreshAvailability();
  }

  install();
  const modal=$('authModal');if(modal)new MutationObserver(install).observe(modal,{subtree:true,childList:true});
})();
