/* Canonical Pricing redirect: separate same-origin script to satisfy server CSP.
 * No billing code or user data is read here. Keep legacy deep-link anchors. */
(function(){
  'use strict';
  const map={
    '#toolPlans':'#plans', '#trialOffer':'#plans',
    '#aiCreditSection':'#credits', '#aiPacks':'#credits',
    '#walletSection':'#wallet', '#welcomeCredits':'#wallet',
    '#credits':'#credits', '#pricing':'#plans'
  };
  const destination=new URL('pricing.html',location.href);
  destination.search=location.search;
  destination.hash=map[location.hash]||'';
  location.replace(destination.href);
})();
