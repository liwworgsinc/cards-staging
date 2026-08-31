/* LIW Cards — staging-only deterministic Agency review renderer.
   Review token -> private payload -> the same renderCard() used by card.html.
   No public-card lookup, no fake auth user, no status spoofing. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_REVIEW_DIRECT_RENDER__)return;
  window.__LIW_AGENCY_REVIEW_DIRECT_RENDER__=true;

  const params=new URLSearchParams(location.search);
  const token=String(params.get('agency_review_token')||'').trim();
  if(!/^[0-9a-f-]{30,80}$/i.test(token))return;

  function reviewFeatureAccess(payload){
    const whiteLabel=Boolean(payload?.branding?.whiteLabel);
    return {
      video_section:true,
      file_downloads:true,
      custom_qr:true,
      custom_seo:true,
      cover_image:true,
      expanded_fonts:true,
      remove_branding:true,
      custom_branding_link:whiteLabel,
      appointment_booking:true,
      lead_capture:true,
      product_showcase:true,
      services_section:true,
      payment_sharing:true,
      rich_sections:true,
      flow_experience:true,
      profile_border_color:true,
      premium_templates:true,
      template_is_premium:false,
      product_limit:24,
      download_limit:24
    };
  }

  function installReviewSections(rows){
    const sections=Array.isArray(rows)?rows:[];
    const originalFrom=supabaseClient.from.bind(supabaseClient);
    supabaseClient.from=function(table){
      if(table!=='card_sections')return originalFrom(table);
      const builder={
        select(){return builder;},
        eq(){return builder;},
        neq(){return builder;},
        is(){return builder;},
        in(){return builder;},
        order(){return builder;},
        limit(){return builder;},
        range(){return builder;},
        then(resolve,reject){
          return Promise.resolve({data:sections,error:null}).then(resolve,reject);
        }
      };
      return builder;
    };
  }

  function applySavedNameFont(card){
    const name=document.getElementById('name');
    const font=String(card?.name_font_family||'').trim();
    if(!name||!font)return;
    name.style.setProperty('font-family',font,'important');
    const scriptFonts=new Set(['great vibes','dancing script','allura','parisienne','sacramento','satisfy','caveat','kaushan script','lobster two']);
    if(scriptFonts.has(font.toLowerCase()))name.style.setProperty('font-weight','400','important');
    else name.style.removeProperty('font-weight');
  }

  function reviewErrorMessage(error){
    return error?.message||'This private card review could not be loaded.';
  }

  async function loadReviewPayload(){
    const {data,error}=await supabaseClient.functions.invoke('review-agency-card',{body:{token,action:'load'}});
    if(error){
      let message=error.message||'Unable to load private review.';
      try{
        const body=await error.context?.json?.();
        if(body?.error)message=body.error;
      }catch(_){ }
      throw new Error(message);
    }
    if(data?.error)throw new Error(data.error);
    return data;
  }

  async function boot(){
    try{
      // public-card.js is loaded first only to provide the exact renderer used by the
      // shareable card. This frame has no public slug, so the review token is the only
      // authority allowed to load the draft card data.
      if(typeof renderCard!=='function')throw new Error('Card renderer did not initialize.');

      const payload=await loadReviewPayload();
      const preview=payload?.preview||{};
      const card=preview.card&&typeof preview.card==='object'?preview.card:null;
      if(!card?.id)throw new Error('The saved card for this review is unavailable.');

      const featureAccess=reviewFeatureAccess(payload);
      const links=Array.isArray(preview.socialLinks)?preview.socialLinks:[];
      const services=Array.isArray(preview.services)?preview.services:[];
      const products=Array.isArray(preview.products)?preview.products:[];
      const downloads=Array.isArray(preview.downloads)?preview.downloads:[];

      // These are top-level lexical globals created by public-card.js. Setting them
      // keeps every downstream LIW renderer (Flow, rich sections, etc.) on the same
      // token-authorized saved card state without recording analytics for the review.
      publicCard=card;
      ownerPreview=true;
      globalThis.publicCardFeatureAccess=featureAccess;
      globalThis.__LIW_AGENCY_REVIEW_MODE__=true;
      globalThis.__LIW_AGENCY_REVIEW_PAYLOAD__=payload;

      // rich-sections.js normally reads its own table. In a private draft review,
      // serve only the token-authorized sections returned by review-agency-card.
      installReviewSections(preview.sections);

      renderCard(card,links,services,products,downloads,true,featureAccess);
      applySavedNameFont(card);

      const banner=document.getElementById('preview-banner');
      if(banner)banner.hidden=true;
      document.body.classList.add('agency-review-card-frame');
      document.documentElement.dataset.agencyReviewReady='true';
      document.dispatchEvent(new CustomEvent('liw:agency-review-card-rendered',{detail:{cardId:card.id}}));

      // A review should look and behave like the saved card, but must not submit
      // live lead forms. renderCard(..., true) already disables lead submission.
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }catch(error){
      console.error('LIW Agency private review render failed:',error);
      if(typeof showUnavailable==='function'){
        showUnavailable('Review unavailable',reviewErrorMessage(error));
      }
      document.documentElement.dataset.agencyReviewError='true';
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
