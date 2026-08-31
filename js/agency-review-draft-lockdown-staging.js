/* LIW Cards staging — keep private Agency approval reviews visually accurate but non-live. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_REVIEW_DRAFT_LOCKDOWN__)return;
  window.__LIW_AGENCY_REVIEW_DRAFT_LOCKDOWN__=true;

  function ensureStyles(){
    if(document.getElementById('agency-review-draft-lockdown-style'))return;
    const style=document.createElement('style');
    style.id='agency-review-draft-lockdown-style';
    style.textContent=`
      .agency-review-private-notice{
        display:flex;
        align-items:flex-start;
        gap:9px;
        max-width:520px;
        margin:0 auto 12px;
        padding:10px 12px;
        border:1px solid rgba(212,168,79,.36);
        border-radius:12px;
        background:#fffaf0;
        color:#5f470f;
        font:700 12px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        box-sizing:border-box;
      }
      .agency-review-private-notice svg{flex:0 0 auto;margin-top:1px}
      body.agency-review-card-frame .public-top-actions,
      body.agency-review-card-frame #save,
      body.agency-review-card-frame #lead-section,
      body.agency-review-card-frame #qr-dialog{
        display:none!important;
      }
      body.agency-review-card-frame .agency-review-action-disabled{
        cursor:not-allowed!important;
      }
    `;
    document.head.appendChild(style);
  }

  function makeNotice(){
    if(document.querySelector('.agency-review-private-notice'))return;
    const shell=document.querySelector('.public-shell');
    if(!shell)return;
    const notice=document.createElement('div');
    notice.className='agency-review-private-notice';
    notice.setAttribute('role','note');
    notice.innerHTML='<i data-lucide="lock-keyhole" size="16" aria-hidden="true"></i><span><strong>Private preview — do not distribute.</strong><br>Share, QR, contact, payment, booking and inquiry actions stay disabled until the card is published.</span>';
    shell.prepend(notice);
  }

  function disableElement(element){
    if(!element||element.classList.contains('agency-review-action-disabled'))return;
    element.classList.add('agency-review-action-disabled');
    element.setAttribute('aria-disabled','true');
    element.setAttribute('tabindex','-1');
    if(element.tagName==='A'){
      const href=element.getAttribute('href');
      if(href)element.dataset.reviewOriginalHref=href;
      element.removeAttribute('href');
    }
  }

  function lockReview(){
    const card=document.getElementById('card');
    if(!card||card.hidden)return;

    ensureStyles();
    makeNotice();
    document.body.classList.add('agency-review-card-frame','agency-review-actions-locked');

    ['share-top','qr-top','save'].forEach(id=>{
      const element=document.getElementById(id);
      if(!element)return;
      element.hidden=true;
      element.setAttribute('aria-hidden','true');
      element.setAttribute('tabindex','-1');
    });

    const topActions=card.querySelector('.public-top-actions');
    if(topActions)topActions.hidden=true;

    const lead=document.getElementById('lead-section');
    if(lead){
      lead.hidden=true;
      lead.setAttribute('aria-hidden','true');
    }

    const qrDialog=document.getElementById('qr-dialog');
    if(qrDialog){
      try{if(qrDialog.open)qrDialog.close();}catch(_){ }
      qrDialog.hidden=true;
      qrDialog.setAttribute('aria-hidden','true');
    }

    card.querySelectorAll('a[href]').forEach(link=>{
      const href=String(link.getAttribute('href')||'').trim();
      if(!href)return;
      // Keep internal preview navigation usable, but never allow the draft inquiry jump.
      if(href.startsWith('#')&&href!=='#lead-section')return;
      disableElement(link);
    });

    card.querySelectorAll('button[data-payment-key],button[data-payment-copy]').forEach(disableElement);

    if(!card.dataset.reviewLockWired){
      card.dataset.reviewLockWired='true';
      card.addEventListener('click',event=>{
        const target=event.target instanceof Element?event.target.closest('.agency-review-action-disabled'):null;
        if(!target)return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      },true);
      card.addEventListener('submit',event=>{
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      },true);
    }

    // Do not allow browser install/share affordances to initialize inside a private review.
    document.querySelectorAll('link[rel="manifest"]').forEach(link=>link.remove());
    document.documentElement.classList.remove('card-home-install-ready','card-share-home-active');
    document.documentElement.dataset.agencyReviewLocked='true';

    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  document.addEventListener('liw:agency-review-card-rendered',lockReview);
  window.addEventListener('pageshow',()=>{
    if(document.documentElement.dataset.agencyReviewReady==='true')lockReview();
  });

  if(document.documentElement.dataset.agencyReviewReady==='true')lockReview();
})();
