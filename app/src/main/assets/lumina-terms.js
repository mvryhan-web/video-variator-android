/**
 * BytePlus Lumina Terms & Conditions & AI Generation Consent Controller
 * Matches exact BytePlus Lumina registration onboarding terms flow.
 */
(function() {
  const STORAGE_KEY = 'deepsyq_lumina_terms_accepted';

  function isAccepted() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch (_) {
      return false;
    }
  }

  function createModalDOM() {
    let backdrop = document.getElementById('luminaTermsModal');
    if (backdrop) return backdrop;

    backdrop = document.createElement('div');
    backdrop.id = 'luminaTermsModal';
    backdrop.className = 'lumina-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'luminaModalTitle');

    backdrop.innerHTML = `
      <div class="lumina-modal-card">
        <div class="lumina-modal-header">
          <div class="lumina-brand-badge">✦ BYTEPLUS LUMINA · DEEPSYQ AI</div>
          <h2 id="luminaModalTitle" class="lumina-modal-title">Условия сервиса и AI-генерации</h2>
          <p class="lumina-modal-sub">Пожалуйста, примите условия использования платформы и дайте согласие на обработку данных AI-моделями для завершения регистрации.</p>
        </div>
        <div class="lumina-terms-scroll">
          <div class="lumina-term-card">
            <div class="lumina-term-heading"><span class="term-num">1</span><span>Условия обслуживания (Terms of Service)</span></div>
            <p class="lumina-term-body">Настоящие Условия регулируют использование сервисов генеративного искусственного интеллекта Deepsyq & BytePlus Lumina для создания изображений, видеороликов и музыки. Пользователь обязуется соблюдать правила добросовестного использования, не производить декомпиляцию платформы и не нарушать права третьих лиц.</p>
          </div>
          <div class="lumina-term-card">
            <div class="lumina-term-heading"><span class="term-num">2</span><span>Передача данных AI-моделям (AI Processing & Model Permissions)</span></div>
            <p class="lumina-term-body">Вы подтверждаете согласие на то, что вводимые текстовые запросы (промпты), параметры и прикреплённые референсные изображения или видео передаются сертифицированной инфраструктуре выбранных моделей (BytePlus Seedream, Seedance, Google Veo, Gemini) исключительно для генерации контента. Ваши приватные материалы не используются для публичного обучения сторонних моделей без согласия.</p>
          </div>
          <div class="lumina-term-card">
            <div class="lumina-term-heading"><span class="term-num">3</span><span>Политика конфиденциальности (Privacy Policy)</span></div>
            <p class="lumina-term-body">Все клиентские соединения защищены протоколом HTTPS. Персональные данные, история запросов и платежные токены хранятся в зашифрованном виде. Сервис не продает и не распространяет пользовательские данные третьим лицам.</p>
          </div>
          <div class="lumina-term-card">
            <div class="lumina-term-heading"><span class="term-num">4</span><span>Авторские права и гарантия прав (Intellectual Property)</span></div>
            <p class="lumina-term-body">Вы гарантируете, что обладаете необходимыми правами и разрешениями на любые изображения и материалы, загружаемые в качестве референсов. Права на созданный результат принадлежат вам в соответствии с условиями выбранного тарифного плана. Запрещается генерация противоправных и вредоносных материалов.</p>
          </div>
          <div class="lumina-term-card">
            <div class="lumina-term-heading"><span class="term-num">5</span><span>Тарификация и AI-кредиты (Billing & Credits)</span></div>
            <p class="lumina-term-body">Каждая операция генерации расходует AI-кредиты в зависимости от разрешения, длительности и типа модели. Точная стоимость в кредитах отображается в интерфейсе перед запуском задачи. Списание происходит только по факту старта генерации.</p>
          </div>
          <div class="lumina-term-card">
            <div class="lumina-term-heading"><span class="term-num">6</span><span>Возрастное ограничение 18+ (Age Requirement)</span></div>
            <p class="lumina-term-body">Нажимая кнопку согласия, вы подтверждаете, что вам исполнилось не менее 18 лет (или вы достигли возраста совершеннолетия в соответствии с законами вашей юрисдикции).</p>
          </div>
        </div>
        <div class="lumina-modal-footer">
          <label class="lumina-accept-check">
            <input type="checkbox" id="luminaAcceptCheckbox" checked>
            <span>Я прочитал(а) и принимаю Условия обслуживания (Terms of Service), Политику конфиденциальности и даю согласие на обработку данных AI-моделями</span>
          </label>
          <button type="button" id="luminaAcceptButton" class="lumina-accept-btn">Принять условия и продолжить</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    return backdrop;
  }

  window.openLuminaTermsModal = function(callback) {
    const backdrop = createModalDOM();
    const checkbox = document.getElementById('luminaAcceptCheckbox');
    const button = document.getElementById('luminaAcceptButton');

    if (checkbox && button) {
      checkbox.onchange = () => {
        button.disabled = !checkbox.checked;
      };
      button.onclick = () => {
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
          localStorage.setItem('deepsyq_consents_accepted', 'true');
          localStorage.setItem('deepsyq_model_consent', 'true');
        } catch (_) {}
        backdrop.classList.remove('is-open');
        setTimeout(() => {
          backdrop.remove();
        }, 300);
        if (typeof callback === 'function') {
          callback();
        }
      };
    }

    // Trigger open animation
    requestAnimationFrame(() => {
      backdrop.classList.add('is-open');
      if (button) button.focus();
    });
  };

  window.isLuminaTermsAccepted = isAccepted;

  // Auto-prompt on Studio entry if not yet accepted
  document.addEventListener('DOMContentLoaded', () => {
    const isStudio = location.pathname.includes('generate-studio');
    if (isStudio && !isAccepted()) {
      // A tour only presents the interface. It cannot submit a generation or
      // accept consent; stopping the tour restores the normal consent prompt.
      let tour=null;try{tour=JSON.parse(sessionStorage.getItem('deepsyq_guided_tour_v3')||'null');}catch(_){}
      if(tour&&Number.isInteger(tour.index)&&tour.index>=1&&tour.index<=3&&['playing','paused'].includes(tour.phase)){
        const creator=document.getElementById('creator');if(creator)creator.inert=true;
        window.addEventListener('jarvix:tour-ended',()=>{if(creator)creator.inert=false;if(!isAccepted())window.openLuminaTermsModal();},{once:true});
        return;
      }
      setTimeout(() => {
        window.openLuminaTermsModal();
      }, 250);
    }
  });
})();
