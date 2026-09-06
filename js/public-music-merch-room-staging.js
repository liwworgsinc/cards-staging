/* LIW Cards staging — Music-only Merch & Drops room enhancer.
   Reuses the proven LIW Product Showcase DOM and purchase tracking. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_MERCH_ROOM__)return;
  window.__LIW_MUSIC_MERCH_ROOM__=true;

  function cardData(){try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(cardData()?.card_experience||'').toLowerCase()==='music';}
  function safe(value,max=240){return String(value??'').trim().slice(0,max);}
  function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));}
  function icon(name,size=18){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function artistName(){return safe(document.getElementById('name')?.textContent||cardData()?.full_name||'the artist',120)||'the artist';}
  function openRoom(){return document.querySelector('.music-artist-room.open');}
  function roomTitle(room){return safe(room?.querySelector('[data-music-room-title]')?.textContent,40).toLowerCase();}
  function closeRoom(){openRoom()?.querySelector('.music-artist-room-close')?.click();}

  function buildHero(section){
    if(section.querySelector('.music-merch-hero'))return;
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
  }

  function decorateProducts(section){
    const grid=section.querySelector('#products');
    if(!grid)return 0;
    grid.classList.add('music-merch-grid');
    grid.querySelectorAll('.music-merch-empty').forEach(node=>node.remove());
    const cards=[...grid.querySelectorAll('.public-product-card')];
    cards.forEach((card,index)=>{
      card.classList.toggle('music-featured-drop',index===0);
      card.dataset.musicDropIndex=String(index);
      const buy=card.querySelector('a[data-product-id]');
      if(buy){
        buy.target='_blank';
        buy.rel='noopener';
        buy.setAttribute('aria-label',`${safe(card.querySelector('h3')?.textContent||'Merch item',100)} — shop in a new tab`);
        if(!buy.dataset.musicMerchLabel){
          buy.dataset.musicMerchLabel='true';
          buy.innerHTML=`Get it ${icon('arrow-up-right',14)}`;
        }
      }
    });
    return cards.length;
  }

  function decorateExternalStore(body){
    const link=[...body.querySelectorAll('.music-room-link[href]')].find(node=>!node.closest('#products-section'));
    if(!link)return null;
    link.target='_blank';link.rel='noopener';
    const wrap=link.parentElement;
    if(wrap)wrap.classList.add('music-merch-external');
    if(!link.dataset.musicMerchStore){
      link.dataset.musicMerchStore='true';
      link.innerHTML=`${icon('store',17)} Visit full artist store ${icon('arrow-up-right',16)}`;
    }
    return link;
  }

  function buildEmpty(grid,hasStore){
    if(grid.querySelector('.music-merch-empty'))return;
    const empty=document.createElement('div');empty.className='music-merch-empty';
    empty.innerHTML=`<span class="music-merch-empty-icon">${icon('shirt',27)}</span><strong>${hasStore?'More merch is in the artist store':'Drops coming soon'}</strong><span>${hasStore?`Use the full artist store below while ${esc(artistName())} adds featured drops to LIW.`:`${esc(artistName())} can add product photos, prices and Buy links from the LIW Product Showcase builder.`}</span>`;
    grid.appendChild(empty);
  }

  function buildBack(body){
    if(body.querySelector(':scope > .music-merch-back'))return;
    const button=document.createElement('button');button.type='button';button.className='music-merch-back';
    button.innerHTML=`${icon('arrow-left',16)} Back to Artist Card`;
    button.addEventListener('click',closeRoom);
    body.appendChild(button);
  }

  function enhance(){
    if(!isMusic())return false;
    const room=openRoom();
    if(!room||roomTitle(room)!=='merch')return false;
    const body=room.querySelector('[data-music-room-body]');
    const section=body?.querySelector('#products-section');
    if(!body||!section)return false;

    section.classList.add('music-merch-section');
    buildHero(section);
    const count=decorateProducts(section);
    const store=decorateExternalStore(body);
    const grid=section.querySelector('#products');
    if(grid&&!count)buildEmpty(grid,Boolean(store));
    buildBack(body);
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  const observer=new MutationObserver(()=>{
    try{enhance();}catch(error){console.warn('[LIW Music Merch] enhancement failed',error);}
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-hidden']});

  let tries=0;
  const timer=setInterval(()=>{
    tries+=1;
    try{enhance();}catch(_){ }
    if(tries>180)clearInterval(timer);
  },100);
  enhance();
})();
