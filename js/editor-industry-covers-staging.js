/* cards-staging cleanup: industry covers removed. Reuse the existing staging loader hook for #3 button-style preview feedback. */
(function(){
  if(document.querySelector('script[data-liw-button-style-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-button-style-staging.js?v=20260816-button-style-1';
  script.defer=true;
  script.dataset.liwButtonStyleStaging='true';
  document.head.appendChild(script);
})();
