/* LIW Cards — cards-staging only: stable exact public-card preview.
   Exact preview refreshes only when explicitly requested (normally after a confirmed save).
   The editor mock remains visible until card.html has actually rendered successfully. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_CARD_FRAME_STAGING__)return;
  window.__LIW_PUBLIC_CARD_FRAME_STAGING__=true;

  const VERSION='20260905-public-frame-stable-2';
  const STYLE_ID='liw-public-card-frame-stable-css';
  const MODAL_ID='liw-public-preview-modal';
  const MOBILE_QUERY='(max-width: 920px)';
  const mobile=window.matchMedia(MOBILE_QUERY);
  const READY_TIMEOUT_MS=11500;
  const MODAL_HARD_STOP_MS=60000;

  let phone=null;
  let frame=null;
  let modalFrame=null;
  let lastSlug='';
  let bootTimer=0;
  let embeddedGeneration=0;
  let modalGeneration=0;

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #phone-preview{position:relative!important}
      #phone-preview .liw-public-card-frame{
        position:absolute;inset:0;width:100%;height:100%;border:0;margin:0;padding:0;
        background:#fff;z-index:4;opacity:0;pointer-events:none;
        transition:opacity .18s ease;
      }
      #phone-preview .liw-public-card-frame.is-ready{opacity:1}
      #phone-preview>.phone-notch{z-index:9!important;pointer-events:none}
      .phone-stage[data-liw-public-frame-ready="true"] .phone-label>span:first-child:after{
        content:' · exact public view';font-size:.66rem;font-weight:700;color:#758096
      }
      .phone-stage[data-liw-public-frame-fallback="true"] .phone-label>span:first-child:after{
        content:' · live fallback';font-size:.66rem;font-weight:700;color:#9a6c17
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
      #${MODAL_ID} .liw-public-preview-state{
        position:absolute;left:50%;top:50%;z-index:3;transform:translate(-50%,-50%);
        width:min(360px,calc(100% - 32px));padding:16px;border:1px solid #e0e4eb;border-radius:16px;
        background:rgba(255,255,255,.96);box-shadow:0 15px 42px rgba(11,20,56,.14);
        text-align:center;color:#0b1438;pointer-events:none;
      }
      #${MODAL_ID} .liw-public-preview-state strong{display:block;font-size:.86rem;margin-bottom:4px}
      #${MODAL_ID} .liw-public-preview-state span{display:block;font-size:.72rem;line-height:1.4;color:#6b7280}
      #${MODAL_ID} .liw-public-preview-state[hidden]{display:none}
      body.liw-public-preview-open{overflow:hidden!important}
      body.liw-public-preview-open #liw-staging-plan-qa{display:none!important}
      @media(max-width:920px){
        body > .phone-stage{display:none!important}
        .phone-stage[data-liw-public-frame-ready="true"] .phone-label>span:first-child:after,
        .phone-stage[data-liw-public-frame-fallback="true"] .phone-label>span:first-child:after{display:none}
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

  function markLabel(text){
    const label=document.querySelector('.phone-label>span:first-child');
    if(label&&text)label.textContent=text;
  }

  function stage(){return document.querySelector('.phone-stage');}

  function setEmbeddedPending(){
    embeddedGeneration+=1;
    const currentStage=stage();
    currentStage?.removeAttribute('data-liw-public-frame-ready');
    currentStage?.removeAttribute('data-liw-public-frame-fallback');
    frame?.classList.remove('is-ready');
    if(frame)frame.style.pointerEvents='none';
    markLabel('Live card preview');
    return embeddedGeneration;
  }

  function setEmbeddedReady(){
    const currentStage=stage();
    currentStage?.setAttribute('data-liw-public-frame-ready','true');
    currentStage?.removeAttribute('data-liw-public-frame-fallback');
    frame?.classList.add('is-ready');
    if(frame)frame.style.pointerEvents='auto';
    markLabel('Public card preview');
  }

  function setEmbeddedFallback(){
    const currentStage=stage();
    currentStage?.removeAttribute('data-liw-public-frame-ready');
    currentStage?.setAttribute('data-liw-public-frame-fallback','true');
    frame?.classList.remove('is-ready');
    if(frame)frame.style.pointerEvents='none';
    markLabel('Live card preview');
  }

  function guardEmbedded(targetFrame){
    if(!targetFrame)return;
    try{
      const doc=targetFrame.contentDocument;
      if(!doc?.head)return;
      let guard=doc.getElementById('liw-editor-frame-guard');
      if(!guard){
        guard=doc.createElement('style');
        guard.id='liw-editor-frame-guard';
        guard.textContent='html{scrollbar-width:none}body::-webkit-scrollbar{display:none}a,button,input,textarea,select,dialog,[role="button"]{pointer-events:none!important}';
        doc.head.appendChild(guard);
      }
    }catch(_){ }
  }

  function frameState(targetFrame){
    try{
      const doc=targetFrame?.contentDocument;
      if(!doc)return 'pending';
      const card=doc.getElementById('card');
      if(card){
        const visible=!card.hidden && card.getClientRects().length>0;
        if(visible)return 'ready';
      }
      const loading=doc.getElementById('loading');
      const text=String(loading?.textContent||doc.body?.textContent||'').replace(/\s+/g,' ').trim();
      if(/Still loading|Unable to load card|Card unavailable|Card not found|Card not published/i.test(text))return 'failed';
    }catch(_){ }
    return 'pending';
  }

  function monitorEmbedded(generation){
    const started=Date.now();
    const timer=setInterval(()=>{
      if(generation!==embeddedGeneration){clearInterval(timer);return;}
      guardEmbedded(frame);
      const state=frameState(frame);
      if(state==='ready'){
        clearInterval(timer);
        setEmbeddedReady();
        return;
      }
      if(state==='failed'||Date.now()-started>=READY_TIMEOUT_MS){
        clearInterval(timer);
        setEmbeddedFallback();
      }
    },220);
  }

  function ensureModal(){
    injectStyles();
    let modal=document.getElementById(MODAL_ID);
    if(modal)return modal;
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
      <div class="liw-public-preview-shell">
        <div class="liw-public-preview-state"><strong>Loading saved card…</strong><span>Using the exact public renderer.</span></div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.liw-public-preview-close')?.addEventListener('click',closeModal);
    modal.querySelector('.liw-public-preview-refresh')?.addEventListener('click',()=>loadModalFrame(true));
    return modal;
  }

  function setModalState(title,detail,hidden=false){
    const box=document.querySelector(`#${MODAL_ID} .liw-public-preview-state`);
    if(!box)return;
    box.hidden=hidden;
    if(hidden)return;
    box.querySelector('strong').textContent=title;
    box.querySelector('span').textContent=detail;
  }

  function settleModalIfReady(generation){
    if(generation!==modalGeneration)return false;
    if(frameState(modalFrame)!=='ready')return false;
    setModalState('','',true);
    return true;
  }

  function scheduleModalLoadSettlement(generation){
    [0,80,250,700,1500,3000].forEach(delay=>{
      setTimeout(()=>settleModalIfReady(generation),delay);
    });
  }

  function monitorModal(generation){
    const started=Date.now();
    let slowNoticeShown=false;
    const timer=setInterval(()=>{
      if(generation!==modalGeneration){clearInterval(timer);return;}
      const state=frameState(modalFrame);
      if(state==='ready'){
        clearInterval(timer);
        setModalState('','',true);
        return;
      }
      if(state==='failed'){
        clearInterval(timer);
        setModalState('Preview could not finish loading','Tap Refresh to try the exact public preview again.');
        return;
      }
      const elapsed=Date.now()-started;
      if(elapsed>=READY_TIMEOUT_MS&&!slowNoticeShown){
        slowNoticeShown=true;
        setModalState('Preview is taking longer than expected','Still loading — this message will clear automatically when the card is ready.');
      }
      if(elapsed>=MODAL_HARD_STOP_MS){
        clearInterval(timer);
        setModalState('Preview needs a refresh','Tap Refresh to try again. Your editor changes are still safe.');
      }
    },250);
  }

  function loadModalFrame(force=false){
    const currentSlug=slug();
    if(!currentSlug)return false;
    const modal=ensureModal();
    const shell=modal.querySelector('.liw-public-preview-shell');
    if(!shell)return false;
    if(!modalFrame){
      modalFrame=document.createElement('iframe');
      modalFrame.className='liw-public-preview-frame';
      modalFrame.title='Exact public card preview';
      modalFrame.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads');
      modalFrame.setAttribute('allow','web-share; clipboard-write');
      modalFrame.setAttribute('loading','eager');
      modalFrame.setAttribute('referrerpolicy','same-origin');
      modalFrame.addEventListener('load',()=>scheduleModalLoadSettlement(modalGeneration));
      shell.prepend(modalFrame);
    }
    if(force||!modalFrame.src||!modalFrame.src.includes(`slug=${encodeURIComponent(currentSlug)}`)){
      modalGeneration+=1;
      const generation=modalGeneration;
      setModalState('Loading saved card…','Using the exact public renderer.');
      modalFrame.src=cardUrl(currentSlug);
      monitorModal(generation);
    }
    return true;
  }

  function openModal(){
    if(!slug())return false;
    const modal=ensureModal();
    modal.classList.add('is-open');
    document.body.classList.add('liw-public-preview-open');
    loadModalFrame(true);
    return true;
  }

  function closeModal(){
    document.getElementById(MODAL_ID)?.classList.remove('is-open');
    document.body.classList.remove('liw-public-preview-open');
  }

  function ensureFrame(){
    injectStyles();
    if(mobile.matches)return Boolean(slug());
    phone=document.getElementById('phone-preview')||document.querySelector('.phone');
    const currentSlug=slug();
    if(!phone||!currentSlug)return false;

    if(!frame){
      frame=document.createElement('iframe');
      frame.className='liw-public-card-frame';
      frame.title='Exact public card preview';
      frame.setAttribute('aria-label','Exact public card preview');
      frame.setAttribute('sandbox','allow-scripts allow-same-origin');
      frame.setAttribute('loading','eager');
      frame.setAttribute('referrerpolicy','same-origin');
      phone.appendChild(frame);
    }

    if(currentSlug!==lastSlug||!frame.src){
      lastSlug=currentSlug;
      const generation=setEmbeddedPending();
      frame.src=cardUrl(currentSlug);
      monitorEmbedded(generation);
    }
    return true;
  }

  function refresh(){
    const currentSlug=slug();
    if(!currentSlug)return false;
    lastSlug=currentSlug;
    if(!mobile.matches){
      if(!ensureFrame())return false;
      const generation=setEmbeddedPending();
      frame.src=cardUrl(currentSlug);
      monitorEmbedded(generation);
    }
    if(document.getElementById(MODAL_ID)?.classList.contains('is-open'))loadModalFrame(true);
    return true;
  }

  function syncViewport(){
    if(mobile.matches){
      stage()?.removeAttribute('data-liw-public-frame-ready');
      return;
    }
    ensureFrame();
  }

  mobile.addEventListener?.('change',syncViewport);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&document.getElementById(MODAL_ID)?.classList.contains('is-open'))closeModal();
  });

  function boot(){return ensureFrame();}
  let attempts=0;
  bootTimer=setInterval(()=>{
    attempts+=1;
    if(boot()||attempts>=40){clearInterval(bootTimer);bootTimer=0;}
  },500);
  setTimeout(boot,300);
  setTimeout(boot,1200);

  window.LIWPublicCardFrameStaging={refresh,open:openModal,close:closeModal,version:VERSION};
})();