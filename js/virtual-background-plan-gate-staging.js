/* LIW Cards — STAGING ONLY — Virtual Background plan + style gate */
(function(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  let accessState='loading';
  let accessContext=null;
  let originalDrawBase=null;
  let originalDrawBranding=null;

  function isRealAdmin(access){
    return Boolean(access?.isAdmin&&!access?.isPlanPreview);
  }

  function canUsePremiumStyles(access){
    if(!access)return false;
    if(isRealAdmin(access))return true;
    return ['plus','pro','agency','white_label'].includes(String(access.planKey||'').toLowerCase());
  }

  function canUseCustomBackground(access){
    if(!access)return false;
    if(isRealAdmin(access))return true;
    return ['pro','agency','white_label'].includes(String(access.planKey||'').toLowerCase());
  }

  function injectStyles(){
    if(document.getElementById('liw-vb-plan-gate-style'))return;
    const style=document.createElement('style');
    style.id='liw-vb-plan-gate-style';
    style.textContent=`
      .vb-template-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .vb-template{position:relative}
      .vb-template-basic-art{background:linear-gradient(135deg,#07102e 0%,#0b1438 68%,#172249 100%)}
      .vb-template-basic-art:before{background:#d4a84f!important;box-shadow:0 0 0 5px rgba(212,168,79,.15)}
      .vb-template-basic-art:after{background:rgba(255,255,255,.30)!important}
      .vb-style-tier-tag{position:absolute;right:7px;top:7px;z-index:2;display:inline-flex;align-items:center;gap:4px;padding:4px 6px;border-radius:999px;font-size:.58rem;font-weight:900;letter-spacing:.045em;line-height:1}
      .vb-style-tier-tag.free{background:#f7f0df;color:#76591e}
      .vb-style-tier-tag.plus{background:#eef0ff;color:#4546c4}
      .vb-template.is-style-locked{opacity:.58;cursor:not-allowed;filter:saturate(.72)}
      .vb-template.is-style-locked:hover{transform:none;box-shadow:none}
      .vb-template.is-style-locked .vb-template-art:after{content:""}
      [data-liw-vb-custom-background]{position:relative}
      .vb-plan-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:#f7f0df;color:#76591e;font-size:.68rem;font-weight:900;letter-spacing:.035em;white-space:nowrap}
      .vb-plan-lock{display:none;align-items:center;justify-content:space-between;gap:12px;padding:12px 13px;border:1px solid #ead9ad;border-radius:13px;background:#fffaf0}
      .vb-plan-lock.show{display:flex}
      .vb-plan-lock-copy{display:flex;align-items:flex-start;gap:9px;min-width:0}.vb-plan-lock-copy>span:first-child{width:32px;height:32px;flex:0 0 32px;display:grid;place-items:center;border-radius:10px;background:#f7f0df;color:#76591e}
      .vb-plan-lock-copy strong{display:block;color:#344054;font-size:.79rem}.vb-plan-lock-copy small{display:block;margin-top:2px;color:#667085;font-size:.7rem;line-height:1.35}
      .vb-plan-upgrade{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 11px;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;font-size:.72rem;font-weight:900;text-decoration:none;white-space:nowrap;box-shadow:0 7px 16px rgba(11,20,56,.16)}
      .vb-plan-upgrade:hover{transform:translateY(-1px)}
      [data-liw-vb-custom-background].is-plan-locked .vb-custom-drop{opacity:.48;cursor:not-allowed;pointer-events:none;filter:saturate(.65)}
      [data-liw-vb-custom-background].is-plan-locked .vb-custom-meta,[data-liw-vb-custom-background].is-plan-locked .vb-custom-privacy{opacity:.66}
      @media(max-width:760px){.vb-template-grid{grid-template-columns:1fr}}
      @media(max-width:620px){.vb-plan-lock{align-items:flex-start;flex-direction:column}.vb-plan-upgrade{width:100%;justify-content:center}}
    `;
    document.head.appendChild(style);
  }

  function setGeneratorStatus(message,isError=false){
    try{if(typeof setVbStatus==='function')setVbStatus(message,Boolean(isError));}catch(_){/* no-op */}
  }

  function selectTemplate(template){
    try{
      if(typeof virtualBackgroundState==='undefined')return;
      virtualBackgroundState.template=template;
      document.querySelectorAll('[data-vb-template]').forEach(item=>{
        const active=item.dataset.vbTemplate===template;
        item.classList.toggle('active',active);
        item.setAttribute('aria-pressed',active?'true':'false');
      });
      if(typeof renderVirtualBackground==='function')renderVirtualBackground();
    }catch(_){/* no-op */}
  }

  function ensureBasicTemplate(){
    const grid=document.querySelector('.vb-template-grid');
    if(!grid)return null;
    let button=grid.querySelector('[data-vb-template="basic"]');
    if(!button){
      button=document.createElement('button');
      button.className='vb-template';
      button.dataset.vbTemplate='basic';
      button.dataset.vbFreeBasic='true';
      button.type='button';
      button.setAttribute('aria-pressed','false');
      button.innerHTML='<span class="vb-style-tier-tag free">FREE</span><span class="vb-template-art vb-template-basic-art"></span><strong>LIW Basic</strong><small>Clean LIW navy + gold branding</small>';
      grid.insertBefore(button,grid.firstElementChild||null);
      button.addEventListener('click',event=>{
        event.preventDefault();
        selectTemplate('basic');
        setGeneratorStatus('LIW Basic selected — included with every plan.');
      });
    }
    grid.querySelectorAll('[data-vb-template]:not([data-vb-template="basic"])').forEach(item=>{
      if(item.querySelector('.vb-style-tier-tag'))return;
      const tag=document.createElement('span');
      tag.className='vb-style-tier-tag plus';
      tag.innerHTML='<i data-lucide="lock-keyhole" size="9"></i> PLUS';
      item.prepend(tag);
    });
    if(window.lucide)lucide.createIcons();
    return button;
  }

  function customBackgroundActive(){
    return Boolean(document.getElementById('vb-custom-badge')?.classList.contains('show'));
  }

  function drawBasicBase(ctx,width,height,side){
    const right=side==='right';
    const navy='#07102e';
    const navy2='#0b1438';
    const gold='#d4a84f';
    ctx.clearRect(0,0,width,height);
    const base=ctx.createLinearGradient(0,0,width,height);
    base.addColorStop(0,navy);
    base.addColorStop(.64,navy2);
    base.addColorStop(1,'#172249');
    ctx.fillStyle=base;
    ctx.fillRect(0,0,width,height);

    const edge=ctx.createLinearGradient(right?width:0,0,right?width-430:430,0);
    edge.addColorStop(0,'rgba(212,168,79,.17)');
    edge.addColorStop(1,'rgba(212,168,79,0)');
    ctx.fillStyle=edge;
    ctx.fillRect(right?width-430:0,0,430,height);

    ctx.fillStyle='rgba(255,255,255,.025)';
    ctx.beginPath();
    ctx.arc(right?width-80:80,120,270,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(right?width-180:180,height-50,360,0,Math.PI*2);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle='rgba(212,168,79,.72)';
    ctx.lineWidth=4;
    ctx.beginPath();
    if(right){ctx.moveTo(width,92);ctx.lineTo(width-360,0);ctx.moveTo(width,height-86);ctx.lineTo(width-490,height);}else{ctx.moveTo(0,92);ctx.lineTo(360,0);ctx.moveTo(0,height-86);ctx.lineTo(490,height);}
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign=right?'right':'left';
    ctx.fillStyle=gold;
    ctx.font='800 17px Inter, Arial, sans-serif';
    ctx.fillText('LIW DIGITAL CARDS',right?width-72:72,90);
    ctx.fillStyle='rgba(255,255,255,.55)';
    ctx.font='600 13px Inter, Arial, sans-serif';
    ctx.fillText('BUILD · SHARE · GROW · EARN',right?width-72:72,116);
    ctx.restore();
  }

  function patchBasicRendering(){
    if(originalDrawBase||originalDrawBranding)return;
    try{
      if(typeof drawVirtualBackgroundBase==='function'){
        originalDrawBase=drawVirtualBackgroundBase;
        drawVirtualBackgroundBase=function(ctx,width,height,template,accent,side){
          if(template==='basic'&&!customBackgroundActive())return drawBasicBase(ctx,width,height,side);
          return originalDrawBase(ctx,width,height,template,accent,side);
        };
      }
      if(typeof drawVirtualBackgroundBranding==='function'){
        originalDrawBranding=drawVirtualBackgroundBranding;
        drawVirtualBackgroundBranding=function(ctx,width,height,data,accent,template){
          if(template==='basic'&&!customBackgroundActive())return originalDrawBranding(ctx,width,height,data,'#D4A84F',template);
          return originalDrawBranding(ctx,width,height,data,accent,template);
        };
      }
    }catch(_){/* no-op */}
  }

  function ensurePlanUi(){
    const section=document.querySelector('[data-liw-vb-custom-background]');
    if(!section)return null;
    const head=section.querySelector('.vb-section-head');
    if(head&&!head.querySelector('.vb-plan-pill')){
      const pill=document.createElement('span');
      pill.className='vb-plan-pill';
      pill.innerHTML='<i data-lucide="crown" size="13"></i> PRO + AGENCY';
      const activeBadge=head.querySelector('#vb-custom-badge');
      if(activeBadge)head.insertBefore(pill,activeBadge);
      else head.appendChild(pill);
    }
    const upload=section.querySelector('.vb-custom-upload');
    if(upload&&!upload.querySelector('.vb-plan-lock')){
      const lock=document.createElement('div');
      lock.className='vb-plan-lock';
      lock.innerHTML='<div class="vb-plan-lock-copy"><span><i data-lucide="lock-keyhole" size="16"></i></span><span><strong>Custom backgrounds are a Pro + Agency feature</strong><small>Generated LIW backgrounds still work on your current plan.</small></span></div><a class="vb-plan-upgrade" href="pricing.html"><i data-lucide="arrow-up-right" size="14"></i> View plans</a>';
      upload.appendChild(lock);
    }
    if(window.lucide)lucide.createIcons();
    return section;
  }

  function applyCustomGate(){
    const section=ensurePlanUi();
    if(!section)return false;
    const input=document.getElementById('vb-custom-background-input');
    const lock=section.querySelector('.vb-plan-lock');
    const allowed=accessState==='ready'&&canUseCustomBackground(accessContext);
    const loading=accessState==='loading';

    section.classList.toggle('is-plan-locked',!allowed);
    section.dataset.planAccess=loading?'loading':allowed?'allowed':'locked';
    if(input)input.disabled=!allowed;
    if(lock)lock.classList.toggle('show',!allowed&&!loading);

    const planName=String(accessContext?.planName||'').trim();
    const planNote=lock?.querySelector('small');
    if(planNote&&!allowed&&!loading){
      planNote.textContent=planName?`${planName} includes generated LIW backgrounds. Upgrade to Pro or Agency to upload your own.`:'Generated LIW backgrounds still work on your current plan.';
    }
    if(window.lucide)lucide.createIcons();
    return true;
  }

  function applyStyleGate(){
    ensureBasicTemplate();
    const premiumAllowed=accessState==='ready'&&canUsePremiumStyles(accessContext);
    const loading=accessState==='loading';
    document.querySelectorAll('[data-vb-template]:not([data-vb-template="basic"])').forEach(button=>{
      const locked=!premiumAllowed;
      button.classList.toggle('is-style-locked',locked);
      button.setAttribute('aria-disabled',locked?'true':'false');
      if(loading)button.dataset.planAccess='loading';
      else button.dataset.planAccess=locked?'locked':'allowed';
    });
    if(accessState==='ready'&&!premiumAllowed){
      try{
        if(typeof virtualBackgroundState!=='undefined'&&virtualBackgroundState.template!=='basic')selectTemplate('basic');
      }catch(_){/* no-op */}
    }
  }

  function applyAllGates(){
    applyCustomGate();
    applyStyleGate();
  }

  function blockLockedInteraction(event){
    const template=event.target?.closest?.('[data-vb-template]');
    if(template&&template.dataset.vbTemplate!=='basic'){
      const allowed=accessState==='ready'&&canUsePremiumStyles(accessContext);
      if(!allowed){
        event.preventDefault();
        event.stopImmediatePropagation();
        if(accessState==='loading')setGeneratorStatus('Checking your plan access…');
        else setGeneratorStatus('Executive, Studio, and Spotlight are included with Plus, Pro, and Agency plans.');
        return;
      }
    }

    const section=event.target?.closest?.('[data-liw-vb-custom-background]');
    if(!section)return;
    const uploadTarget=event.target.closest?.('#vb-custom-drop,#vb-custom-background-input');
    if(!uploadTarget)return;
    const allowed=accessState==='ready'&&canUseCustomBackground(accessContext);
    if(allowed)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(accessState==='loading')setGeneratorStatus('Checking your plan access…');
    else setGeneratorStatus('Custom background upload is included with Pro and Agency plans.');
  }

  async function resolveAccess(){
    try{
      const {data:{user}}=await supabaseClient.auth.getUser();
      if(!user){accessState='locked';applyAllGates();return;}
      if(typeof getLiwAccessContext!=='function'){accessState='locked';applyAllGates();return;}
      accessContext=await getLiwAccessContext(user);
      accessState='ready';
      applyAllGates();
    }catch(error){
      console.warn('Virtual background plan access could not be resolved:',error);
      accessState='locked';
      applyAllGates();
    }
  }

  function boot(){
    injectStyles();
    ensureBasicTemplate();
    patchBasicRendering();
    applyAllGates();
    document.addEventListener('click',blockLockedInteraction,true);
    document.addEventListener('change',blockLockedInteraction,true);
    document.addEventListener('drop',blockLockedInteraction,true);
    document.addEventListener('dragover',event=>{
      if(accessState==='ready'&&canUseCustomBackground(accessContext))return;
      const section=event.target?.closest?.('[data-liw-vb-custom-background]');
      if(!section)return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },true);
    resolveAccess();
    setTimeout(()=>{ensureBasicTemplate();patchBasicRendering();applyAllGates();},180);
    setTimeout(()=>{ensureBasicTemplate();patchBasicRendering();applyAllGates();},700);
    setTimeout(()=>{ensureBasicTemplate();patchBasicRendering();applyAllGates();},1500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();