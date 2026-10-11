/* LIW Cards staging — Super Studio inline preview parity. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_PREVIEW_PARITY__)return;
  window.__LIW_SUPER_STUDIO_PREVIEW_PARITY__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')&&/\/editor\.html$/i.test(location.pathname)))return;

  let wrapped=false;
  function mount(){
    const SS=window.LIWSuperStudio;
    if(!SS||wrapped||typeof SS.renderExperience!=='function')return false;
    const original=SS.renderExperience.bind(SS);
    SS.renderExperience=function(args={}){
      const next={...args,card:{...(args.card||{})}};
      if(args.preview===true&&next.card.products_enabled===undefined){
        const field=document.querySelector('[name="products_enabled"]');
        next.card.products_enabled=Boolean(field?.checked);
      }
      return original(next);
    };
    wrapped=true;
    try{window.LIWSuperStudioEditor?.refresh?.();}catch(_){}
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries+=1;if(mount()||tries>50)clearInterval(timer);},120);
  mount();
})();
