/* LIW Cards staging — render an independently selected cardholder name font. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_NAME_FONT_STAGING__)return;
  window.__LIW_PUBLIC_NAME_FONT_STAGING__=true;

  if(!document.querySelector('link[data-liw-name-font-library]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/card-fonts-staging.css?v=20260830-name-library-2';
    link.dataset.liwNameFontLibrary='true';
    document.head.appendChild(link);
  }

  /* Keep the newest Flow identity rules and avatar-follow helper on both the
     public staging card and the private staging preview. */
  if(!document.querySelector('link[data-liw-flow-identity-follow]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/flow-identity-premium-staging.css?v=20260830-flow-id-5';
    link.dataset.liwFlowIdentityFollow='true';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-liw-flow-identity-follow]')){
    const script=document.createElement('script');
    script.src='js/flow-identity-follow-avatar-staging.js?v=20260830-flow-follow-1';
    script.defer=true;
    script.dataset.liwFlowIdentityFollow='true';
    document.body.appendChild(script);
  }

  const slug=new URLSearchParams(location.search).get('slug');
  if(!slug)return;

  const coreFonts=new Set(['dm sans','inter','manrope','georgia','arial']);
  const scriptFonts=new Set(['great vibes','dancing script','allura','parisienne','sacramento','satisfy','caveat','kaushan script','lobster two']);

  function applyFont(requested){
    const name=document.getElementById('name');
    const card=document.getElementById('card');
    if(!name||!card)return false;

    let font=String(requested||'').trim();
    if(!font)return true;

    const isCore=coreFonts.has(font.toLowerCase());
    const access=globalThis.publicCardFeatureAccess;
    if(!isCore&&(!access||typeof access.expanded_fonts==='undefined'))return false;
    if(!isCore&&access.expanded_fonts!==true){
      font=card.style.fontFamily||getComputedStyle(card).fontFamily||'DM Sans';
    }

    name.style.setProperty('font-family',font,'important');
    if(scriptFonts.has(font.toLowerCase()))name.style.setProperty('font-weight','400','important');
    else name.style.removeProperty('font-weight');
    return true;
  }

  async function run(){
    if(typeof supabaseClient==='undefined'||!supabaseClient)return;
    try{
      const {data,error}=await supabaseClient.rpc('public_card_name_font_by_slug',{p_slug:slug});
      if(error||!data)return;
      let attempts=0;
      const mount=()=>{
        attempts+=1;
        const applied=applyFont(data);
        const card=document.getElementById('card');
        if(applied&&card&&!card.hidden)return true;
        return attempts>=48;
      };
      if(mount())return;
      const timer=setInterval(()=>{if(mount())clearInterval(timer);},125);
    }catch(error){
      console.warn('LIW staging name font enhancement unavailable:',error);
    }
  }

  run();
})();

/* Staging-only inquiry routing: keep the Agency lead record with the workspace while
   delivering one Resend notification to the assigned Agency client. */
(function loadLeadRouting(){
  if(window.__LIW_PUBLIC_LEAD_ROUTING_LOADER__)return;
  window.__LIW_PUBLIC_LEAD_ROUTING_LOADER__=true;
  const script=document.createElement('script');
  script.src='js/public-lead-routing-staging.js?v=20260830-agency-client-routing-1';
  script.defer=true;
  document.head.appendChild(script);
})();

/* Staging public cards: payment links are Lite+ only. */
(function loadPaymentLinkLiteGate(){
  if(window.__LIW_PAYMENT_LINK_LITE_GATE_LOADER__)return;
  window.__LIW_PAYMENT_LINK_LITE_GATE_LOADER__=true;
  const script=document.createElement('script');
  script.src='js/payment-link-lite-gate-staging.js?v=20260830-lite-paylink-1';
  script.defer=true;
  document.head.appendChild(script);
})();

/* Staging-only Music experience bootstrap. The assets are inert unless
   card_experience === "music", so Classic and Flow keep their current DOM paths. */
(function loadMusicExperience(){
  if(window.__LIW_MUSIC_EXPERIENCE_LOADER__)return;
  window.__LIW_MUSIC_EXPERIENCE_LOADER__=true;

  if(!document.querySelector('link[data-liw-music-experience]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/music-theme-staging.css?v=20260904-dressing-room-1';
    link.dataset.liwMusicExperience='true';
    document.head.appendChild(link);
  }

  if(!document.querySelector('link[data-liw-music-home-fit]')){
    const fit=document.createElement('link');
    fit.rel='stylesheet';
    fit.href='css/music-home-fit-staging.css?v=20260904-home-fit-2';
    fit.dataset.liwMusicHomeFit='true';
    document.head.appendChild(fit);
  }

  if(!document.querySelector('link[data-liw-music-template-inherit]')){
    const templateStyle=document.createElement('link');
    templateStyle.rel='stylesheet';
    templateStyle.href='css/music-template-inherit-staging.css?v=20260904-template-inherit-1';
    templateStyle.dataset.liwMusicTemplateInherit='true';
    document.head.appendChild(templateStyle);
  }

  if(!document.querySelector('script[data-liw-music-experience]')){
    const script=document.createElement('script');
    script.src='js/public-music-card-staging.js?v=20260904-dressing-room-1';
    script.defer=true;
    script.dataset.liwMusicExperience='true';
    document.body.appendChild(script);
  }

  if(!document.querySelector('script[data-liw-music-template-inherit]')){
    const templateScript=document.createElement('script');
    templateScript.src='js/public-music-template-inherit-staging.js?v=20260904-template-inherit-1';
    templateScript.defer=true;
    templateScript.dataset.liwMusicTemplateInherit='true';
    document.body.appendChild(templateScript);
  }

  /* Free Music cards reserve the bottom slot for a Super Admin-controlled
     campaign. Lite and above remain ad-free. */
  if(!document.querySelector('link[data-liw-music-plan-ads]')){
    const adStyle=document.createElement('link');
    adStyle.rel='stylesheet';
    adStyle.href='css/music-plan-ads-staging.css?v=20260904-free-ads-3';
    adStyle.dataset.liwMusicPlanAds='true';
    document.head.appendChild(adStyle);
  }

  if(!document.querySelector('script[data-liw-music-free-ad]')){
    const adScript=document.createElement('script');
    adScript.src='js/public-music-free-ad-staging.js?v=20260904-free-ads-3';
    adScript.defer=true;
    adScript.dataset.liwMusicFreeAd='true';
    document.body.appendChild(adScript);
  }

  /* Music-only grid style preference from Artist Dressing Room. */
  if(!document.querySelector('link[data-liw-music-grid-labels]')){
    const gridStyle=document.createElement('link');
    gridStyle.rel='stylesheet';
    gridStyle.href='css/music-grid-labels-staging.css?v=20260904-grid-labels-3';
    gridStyle.dataset.liwMusicGridLabels='true';
    document.head.appendChild(gridStyle);
  }

  if(!document.querySelector('script[data-liw-music-grid-labels]')){
    const gridScript=document.createElement('script');
    gridScript.src='js/public-music-grid-labels-staging.js?v=20260904-grid-labels-1';
    gridScript.defer=true;
    gridScript.dataset.liwMusicGridLabels='true';
    document.body.appendChild(gridScript);
  }

  /* Final Music home composition: pair Inner Circle + Upcoming Show, enlarge
     the Free promo card, and reveal after the plan-aware geometry settles. */
  if(!document.querySelector('link[data-liw-music-home-polish]')){
    const polishStyle=document.createElement('link');
    polishStyle.rel='stylesheet';
    polishStyle.href='css/music-home-polish-staging.css?v=20260904-home-polish-1';
    polishStyle.dataset.liwMusicHomePolish='true';
    document.head.appendChild(polishStyle);
  }

  /* Music-only artist identity: large portrait overlaps the cover; stage name +
     genre/location stay aligned beside it. */
  if(!document.querySelector('link[data-liw-music-identity-row]')){
    const identityStyle=document.createElement('link');
    identityStyle.rel='stylesheet';
    identityStyle.href='css/music-identity-row-staging.css?v=20260904-identity-row-3';
    identityStyle.dataset.liwMusicIdentityRow='true';
    document.head.appendChild(identityStyle);
  }

  if(!document.querySelector('script[data-liw-music-home-polish]')){
    const polishScript=document.createElement('script');
    polishScript.src='js/public-music-home-polish-staging.js?v=20260904-home-polish-2';
    polishScript.defer=true;
    polishScript.dataset.liwMusicHomePolish='true';
    document.body.appendChild(polishScript);
  }
})();