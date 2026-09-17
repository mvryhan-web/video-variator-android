(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const locale=(()=>{const raw=(navigator.languages?.[0]||navigator.language||'en-US').toLowerCase();if(raw.startsWith('fr'))return'fr';if(raw.startsWith('ru'))return'ru';if(raw.startsWith('uk'))return'uk';return'en';})();
  const copy={
    en:{title:'Sign in to your account',sub:'Use Google or email. Your plan, credits, and history stay connected across devices.',divider:'or continue with email',email:'Email',password:'Password',name:'Name (optional)',login:'Continue with email',create:'Create account',have:'Already have an account? Sign in',new:'New here? Create an account',creating:'Creating account…',signing:'Signing in…',done:'Signed in. Reloading…',bad:'Check your email and password and try again.',exists:'An account with this email already exists. Sign in instead.',passwordRule:'Use at least 8 characters.',status:'Email sign-in is ready. Google sign-in works when Google OAuth is configured.'},
    fr:{title:'Connectez-vous à votre compte',sub:'Utilisez Google ou votre e-mail. Votre offre, vos crédits et votre historique restent synchronisés.',divider:'ou continuer avec l’e-mail',email:'E-mail',password:'Mot de passe',name:'Nom (facultatif)',login:'Continuer avec l’e-mail',create:'Créer un compte',have:'Déjà un compte ? Se connecter',new:'Nouveau ? Créer un compte',creating:'Création du compte…',signing:'Connexion…',done:'Connecté. Rechargement…',bad:'Vérifiez votre e-mail et votre mot de passe.',exists:'Un compte existe déjà avec cet e-mail. Connectez-vous.',passwordRule:'Utilisez au moins 8 caractères.',status:'La connexion par e-mail est prête. Google fonctionne dès que OAuth Google est configuré.'},
    ru:{title:'Войти в аккаунт',sub:'Используй Google или email. Тариф, кредиты и история будут связаны между устройствами.',divider:'или продолжить через email',email:'Email',password:'Пароль',name:'Имя (необязательно)',login:'Продолжить через email',create:'Создать аккаунт',have:'Уже есть аккаунт? Войти',new:'Нет аккаунта? Создать',creating:'Создаём аккаунт…',signing:'Входим…',done:'Готово. Перезагружаю…',bad:'Проверь email и пароль и попробуй ещё раз.',exists:'Аккаунт с таким email уже есть. Войди в него.',passwordRule:'Минимум 8 символов.',status:'Вход по email уже работает. Google заработает после настройки Google OAuth.'},
    uk:{title:'Увійти в акаунт',sub:'Використовуй Google або email. Тариф, кредити та історія будуть пов’язані між пристроями.',divider:'або продовжити через email',email:'Email',password:'Пароль',name:'Ім’я (необов’язково)',login:'Продовжити через email',create:'Створити акаунт',have:'Вже є акаунт? Увійти',new:'Немає акаунта? Створити',creating:'Створюємо акаунт…',signing:'Входимо…',done:'Готово. Перезавантажую…',bad:'Перевір email і пароль та спробуй ще раз.',exists:'Акаунт з таким email уже є. Увійди в нього.',passwordRule:'Мінімум 8 символів.',status:'Вхід через email уже працює. Google запрацює після налаштування Google OAuth.'}
  };
  const c=copy[locale]||copy.en;

  function apiBase(){
    try{const native=window.AndroidBridge?.getApiBase?.();if(native)return String(native).replace(/\/$/,'');}catch(_){ }
    return String(window.VV_API_BASE||location.origin||'').replace(/\/$/,'');
  }
  function messageFor(error){
    if(error==='EMAIL_ALREADY_REGISTERED')return c.exists;
    if(error==='INVALID_PASSWORD_LENGTH')return c.passwordRule;
    return c.bad;
  }

  function install(){
    const card=document.querySelector('#authModal .authCard');if(!card||$('emailAuthForm'))return;
    const heading=card.querySelector('h2'),intro=card.querySelector('h2 + p');if(heading)heading.textContent=c.title;if(intro)intro.textContent=c.sub;
    const apple=$('appleButton');if(apple)apple.hidden=true;
    const privacy=Array.from(document.querySelectorAll('.privacyPoint span')).find(el=>/Google and Apple identity tokens/i.test(el.textContent));
    if(privacy)privacy.textContent='Google identity tokens are verified on the server. Email passwords are securely hashed and are never stored in plain text.';
    const setup=card.querySelector('.authSetupStatus');if(setup)setup.textContent=c.status;

    const google=$('googleButton');
    const wrap=document.createElement('div');wrap.className='emailAuthWrap';
    wrap.innerHTML=`
      <div class="authDivider"><span>${c.divider}</span></div>
      <form id="emailAuthForm" class="emailAuthForm" novalidate>
        <label id="emailNameLabel" hidden><span>${c.name}</span><input id="emailAuthName" name="name" autocomplete="name" maxlength="80"></label>
        <label><span>${c.email}</span><input id="emailAuthEmail" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254"></label>
        <label><span>${c.password}</span><input id="emailAuthPassword" name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="128"></label>
        <small id="emailAuthHint" class="muted">${c.passwordRule}</small>
        <button id="emailAuthSubmit" class="primaryBtn" type="submit">${c.login}</button>
        <button id="emailAuthToggle" class="authTextButton" type="button">${c.new}</button>
        <div id="emailAuthMessage" class="emailAuthMessage" role="status" aria-live="polite"></div>
      </form>`;
    if(google)google.insertAdjacentElement('afterend',wrap);else card.appendChild(wrap);

    let creating=false;
    const form=$('emailAuthForm'),nameLabel=$('emailNameLabel'),password=$('emailAuthPassword'),submit=$('emailAuthSubmit'),toggle=$('emailAuthToggle'),msg=$('emailAuthMessage');
    toggle.addEventListener('click',()=>{
      creating=!creating;nameLabel.hidden=!creating;password.autocomplete=creating?'new-password':'current-password';submit.textContent=creating?c.create:c.login;toggle.textContent=creating?c.have:c.new;msg.textContent='';
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
        localStorage.setItem('vv_token',data.token);msg.textContent=c.done;
        setTimeout(()=>location.reload(),250);
      }catch(err){msg.textContent=messageFor(err.message);submit.disabled=false;toggle.disabled=false;}
    });
  }

  install();
  const modal=$('authModal');if(modal)new MutationObserver(install).observe(modal,{subtree:true,childList:true});
})();
