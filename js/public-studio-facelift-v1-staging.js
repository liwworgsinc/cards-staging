/* LIW Cards staging — Studio public facelift V1.
   Adds Studio-specific booking prominence and fast customer shortcuts without
   replacing the existing Barbershop engine or its rooms. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_FACELIFT_V1__)return;
  window.__LIW_STUDIO_FACELIFT_V1__=true;
  if(new URLSearchParams(location.search).get('embed')==='1')return;

  const TYPES={
    barber:{book:'Book My Chair',service:'Services',portfolio:'Gallery'},
    hair:{book:'Book Hair Appointment',service:'Hair Services',portfolio:'Styles'},
    nails:{book:'Book Nail Appointment',service:'Nail Services',portfolio:'Nail Work'},
    lashes:{book:'Book Lash / Brow',service:'Lash & Brow',portfolio:'Results'},
    makeup:{book:'Book Makeup Session',service:'Makeup Services',portfolio:'Looks'},
    esthetician:{book:'Book Skin Treatment',service:'Treatments',portfolio:'Results'},
    spa:{book:'Book Spa Service',service:'Spa Services',portfolio:'Gallery'},
    cosmetics:{book:'Book Consultation',service:'Services',portfolio:'Products'},
    tattoo:{book:'Request Tattoo Appointment',service:'Tattoo Services',portfolio:'Tattoo Work'},
    other:{book:'Book Appointment',service:'Services',portfolio:'Portfolio'}
  };

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const type=()=>String(document.documentElement.dataset.studioBusinessType||q('#card')?.dataset.studioBusinessType||'other').trim().toLowerCase();
  const meta=()=>TYPES[type()]||TYPES.other;
  const room=()=>window.LIWBarberClientRoom||null;

  function configured(key){
    try{return Boolean(room()?.sourceConfigured?.(key));}catch(_){return false;}
  }

  function icon(name){
    const paths={
      calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 15l2 2 5-5"/>',
      services:'<path d="M4 7h16M4 12h16M4 17h10"/><circle cx="18" cy="17" r="2"/>',
      gallery:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-4.5-4.5L8 19"/>',
      location:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.services)+'</svg>';
  }

  function bind(home){
    if(home.dataset.studioFaceliftBound==='true')return;
    home.dataset.studioFaceliftBound='true';
    home.addEventListener('click',event=>{
      const book=event.target.closest?.('[data-studio-home-book]');
      if(book){
        event.preventDefault();
        room()?.openNativeAppointment?.();
        return;
      }
      const shortcut=event.target.closest?.('[data-studio-home-room]');
      if(shortcut){
        event.preventDefault();
        room()?.setRoom?.(shortcut.dataset.studioHomeRoom);
      }
    });
  }

  function render(){
    const card=q('#card');
    const home=q('.barber-client-home');
    if(!card||!home||!document.documentElement.classList.contains('liw-public-studio'))return false;
    const current=meta();
    bind(home);

    let book=q('[data-studio-home-book]',home);
    if(!book){
      book=document.createElement('button');
      book.type='button';
      book.className='studio-home-book';
      book.dataset.studioHomeBook='true';
      const promo=q('.barber-client-promo',home);
      if(promo)promo.insertAdjacentElement('beforebegin',book);
      else home.appendChild(book);
    }
    book.innerHTML=icon('calendar')+'<span>'+current.book+'</span>';

    let shortcuts=q('.studio-home-shortcuts',home);
    if(!shortcuts){
      shortcuts=document.createElement('div');
      shortcuts.className='studio-home-shortcuts';
      const promo=q('.barber-client-promo',home);
      if(promo)promo.insertAdjacentElement('beforebegin',shortcuts);
      else book.insertAdjacentElement('afterend',shortcuts);
    }

    const items=[];
    if(configured('cuts'))items.push({key:'cuts',icon:'services',label:current.service});
    if(configured('gallery'))items.push({key:'gallery',icon:'gallery',label:current.portfolio});
    if(configured('map'))items.push({key:'map',icon:'location',label:'Location'});
    shortcuts.innerHTML=items.slice(0,3).map(item=>'<button type="button" class="studio-home-shortcut" data-studio-home-room="'+item.key+'">'+icon(item.icon)+'<span>'+item.label+'</span></button>').join('');
    shortcuts.hidden=items.length===0;

    const promoLabel=q('.barber-client-promo-label span:last-child',home);
    if(promoLabel)promoLabel.textContent='STUDIO HIGHLIGHT';

    const hint=q('.barber-client-hint span:last-child',home);
    if(hint)hint.textContent='Explore services, work and location here, or use the Studio dock for more.';

    card.dataset.studioFacelift='v1';
    return true;
  }

  function settle(){
    render();
    requestAnimationFrame(render);
    setTimeout(render,90);
    setTimeout(render,260);
  }

  window.addEventListener('liw:studio-ready',settle,{passive:true});
  window.addEventListener('liw:barber-client-ready',settle,{passive:true});
  window.addEventListener('liw:studio-type-ready',settle,{passive:true});
  window.addEventListener('load',settle,{once:true,passive:true});
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('[data-barber-frame-home],[data-barber-dock-action="home"]'))setTimeout(settle,0);
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',settle,{once:true});
  else settle();

  window.LIWStudioFaceliftV1={refresh:settle};
})();