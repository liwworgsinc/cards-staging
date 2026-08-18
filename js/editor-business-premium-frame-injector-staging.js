/* cards-staging only: ensure the exact public-card iframe receives the persisted
   Advanced Business Tool style engine even if a cached public bootstrap script is served. */
(function(){
  'use strict';
  if(window.__LIW_BUSINESS_PREMIUM_FRAME_INJECTOR__)return;
  window.__LIW_BUSINESS_PREMIUM_FRAME_INJECTOR__=true;

  function inject(frame){
    if(!frame)return false;
    try{
      const doc=frame.contentDocument;
      if(!doc?.head||!doc.body?.classList.contains('public-body'))return false;
      if(doc.querySelector('script[data-liw-business-tool-premium-frame]')||doc.defaultView?.LIWBusinessToolPremium)return true;
      const script=doc.createElement('script');
      script.src=new URL('js/business-tool-premium-shared-staging.js?v=20260818-business-premium-1',location.href).href;
      script.defer=true;
      script.dataset.liwBusinessToolPremiumFrame='true';
      doc.head.appendChild(script);
      return true;
    }catch(_){return false;}
  }

  function wire(frame){
    if(!frame||frame.dataset.liwBusinessPremiumInjector==='true')return;
    frame.dataset.liwBusinessPremiumInjector='true';
    frame.addEventListener('load',()=>setTimeout(()=>inject(frame),20));
    inject(frame);
  }

  function scan(){
    document.querySelectorAll('iframe.liw-public-card-frame,iframe.liw-public-preview-frame').forEach(wire);
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    scan();
    if(attempts>=48)clearInterval(timer);
  },250);
  setTimeout(scan,80);
  setTimeout(scan,700);
})();
