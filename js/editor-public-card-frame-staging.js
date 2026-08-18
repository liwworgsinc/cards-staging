/* LIW Cards — cards-staging only: exact public-card preview inside the editor phone.
   Uses the real card.html renderer in a same-origin iframe. No render wrapping,
   no MutationObserver, and no fast refresh loop. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_CARD_FRAME_STAGING__) return;
  window.__LIW_PUBLIC_CARD_FRAME_STAGING__=true;

  const VERSION='20260818-public-frame-1';
  const STYLE_ID='liw-public-card-frame-staging-css';
  const REFRESH_INPUT_MS=1700;
  const REFRESH_CHANGE_MS=1250;
  const REFRESH_ACTION_MS=1450;

  let phone=null;
  let frame=null;
  let refreshTimer=0;
  let bootTimer=0;
  let lastSlug='';
  let loadedOnce=false;

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #phone-preview{position:relative!important}
      #phone-preview .liw-public-card-frame{
        position:absolute;inset:0;width:100%;height:100%;border:0;margin:0;padding:0;
        background:#fff;z-index:2;opacity:0;transition:opacity .16s ease;
      }
      #phone-preview .liw-public-card-frame.is-ready{opacity:1}
      #phone-preview>.phone-notch{z-index:9!important;pointer-events:none}
      .phone-stage[data-liw-public-frame-ready="true"] .phone-label>span:first-child:after{
        content:' · exact public view';font-size:.66rem;font-weight:700;color:#758096
      }
      @media(max-width:920px){
        .phone-stage[data-liw-public-frame-ready="true"] .phone-label>span:first-child:after{display:none}
      }
    `;
    document.head.appendChild(style);
  }

  function slug(){
    return String(document.querySelector('[name="slug"]')?.value||'').trim();
  }

  function cardUrl(currentSlug){
    const url=new URL('card.html',location.href);
    url.searchParams.set('slug',currentSlug);
    url.searchParams.set('editor_preview','1');
    url.searchParams.set('_liw',`${VERSION}-${Date.now()}`);
    return url.href;
  }

  function markStatus(text){
    const label=document.querySelector('.phone-label>span:first-child');
    if(label && text) label.textContent=text;
  }

  function lockIframeInteractions(){
    if(!frame) return;
    try{
      const doc=frame.contentDocument;
      if(!doc?.head) return;
      if(!doc.getElementById('liw-editor-frame-guard')){
        const guard=doc.createElement('style');
        guard.id='liw-editor-frame-guard';
        guard.textContent=`
          html{scrollbar-width:none}
          body::-webkit-scrollbar{display:none}
          a,button,input,textarea,select,dialog,[role="button"]{pointer-events:none!important}
        `;
        doc.head.appendChild(guard);
      }
    }catch(_){ }
  }

  function handleLoad(){
    if(!frame) return;
    lockIframeInteractions();
    frame.style.pointerEvents='auto';
    frame.classList.add('is-ready');
    document.querySelector('.phone-stage')?.setAttribute('data-liw-public-frame-ready','true');
    markStatus('Public card preview');
    loadedOnce=true;
  }

  function ensureFrame(){
    injectStyles();
    phone=document.getElementById('phone-preview')||document.querySelector('.phone');
    if(!phone) return false;
    const currentSlug=slug();
    if(!currentSlug) return false;

    if(!frame){
      frame=document.createElement('iframe');
      frame.className='liw-public-card-frame';
      frame.title='Exact public card preview';
      frame.setAttribute('aria-label','Exact public card preview');
      frame.setAttribute('sandbox','allow-scripts allow-same-origin');
      frame.setAttribute('loading','eager');
      frame.setAttribute('referrerpolicy','same-origin');
      frame.style.pointerEvents='none';
      frame.addEventListener('load',handleLoad);
      phone.appendChild(frame);
    }

    if(currentSlug!==lastSlug || !frame.src){
      lastSlug=currentSlug;
      frame.classList.remove('is-ready');
      frame.style.pointerEvents='none';
      frame.src=cardUrl(currentSlug);
    }
    return true;
  }

  function refresh(){
    refreshTimer=0;
    const currentSlug=slug();
    if(!currentSlug){
      ensureFrame();
      return false;
    }
    if(!ensureFrame()) return false;
    lastSlug=currentSlug;
    frame.classList.remove('is-ready');
    frame.style.pointerEvents='none';
    frame.src=cardUrl(currentSlug);
    return true;
  }

  function queueRefresh(delay){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(refresh,delay);
  }

  function editorField(target){
    return target instanceof Element && target.matches('input,textarea,select') && Boolean(target.closest('.editor-workspace'));
  }

  function editorAction(target){
    if(!(target instanceof Element)) return false;
    return Boolean(target.closest('.editor-workspace button,.editor-workspace label,.editor-workspace summary'));
  }

  document.addEventListener('input',event=>{
    if(editorField(event.target)) queueRefresh(REFRESH_INPUT_MS);
  },false);

  document.addEventListener('change',event=>{
    if(editorField(event.target)) queueRefresh(REFRESH_CHANGE_MS);
  },false);

  document.addEventListener('click',event=>{
    if(event.target.closest('#save-now-button')){
      queueRefresh(850);
      return;
    }
    if(editorAction(event.target)) queueRefresh(REFRESH_ACTION_MS);
  },false);

  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden && loadedOnce) queueRefresh(350);
  });

  window.addEventListener('pageshow',()=>{
    if(loadedOnce) queueRefresh(350);
  },{passive:true});

  function boot(){
    if(ensureFrame()) return true;
    return false;
  }

  let attempts=0;
  bootTimer=setInterval(()=>{
    attempts+=1;
    if(boot()||attempts>=40){
      clearInterval(bootTimer);
      bootTimer=0;
    }
  },500);
  setTimeout(boot,300);
  setTimeout(boot,1200);

  window.LIWPublicCardFrameStaging={refresh,version:VERSION};
})();
