/* LIW Cards — cards-staging only: make the full-screen exact public preview interactive.
   The embedded desktop phone remains read-only; only the full-screen modal is unlocked. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_PREVIEW_INTERACTIVE__)return;
  window.__LIW_PUBLIC_PREVIEW_INTERACTIVE__=true;

  const MODAL_ID='liw-public-preview-modal';
  const SANDBOX='allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads';

  function unlock(frame){
    if(!frame||!frame.classList.contains('liw-public-preview-frame'))return false;

    frame.setAttribute('allow','web-share; clipboard-write');
    const sandboxChanged=frame.getAttribute('sandbox')!==SANDBOX;
    if(sandboxChanged)frame.setAttribute('sandbox',SANDBOX);

    try{
      const doc=frame.contentDocument;
      if(doc){
        doc.getElementById('liw-editor-frame-guard')?.remove();
        let style=doc.getElementById('liw-public-preview-interactive-override');
        if(!style&&doc.head){
          style=doc.createElement('style');
          style.id='liw-public-preview-interactive-override';
          style.textContent=`
            a,button,input,textarea,select,dialog,[role="button"]{pointer-events:auto!important}
          `;
          doc.head.appendChild(style);
        }
      }
    }catch(_){ }

    /* Sandbox permissions are fixed when a document loads. Reload once after
       adding popup/download permissions so booking/payment/save behave like the real card. */
    if(sandboxChanged&&frame.src&&frame.dataset.liwInteractiveSandboxReloaded!=='true'){
      frame.dataset.liwInteractiveSandboxReloaded='true';
      setTimeout(()=>{
        try{frame.contentWindow.location.replace(frame.src);}catch(_){frame.src=frame.src;}
      },30);
    }
    return true;
  }

  function wire(frame){
    if(!frame||frame.dataset.liwInteractivePreviewWired==='true')return;
    frame.dataset.liwInteractivePreviewWired='true';
    frame.addEventListener('load',()=>setTimeout(()=>unlock(frame),0));
    unlock(frame);
  }

  function scan(){
    document.querySelectorAll(`#${MODAL_ID} iframe.liw-public-preview-frame`).forEach(wire);
  }

  document.addEventListener('click',event=>{
    if(event.target instanceof Element&&event.target.closest('#liw-mobile-public-preview-launcher,.liw-public-preview-refresh')){
      setTimeout(scan,30);
      setTimeout(scan,260);
    }
  },false);

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    scan();
    if(attempts>=80)clearInterval(timer);
  },250);
  setTimeout(scan,80);
  setTimeout(scan,700);
})();
