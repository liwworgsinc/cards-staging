/* LIW Cards — cards-staging launch stability controller.
   The customer-facing card renders first. Optional enhancements are mounted only
   after the core card is visible, in a deterministic order, so slow devices and
   variable networks do not race multiple polling modules during first paint. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_CARD_ENHANCEMENTS_STABLE__)return;
  window.__LIW_PUBLIC_CARD_ENHANCEMENTS_STABLE__=true;

  const loaded=new Map();
  let started=false;

  function loadScript(src,key=src){
    if(loaded.has(key))return loaded.get(key);
    const promise=new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(script=>script.src&&script.src.includes(src.split('?')[0]));
      if(existing){
        if(existing.dataset.liwLoaded==='true')return resolve(existing);
        existing.addEventListener('load',()=>resolve(existing),{once:true});
        existing.addEventListener('error',()=>reject(new Error(`Unable to load ${src}`)),{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.dataset.liwStabilityEnhancement=key;
      script.onload=()=>{script.dataset.liwLoaded='true';resolve(script);};
      script.onerror=()=>reject(new Error(`Unable to load ${src}`));
      document.body.appendChild(script);
    });
    loaded.set(key,promise);
    return promise;
  }

  function waitFor(predicate,{root=document.documentElement,timeout=2600,attributes=false}={}){
    return new Promise(resolve=>{
      try{if(predicate())return resolve(true);}catch(_){}
      let done=false;
      const finish=value=>{
        if(done)return;
        done=true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(value);
      };
      const observer=new MutationObserver(()=>{
        try{if(predicate())finish(true);}catch(_){}
      });
      observer.observe(root,{childList:true,subtree:true,attributes});
      const timer=setTimeout(()=>finish(false),timeout);
    });
  }

  function ensureRichMarker(){
    if(document.getElementById('public-rich-sections'))return;
    const marker=document.createElement('div');
    marker.id='public-rich-sections';
    marker.hidden=true;
    marker.dataset.liwStableFallback='true';
    const lead=document.getElementById('lead-section');
    const branding=document.getElementById('branding');
    if(lead)lead.insertAdjacentElement('beforebegin',marker);
    else if(branding)branding.insertAdjacentElement('beforebegin',marker);
    else document.querySelector('.public-content')?.appendChild(marker);
  }

  function runIdle(task){
    if('requestIdleCallback' in window){
      requestIdleCallback(()=>task(),{timeout:1800});
    }else{
      setTimeout(task,700);
    }
  }

  async function mountEnhancements(cardData={},featureAccess={}){
    if(started)return;
    started=true;
    document.documentElement.dataset.liwCardPhase='core-ready';

    // Rich content first. Flow depends on the final section structure.
    try{
      await loadScript('js/public-rich-sections.js?v=20260811-1','rich-sections');
      const richReady=await waitFor(()=>Boolean(document.getElementById('public-rich-sections')),{timeout:2600});
      if(!richReady)ensureRichMarker();
      await loadScript('js/rich-section-premium.js?v=20260811-2','rich-premium');
    }catch(error){
      console.warn('LIW optional rich sections unavailable:',error);
      ensureRichMarker();
    }

    // Flow mounts only after the card + rich-section structure are settled.
    try{
      await loadScript('js/public-swipe-card.js?v=20260815-3','flow');
      const wantsFlow=featureAccess?.flow_experience===true&&(
        String(cardData?.card_experience||'').toLowerCase()==='flow'||
        String(cardData?.card_layout||'').toLowerCase()==='swipe'
      );
      if(wantsFlow){
        await waitFor(()=>document.getElementById('card')?.classList.contains('swipe-card-active'),{
          root:document.getElementById('card')||document.documentElement,
          timeout:1800,
          attributes:true
        });
        if(document.getElementById('card')?.classList.contains('swipe-card-active')){
          await loadScript('js/public-swipe-pay-panel-staging.js?v=20260818-pay-panel-1','flow-pay');
        }
      }
    }catch(error){
      console.warn('LIW optional Flow enhancement unavailable:',error);
    }

    document.documentElement.dataset.liwCardPhase='interactive';

    // Non-critical enhancements never compete with first paint or card interaction.
    runIdle(async()=>{
      try{await loadScript('js/business-tool-premium-shared-staging.js?v=20260818-business-premium-2','business-style');}catch(error){console.warn('LIW optional business styling unavailable:',error);}
      try{await loadScript('js/pwa-install.js?v=20260821-share-home-2','pwa');}catch(error){console.warn('LIW optional PWA tools unavailable:',error);}

      // External-host share rewriting is useful only when another origin embeds a card.
      try{
        if(document.referrer&&new URL(document.referrer).origin!==location.origin){
          await loadScript('js/external-host-share-v2.js?v=20260818-business-premium-2','external-share');
        }
      }catch(_){}
      document.documentElement.dataset.liwCardPhase='enhanced';
    });
  }

  const originalRender=typeof window.renderCard==='function'?window.renderCard:null;
  if(originalRender){
    window.renderCard=function(cardData,links,services,products,downloads,isPreview,featureAccess){
      const result=originalRender.apply(this,arguments);
      Promise.resolve().then(()=>mountEnhancements(cardData,featureAccess||{}));
      return result;
    };
  }

  // Defensive fallback if the core renderer finished unusually early from browser cache.
  const card=document.getElementById('card');
  if(card&&!card.hidden){
    let cardData={};
    try{cardData=typeof publicCard!=='undefined'&&publicCard?publicCard:{};}catch(_){}
    Promise.resolve().then(()=>mountEnhancements(cardData,globalThis.publicCardFeatureAccess||{}));
  }
})();
