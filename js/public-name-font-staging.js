/* LIW Cards staging — render an independently selected cardholder name font. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_NAME_FONT_STAGING__)return;
  window.__LIW_PUBLIC_NAME_FONT_STAGING__=true;

  const slug=new URLSearchParams(location.search).get('slug');
  if(!slug)return;

  const coreFonts=new Set(['dm sans','inter','manrope','georgia','arial']);

  function applyFont(requested){
    const name=document.getElementById('name');
    const card=document.getElementById('card');
    if(!name||!card)return false;

    let font=String(requested||'').trim();
    if(!font)return false;
    const access=globalThis.publicCardFeatureAccess||{};
    if(access.expanded_fonts!==true&&!coreFonts.has(font.toLowerCase())){
      font=card.style.fontFamily||getComputedStyle(card).fontFamily||'DM Sans';
    }
    name.style.setProperty('font-family',font,'important');
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
        return attempts>=40;
      };
      if(mount())return;
      const timer=setInterval(()=>{if(mount())clearInterval(timer);},125);
    }catch(error){
      console.warn('LIW staging name font enhancement unavailable:',error);
    }
  }

  run();
})();
