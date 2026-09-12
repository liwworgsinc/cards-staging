/* LIW Cards staging — retired Studio loader gate compatibility shim.
   Studio no longer owns, blocks, hides, or releases the global LIW loader.
   The normal public-card loader controls first paint; Studio V4 adapts afterward. */
(function(){
  'use strict';
  window.__LIW_STUDIO_PUBLIC_FAST_RELEASE_V3__=true;
  const root=document.documentElement;
  root.classList.remove(
    'liw-studio-fast-pending',
    'liw-studio-fast-ready',
    'liw-studio-runtime-pending',
    'liw-studio-runtime-ready',
    'liw-studio-dock-ready'
  );
  document.getElementById('liw-studio-fast-release-style-v3')?.remove();

  // A cached V3 loader hook may still request this file. Hand that request to the
  // non-blocking Studio V4 adapter instead of restoring any loader-gating behavior.
  if(!document.querySelector('script[data-liw-public-studio-v4]')){
    const script=document.createElement('script');
    script.src='js/public-studio-v4-staging.js?v=20260912-studio-v4-1';
    script.async=false;
    script.dataset.liwPublicStudioV4='true';
    document.body.appendChild(script);
  }
})();
