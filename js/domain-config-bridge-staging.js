(() => {
  'use strict';
  try {
    if (typeof LIW_CONFIG !== 'undefined' && !window.LIW_CONFIG) window.LIW_CONFIG = LIW_CONFIG;
  } catch (_) {}

  if (document.querySelector('script[data-domain-stripe-checkout-staging]')) return;
  const script = document.createElement('script');
  script.src = 'js/domain-stripe-checkout-staging.js?v=20260830-domain-owner-3';
  script.dataset.domainStripeCheckoutStaging = 'true';
  document.body.appendChild(script);
})();
