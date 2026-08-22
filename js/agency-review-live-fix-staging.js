/* LIW Cards — staging review-page live card correction. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_REVIEW_LIVE_FIX__)return;
  window.__LIW_AGENCY_REVIEW_LIVE_FIX__=true;

  const token=new URLSearchParams(location.search).get('token')||'';
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  async function waitForReview(){
    for(let i=0;i<80;i+=1){
      const app=document.getElementById('agency-review-app');
      const card=document.getElementById('agency-review-card');
      if(app&&card&&!app.hidden)return {app,card};
      await sleep(100);
    }
    return null;
  }

  async function loadReviewPayload(){
    if(!window.supabaseClient||!/^[0-9a-f-]{30,80}$/i.test(token))return null;
    const {data,error}=await supabaseClient.functions.invoke('review-agency-card',{body:{token,action:'load'}});
    if(error||data?.error)return null;
    return data||null;
  }

  async function applyExactPublishedPreview(){
    const ready=await waitForReview();
    if(!ready)return;
    const payload=await loadReviewPayload();
    const cardData=payload?.preview?.card||null;
    if(!cardData)return;

    // Published cards can use the exact same public renderer customers see.
    // Private drafts keep the review renderer, but the staging CSS constrains it to card dimensions.
    if(String(cardData.status||'')!=='published'||!cardData.slug){
      ready.card.classList.add('agency-review-card-draft');
      return;
    }

    const frame=document.createElement('iframe');
    frame.title=`Preview of ${cardData.full_name||'digital card'}`;
    frame.loading='eager';
    frame.referrerPolicy='no-referrer';
    frame.src=`card.html?slug=${encodeURIComponent(cardData.slug)}&agency_review=1`;
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-modals');

    ready.card.className='agency-review-card agency-review-card-live';
    ready.card.removeAttribute('style');
    ready.card.replaceChildren(frame);

    const state=document.getElementById('agency-review-preview-state');
    if(state)state.textContent='Exact published card preview';
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyExactPublishedPreview,{once:true});
  else applyExactPublishedPreview();
})();
