/* LIW Cards staging — Music-only grid label preference.
   Keeps labels by default. When the artist turns them off in Dressing Room,
   the 3x3 launcher becomes an icon-first app grid with larger icons. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_GRID_LABELS__)return;
  window.__LIW_MUSIC_GRID_LABELS__=true;

  let showLabels=true;
  let loaded=false;

  function cardData(){try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(cardData()?.card_experience||'').toLowerCase()==='music';}

  function apply(){
    if(!isMusic())return false;
    const card=document.querySelector('.music-card-active');
    const launcher=card?.querySelector('.music-luxe-launcher');
    if(!card||!launcher)return false;

    launcher.classList.toggle('music-grid-icon-only',!showLabels);
    card.classList.toggle('music-grid-labels-off',!showLabels);
    launcher.querySelectorAll('.music-luxe-tile').forEach(button=>{
      const text=String(button.querySelector('strong')?.textContent||'').trim();
      if(text)button.setAttribute('aria-label',text);
    });
    return true;
  }

  async function loadPreference(){
    if(loaded)return;
    const data=cardData();
    if(!data||!isMusic()||typeof supabaseClient==='undefined'||!supabaseClient)return;
    loaded=true;
    const slug=String(data.slug||new URLSearchParams(location.search).get('slug')||'').trim();
    if(!slug)return;
    try{
      const {data:settings,error}=await supabaseClient.rpc('public_artist_settings_by_slug',{p_slug:slug});
      if(error)throw error;
      showLabels=settings?.grid_labels!==false;
    }catch(error){
      showLabels=true;
      console.warn('[LIW Music] Grid label preference unavailable:',error);
    }
    apply();
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(!loaded)loadPreference();
    const done=loaded&&apply();
    if((done&&attempts>12)||attempts>100)clearInterval(timer);
  },80);

  const observer=new MutationObserver(()=>{if(loaded)apply();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  loadPreference();
})();