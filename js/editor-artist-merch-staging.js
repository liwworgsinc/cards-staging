/* LIW Cards staging — Artist Store compatibility bridge.
   The Artist Control Center now mounts the native LIW Product Showcase directly
   inside its Store tab. This file stays intentionally small so older editor
   loaders can keep requesting it without relocating the Dressing Room. */
(function(){
  'use strict';
  if(window.__LIW_ARTIST_NATIVE_MERCH__)return;
  window.__LIW_ARTIST_NATIVE_MERCH__=true;

  function productCount(){
    try{if(typeof products!=='undefined'&&Array.isArray(products))return products.filter(item=>String(item?.name||'').trim()).length;}catch(_){ }
    return document.querySelectorAll('#product-list .builder-row,#product-list [data-product-index],#product-list .product-builder-row').length;
  }

  function sync(){
    const room=document.getElementById('artist-dressing-room');if(!room)return false;
    const count=productCount();
    const output=room.querySelector('[data-artist-count="store"]');if(output)output.textContent=String(count);
    return true;
  }

  document.addEventListener('click',event=>{
    if(event.target.closest?.('#add-product,[data-remove-product]'))setTimeout(sync,120);
  },true);
  document.addEventListener('change',event=>{
    if(event.target.closest?.('#product-list,[name="products_enabled"]'))setTimeout(sync,120);
  },true);

  let tries=0;const timer=setInterval(()=>{tries++;if(sync()&&tries>12)clearInterval(timer);if(tries>80)clearInterval(timer);},250);
  sync();
})();

/* Music Dressing Room: selected LIW template still controls public design. */
(function loadArtistTemplateBridge(){
  if(!document.querySelector('link[data-liw-artist-template-bridge]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='css/editor-artist-template-bridge-staging.css?v=20260907-control-center-1';link.dataset.liwArtistTemplateBridge='true';document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-liw-artist-template-bridge]')){
    const script=document.createElement('script');script.src='js/editor-artist-template-bridge-staging.js?v=20260907-control-center-1';script.defer=true;script.dataset.liwArtistTemplateBridge='true';document.body.appendChild(script);
  }
})();

/* Music Dressing Room: explicit performer/creator type plus modular Podcast,
   Call and Text home-button controls. The module is Music-only and reuses the
   existing artist_settings autosave path. */
(function loadArtistPerformerModules(){
  if(document.querySelector('script[data-liw-artist-performer-modules]'))return;
  const script=document.createElement('script');
  script.src='js/editor-artist-performer-modules-staging.js?v=20260907-performer-modules-2';
  script.defer=true;
  script.dataset.liwArtistPerformerModules='true';
  document.body.appendChild(script);
})();
