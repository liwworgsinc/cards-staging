(function(){
  'use strict';
  const $=selector=>document.querySelector(selector);
  let cards=[];

  function escapeHtml(value=''){
    return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function domainHref(cardId='',mode='buy'){
    const next=new URL('domains.html',location.href);
    if(cardId)next.searchParams.set('card',cardId);
    next.searchParams.set('from','agency-hosting');
    if(mode==='connect')next.searchParams.set('mode','connect');
    return `${next.pathname.split('/').pop()}${next.search}`;
  }

  function liveHref(slug=''){
    const next=new URL('card.html',location.href);
    next.searchParams.set('slug',slug);
    return `${next.pathname.split('/').pop()}${next.search}`;
  }

  function ensureStyles(){
    if(document.getElementById('agency-hosting-delivery-style'))return;
    const style=document.createElement('style');
    style.id='agency-hosting-delivery-style';
    style.textContent=`
      #agency-hosting-v2-dialog .agency-hosting-delivery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:15px}
      #agency-hosting-v2-dialog .agency-hosting-delivery-option{display:flex;flex-direction:column;gap:8px;min-height:154px;padding:15px;border:1px solid #e2e7ef;border-radius:13px;background:#fff}
      #agency-hosting-v2-dialog .agency-hosting-delivery-option>span{width:36px;height:36px;display:grid;place-items:center;border-radius:10px;background:#0b1736;color:#f1d584}
      #agency-hosting-v2-dialog .agency-hosting-delivery-option strong{color:#17213b;font-size:.78rem}
      #agency-hosting-v2-dialog .agency-hosting-delivery-option p{margin:0;color:#6f7b8f;font-size:.65rem;line-height:1.45;flex:1}
      #agency-hosting-v2-dialog .agency-hosting-domain-actions{display:flex;gap:6px;flex-wrap:wrap}
      #agency-hosting-v2-dialog .agency-hosting-delivery-option .btn{justify-content:center;min-height:34px;padding:7px 9px;font-size:.62rem}
      #agency-hosting-v2-dialog .agency-hosting-delivery-note{margin:12px 0 0;color:#7a8699;font-size:.62rem;line-height:1.45}
      @media(max-width:720px){#agency-hosting-v2-dialog .agency-hosting-delivery-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureDialog(){
    if($('#agency-hosting-v2-dialog'))return;
    ensureStyles();
    const dialog=document.createElement('dialog');
    dialog.id='agency-hosting-v2-dialog';
    dialog.className='agency-dialog';
    dialog.innerHTML=`<div class="agency-dialog-body">
      <div class="agency-dialog-head"><div><h2>Host &amp; deliver client card</h2><p>Choose the card, then decide how the client should go live.</p></div><button class="icon-btn" id="agency-hosting-v2-close" type="button" aria-label="Close">×</button></div>
      <div class="agency-field full"><label for="agency-hosting-v2-select">Client card</label><select id="agency-hosting-v2-select"></select></div>
      <div class="agency-hosting-delivery-grid">
        <article class="agency-hosting-delivery-option"><span><i data-lucide="link" size="18"></i></span><strong>LIW hosted link</strong><p>Use the card’s normal LIW web address. Future edits stay live automatically.</p><a class="btn btn-light" id="agency-hosting-v2-live" target="_blank" rel="noopener">Open live card</a></article>
        <article class="agency-hosting-delivery-option"><span><i data-lucide="globe-2" size="18"></i></span><strong>Custom domain</strong><p>Buy a memorable domain through LIW or connect one the client already owns.</p><div class="agency-hosting-domain-actions"><a class="btn btn-primary" id="agency-hosting-v2-buy-domain">Find a domain</a><a class="btn btn-light" id="agency-hosting-v2-connect-domain">Connect existing</a></div></article>
        <article class="agency-hosting-delivery-option"><span><i data-lucide="download" size="18"></i></span><strong>Host somewhere else</strong><p>Download the connected card file for the agency or client’s own hosting account.</p><button class="btn btn-light" id="agency-hosting-v2-download" type="button">Download Auto-Sync File</button></article>
      </div>
      <p class="agency-hosting-delivery-note">Domain registration stays in the existing LIW domain flow. Nothing here changes card data, pricing, or the regular customer domain experience.</p>
    </div>`;
    document.body.appendChild(dialog);
    $('#agency-hosting-v2-close').addEventListener('click',()=>dialog.close());
    $('#agency-hosting-v2-select').addEventListener('change',syncSelectedCard);
    if(window.lucide)try{lucide.createIcons();}catch(_){}
  }

  function syncSelectedCard(){
    const select=$('#agency-hosting-v2-select');
    const option=select?.selectedOptions?.[0];
    if(!option)return;
    const cardId=option.dataset.cardId||'';
    const slug=option.value||'';
    const live=$('#agency-hosting-v2-live');
    const buy=$('#agency-hosting-v2-buy-domain');
    const connect=$('#agency-hosting-v2-connect-domain');
    if(live)live.href=liveHref(slug);
    if(buy)buy.href=domainHref(cardId,'buy');
    if(connect)connect.href=domainHref(cardId,'connect');
  }

  window.addEventListener('liw:agency-hosting-open',event=>{
    cards=Array.isArray(event.detail?.cards)?event.detail.cards:[];
    if(!cards.length)return;
    ensureDialog();
    const select=$('#agency-hosting-v2-select');
    select.innerHTML=cards.map(card=>`<option value="${escapeHtml(card.slug)}" data-card-id="${escapeHtml(card.id)}">${escapeHtml(card.name)}${card.company?` · ${escapeHtml(card.company)}`:''}</option>`).join('');
    syncSelectedCard();
    $('#agency-hosting-v2-dialog').showModal();
  });
})();
