/* LIW Cards staging — Music-only swipe rail for Gallery, Book Me, EPK, Inner Circle and Next Show.
   Keeps the existing live room buttons intact. Gallery/Book/EPK move into the rail;
   Inner Circle/Next Show use lightweight proxies so Music home-polish can keep owning
   the original conversion cards without pulling them back out of the rail. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_BOTTOM_SWIPE_V3__)return;
  window.__LIW_MUSIC_BOTTOM_SWIPE_V3__=true;

  function data(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(data()?.card_experience||'').toLowerCase()==='music';}
  function label(tile){return String(tile?.querySelector?.('strong')?.textContent||'').trim().toLowerCase();}

  function ensureHead(more){
    let head=more.querySelector(':scope > .music-bottom-swipe-head');
    const title=more.querySelector(':scope > .music-hub-more-title')||more.querySelector('.music-hub-more-title');
    if(!head){
      head=document.createElement('div');
      head.className='music-bottom-swipe-head';
      if(title)more.insertBefore(head,title);else more.prepend(head);
    }
    if(title&&title.parentNode!==head)head.appendChild(title);
    if(title)title.textContent='More';
    let hint=head.querySelector('.music-bottom-swipe-hint');
    if(!hint){
      hint=document.createElement('span');
      hint.className='music-bottom-swipe-hint';
      hint.setAttribute('aria-hidden','true');
      hint.innerHTML='Swipe <span>→</span>';
      head.appendChild(hint);
    }
  }

  function ensureProxy(rail,source,key){
    let proxy=rail.querySelector(`[data-music-bottom-proxy="${key}"]`);
    if(!source){
      proxy?.remove();
      return null;
    }

    if(!proxy){
      proxy=source.cloneNode(false);
      proxy.removeAttribute('id');
      proxy.removeAttribute('hidden');
      proxy.hidden=false;
      proxy.classList.remove('music-inner-circle','music-upcoming-show');
      proxy.classList.add('music-bottom-swipe-item','music-bottom-swipe-proxy',key==='inner'?'music-bottom-swipe-inner':'music-bottom-swipe-show');
      proxy.dataset.musicBottomProxy=key;

      if(proxy.tagName==='BUTTON')proxy.type='button';
      else{
        proxy.setAttribute('role','group');
        proxy.removeAttribute('tabindex');
      }

      proxy.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        if(key==='inner')source.querySelector('button')?.click();
        else source.click();
      });
      rail.appendChild(proxy);
    }

    /* Keep the proxy copy current after Artist Hub upgrades labels/show data. */
    proxy.innerHTML=source.innerHTML;
    proxy.hidden=false;
    if(proxy.parentNode!==rail)rail.appendChild(proxy);
    return proxy;
  }

  function collectItems(card,rail){
    const tiles=[...card.querySelectorAll('.music-luxe-tile')];
    const pick=name=>tiles.find(tile=>label(tile)===name)||null;
    const gallery=pick('gallery');
    const book=pick('book me');
    const epk=pick('epk');

    [gallery,book,epk].filter(Boolean).forEach(node=>{
      node.classList.add('music-bottom-swipe-item');
      if(node.parentNode!==rail)rail.appendChild(node);
    });

    const innerSource=card.querySelector('.music-secondary-row .music-inner-circle')||card.querySelector('.music-inner-circle');
    const showSource=card.querySelector('.music-secondary-row .music-upcoming-show')||card.querySelector('.music-upcoming-show');
    const inner=ensureProxy(rail,innerSource,'inner');
    const show=ensureProxy(rail,showSource,'show');

    /* Reassert a deterministic order even after room/home scripts touch the DOM. */
    [gallery,book,epk,inner,show].filter(Boolean).forEach(node=>rail.appendChild(node));
    return [gallery,book,epk,inner,show].filter(Boolean);
  }

  function mount(){
    if(!isMusic())return false;
    const card=document.querySelector('#card.music-card-active.music-artist-hub-v3');
    const launcher=card?.querySelector('.music-luxe-launcher');
    const more=launcher?.querySelector('.music-hub-more');
    const moreGrid=more?.querySelector('.music-hub-more-grid');
    if(!card||card.hidden||!launcher||!more||!moreGrid)return false;

    document.body.classList.add('music-bottom-swipe-page');
    more.hidden=false;
    more.classList.add('music-bottom-swipe');
    ensureHead(more);

    let rail=more.querySelector(':scope > .music-bottom-swipe-rail');
    if(!rail){
      rail=document.createElement('div');
      rail.className='music-bottom-swipe-rail';
      rail.setAttribute('role','group');
      rail.setAttribute('aria-label','More artist actions. Swipe left or right.');
      rail.tabIndex=0;
      more.appendChild(rail);
      rail.addEventListener('keydown',event=>{
        if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
        event.preventDefault();
        const amount=Math.max(140,Math.round(rail.clientWidth*.48));
        rail.scrollBy({left:event.key==='ArrowRight'?amount:-amount,behavior:'smooth'});
      });
    }

    const items=collectItems(card,rail);
    moreGrid.classList.add('music-bottom-swipe-source');
    const secondary=card.querySelector('.music-secondary-row');
    if(secondary)secondary.classList.add('music-bottom-swipe-source');
    card.classList.add('music-bottom-swipe-mounted');
    rail.dataset.itemCount=String(items.length);
    return items.length>=5;
  }

  /* Home polish can create Inner Circle / Next Show after Artist Hub is visible.
     Use bounded retries only — no document-wide observer or perpetual loop. */
  [0,90,220,480,900,1500,2400,3400,4800].forEach(delay=>setTimeout(mount,delay));

  document.addEventListener('click',event=>{
    if(!isMusic())return;
    if(event.target?.closest?.('.music-luxe-tile,.music-inner-circle,.music-upcoming-show,.music-bottom-swipe-proxy')){
      setTimeout(mount,120);
      setTimeout(mount,360);
    }
  },true);

  document.addEventListener('liw:card-loader-ready',()=>setTimeout(mount,60));
  window.addEventListener('pageshow',()=>setTimeout(mount,80));
})();
