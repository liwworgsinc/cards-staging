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
