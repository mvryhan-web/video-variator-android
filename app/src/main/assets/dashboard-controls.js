/* Visible choices share the existing selects and server-authorized plan policy. */
(() => {
  'use strict';
  const groups = [...document.querySelectorAll('#dashboardView .dashboardChoice')];
  function sync() {
    for (const group of groups) {
      const select = document.getElementById(group.dataset.select);
      for (const button of group.querySelectorAll('button[data-value]')) {
        const option = [...select.options].find(item => item.value === button.dataset.value);
        // A disabled select can mean a plan has one fixed quality; show that selected
        // quality as the current choice while blocking all other qualities.
        button.disabled = !option || option.disabled || (select.disabled && select.value !== button.dataset.value);
        button.setAttribute('aria-pressed', String(select.value === button.dataset.value));
      }
    }
  }
  for (const group of groups) {
    const select = document.getElementById(group.dataset.select);
    group.addEventListener('click', event => {
      const button = event.target.closest('button[data-value]');
      if (!button || button.disabled) return;
      select.value = button.dataset.value;
      select.dispatchEvent(new Event('change', {bubbles: true}));
      sync();
    });
    group.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const available = [...group.querySelectorAll('button[data-value]')].filter(button => !button.disabled);
      const index = available.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length;
      available[next].focus(); available[next].click();
    });
    select.addEventListener('change', sync);
    new MutationObserver(sync).observe(select, {attributes: true, childList: true, subtree: true});
  }
  const plan = document.getElementById('currentPlan');
  if (plan) new MutationObserver(sync).observe(plan, {childList: true, characterData: true, subtree: true});
  const lang = (navigator.languages?.[0] || navigator.language || 'en').slice(0, 2);
  const label = document.querySelector('[data-dashboard-optimization]');
  if (label) label.textContent = ({ru:'Оптимизация',uk:'Оптимізація',fr:'Optimisation'})[lang] || 'Optimization';
  sync();
})();
