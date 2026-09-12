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
  const VERSION='20260912-studio-runtime-1';
  const TYPES=new Set(['barber','hair','nails','lashes','makeup','esthetician','spa','cosmetics']);
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

  function templateList(){
    try{return Array.isArray(templates)?templates:[];}catch(_){return [];}
  }

  function syncTemplateUi(templateId){
    const id=String(templateId||value('template_id')).trim();
    if(!id)return;
    const template=templateList().find(item=>String(item?.id||'')===id)||null;
    qa('.template-card').forEach(card=>{
      const cardId=String(card.dataset.template||card.dataset.templateId||'').trim();
      if(cardId)card.classList.toggle('active',cardId===id);
    });
    const summary=q('#template-selected-summary');
    if(summary&&template?.name)summary.textContent=String(template.name);
    try{window.LIWBarberTemplateBridge?.refresh?.();}catch(_){ }
  }

  function reassertStudio({templateId='',reapply=false}={}){
    const savedId=String(templateId||value('template_id')).trim();
    if(reapply&&savedId){
      const template=templateList().find(item=>String(item?.id||'')===savedId)||null;
      if(template&&typeof applyTemplate==='function'){
        try{applyTemplate(template);}catch(error){console.warn('[Studio] template reapply skipped:',error);}
      }
      setEditorValue('template_id',savedId);
    }
    setEditorValue('card_experience','classic');
    setEditorValue('color_mode',MODE);
    setEditorValue('profile_image_shape','circle');
    syncTemplateUi(savedId);
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
        const selectedId=value('template_id');
        // The legacy V5 click handler clears template_id and applies Black & Gold.
        // Reapply the already-selected LIW template after that handler completes.
        setTimeout(()=>reassertStudio({templateId:selectedId,reapply:Boolean(selectedId)}),0);
        setTimeout(()=>reassertStudio({templateId:selectedId,reapply:Boolean(selectedId)}),90);
        return;
      }

      const templateCard=target.closest('.template-card');
      if(templateCard&&editorStudioActive()){
        // Let the normal template library apply the new template first. Then restore
        // Studio's marker only; never turn Studio off just because its skin changed.
        setTimeout(()=>reassertStudio({templateId:value('template_id'),reapply:false}),0);
        setTimeout(()=>reassertStudio({templateId:value('template_id'),reapply:false}),120);
      }
    },true);

    const settle=()=>{
      if(!editorStudioActive())return;
      const id=value('template_id');
      if(id)syncTemplateUi(id);
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(settle,450),{once:true});
    else setTimeout(settle,450);
    window.addEventListener('pageshow',()=>setTimeout(settle,120),{passive:true});

    window.LIWStudioRuntime={version:VERSION,reassert:reassertStudio,syncTemplate:syncTemplateUi};
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
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .public-cover::after{content:none!important;display:none!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-welcome-kicker>span{width:20px!important;height:3px!important;background:var(--barber-secondary,#d4a84f)!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--barber-secondary,#d4a84f) 22%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-dock-center-mark{width:22px!important;height:2px!important;opacity:.52!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-dock-center-mark span{background:var(--barber-secondary,#d4a84f)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-hint-symbol{font-size:0!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-hint-symbol::after{content:"✦";font-size:.72rem;line-height:1}

      /* Non-barber Studio skins use the selected LIW template colors, not hard-coded barber gold. */
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-promo{border-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 28%,transparent)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--barber-secondary,#d4a84f) 12%,var(--barber-background,#090909)),var(--barber-background,#090909))!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-promo::after{border-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 13%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-dock{background:linear-gradient(180deg,color-mix(in srgb,var(--barber-secondary,#d4a84f) 10%,var(--barber-background,#090909)),var(--barber-background,#090909) 60%)!important;border-top-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 38%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-dock-orbit{border-top-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 50%,transparent)!important;background:linear-gradient(180deg,color-mix(in srgb,var(--barber-secondary,#d4a84f) 8%,transparent),transparent 52%)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-item{border-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 20%,transparent)!important;background:color-mix(in srgb,var(--barber-primary,#111) 78%,var(--barber-background,#090909))!important;color:color-mix(in srgb,var(--barber-text,#fff) 76%,var(--barber-secondary,#d4a84f))!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-item span{color:color-mix(in srgb,var(--barber-text,#fff) 82%,var(--barber-secondary,#d4a84f))!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-item.active span{color:var(--barber-text,#fff)!important}
      html[data-studio-business-type] body.public-body,html[data-studio-business-type] body.public-body .public-shell{background:var(--studio-page-background,#090909)!important}
      html[data-studio-business-type] #card.barbershop-card-active{min-height:100dvh!important;background:var(--barber-background,#090909)!important}
    `;
    document.head.appendChild(style);
  }

  function syncPublicType(){
    const card=q('#card');
    let type=String(document.documentElement.dataset.studioBusinessType||card?.dataset.studioBusinessType||'').trim().toLowerCase();
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

    const background=String(data.background_color||'#090909');
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
    let started=performance.now();
    let studioDetected=false;

    const tick=()=>{
      const data=publicCardData();
      const card=q('#card');
      if(data&&card&&publicStudio(data)){
        if(!studioDetected){
          studioDetected=true;
          document.documentElement.classList.add('liw-studio-runtime-pending');
        }
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
