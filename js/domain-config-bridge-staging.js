(() => {
  'use strict';
  try {
    if (typeof LIW_CONFIG !== 'undefined' && !window.LIW_CONFIG) window.LIW_CONFIG = LIW_CONFIG;
  } catch (_) {}
})();
