/* LIW Cards — cards-staging only: exact public-card preview inside the editor phone.
   Desktop uses the real card.html renderer inside the phone. Mobile uses a clean
   launcher that opens the same public card full-screen. No render wrapping,
   no MutationObserver, and no fast refresh loop. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_CARD_FRAME_STAGING__) return;
  window.__LIW_PUBLIC_CARD_FRAME_STAGING__=true;

  const VERSION='20260818-public-frame-2';
  const STYLE_ID='liw-public-card-frame-staging-css';
  const MODAL_ID='liw-public-preview-modal';
  const MOBILE_QUERY='(max-width: 920px)';
  const mobile=window.matchMedia(MOBILE_QUERY);
  const REFRESH_INPUT_MS=1700;
  const REFRESH_CHANGE_MS=1250;
  const REFRESH_ACTION_MS=1450;

  let phone=null;
  let frame=null;
  let modalFrame=null;
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

      #${MODAL_ID}{
        position:fixed;inset:0;z-index:2147483000;display:none;flex-direction:column;
        background:#f4f5f8;color:#0b1224;padding-top:env(safe-area-inset-top,0px);
      }
      #${MODAL_ID}.is-open{display:flex}
      #${MODAL_ID} .liw-public-preview-head{
        flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;
        min-height:62px;padding:10px 12px;background:#fff;border-bottom:1px solid #e2e4e9;
        box-shadow:0 5px 18px rgba(11,20,56,.08);z-index:2;
      }
      #${MODAL_ID} .liw-public-preview-title{min-width:0;display:grid;gap:1px}
      #${MODAL_ID} .liw-public-preview-title strong{font-size:.98rem;line-height:1.2}
      #${MODAL_ID} .liw-public-preview-title span{font-size:.68rem;color:#697089;font-weight:700}
      #${MODAL_ID} .liw-public-preview-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
      #${MODAL_ID} .liw-public-preview-refresh,
      #${MODAL_ID} .liw-public-preview-close{
        min-height:40px;border:1px solid #dce1e9;border-radius:12px;background:#fff;color:#0b1438;
        padding:8px 11px;font:800 .76rem/1 'DM Sans',system-ui,sans-serif;display:inline-flex;
        align-items:center;justify-content:center;gap:6px;cursor:pointer;
      }
      #${MODAL_ID} .liw-public-preview-close{background:#0b1438;border-color:#0b1438;color:#fff}
      #${MODAL_ID} .liw-public-preview-shell{position:relative;flex:1 1 auto;min-height:0;background:#fff}
      #${MODAL_ID} .liw-public-preview-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
      body.liw-public-preview-open{overflow:hidden!important}
      body.liw-public-preview-open #liw-staging-plan-qa{display:none!important}

      @media(max-width:920px){
        .phone-stage[data-liw-public-frame-mobile="true"] .phone,
        .phone-stage[data-liw-public-frame-mobile="true"] .phone-label{display:none!important}
        .phone-stage[data-liw-public-frame-mobile="true"] #mobile-preview-button{
          position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;
          display:flex!important;width:auto!important;min-width:172px!important;min-height:48px!important;
          padding:11px 15px!important;border-radius:999px!important;background:#0b1438!important;
          border:1px solid rgba(255,255,255,.2)!important;color:#fff!important;font-size:.72rem!important;
          font-weight:900!important;line-height:1!important;gap:7px!important;pointer-events:auto!important;
          box-shadow:0 12px 30px rgba(11,20,56,.28)!important;
        }
        .phone-stage[data-liw-public-frame-mobile="true"] #mobile-preview-button svg{width:15px!important;height:15px!important}
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

  function guardFrame(targetFrame){
    if(!targetFrame) return;
    try{
      const doc=targetFrame.contentDocument;
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

  function ensureModal(){
    let modal=document.getElementById(MODAL_ID);
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id=MODAL_ID;
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label','Exact public card preview');
    modal.innerHTML=`
      <div class="liw-public-preview-head">
        <div class="liw-public-preview-title"><strong>Public card preview</strong><span>Same renderer your customers see</span></div>
        <div class="liw-public-preview-actions">
          <button type="button" class="liw-public-preview-refresh" aria-label="Refresh public preview">Refresh</button>
          <button type="button" class="liw-public-preview-close" aria-label="Close public preview">Close</button>
        </div>
      </div>
      <div class="liw-public-preview-shell"></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.liw-public-preview-close')?.addEventListener('click',closeModal);
    modal.querySelector('.liw-public-preview-refresh')?.addEventListener('click',()=>loadModalFrame(true));
    return modal;
  }

  function loadModalFrame(force=false){
    const currentSlug=slug();
    if(!currentSlug) return false;
    const modal=ensureModal();
    const shell=modal.querySelector('.liw-public-preview-shell');
    if(!shell) return false;
    if(!modalFrame){
      modalFrame=document.createElement('iframe');
      modalFrame.className='liw-public-preview-frame';
      modalFrame.title='Exact public card preview';
      modalFrame.setAttribute('sandbox','allow-scripts allow-same-origin');
      modalFrame.setAttribute('loading','eager');
      modalFrame.setAttribute('referrerpolicy','same-origin');
      modalFrame.addEventListener('load',()=>guardFrame(modalFrame));
      shell.appendChild(modalFrame);
    }
    if(force || !modalFrame.src || !modalFrame.src.includes(`slug=${encodeURIComponent(currentSlug)}`)){
      modalFrame.src=cardUrl(currentSlug);
    }
    return true;
  }

  function openModal(){
    if(!slug()) return false;
    const modal=ensureModal();
    loadModalFrame(true);
    modal.classList.add('is-open');
    document.body.classList.add('liw-public-preview-open');
    return true;
  }

  function closeModal(){
    document.getElementById(MODAL_ID)?.classList.remove('is-open');
    document.body.classList.remove('liw-public-preview-open');
  }

  function setupMobileLauncher(){
    const stage=document.querySelector('.phone-stage');
    const button=document.getElementById('mobile-preview-button');
    if(!stage||!button) return false;
    stage.dataset.liwPublicFrameMobile='true';
    stage.style.setProperty('width','auto','important');
    stage.style.setProperty('max-width','none','important');
    stage.style.setProperty('height','auto','important');
    stage.style.setProperty('padding','0','important');
    stage.style.setProperty('border','0','important');
    stage.style.setProperty('border-radius','0','important');
    stage.style.setProperty('background','transparent','important');
    stage.style.setProperty('box-shadow','none','important');
    stage.style.setProperty('overflow','visible','important');
    stage.style.setProperty('right','12px','important');
    stage.style.setProperty('bottom','calc(148px + env(safe-area-inset-bottom, 0px))','important');
    stage.style.setProperty('pointer-events','auto','important');
    button.innerHTML='<i data-lucide="maximize-2" size="15"></i><span>View public preview</span>';
    button.setAttribute('aria-label','View exact public card preview');
    button.title='View exact public card preview';
    if(window.lucide) try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function restoreDesktopStage(){
    const stage=document.querySelector('.phone-stage');
    if(!stage) return;
    delete stage.dataset.liwPublicFrameMobile;
    ['width','max-width','height','padding','border','border-radius','background','box-shadow','overflow','pointer-events'].forEach(prop=>stage.style.removeProperty(prop));
    try{ window.dispatchEvent(new Event('resize')); }catch(_){ }
  }

  function syncViewportMode(){
    if(mobile.matches) setupMobileLauncher();
    else restoreDesktopStage();
  }

  function handleLoad(){
    if(!frame) return;
    guardFrame(frame);
    frame.style.pointerEvents='auto';
    frame.classList.add('is-ready');
    document.querySelector('.phone-stage')?.setAttribute('data-liw-public-frame-ready','true');
    markStatus('Public card preview');
    loadedOnce=true;
    syncViewportMode();
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
    syncViewportMode();
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
    if(document.getElementById(MODAL_ID)?.classList.contains('is-open')) loadModalFrame(true);
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

  document.addEventListener('click',event=>{
    const launcher=event.target instanceof Element ? event.target.closest('#mobile-preview-button') : null;
    if(launcher && mobile.matches){
      event.preventDefault();
      event.stopImmediatePropagation();
      openModal();
      return;
    }
  },true);

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && document.getElementById(MODAL_ID)?.classList.contains('is-open')) closeModal();
  });

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

  mobile.addEventListener?.('change',syncViewportMode);

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

  window.LIWPublicCardFrameStaging={refresh,open:openModal,close:closeModal,version:VERSION};
})();
