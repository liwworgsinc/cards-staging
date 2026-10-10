/* LIW Cards staging — Studio render handshake.
   Keeps the public Studio identity synchronized while the async Studio profile resolves.
   The Barbershop engine still owns the underlying rooms; this module only coordinates
   the canonical Studio type/profile with the final Studio renderers. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_ADAPTER_RENDER_HANDSHAKE__)return;
  window.__LIW_STUDIO_ADAPTER_RENDER_HANDSHAKE__=true;

  const MAX_WAIT_MS=12000;
  const TICK_MS=100;
  const started=Date.now();
  let timer=0;
  let loaderSignaled=false;
  let lastProfileSignature='';

  function cardData(){
    try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}
  }

  function isStudio(data){
    const mode=String(data?.color_mode||'').trim().toLowerCase();
    const experience=String(data?.card_experience||'classic').trim().toLowerCase();
    return experience==='barbershop'||(mode==='barbershop'&&experience!=='music');
  }

  function currentProfile(){
    try{return window.LIWStudioPublicV2?.profile||null;}catch(_){return null;}
  }

  function profileSignature(profile){
    if(!profile)return '';
    const primary=String(profile.primary_type||'').trim().toLowerCase();
    const specialties=Array.isArray(profile.specialties)?profile.specialties.map(v=>String(v||'').trim().toLowerCase()).filter(Boolean):[];
    return [primary,specialties.join(','),String(profile.custom_specialty||'').trim()].join('|');
  }

  function applyCanonicalProfile(profile){
    if(!profile)return false;
    const primary=String(profile.primary_type||'').trim().toLowerCase();
    if(!primary)return false;

    const root=document.documentElement;
    const body=document.body;
    const card=document.getElementById('card');
    root.dataset.studioBusinessType=primary;
    if(body)body.dataset.studioBusinessType=primary;
    if(card)card.dataset.studioBusinessType=primary;

    const badge=card?.querySelector?.('.studio-public-industry');
    if(badge){
      const icon=badge.querySelector('span:first-child');
      const label=badge.querySelector('span:last-child');
      if(icon)icon.textContent=primary==='barber'?'✂':'✦';
      const labels={
        barber:'Barber',hair:'Hair Stylist',braider:'Braider',loctician:'Loctician',wig:'Wig / Install Specialist',
        nails:'Nail Tech',lashes:'Lash Artist',brows:'Brow Artist',makeup:'Makeup Artist',esthetician:'Esthetician',
        wax:'Wax Specialist',massage:'Massage Therapist',spa:'Spa / Wellness',spraytan:'Spray Tan Artist',
        pmu:'Permanent Makeup Artist',tattoo:'Tattoo Artist',piercing:'Piercer',toothgem:'Tooth Gem Artist',
        cosmetics:'Beauty / Cosmetics',salon:'Salon / Multi-Service Studio',other:'Studio Professional'
      };
      if(label)label.textContent=primary==='other'&&profile.custom_specialty?String(profile.custom_specialty):labels[primary]||'Studio Professional';
    }
    return true;
  }

  function signalLoaderReady(){
    if(loaderSignaled)return;
    loaderSignaled=true;
    try{
      window.dispatchEvent(new CustomEvent('liw:card-loader-ready',{
        detail:{reason:'studio-card-rendered'}
      }));
    }catch(_){ }
  }

  function signalProfileReady(profile){
    const signature=profileSignature(profile);
    if(!signature||signature===lastProfileSignature)return;
    lastProfileSignature=signature;
    applyCanonicalProfile(profile);
    try{
      window.dispatchEvent(new CustomEvent('liw:studio-profile-ready',{
        detail:{
          primaryType:String(profile.primary_type||'').trim().toLowerCase(),
          specialties:Array.isArray(profile.specialties)?profile.specialties.slice():[]
        }
      }));
      window.dispatchEvent(new CustomEvent('liw:studio-type-ready',{
        detail:{reason:'studio-profile-synchronized',primaryType:String(profile.primary_type||'').trim().toLowerCase()}
      }));
    }catch(_){ }
    try{window.LIWStudioSignatureTopV4?.refresh?.();}catch(_){ }
    try{window.LIWStudioLuxeV3?.refresh?.();}catch(_){ }
  }

  function pulse(){
    const data=cardData();
    const card=document.getElementById('card');
    if(!data||!card||card.hidden||!isStudio(data))return false;
    if(window.__LIW_PUBLIC_BARBERSHOP_STAGING__!==true)return false;

    signalLoaderReady();
    const profile=currentProfile();
    if(profile)signalProfileReady(profile);
    return true;
  }

  function stop(){
    if(timer){clearInterval(timer);timer=0;}
  }

  timer=setInterval(()=>{
    pulse();
    if(Date.now()-started>=MAX_WAIT_MS)stop();
  },TICK_MS);

  window.addEventListener('liw:studio-ready',pulse,{passive:true});
  window.addEventListener('liw:barber-client-ready',pulse,{passive:true});
  window.addEventListener('load',pulse,{once:true,passive:true});
  if(document.readyState!=='loading')pulse();
})();
