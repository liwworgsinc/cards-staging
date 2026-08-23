/* LIW Cards — STAGING ONLY — Virtual Background plan gate */
(function(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  let accessState='loading';
  let accessContext=null;

  function canUseCustomBackground(access){
    if(!access)return false;
    if(access.isAdmin&&!access.isPlanPreview)return true;
    return ['pro','agency','white_label'].includes(String(access.planKey||'').toLowerCase());
  }

  function injectStyles(){
    if(document.getElementById('liw-vb-plan-gate-style'))return;
    const style=document.createElement('style');
    style.id='liw-vb-plan-gate-style';
    style.textContent=`
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
      @media(max-width:620px){.vb-plan-lock{align-items:flex-start;flex-direction:column}.vb-plan-upgrade{width:100%;justify-content:center}}
    `;
    document.head.appendChild(style);
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

  function setGeneratorStatus(message){
    try{if(typeof setVbStatus==='function')setVbStatus(message,false);}catch(_){/* no-op */}
  }

  function applyGate(){
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
      planNote.textContent=planName?`${planName} includes the generated LIW backgrounds. Upgrade to Pro or Agency to upload your own.`:'Generated LIW backgrounds still work on your current plan.';
    }
    if(window.lucide)lucide.createIcons();
    return true;
  }

  function blockLockedInteraction(event){
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
      if(!user){accessState='locked';applyGate();return;}
      if(typeof getLiwAccessContext!=='function'){accessState='locked';applyGate();return;}
      accessContext=await getLiwAccessContext(user);
      accessState='ready';
      applyGate();
    }catch(error){
      console.warn('Virtual background plan access could not be resolved:',error);
      accessState='locked';
      applyGate();
    }
  }

  function boot(){
    injectStyles();
    applyGate();
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
    setTimeout(applyGate,180);
    setTimeout(applyGate,700);
    setTimeout(applyGate,1500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
