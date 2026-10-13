/* LIW Cards staging — safe Super Studio editor preview parity + entitlement gate.
   Replaces the 20261012 main-preview runtime whose broad MutationObserver could
   self-trigger forever while rewriting the Super Studio selector badge. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_MAIN_PREVIEW_PARITY_SAFE__)return;
  window.__LIW_SUPER_STUDIO_MAIN_PREVIEW_PARITY_SAFE__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')&&/\/editor\.html$/i.test(location.pathname)))return;

  const WIDTH=390;
  const HEIGHT=800;
  const EXPERIENCE_SELECTOR='[name="card_experience"]';
  const FRAME_SELECTOR='#phone-preview .liw-public-card-frame';
  const CLEAN_STYLE_ID='liw-super-studio-editor-preview-clean';
  let resizeObserver=null;
  let observedPhone=null;
  let wiredFrame=null;
  let fitQueued=false;

  const q=(selector,root=document)=>root.querySelector(selector);
  const field=name=>q(`[name="${name}"]`);
  const isSuperStudio=()=>String(field('card_experience')?.value||'').trim().toLowerCase()==='super-studio';

  function setStyle(node,name,value){
    if(!node)return;
    if(node.style.getPropertyValue(name)!==value)node.style.setProperty(name,value);
  }

  function removeStyle(node,name){
    if(node?.style?.getPropertyValue(name))node.style.removeProperty(name);
  }

  function resetPreview(shell,target){
    if(target){
      ['width','height','left','top','right','bottom','transform','transform-origin'].forEach(name=>removeStyle(target,name));
      if(target.hasAttribute('data-ss-main-preview-parity'))target.removeAttribute('data-ss-main-preview-parity');
    }
    if(shell){
      removeStyle(shell,'height');
      removeStyle(shell,'--ss-preview-scale');
      if(shell.hasAttribute('data-ss-canonical-preview'))shell.removeAttribute('data-ss-canonical-preview');
    }
  }

  function cleanPreviewChrome(target){
    try{
      const doc=target?.contentDocument;
      if(!doc?.head||doc.getElementById(CLEAN_STYLE_ID))return;
      const style=doc.createElement('style');
      style.id=CLEAN_STYLE_ID;
      style.textContent='.liw-reading-floating,#liw-reading-dialog{display:none!important}';
      doc.head.appendChild(style);
    }catch(_){}
  }

  function fit(){
    fitQueued=false;
    const shell=q('#phone-preview');
    const target=q(FRAME_SELECTOR);
    if(!shell||!target)return false;
    if(!isSuperStudio()){
      resetPreview(shell,target);
      return false;
    }

    const shellWidth=Math.max(1,shell.clientWidth);
    const scale=shellWidth/WIDTH;
    if(!Number.isFinite(scale)||scale<=0)return false;
    const computed=getComputedStyle(shell);
    const borderY=(parseFloat(computed.borderTopWidth)||0)+(parseFloat(computed.borderBottomWidth)||0);
    const height=(HEIGHT*scale+borderY)+'px';

    if(shell.style.height!==height)shell.style.height=height;
    if(target.getAttribute('allow')!=='autoplay; clipboard-write; web-share; fullscreen')target.setAttribute('allow','autoplay; clipboard-write; web-share; fullscreen');
    if(target.dataset.ssMainPreviewParity!=='true')target.dataset.ssMainPreviewParity='true';
    setStyle(target,'left','0px');
    setStyle(target,'top','0px');
    setStyle(target,'right','auto');
    setStyle(target,'bottom','auto');
    setStyle(target,'width',WIDTH+'px');
    setStyle(target,'height',HEIGHT+'px');
    setStyle(target,'transform-origin','top left');
    setStyle(target,'transform',`scale(${scale})`);
    if(shell.dataset.ssCanonicalPreview!=='390x800')shell.dataset.ssCanonicalPreview='390x800';
    setStyle(shell,'--ss-preview-scale',String(scale));
    cleanPreviewChrome(target);
    return true;
  }

  function queueFit(){
    if(fitQueued)return;
    fitQueued=true;
    requestAnimationFrame(fit);
  }

  function wirePreview(){
    const shell=q('#phone-preview');
    const target=q(FRAME_SELECTOR);
    if(shell&&observedPhone!==shell){
      try{resizeObserver?.disconnect();}catch(_){}
      observedPhone=shell;
      if('ResizeObserver' in window){
        resizeObserver=new ResizeObserver(queueFit);
        resizeObserver.observe(shell);
      }
    }
    if(target&&wiredFrame!==target){
      if(wiredFrame)wiredFrame.removeEventListener('load',queueFit);
      wiredFrame=target;
      wiredFrame.addEventListener('load',queueFit,{passive:true});
    }
    queueFit();
  }

  const previewObserver=new MutationObserver(records=>{
    const relevant=records.some(record=>Array.from(record.addedNodes||[]).some(node=>node?.nodeType===1&&(
      node.matches?.('#phone-preview,.liw-public-card-frame')||node.querySelector?.('#phone-preview,.liw-public-card-frame')
    )));
    if(relevant)wirePreview();
  });
  previewObserver.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('liw:editor-card-hydrated',wirePreview);
  document.addEventListener('change',event=>{if(event.target?.matches?.(EXPERIENCE_SELECTOR))wirePreview();});
  document.addEventListener('input',event=>{if(event.target?.matches?.(EXPERIENCE_SELECTOR))wirePreview();});
  window.addEventListener('resize',queueFit,{passive:true});
  window.addEventListener('pageshow',wirePreview,{passive:true});
  window.LIWSuperStudioMainPreviewParity={fit:queueFit,canonicalWidth:WIDTH,canonicalHeight:HEIGHT};
  wirePreview();

  const FULL_ACCESS_PLANS=new Set(['plus','pro','agency','agency_starter','agency_pro','agency_s','agency_p']);
  let previewRequested=false;
  let wrappedEditorApi=false;
  let accessQueued=false;

  function normalizePlan(value){return String(value||'free').trim().toLowerCase().replace(/[\s-]+/g,'_');}
  function accessContext(){try{return typeof editorAccess!=='undefined'?editorAccess:null;}catch(_){return null;}}
  function currentPlanKey(){
    const access=accessContext();
    try{return normalizePlan(access?.planKey||(typeof currentPlan!=='undefined'?currentPlan:'free'));}catch(_){return 'free';}
  }
  function canUseSuperStudio(){
    const access=accessContext();
    if(access?.isAdmin&&!access?.isPlanPreview)return true;
    try{if(access?.has?.('super_studio_experience'))return true;}catch(_){}
    return FULL_ACCESS_PLANS.has(currentPlanKey());
  }

  function ensureStyles(){
    if(q('#liw-super-studio-entitlement-style'))return;
    const style=document.createElement('style');
    style.id='liw-super-studio-entitlement-style';
    style.textContent=`
      .card-experience-option.super-studio-option.ss-preview-only{border-style:dashed!important;position:relative}
      .card-experience-option.super-studio-option.ss-preview-only .super-studio-new{background:#5b46d8!important;color:#fff!important}
      .ss-plan-lock{display:none;margin-top:14px;padding:14px 15px;border:1px solid #e4ddff;border-radius:16px;background:linear-gradient(135deg,#faf8ff,#fff);box-shadow:0 8px 24px rgba(31,41,55,.05);grid-template-columns:1fr auto;gap:14px;align-items:center}
      .ss-plan-lock.is-visible{display:grid}.ss-plan-lock strong{display:block;color:#111827;font-size:.8rem}.ss-plan-lock span{display:block;margin-top:4px;color:#667085;font-size:.68rem;line-height:1.45}.ss-plan-lock a{white-space:nowrap}
      .super-studio-control-center.ss-entitlement-readonly{opacity:.62;position:relative}.super-studio-control-center.ss-entitlement-readonly:after{content:'Preview only — upgrade to edit or publish Super Studio';position:absolute;inset:0;z-index:20;display:grid;place-items:start center;padding-top:24px;background:rgba(255,255,255,.72);backdrop-filter:blur(1px);color:#352a67;font-size:.72rem;font-weight:950;text-align:center;pointer-events:auto}
      .ss-entitlement-dialog{border:0;padding:0;background:transparent;max-width:none;max-height:none;width:100vw;height:100vh}.ss-entitlement-dialog::backdrop{background:rgba(7,10,18,.76);backdrop-filter:blur(8px)}
      .ss-entitlement-shell{width:min(96vw,470px);max-height:94vh;margin:3vh auto;background:#f5f6f8;border-radius:28px;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.38);display:grid;grid-template-rows:auto minmax(0,1fr) auto}
      .ss-entitlement-head{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:14px 16px;background:#111827;color:#fff}.ss-entitlement-head span{display:block;color:#e6c98c;font-size:.56rem;font-weight:950;letter-spacing:.11em}.ss-entitlement-head h3{margin:2px 0 0;font-size:.95rem}.ss-entitlement-close{width:36px;height:36px;border:1px solid rgba(255,255,255,.17);border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:1.2rem;cursor:pointer}
      .ss-entitlement-preview-wrap{overflow:auto;padding:14px}.ss-entitlement-preview-card{width:min(100%,390px);margin:0 auto;border-radius:26px;overflow:hidden;background:#fff;box-shadow:0 14px 42px rgba(15,23,42,.16)}.ss-entitlement-preview-card .super-studio-experience{min-height:760px}.ss-entitlement-preview-card .super-studio-experience a,.ss-entitlement-preview-card .super-studio-experience button{pointer-events:none}
      .ss-entitlement-foot{display:grid;gap:9px;padding:14px 16px;background:#fff;border-top:1px solid #e5e7eb}.ss-entitlement-foot strong{font-size:.76rem;color:#111827}.ss-entitlement-foot span{font-size:.66rem;color:#667085;line-height:1.45}.ss-entitlement-foot-actions{display:flex;gap:8px;flex-wrap:wrap}.ss-entitlement-foot-actions a{flex:1;text-align:center;min-width:150px}
      @media(max-width:620px){.ss-plan-lock.is-visible{grid-template-columns:1fr}.ss-plan-lock a{justify-self:start}.ss-entitlement-shell{width:100vw;height:100vh;max-height:none;margin:0;border-radius:0}.ss-entitlement-preview-wrap{padding:10px}}
    `;
    document.head.appendChild(style);
  }

  function ensurePlanLock(){
    const section=q('#card-experience-section');
    if(!section)return null;
    let lock=q('#super-studio-plan-lock');
    if(lock)return lock;
    lock=document.createElement('div');
    lock.id='super-studio-plan-lock';
    lock.className='ss-plan-lock';
    lock.innerHTML='<div><strong>Super Studio unlocks on Plus, Pro, Agency Starter and Agency Pro</strong><span>Free and Lite can preview the full experience before upgrading. Preview mode never changes or publishes your card.</span></div><a class="btn btn-primary btn-sm" href="pricing.html#plan-plus">View plans</a>';
    section.insertAdjacentElement('afterend',lock);
    return lock;
  }

  function editorCard(){
    const value=(name,fallback='')=>String(field(name)?.value??fallback);
    return {full_name:value('full_name','Your Name')||'Your Name',company_name:value('company_name','Your Studio')||'Your Studio',job_title:value('job_title','Hair Stylist')||'Hair Stylist',biography:value('biography',''),phone:value('phone',''),sms_phone:value('sms_phone',''),email:value('email',''),website:value('website',''),business_address:value('business_address',''),profile_image_url:value('profile_image_url',''),cover_image_url:value('cover_image_url',''),primary_color:value('primary_color','#111827'),secondary_color:value('secondary_color','#c89245'),background_color:value('background_color','#fff'),text_color:value('text_color','#171821'),products_enabled:false};
  }

  function samplePreview(){
    const SS=window.LIWSuperStudio;
    if(!SS)return '<div style="padding:30px;font:600 14px system-ui">Super Studio preview is loading…</div>';
    let profession=q('[data-ss-path="studioProfession"]')?.value||'hair-stylist';
    if(!SS.PROFESSIONS?.[profession]||profession==='barber')profession='hair-stylist';
    const names=(SS.starterServices?.(profession)||[]).slice(0,3);
    const categories=SS.starterCategories?.(profession)||[];
    const services=names.map((name,index)=>({name,description:index===0?'Popular client service with simple mobile booking.':'',price_cents:[8500,12000,6500][index]||7500,image_url:''}));
    const state=SS.normalize?.({studioProfession:profession,serviceMeta:names.map((name,index)=>({serviceName:name,category:categories[index%Math.max(1,categories.length)]||'Service',priceType:'starting',duration:String([60,90,45][index]||60),bookingAvailable:true,active:true,depositType:'none',depositValue:''})),reviews:{items:[{id:'preview-review',name:'Happy Client',quote:'Professional, easy to book, and I knew exactly where to find everything.'}],seeUrl:'',leaveUrl:''},specials:[{id:'preview-offer',title:'New Client Welcome',description:'A sample offer area for your studio.',promoCode:'',expiresAt:'',imageUrl:''}]})||{studioProfession:profession};
    return SS.renderExperience?.({card:editorCard(),state,services,socials:[],products:[],preview:true})||'<div style="padding:30px">Super Studio preview is loading…</div>';
  }

  function previewDialog(){
    let dialog=q('#super-studio-entitlement-preview');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='super-studio-entitlement-preview';
    dialog.className='ss-entitlement-dialog';
    dialog.innerHTML='<div class="ss-entitlement-shell"><header class="ss-entitlement-head"><div><span>PREVIEW MODE</span><h3>Super Studio</h3></div><button class="ss-entitlement-close" type="button" data-ss-entitlement-close aria-label="Close preview">×</button></header><div class="ss-entitlement-preview-wrap"><div class="ss-entitlement-preview-card" data-ss-entitlement-preview-card></div></div><footer class="ss-entitlement-foot"><strong>This preview does not activate Super Studio on your card.</strong><span>Upgrade to Plus, Pro, Agency Starter or Agency Pro to select, edit and publish this experience.</span><div class="ss-entitlement-foot-actions"><button class="btn btn-light" type="button" data-ss-entitlement-close>Keep current experience</button><a class="btn btn-primary" href="pricing.html#plan-plus">Upgrade to unlock</a></div></footer></div>';
    document.body.appendChild(dialog);
    dialog.addEventListener('click',event=>{
      if(event.target===dialog||event.target.closest?.('[data-ss-entitlement-close]')){event.preventDefault();dialog.close?.();return;}
      if(event.target.closest?.('.super-studio-experience')){event.preventDefault();event.stopPropagation();}
    });
    return dialog;
  }

  function openRestrictedPreview(){
    previewRequested=true;
    syncAccessUi();
    const dialog=previewDialog();
    const host=q('[data-ss-entitlement-preview-card]',dialog);
    if(host)host.innerHTML=samplePreview();
    if(window.lucide)try{lucide.createIcons({nodes:[dialog]});}catch(_){try{lucide.createIcons();}catch(__){}}
    if(typeof dialog.showModal==='function'){if(!dialog.open)dialog.showModal();}else dialog.setAttribute('open','');
  }

  function syncAccessUi(){
    ensureStyles();
    const allowed=canUseSuperStudio();
    const button=q('[data-card-experience="super-studio"]');
    const badge=button?.querySelector('.super-studio-new');
    if(button){
      button.classList.toggle('ss-preview-only',!allowed);
      button.classList.toggle('locked',!allowed);
      const label=allowed?'Select Super Studio':'Preview Super Studio — upgrade required to use it';
      const title=allowed?'Use Super Studio':'Preview Super Studio — Plus, Pro, Agency Starter or Agency Pro required to use it';
      if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
      if(button.getAttribute('title')!==title)button.setAttribute('title',title);
      const badgeText=allowed?'NEW':'PREVIEW';
      if(badge&&badge.textContent!==badgeText)badge.textContent=badgeText;
    }
    const lock=ensurePlanLock();
    if(lock)lock.classList.toggle('is-visible',!allowed&&(previewRequested||isSuperStudio()));
    const center=q('#super-studio-control-center');
    if(center){
      const readOnly=!allowed&&isSuperStudio();
      center.classList.toggle('ss-entitlement-readonly',readOnly);
      if(readOnly){if(!center.hasAttribute('inert'))center.setAttribute('inert','');if(center.getAttribute('aria-disabled')!=='true')center.setAttribute('aria-disabled','true');}
      else{if(center.hasAttribute('inert'))center.removeAttribute('inert');if(center.hasAttribute('aria-disabled'))center.removeAttribute('aria-disabled');}
    }
  }

  function queueAccessSync(){
    if(accessQueued)return;
    accessQueued=true;
    requestAnimationFrame(()=>{accessQueued=false;wrapEditorApi();syncAccessUi();});
  }

  function publishLike(target){
    const control=target?.closest?.('button,a,[role="button"]');
    if(!control)return false;
    const signature=`${control.id||''} ${control.className||''} ${control.getAttribute?.('data-action')||''} ${control.getAttribute?.('data-editor-action')||''} ${control.textContent||''}`.toLowerCase();
    return /\bpublish\b/.test(signature)||/publish[-_ ]?(card|changes|now)?/.test(signature);
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-card-experience="super-studio"]');
    if(button&&!canUseSuperStudio()){
      event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();
      openRestrictedPreview();
      try{if(typeof toast==='function')toast('Super Studio preview — upgrade to Plus, Pro, Agency Starter or Agency Pro to use it.');}catch(_){}
      return;
    }
    if(!canUseSuperStudio()&&isSuperStudio()&&publishLike(event.target)){
      event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();
      previewRequested=true;syncAccessUi();
      try{if(typeof toast==='function')toast('Upgrade to Plus, Pro, Agency Starter or Agency Pro to publish Super Studio.');}catch(_){}
    }
  },true);

  function wrapEditorApi(){
    const api=window.LIWSuperStudioEditor;
    if(!api||wrappedEditorApi)return;
    wrappedEditorApi=true;
    if(typeof api.activate==='function'){
      const activate=api.activate.bind(api);
      api.activate=function(){if(canUseSuperStudio())return activate(...arguments);openRestrictedPreview();return false;};
    }
    if(typeof api.save==='function'){
      const save=api.save.bind(api);
      api.save=function(){if(canUseSuperStudio())return save(...arguments);syncAccessUi();return Promise.resolve(false);};
    }
  }

  const accessObserver=new MutationObserver(records=>{
    const relevant=records.some(record=>Array.from(record.addedNodes||[]).some(node=>node?.nodeType===1&&(
      node.matches?.('[data-card-experience="super-studio"],#card-experience-section,#super-studio-control-center')||
      node.querySelector?.('[data-card-experience="super-studio"],#card-experience-section,#super-studio-control-center')
    )));
    if(relevant)queueAccessSync();
  });
  accessObserver.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('liw:editor-card-hydrated',()=>{previewRequested=false;queueAccessSync();});
  document.addEventListener('change',event=>{if(event.target?.matches?.(EXPERIENCE_SELECTOR)){previewRequested=false;queueAccessSync();}});
  document.addEventListener('input',event=>{if(event.target?.matches?.(EXPERIENCE_SELECTOR))queueAccessSync();});
  window.addEventListener('pageshow',queueAccessSync,{passive:true});
  queueAccessSync();
})();
