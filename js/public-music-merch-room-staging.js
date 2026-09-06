/* LIW Cards staging — Music-only Merch & Drops room enhancer.
   Reuses the proven LIW Product Showcase DOM and purchase tracking.
   Mobile-safe: enhances on room open without a self-triggering DOM observer. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_MERCH_ROOM__)return;
  window.__LIW_MUSIC_MERCH_ROOM__=true;

  function cardData(){try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(cardData()?.card_experience||'').toLowerCase()==='music';}
  function safe(value,max=240){return String(value??'').trim().slice(0,max);}
  function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function icon(name,size=18){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function artistName(){return safe(document.getElementById('name')?.textContent||cardData()?.full_name||'the artist',120)||'the artist';}
  function openRoom(){return document.querySelector('.music-artist-room.open');}
  function roomTitle(room){return safe(room?.querySelector('[data-music-room-title]')?.textContent,40).toLowerCase();}
  function closeRoom(){openRoom()?.querySelector('.music-artist-room-close')?.click();}

  function buildHero(section){
    if(section.querySelector('.music-merch-hero'))return false;
    const hero=document.createElement('div');
    hero.className='music-merch-hero';
    hero.innerHTML=`
      <span class="music-merch-hero-mark">${icon('shopping-bag',24)}</span>
      <div class="music-merch-hero-copy">
        <small>MERCH &amp; DROPS</small>
        <h2>Shop ${esc(artistName())}</h2>
        <p>Browse the artist's featured pieces without leaving the LIW experience.</p>
      </div>
      <span class="music-merch-hero-note">${icon('rotate-ccw',14)} Checkout opens in a new tab, so this Artist Card stays right here for you.</span>`;
    section.prepend(hero);
    return true;
  }

  function decorateProducts(section){
    const grid=section.querySelector('#products');
    if(!grid)return {count:0,changed:false};
    let changed=false;
    if(!grid.classList.contains('music-merch-grid')){grid.classList.add('music-merch-grid');changed=true;}
    grid.querySelectorAll('.music-merch-empty').forEach(node=>{node.remove();changed=true;});
    const cards=[...grid.querySelectorAll('.public-product-card')];
    cards.forEach((card,index)=>{
      const featured=index===0;
      if(card.classList.contains('music-featured-drop')!==featured){card.classList.toggle('music-featured-drop',featured);changed=true;}
      if(card.dataset.musicDropIndex!==String(index)){card.dataset.musicDropIndex=String(index);changed=true;}
      const buy=card.querySelector('a[data-product-id]');
      if(buy){
        if(buy.target!=='_blank'){buy.target='_blank';changed=true;}
        if(buy.rel!=='noopener'){buy.rel='noopener';changed=true;}
        const aria=`${safe(card.querySelector('h3')?.textContent||'Merch item',100)} — shop in a new tab`;
        if(buy.getAttribute('aria-label')!==aria){buy.setAttribute('aria-label',aria);changed=true;}
        if(!buy.dataset.musicMerchLabel){
          buy.dataset.musicMerchLabel='true';
          buy.innerHTML=`Get it ${icon('arrow-up-right',14)}`;
          changed=true;
        }
      }
    });
    return {count:cards.length,changed};
  }

  function decorateExternalStore(body){
    const link=[...body.querySelectorAll('.music-room-link[href]')].find(node=>!node.closest('#products-section'));
    if(!link)return {link:null,changed:false};
    let changed=false;
    if(link.target!=='_blank'){link.target='_blank';changed=true;}
    if(link.rel!=='noopener'){link.rel='noopener';changed=true;}
    const wrap=link.parentElement;
    if(wrap&&!wrap.classList.contains('music-merch-external')){wrap.classList.add('music-merch-external');changed=true;}
    if(!link.dataset.musicMerchStore){
      link.dataset.musicMerchStore='true';
      link.innerHTML=`${icon('store',17)} Visit full artist store ${icon('arrow-up-right',16)}`;
      changed=true;
    }
    return {link,changed};
  }

  function buildEmpty(grid,hasStore){
    if(grid.querySelector('.music-merch-empty'))return false;
    const empty=document.createElement('div');empty.className='music-merch-empty';
    empty.innerHTML=`<span class="music-merch-empty-icon">${icon('shirt',27)}</span><strong>${hasStore?'More merch is in the artist store':'Drops coming soon'}</strong><span>${hasStore?`Use the full artist store below while ${esc(artistName())} adds featured drops to LIW.`:`${esc(artistName())} can add product photos, prices and Buy links from the LIW Product Showcase builder.`}</span>`;
    grid.appendChild(empty);
    return true;
  }

  function buildBack(body){
    if(body.querySelector(':scope > .music-merch-back'))return false;
    const button=document.createElement('button');button.type='button';button.className='music-merch-back';
    button.innerHTML=`${icon('arrow-left',16)} Back to Artist Card`;
    button.addEventListener('click',closeRoom);
    body.appendChild(button);
    return true;
  }

  function enhance(){
    if(!isMusic())return false;
    const room=openRoom();
    if(!room||roomTitle(room)!=='merch')return false;
    const body=room.querySelector('[data-music-room-body]');
    const section=body?.querySelector('#products-section');
    if(!body||!section)return false;

    let changed=false;
    if(!section.classList.contains('music-merch-section')){section.classList.add('music-merch-section');changed=true;}
    changed=buildHero(section)||changed;
    const products=decorateProducts(section);changed=products.changed||changed;
    const store=decorateExternalStore(body);changed=store.changed||changed;
    const grid=section.querySelector('#products');
    if(grid&&!products.count)changed=buildEmpty(grid,Boolean(store.link))||changed;
    changed=buildBack(body)||changed;
    if(changed&&window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  let scheduled=false;
  function scheduleEnhance(){
    if(scheduled)return;
    scheduled=true;
    [0,80,220,520,1000].forEach((delay,index)=>{
      setTimeout(()=>{
        try{enhance();}catch(error){console.warn('[LIW Music Merch] enhancement failed',error);}
        if(index===4)scheduled=false;
      },delay);
    });
  }

  document.addEventListener('click',event=>{
    const tile=event.target?.closest?.('.music-luxe-tile');
    if(!tile)return;
    const label=safe(tile.querySelector('strong')?.textContent,40).toLowerCase();
    if(label==='merch')scheduleEnhance();
  });

  /* Catch a room that is already opening while this enhancer loads. */
  setTimeout(()=>{try{if(enhance())scheduleEnhance();}catch(_){ }},0);
})();
