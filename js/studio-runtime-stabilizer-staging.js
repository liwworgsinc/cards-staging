/* LIW Cards staging — Studio runtime stabilizer.
   Fixes the legacy Barbershop/Studio boundary without changing Classic, Flow or Showtime.
   Editor: Studio keeps the selected LIW template instead of clearing/deactivating it.
   Public: waits for the Studio shell + saved business type, then reveals one finished card
   and removes the branded loader. Non-barber Studio types never inherit barber-only chrome. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_RUNTIME_STABILIZER__)return;
  window.__LIW_STUDIO_RUNTIME_STABILIZER__=true;

  const MODE='barbershop';
  const VERSION='20260912-studio-runtime-2';
  const TYPES=new Set(['barber','hair','nails','lashes','makeup','esthetician','spa','cosmetics']);
  const STYLE_KEYS=['primary_color','secondary_color','background_color','text_color','button_color','button_text_color','font_family','button_style','profile_image_shape','border_radius','gradient_background','template_id'];
  const isEditor=/\/editor(?:\.html)?$/i.test(location.pathname);
  const isPublic=/\/card(?:\.html)?$/i.test(location.pathname);
  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>Array.from(scope.querySelectorAll(selector));

  function field(name){return q(`[name="${name}"]`);}
  function value(name,fallback=''){
    const el=field(name);
    return el?String(el.value??'').trim():fallback;
  }
  function editorStudioActive(){
    return value('color_mode').toLowerCase()===MODE&&value('card_experience','classic').toLowerCase()!=='music';
  }

  function setEditorValue(name,next){
    const el=field(name);
    if(el)el.value=String(next??'');
  }

  function captureStyleSnapshot(){
    const snapshot={};
    STYLE_KEYS.forEach(key=>{snapshot[key]=value(key);});
    return snapshot;
  }

  function restoreStyleSnapshot(snapshot){
    if(!snapshot)return;
    STYLE_KEYS.forEach(key=>{
      if(key==='template_id'||key==='profile_image_shape')return;
      if(snapshot[key]!==undefined&&snapshot[key]!==null&&snapshot[key]!=='')setEditorValue(key,snapshot[key]);
    });
    if(snapshot.template_id)setEditorValue('template_id',snapshot.template_id);
  }

  function templateList(){
    try{return Array.isArray(templates)?templates:[];}catch(_){return [];}
  }

  function cleanLegacyStudioLook(){
    /* The V5 shell still contains Barber-only preset buttons. Studio uses the main
       LIW Standard/Premium template library, so those old presets must not remain
       as a second competing skin system. */
    q('#barber-control-center .barber-v5-presets')?.remove();
    const look=q('#barber-control-center [data-barber-v5-panel="look"]');
    if(look)look.dataset.studioTemplateSource='liw-template-library';
  }

  function syncTemplateUi(templateId){
    const id=String(templateId||value('template_id')).trim();
    const template=id?templateList().find(item=>String(item?.id||'')===id)||null:null;
    qa('.template-card').forEach(card=>{
      const cardId=String(card.dataset.template||card.dataset.templateId||'').trim();
      if(cardId)card.classList.toggle('active',Boolean(id)&&cardId===id);
    });
    const summary=q('#template-selected-summary');
    if(summary){
      if(template?.name)summary.textContent=String(template.name);
      else if(!id&&editorStudioActive())summary.textContent='Choose an LIW template';
    }
    cleanLegacyStudioLook();
    try{window.LIWBarberTemplateBridge?.refresh?.();}catch(_){ }
  }

  function reassertStudio({templateId='',reapply=false,snapshot=null}={}){
    const savedId=String(templateId||value('template_id')).trim();
    if(reapply&&savedId){
      const template=templateList().find(item=>String(item?.id||'')===savedId)||null;
      if(template&&typeof applyTemplate==='function'){
        try{applyTemplate(template);}catch(error){console.warn('[Studio] template reapply skipped:',error);}
      }
      setEditorValue('template_id',savedId);
    }else if(snapshot){
      restoreStyleSnapshot(snapshot);
    }

    setEditorValue('card_experience','classic');
    setEditorValue('color_mode',MODE);
    /* Studio's full-screen identity uses the centered round profile regardless of skin. */
    setEditorValue('profile_image_shape','circle');
    syncTemplateUi(savedId||value('template_id'));
    try{if(typeof render==='function')render();}catch(_){ }
    try{window.LIWBarbershopEditor?.refresh?.();}catch(_){ }
    try{window.LIWStudioBusinessTypes?.refresh?.();}catch(_){ }
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
  }

  function installEditorGuard(){
    if(!isEditor)return;

    document.addEventListener('click',event=>{
      const target=event.target instanceof Element?event.target:null;
      if(!target)return;

      const studioChoice=target.closest('[data-card-experience="barbershop"]');
      if(studioChoice){
        const snapshot=captureStyleSnapshot();
        const selectedId=snapshot.template_id;
        // The legacy V5 handler clears template_id and applies Black & Gold.
        // Restore the selected LIW template (or the current custom styling when no
        // template is selected) after that legacy handler completes.
        setTimeout(()=>reassertStudio({templateId:selectedId,reapply:Boolean(selectedId),snapshot}),0);
        setTimeout(()=>reassertStudio({templateId:selectedId,reapply:Boolean(selectedId),snapshot}),90);
        return;
      }

      const templateCard=target.closest('.template-card');
      if(templateCard&&editorStudioActive()){
        // Let the normal template library apply the newly chosen template first.
        // Then restore only Studio's experience marker; do not deactivate Studio.
        setTimeout(()=>reassertStudio({templateId:value('template_id'),reapply:false}),0);
        setTimeout(()=>reassertStudio({templateId:value('template_id'),reapply:false}),120);
      }
    },true);

    const settle=()=>{
      if(!editorStudioActive())return;
      cleanLegacyStudioLook();
      const id=value('template_id');
      syncTemplateUi(id);
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(settle,450),{once:true});
    else setTimeout(settle,450);
    window.addEventListener('pageshow',()=>setTimeout(settle,120),{passive:true});

    window.LIWStudioRuntime={version:VERSION,reassert:reassertStudio,syncTemplate:syncTemplateUi,cleanLegacyLook:cleanLegacyStudioLook};
  }

  function publicCardData(){
    try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}
  }
  function publicStudio(data){
    const mode=String(data?.color_mode||'').trim().toLowerCase();
    const experience=String(data?.card_experience||'classic').trim().toLowerCase();
    return experience==='barbershop'||(mode===MODE&&experience!=='music');
  }

  function injectPublicStyle(){
    if(q('#liw-studio-runtime-style'))return;
    const style=document.createElement('style');
    style.id='liw-studio-runtime-style';
    style.textContent=`
      html.liw-studio-runtime-pending #card{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      html.liw-studio-runtime-pending #loading{display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
      html.liw-studio-runtime-ready #loading{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      html.liw-studio-runtime-ready #loading *,html.liw-studio-runtime-ready #loading *::before,html.liw-studio-runtime-ready #loading *::after{animation:none!important}

      /* Studio writes its business type to <html>. Non-barber businesses must not
         inherit the old pole/stripe/scissors identity from the Barber engine. */
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .public-cover::after{content:none!important;display:none!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-welcome-kicker>span{width:20px!important;height:3px!important;background:var(--barber-secondary,#d4a84f)!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--barber-secondary,#d4a84f) 22%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-dock-center-mark{width:22px!important;height:2px!important;opacity:.52!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-dock-center-mark span{background:var(--barber-secondary,#d4a84f)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-hint-symbol{font-size:0!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-hint-symbol::after{content:"✦";font-size:.72rem;line-height:1}

      /* Non-barber Studio skins use the selected LIW template values, not the old
         hard-coded black/gold Barber surfaces. */
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active.barber-client-room-active .public-content,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-stage,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-home,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-iframe-shell,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-booking-host{background:var(--barber-background,#fff)!important;color:var(--barber-text,#111827)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-iframe-top{background:color-mix(in srgb,var(--barber-primary,#111827) 8%,var(--barber-background,#fff))!important;border-bottom-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 24%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-promo{border-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 30%,transparent)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--barber-secondary,#d4a84f) 12%,var(--barber-background,#fff)),color-mix(in srgb,var(--barber-primary,#111827) 3%,var(--barber-background,#fff)))!important;box-shadow:0 14px 28px color-mix(in srgb,var(--barber-primary,#111827) 12%,transparent),inset 0 1px 0 rgba(255,255,255,.18)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-promo::after{border-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 14%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-promo>strong,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-home h1{color:var(--barber-text,#111827)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-welcome-specialty,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-promo>p,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-hint{color:color-mix(in srgb,var(--barber-text,#111827) 70%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-hint{background:color-mix(in srgb,var(--barber-primary,#111827) 5%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-dock{background:linear-gradient(180deg,color-mix(in srgb,var(--barber-secondary,#d4a84f) 10%,var(--barber-background,#fff)),var(--barber-background,#fff) 64%)!important;border-top-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 38%,transparent)!important;box-shadow:0 -10px 24px color-mix(in srgb,var(--barber-primary,#111827) 10%,transparent),inset 0 1px 0 rgba(255,255,255,.15)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-dock-orbit{border-top-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 50%,transparent)!important;background:linear-gradient(180deg,color-mix(in srgb,var(--barber-secondary,#d4a84f) 8%,transparent),transparent 52%)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-item{border-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 22%,transparent)!important;background:color-mix(in srgb,var(--barber-primary,#111827) 8%,var(--barber-background,#fff))!important;color:color-mix(in srgb,var(--barber-text,#111827) 82%,var(--barber-secondary,#d4a84f))!important;box-shadow:0 6px 12px color-mix(in srgb,var(--barber-primary,#111827) 12%,transparent),inset 0 1px 0 rgba(255,255,255,.16)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-item span{color:color-mix(in srgb,var(--barber-text,#111827) 82%,var(--barber-secondary,#d4a84f))!important;text-shadow:none!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-item.active{border-color:var(--barber-secondary,#d4a84f)!important;background:color-mix(in srgb,var(--barber-secondary,#d4a84f) 12%,var(--barber-background,#fff))!important;color:var(--barber-secondary,#d4a84f)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-item.active span{color:var(--barber-text,#111827)!important}
      html[data-studio-business-type] body.public-body,html[data-studio-business-type] body.public-body .public-shell{background:var(--studio-page-background,#fff)!important}
      html[data-studio-business-type] #card.barbershop-card-active{min-height:100dvh!important;background:var(--barber-background,#fff)!important}
    `;
    document.head.appendChild(style);
  }

  function syncPublicType(){
    const card=q('#card');
    const type=String(document.documentElement.dataset.studioBusinessType||card?.dataset.studioBusinessType||'').trim().toLowerCase();
    if(!TYPES.has(type))return '';
    document.documentElement.dataset.studioBusinessType=type;
    if(document.body)document.body.dataset.studioBusinessType=type;
    return type;
  }

  function studioShellReady(){
    const data=publicCardData();
    const card=q('#card');
    if(!data||!card||card.hidden||!publicStudio(data))return false;
    const type=syncPublicType();
    if(!type||!card.classList.contains('barbershop-card-active'))return false;
    const hasHome=Boolean(q('.barber-client-home')||q('.barber-client-stage'));
    const hasDock=Boolean(q('.barber-revolve-dock'));
    return hasHome&&hasDock;
  }

  function finishPublicStudio(reason='studio-ready'){
    const data=publicCardData();
    const card=q('#card');
    const type=syncPublicType();
    if(!data||!card||!type)return false;

    const background=String(data.background_color||'#ffffff');
    document.documentElement.style.setProperty('--studio-page-background',background);
    document.documentElement.classList.remove('liw-studio-runtime-pending','liw-card-loader-active','liw-card-loader-release','liw-card-loader-failed');
    document.documentElement.classList.add('liw-studio-runtime-ready');
    card.dataset.studioReady='true';
    card.style.removeProperty('visibility');
    card.style.removeProperty('opacity');
    card.style.removeProperty('pointer-events');

    const loading=q('#loading');
    if(loading){
      loading.hidden=true;
      loading.setAttribute('aria-hidden','true');
      loading.setAttribute('aria-busy','false');
      loading.style.setProperty('display','none','important');
      loading.style.setProperty('visibility','hidden','important');
      loading.style.setProperty('opacity','0','important');
      loading.style.setProperty('pointer-events','none','important');
      qa('.skeleton',loading).forEach(node=>node.style.setProperty('animation','none','important'));
    }
    try{window.dispatchEvent(new CustomEvent('liw:studio-ready',{detail:{type,reason}}));}catch(_){ }
    return true;
  }

  function installPublicGuard(){
    if(!isPublic)return;
    injectPublicStyle();
    let timer=0;
    const started=performance.now();
    let studioDetected=false;

    const tick=()=>{
      const data=publicCardData();
      const card=q('#card');
      if(data&&card&&publicStudio(data)){
        if(!studioDetected)studioDetected=true;
        /* Keep the existing branded loader as the only visible surface until the
           Studio shell is complete. The old loader may try to release as Classic;
           reasserting these classes prevents the card/loader overlap. */
        document.documentElement.classList.add('liw-studio-runtime-pending','liw-card-loader-active');
        document.documentElement.classList.remove('liw-card-loader-release','liw-card-loader-failed');
        syncPublicType();
        if(studioShellReady()){
          finishPublicStudio('shell-stable');
          clearInterval(timer);
          return;
        }
      }
      if(performance.now()-started>9000){
        clearInterval(timer);
        // Never allow a loader animation to run forever. If Studio content exists,
        // reveal it cleanly; the user can still interact while optional rooms finish.
        if(studioDetected&&data&&card&&!card.hidden){
          syncPublicType();
          finishPublicStudio('bounded-failsafe');
        }
      }
    };

    timer=setInterval(tick,70);
    tick();
    window.addEventListener('liw:barber-client-ready',()=>{
      if(studioShellReady()){
        clearInterval(timer);
        finishPublicStudio('client-room-ready');
      }
    },{passive:true});
  }

  installEditorGuard();
  installPublicGuard();
})();
