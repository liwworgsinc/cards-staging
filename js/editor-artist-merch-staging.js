(function(){
  'use strict';
  if(window.__LIW_ARTIST_NATIVE_MERCH__)return;
  window.__LIW_ARTIST_NATIVE_MERCH__=true;

  function ensureStyles(){
    if(document.getElementById('liw-artist-native-merch-style'))return;
    const style=document.createElement('style');
    style.id='liw-artist-native-merch-style';
    style.textContent=`
      .artist-native-merch{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:12px 0 0;padding:13px 14px;border:1px solid rgba(255,255,255,.085);border-radius:15px;background:radial-gradient(circle at 92% 0,rgba(120,68,255,.14),transparent 34%),#090c15}
      .artist-native-merch-copy{display:grid;gap:3px;min-width:0}.artist-native-merch-copy strong{display:flex;align-items:center;gap:7px;color:#fff;font-size:.76rem}.artist-native-merch-copy strong svg{color:#b16dff}.artist-native-merch-copy span{color:#8f98af;font-size:.64rem;line-height:1.45}
      .artist-native-merch-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}.artist-native-merch-badge{padding:6px 8px;border-radius:999px;background:rgba(129,77,255,.12);border:1px solid rgba(151,99,255,.22);color:#cbb9ff;font-size:.59rem;font-weight:900;white-space:nowrap}
      .artist-native-merch .btn{min-height:36px!important;padding:8px 11px!important}
      @media(max-width:620px){.artist-native-merch{align-items:stretch;display:grid}.artist-native-merch-actions{justify-content:space-between}.artist-native-merch-actions .btn{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function productCount(){
    try{
      if(typeof products!=='undefined'&&Array.isArray(products))return products.filter(item=>String(item?.name||'').trim()).length;
    }catch(_){ }
    const list=document.getElementById('product-list');
    if(!list)return 0;
    return Math.max(0,list.querySelectorAll('[data-product-index],.builder-row,.product-builder-row').length);
  }

  function updateCount(){
    const badge=document.querySelector('[data-artist-merch-count]');
    if(!badge)return;
    const count=productCount();
    badge.textContent=count?`${count} merch item${count===1?'':'s'}`:'No merch yet';
  }

  function openNativeMerchBuilder(){
    try{if(typeof openTab==='function')openTab('tools');}catch(_){ }
    const tools=document.getElementById('business-tools-content');
    if(tools)tools.hidden=false;

    const productCard=document.querySelector('[data-entitlement-card="product_showcase"]');
    const toggle=document.querySelector('[name="products_enabled"]');
    if(toggle&&!toggle.disabled&&!toggle.checked){
      toggle.checked=true;
      toggle.dispatchEvent(new Event('change',{bubbles:true}));
    }

    setTimeout(()=>{
      productCard?.scrollIntoView({behavior:'smooth',block:'start'});
      if(toggle?.disabled&&typeof toast==='function')toast('Merch products use the LIW Product Showcase feature.');
      else if(typeof toast==='function')toast('Add or edit merch here. These products also stay available to Classic and Flow.');
    },80);
  }

  function mount(){
    const room=document.getElementById('artist-dressing-room');
    if(!room)return false;
    ensureStyles();

    const merchInput=room.querySelector('[data-artist-field="merch_url"]');
    if(merchInput){
      const label=merchInput.closest('label');
      const caption=label?.querySelector('span:first-child');
      if(caption)caption.textContent='External merch store (optional)';
      merchInput.placeholder='Shopify, Bandcamp, website, or full store URL';
    }

    if(room.querySelector('[data-artist-native-merch]')){updateCount();return true;}
    const backstageBlock=merchInput?.closest('.artist-dressing-block');
    const grid=merchInput?.closest('.artist-dressing-grid');
    if(!backstageBlock||!grid)return false;

    const manager=document.createElement('div');
    manager.className='artist-native-merch';
    manager.dataset.artistNativeMerch='true';
    manager.innerHTML=`
      <div class="artist-native-merch-copy">
        <strong><i data-lucide="shopping-bag" size="16"></i> LIW merch products</strong>
        <span>Add product photos, names, prices, descriptions and Buy links with the same product builder used by Classic and Flow. Music displays them inside the full-screen Merch room.</span>
      </div>
      <div class="artist-native-merch-actions">
        <span class="artist-native-merch-badge" data-artist-merch-count>No merch yet</span>
        <button type="button" class="btn btn-light btn-sm" data-artist-manage-merch><i data-lucide="package-plus" size="15"></i> Manage merch</button>
      </div>`;
    grid.insertAdjacentElement('afterend',manager);
    manager.querySelector('[data-artist-manage-merch]')?.addEventListener('click',openNativeMerchBuilder);
    updateCount();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries+=1;
    if(mount()&&tries>8)clearInterval(timer);
    if(tries>80)clearInterval(timer);
  },250);
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#add-product,[data-remove-product]'))setTimeout(updateCount,80);
  },true);
  mount();
})();