/* LIW Cards staging — payment links are available on Lite and above only. */
(function(){
  'use strict';
  if(window.__LIW_PAYMENT_LINK_LITE_GATE__)return;
  window.__LIW_PAYMENT_LINK_LITE_GATE__=true;

  const PAID_PLANS=new Set(['lite','plus','pro','agency','white_label']);

  function editorAccessAllowed(){
    try{
      if(typeof editorAccess==='undefined'||!editorAccess)return null;
      if(editorAccess.isAdmin&&!editorAccess.isPlanPreview)return true;
      const plan=String(editorAccess.planKey||'starter').toLowerCase();
      if(PAID_PLANS.has(plan))return true;
      if(plan==='starter'||plan==='free')return false;
      return editorAccess.has?.('payment_sharing')===true;
    }catch(_){return null;}
  }

  function decorateEditorPaymentLink(){
    const input=document.querySelector('[name="payment_url"]');
    if(!input)return false;
    const allowed=editorAccessAllowed();
    if(allowed===null)return false;

    const card=input.closest('.tool-editor-card');
    if(card){
      card.dataset.entitlementCard='payment_link';
      card.classList.toggle('locked',!allowed);
      let badge=card.querySelector('.entitlement-badge');
      if(!badge){
        badge=document.createElement('span');
        card.querySelector('.tool-editor-head')?.appendChild(badge);
      }
      badge.className=`entitlement-badge ${allowed?'included':'locked'}`;
      badge.dataset.entitlementBadge='payment_link';
      badge.innerHTML=allowed
        ? '<i data-lucide="circle-check" size="14"></i> Included'
        : '<i data-lucide="lock" size="14"></i> Lite+';
    }

    input.disabled=!allowed;
    if(!allowed&&input.value){
      input.value='';
      try{input.dispatchEvent(new Event('input',{bubbles:true}));}catch(_){ }
      try{if(typeof render==='function')render();}catch(_){ }
      try{if(typeof syncBusinessToolsVisibility==='function')syncBusinessToolsVisibility();}catch(_){ }
      try{if(typeof requestImmediateAutosave==='function')requestImmediateAutosave();}catch(_){ }
    }
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function hardenEditorPayload(){
    if(window.__LIW_PAYMENT_LINK_PAYLOAD_HARDENED__)return;
    if(typeof collectCardPayload!=='function')return;
    const original=collectCardPayload;
    collectCardPayload=function(){
      const payload=original.apply(this,arguments);
      if(editorAccessAllowed()===false&&payload)payload.payment_url=null;
      return payload;
    };
    window.__LIW_PAYMENT_LINK_PAYLOAD_HARDENED__=true;
  }

  function publicAccessAllowed(){
    const access=globalThis.publicCardFeatureAccess;
    if(!access||typeof access!=='object')return null;
    if(access.payment_link===true)return true;
    if(access.payment_sharing===true)return true;
    return false;
  }

  function gatePublicPaymentLink(){
    const area=document.getElementById('business-actions');
    if(!area)return false;
    const allowed=publicAccessAllowed();
    const links=area.querySelectorAll('[data-event="payment_click"]');
    links.forEach(link=>{
      if(allowed===true){
        link.hidden=false;
        link.removeAttribute('aria-hidden');
      }else{
        link.hidden=true;
        link.setAttribute('aria-hidden','true');
        if(allowed===false)link.remove();
      }
    });
    return allowed!==null;
  }

  function bootEditor(){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      hardenEditorPayload();
      if(decorateEditorPaymentLink()||attempts>80)clearInterval(timer);
    },150);
  }

  function bootPublic(){
    const area=document.getElementById('business-actions');
    if(!area)return;
    gatePublicPaymentLink();
    new MutationObserver(gatePublicPaymentLink).observe(area,{childList:true,subtree:true});
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      if(gatePublicPaymentLink()||attempts>80)clearInterval(timer);
    },125);
  }

  if(document.querySelector('.editor-page'))bootEditor();
  if(document.getElementById('business-actions'))bootPublic();
})();
