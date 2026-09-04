(function(){
  'use strict';
  if(window.__LIW_ARTIST_NATIVE_MERCH__)return;
  window.__LIW_ARTIST_NATIVE_MERCH__=true;

  function ensureStyles(){
    if(document.getElementById('liw-artist-native-merch-style'))return;
    const style=document.createElement('style');
    style.id='liw-artist-native-merch-style';
    style.textContent=`
      .artist-native-merch{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:14px 0 0;padding:15px 16px;border:1px solid rgba(255,255,255,.085);border-radius:16px;background:radial-gradient(circle at 92% 0,rgba(120,68,255,.14),transparent 34%),#090c15}
      .artist-native-merch-copy{display:grid;gap:4px;min-width:0}.artist-native-merch-copy strong{display:flex;align-items:center;gap:7px;color:#fff;font-size:.82rem}.artist-native-merch-copy strong svg{color:#b16dff}.artist-native-merch-copy span{color:#8f98af;font-size:.69rem;line-height:1.5}
      .artist-native-merch-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}.artist-native-merch-badge{padding:6px 8px;border-radius:999px;background:rgba(129,77,255,.12);border:1px solid rgba(151,99,255,.22);color:#cbb9ff;font-size:.61rem;font-weight:900;white-space:nowrap}
      .artist-native-merch .btn{min-height:38px!important;padding:8px 12px!important}
      .artist-dressing-room.artist-dressing-room-standalone{margin:24px 0!important;border-radius:28px!important;overflow:visible!important;box-shadow:0 24px 70px rgba(15,11,45,.18)!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-dressing-room-hero{padding:28px 28px 24px!important;border-radius:28px 28px 0 0}
      .artist-dressing-room.artist-dressing-room-standalone .artist-dressing-room-heading h3{font-size:1.38rem!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-dressing-room-heading p{max-width:760px!important;font-size:.82rem!important;line-height:1.65!important}
      .artist-dressing-room.artist-dressing-room-standalone>.artist-dressing-grid,.artist-dressing-room.artist-dressing-room-standalone>.artist-dressing-block,.artist-dressing-room.artist-dressing-room-standalone>.artist-dressing-savebar{margin-left:24px!important;margin-right:24px!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-dressing-block{padding:20px!important;margin-top:20px!important;border-radius:20px!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-dressing-block-head{margin-bottom:16px!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-dressing-block-head strong{font-size:.9rem!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-dressing-block-head span{font-size:.71rem!important}
      .artist-dressing-room.artist-dressing-room-standalone label>span:first-child,.artist-dressing-room.artist-dressing-room-standalone .artist-release-fields label>span:first-child{font-size:.73rem!important;margin-bottom:7px!important}
      .artist-dressing-room.artist-dressing-room-standalone .input{min-height:46px!important;font-size:.82rem!important;padding:11px 13px!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-release-editor{grid-template-columns:160px minmax(0,1fr)!important;gap:20px!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-release-preview{min-height:160px!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-glam-presets{gap:12px!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-glam-presets label>span{padding:13px!important;min-height:92px}
      .artist-dressing-room.artist-dressing-room-standalone .artist-tile-list{gap:8px!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-tile-row{min-height:54px!important;padding:8px 10px!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-dressing-savebar{margin-top:22px!important;margin-bottom:24px!important;padding:17px!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-dressing-savebar strong{font-size:.8rem!important}
      .artist-dressing-room.artist-dressing-room-standalone .artist-dressing-savebar span{font-size:.68rem!important}
      @media(min-width:980px){.artist-dressing-room.artist-dressing-room-standalone .artist-dressing-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))!important}.artist-dressing-room.artist-dressing-room-standalone .artist-dressing-grid-2{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:720px){.artist-native-merch{align-items:stretch;display:grid}.artist-native-merch-actions{justify-content:space-between}.artist-native-merch-actions .btn{flex:1}.artist-dressing-room.artist-dressing-room-standalone{margin:18px 0!important;border-radius:22px!important}.artist-dressing-room.artist-dressing-room-standalone .artist-dressing-room-hero{padding:22px 18px!important;border-radius:22px 22px 0 0}.artist-dressing-room.artist-dressing-room-standalone>.artist-dressing-grid,.artist-dressing-room.artist-dressing-room-standalone>.artist-dressing-block,.artist-dressing-room.artist-dressing-room-standalone>.artist-dressing-savebar{margin-left:14px!important;margin-right:14px!important}.artist-dressing-room.artist-dressing-room-standalone .artist-dressing-block{padding:16px!important;margin-top:16px!important}.artist-dressing-room.artist-dressing-room-standalone .artist-release-editor{grid-template-columns:1fr!important;gap:14px!important}.artist-dressing-room.artist-dressing-room-standalone .artist-release-preview{min-height:180px!important}}
    `;
    document.head.appendChild(style);
  }

  function loadArtistAudioEditor(){
    if(document.querySelector('script[data-liw-artist-audio-editor]'))return;
    const script=document.createElement('script');
    script.src='js/editor-artist-audio-staging.js?v=20260904-native-audio-1';
    script.defer=true;
    script.dataset.liwArtistAudioEditor='true';
    document.body.appendChild(script);
  }

  function relocateDressingRoom(){
    const room=document.getElementById('artist-dressing-room');
    const experience=document.getElementById('card-experience-section');
    if(!room||!experience)return false;
    room.classList.add('artist-dressing-room-standalone');
    if(room.previousElementSibling!==experience)experience.insertAdjacentElement('afterend',room);
    const copy=room.querySelector('.artist-dressing-room-heading p');
    if(copy)copy.textContent='This is the artist’s workspace. Take your time here — releases, streaming, shows, merch, booking and visual styling can scroll normally. Only the public Music home is locked to one screen.';
    loadArtistAudioEditor();
    return true;
  }

  function productCount(){try{if(typeof products!=='undefined'&&Array.isArray(products))return products.filter(item=>String(item?.name||'').trim()).length;}catch(_){ }const list=document.getElementById('product-list');if(!list)return 0;return Math.max(0,list.querySelectorAll('[data-product-index],.builder-row,.product-builder-row').length);}
  function updateCount(){const badge=document.querySelector('[data-artist-merch-count]');if(!badge)return;const count=productCount();badge.textContent=count?`${count} merch item${count===1?'':'s'}`:'No merch yet';}
  function openNativeMerchBuilder(){try{if(typeof openTab==='function')openTab('tools');}catch(_){ }const tools=document.getElementById('business-tools-content');if(tools)tools.hidden=false;const productCard=document.querySelector('[data-entitlement-card="product_showcase"]');const toggle=document.querySelector('[name="products_enabled"]');if(toggle&&!toggle.disabled&&!toggle.checked){toggle.checked=true;toggle.dispatchEvent(new Event('change',{bubbles:true}));}setTimeout(()=>{productCard?.scrollIntoView({behavior:'smooth',block:'start'});if(toggle?.disabled&&typeof toast==='function')toast('Merch products use the LIW Product Showcase feature.');else if(typeof toast==='function')toast('Add or edit merch here. These products also stay available to Classic and Flow.');},80);}
  function mount(){
    const room=document.getElementById('artist-dressing-room');if(!room)return false;ensureStyles();relocateDressingRoom();
    const merchInput=room.querySelector('[data-artist-field="merch_url"]');if(merchInput){const label=merchInput.closest('label');const caption=label?.querySelector('span:first-child');if(caption)caption.textContent='External merch store (optional)';merchInput.placeholder='Shopify, Bandcamp, website, or full store URL';}
    if(room.querySelector('[data-artist-native-merch]')){updateCount();return true;}
    const backstageBlock=merchInput?.closest('.artist-dressing-block');const grid=merchInput?.closest('.artist-dressing-grid');if(!backstageBlock||!grid)return false;
    const manager=document.createElement('div');manager.className='artist-native-merch';manager.dataset.artistNativeMerch='true';manager.innerHTML=`<div class="artist-native-merch-copy"><strong><i data-lucide="shopping-bag" size="16"></i> LIW merch products</strong><span>Add product photos, names, prices, descriptions and Buy links with the same product builder used by Classic and Flow. Music displays them inside the full-screen Merch room.</span></div><div class="artist-native-merch-actions"><span class="artist-native-merch-badge" data-artist-merch-count>No merch yet</span><button type="button" class="btn btn-light btn-sm" data-artist-manage-merch><i data-lucide="package-plus" size="15"></i> Manage merch</button></div>`;
    grid.insertAdjacentElement('afterend',manager);manager.querySelector('[data-artist-manage-merch]')?.addEventListener('click',openNativeMerchBuilder);updateCount();if(window.lucide)try{lucide.createIcons();}catch(_){ }return true;
  }

  let tries=0;const timer=setInterval(()=>{tries+=1;const ready=mount();if(ready&&tries>12)clearInterval(timer);if(tries>100)clearInterval(timer);},250);
  document.addEventListener('click',event=>{if(event.target.closest?.('#add-product,[data-remove-product]'))setTimeout(updateCount,80);if(event.target.closest?.('[data-card-experience]'))setTimeout(relocateDressingRoom,40);},true);
  ensureStyles();mount();
})();