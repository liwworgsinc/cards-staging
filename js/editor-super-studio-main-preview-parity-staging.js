/* LIW Cards staging — Super Studio main editor phone parity.
   Render the built-in editor phone at the same canonical 390px mobile viewport
   used by external-preview.html, then scale the whole public card to the phone shell. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_MAIN_PREVIEW_PARITY__)return;
  window.__LIW_SUPER_STUDIO_MAIN_PREVIEW_PARITY__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')&&/\/editor\.html$/i.test(location.pathname)))return;

  const CANONICAL_MOBILE_WIDTH=390;
  const FRAME_SELECTOR='#phone-preview .liw-public-card-frame';
  const EXPERIENCE_SELECTOR='[name="card_experience"]';
  let resizeObserver=null;
  let observedPhone=null;
  let wiredFrame=null;
  let queued=false;

  function isSuperStudio(){
    return String(document.querySelector(EXPERIENCE_SELECTOR)?.value||'').trim().toLowerCase()==='super-studio';
  }

  function phone(){return document.getElementById('phone-preview');}
  function frame(){return document.querySelector(FRAME_SELECTOR);}

  function resetFrame(target){
    if(!target)return;
    target.style.removeProperty('width');
    target.style.removeProperty('height');
    target.style.removeProperty('left');
    target.style.removeProperty('top');
    target.style.removeProperty('right');
    target.style.removeProperty('bottom');
    target.style.removeProperty('transform');
    target.style.removeProperty('transform-origin');
    target.removeAttribute('data-ss-main-preview-parity');
  }

  function fit(){
    queued=false;
    const shell=phone();
    const target=frame();
    if(!shell||!target)return false;

    if(!isSuperStudio()){
      resetFrame(target);
      return false;
    }

    const shellWidth=Math.max(1,shell.clientWidth);
    const shellHeight=Math.max(1,shell.clientHeight);
    const scale=shellWidth/CANONICAL_MOBILE_WIDTH;
    if(!Number.isFinite(scale)||scale<=0)return false;

    target.setAttribute('allow','autoplay; clipboard-write; web-share; fullscreen');
    target.dataset.ssMainPreviewParity='true';
    target.style.left='0';
    target.style.top='0';
    target.style.right='auto';
    target.style.bottom='auto';
    target.style.width=CANONICAL_MOBILE_WIDTH+'px';
    target.style.height=(shellHeight/scale)+'px';
    target.style.transformOrigin='top left';
    target.style.transform=`scale(${scale})`;

    shell.dataset.ssCanonicalPreview='390';
    shell.style.setProperty('--ss-preview-scale',String(scale));
    return true;
  }

  function queueFit(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(fit);
  }

  function wireFrame(){
    const target=frame();
    if(!target)return false;
    if(wiredFrame!==target){
      if(wiredFrame)wiredFrame.removeEventListener('load',queueFit);
      wiredFrame=target;
      wiredFrame.addEventListener('load',queueFit,{passive:true});
    }
    return true;
  }

  function observePhone(){
    const shell=phone();
    if(!shell||observedPhone===shell)return;
    try{resizeObserver?.disconnect();}catch(_){}
    observedPhone=shell;
    if('ResizeObserver' in window){
      resizeObserver=new ResizeObserver(queueFit);
      resizeObserver.observe(shell);
    }
  }

  function scan(){
    observePhone();
    wireFrame();
    queueFit();
  }

  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.type==='childList'||(record.type==='attributes'&&record.target?.matches?.(EXPERIENCE_SELECTOR))))scan();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['value']});

  document.addEventListener('liw:editor-card-hydrated',scan);
  document.addEventListener('change',event=>{if(event.target?.matches?.(EXPERIENCE_SELECTOR))scan();});
  document.addEventListener('input',event=>{if(event.target?.matches?.(EXPERIENCE_SELECTOR))scan();});
  window.addEventListener('resize',queueFit,{passive:true});
  window.addEventListener('pageshow',scan,{passive:true});

  window.LIWSuperStudioMainPreviewParity={fit:queueFit,canonicalWidth:CANONICAL_MOBILE_WIDTH};
  scan();
})();
