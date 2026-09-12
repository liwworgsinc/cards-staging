/* LIW Cards staging — Showtime section ownership guard.
   Showtime owns a fixed fan-first home. Generic business modules remain source-only
   and must never spill into the public home stack. Event-driven only. */
(function(){
  'use strict';
  if(window.__LIW_SHOWTIME_SECTION_OWNERSHIP__)return;
  window.__LIW_SHOWTIME_SECTION_OWNERSHIP__=true;

  function data(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isShowtime(){
    const card=document.getElementById('card');
    return String(data()?.card_experience||'').toLowerCase()==='music'||Boolean(card?.classList.contains('music-card-active'));
  }

  function installGuard(){
    if(document.getElementById('liw-showtime-section-ownership-style'))return;
    const style=document.createElement('style');
    style.id='liw-showtime-section-ownership-style';
    style.textContent=`
      #card.music-card-active #booking-v1-section,
      #card.music-card-active #public-rich-sections,
      #card.music-card-active .public-content > .public-rich-section{
        display:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function parkKnownSources(){
    if(!isShowtime())return false;
    const card=document.getElementById('card');
    const parking=card?.querySelector('.music-section-parking');
    if(!parking)return false;
    ['booking-v1-section','public-rich-sections'].forEach(id=>{
      const node=document.getElementById(id);
      if(node&&node.parentElement!==parking&&card.contains(node))parking.appendChild(node);
    });
    return true;
  }

  function roomTrigger(node){
    return node?.closest?.('.music-luxe-tile,.music-primary-cta,.music-release-card,.music-upcoming-show,.music-inner-circle button');
  }

  installGuard();

  /* Existing Showtime click handlers run on the target before this document-level
     bubble listener. By the time this fires, the requested room is already open. */
  document.addEventListener('click',event=>{
    if(!isShowtime())return;
    const trigger=roomTrigger(event.target);
    if(!trigger||!trigger.closest('#card.music-card-active'))return;
    parkKnownSources();
    try{window.dispatchEvent(new CustomEvent('liw:showtime-room-open',{detail:{label:String(trigger.textContent||'').trim().slice(0,80)}}));}catch(_){ }
  });

  window.addEventListener('liw:card-loader-ready',()=>{
    if(!isShowtime())return;
    parkKnownSources();
  },{passive:true});

  window.addEventListener('pageshow',()=>{
    if(!isShowtime())return;
    parkKnownSources();
  },{once:true,passive:true});
})();