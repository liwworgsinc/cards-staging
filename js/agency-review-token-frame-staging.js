/* LIW Cards — staging-only: replace approval preview with exact token-backed card renderer. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_REVIEW_TOKEN_FRAME__)return;
  window.__LIW_AGENCY_REVIEW_TOKEN_FRAME__=true;

  const token=String(new URLSearchParams(location.search).get('token')||'').trim();
  if(!/^[0-9a-f-]{30,80}$/i.test(token))return;

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    const app=document.getElementById('agency-review-app');
    const target=document.getElementById('agency-review-card');
    if(!app||!target||app.hidden){if(attempts>120)clearInterval(timer);return;}

    const frame=document.createElement('iframe');
    frame.title='Exact private digital card preview';
    frame.loading='eager';
    frame.src=`agency-review-card-frame.html?agency_review_token=${encodeURIComponent(token)}&review_v=20260821-direct-1`;
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads');
    frame.setAttribute('scrolling','yes');

    target.className='agency-review-card agency-review-card-live';
    target.removeAttribute('style');
    target.replaceChildren(frame);

    const state=document.getElementById('agency-review-preview-state');
    if(state)state.textContent='Exact saved card preview';
    clearInterval(timer);
  },80);
})();
