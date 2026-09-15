/* LIW Cards — Showtime lower swipe rail.
   Keeps the existing live artist-room buttons intact and adds Business Hours / Map
   as rail actions that open in a Showtime modal instead of spilling onto the home. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_BOTTOM_SWIPE_V4__)return;
  window.__LIW_MUSIC_BOTTOM_SWIPE_V4__=true;

  const RICH_ROOMS={
    hours:{label:'Hours',title:'Business Hours',icon:'clock'},
    location:{label:'Map',title:'Map & Location',icon:'map-pin'}
  };
  let activeRichRoom=null;

  function data(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(data()?.card_experience||'').toLowerCase()==='music';}
  function label(tile){return String(tile?.querySelector?.('strong')?.textContent||'').trim().toLowerCase();}
  function icon(name,size=21){return `<i data-lucide="${name}" size="${size}"></i>`;}

  function ensureHead(more){
    let head=more.querySelector(':scope > .music-bottom-swipe-head');
    const title=more.querySelector(':scope > .music-hub-more-title')||more.querySelector('.music-hub-more-title');
    if(!head){
      head=document.createElement('div');
      head.className='music-bottom-swipe-head';
      if(title)more.insertBefore(head,title);else more.prepend(head);
    }
    if(title&&title.parentNode!==head)head.appendChild(title);
    if(title&&!String(title.textContent||'').trim())title.textContent='More';
    let hint=head.querySelector('.music-bottom-swipe-hint');
    if(!hint){
      hint=document.createElement('span');
      hint.className='music-bottom-swipe-hint';
      hint.setAttribute('aria-hidden','true');
      hint.innerHTML='Swipe <span>→</span>';
      head.appendChild(hint);
    }
  }

  function richSection(type){
    if(activeRichRoom?.type===type&&activeRichRoom.node)return activeRichRoom.node;
    return document.querySelector(`#public-rich-sections [data-public-rich="${type}"]`)
      || document.querySelector(`[data-public-rich="${type}"]`);
  }

  function restoreRichRoomNode(){
    if(!activeRichRoom?.node)return;
    const {node,parent,next,hidden}=activeRichRoom;
    if(parent?.isConnected){
      if(next&&next.parentNode===parent)parent.insertBefore(node,next);
      else parent.appendChild(node);
    }
    node.hidden=Boolean(hidden);
    activeRichRoom=null;
  }

  function closeRichRoom(){
    const room=document.getElementById('music-rich-utility-room');
    restoreRichRoomNode();
    if(!room)return;
    room.classList.remove('open');
    room.setAttribute('aria-hidden','true');
    if(!document.querySelector('.music-artist-room.open'))document.documentElement.classList.remove('music-room-open');
  }

  function ensureRichRoom(){
    let room=document.getElementById('music-rich-utility-room');
    if(room)return room;
    room=document.createElement('section');
    room.id='music-rich-utility-room';
    room.className='music-artist-room music-rich-utility-room';
    room.setAttribute('role','dialog');
    room.setAttribute('aria-modal','true');
    room.setAttribute('aria-hidden','true');
    room.innerHTML=`<header class="music-artist-room-head"><div class="music-artist-room-title"><span class="music-artist-room-mark">${icon('sparkles',18)}</span><div><small>LIW ARTIST CARD</small><strong data-music-room-title>Artist Room</strong></div></div><button class="music-artist-room-close" type="button" aria-label="Close artist room">${icon('x',21)}</button></header><div class="music-artist-room-body" data-music-room-body></div>`;
    room.querySelector('.music-artist-room-close')?.addEventListener('click',closeRichRoom);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&room.classList.contains('open'))closeRichRoom();
    });
    document.body.appendChild(room);
    return room;
  }

  function openRichRoom(type){
    if(!isMusic())return;
    const meta=RICH_ROOMS[type];
    const section=richSection(type);
    if(!meta||!section)return;

    const other=document.querySelector('.music-artist-room.open:not(#music-rich-utility-room)');
    other?.querySelector('.music-artist-room-close')?.click();

    const room=ensureRichRoom();
    restoreRichRoomNode();
    const body=room.querySelector('[data-music-room-body]');
    if(!body)return;

    activeRichRoom={
      type,
      node:section,
      parent:section.parentElement,
      next:section.nextSibling,
      hidden:section.hidden
    };

    body.replaceChildren(section);
    section.hidden=false;
    room.querySelector('[data-music-room-title]').textContent=meta.title;
    room.querySelector('.music-artist-room-mark').innerHTML=icon(meta.icon,18);
    room.classList.add('open');
    room.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('music-room-open');
    room.querySelector('.music-artist-room-close')?.focus();

    try{if(typeof window.track==='function')window.track('showtime_rich_room_open',type,{experience:'music'});}catch(_){}
    try{window.dispatchEvent(new CustomEvent('liw:showtime-room-open',{detail:{label:meta.title,key:type}}));}catch(_){}
    if(window.lucide)try{lucide.createIcons();}catch(_){}
  }

  function parkRichContainer(card){
    const container=document.getElementById('public-rich-sections');
    if(!container||!card?.contains(container))return container;
    const parking=card.querySelector('.music-section-parking');
    if(parking&&container.parentElement!==parking)parking.appendChild(container);
    container.hidden=true;
    container.setAttribute('aria-hidden','true');
    return container;
  }

  function ensureRichTile(rail,type){
    const meta=RICH_ROOMS[type];
    const source=richSection(type);
    let tile=rail.querySelector(`[data-showtime-rich-room="${type}"]`);
    if(!meta||!source){
      tile?.remove();
      return null;
    }
    if(!tile){
      tile=document.createElement('button');
      tile.type='button';
      tile.className='music-luxe-tile music-bottom-swipe-item music-bottom-swipe-rich';
      tile.dataset.showtimeRichRoom=type;
      tile.dataset.artistHubKey=type;
      tile.setAttribute('aria-label',meta.title);
      tile.innerHTML=`<span class="music-luxe-icon">${icon(meta.icon,21)}</span><strong>${meta.label}</strong>`;
      tile.addEventListener('click',event=>{
        event.preventDefault();
        openRichRoom(type);
      });
      rail.appendChild(tile);
    }
    tile.hidden=false;
    return tile;
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
    parkRichContainer(card);
    const tiles=[...card.querySelectorAll('.music-luxe-tile:not(.music-bottom-swipe-rich)')];
    const pick=name=>tiles.find(tile=>label(tile)===name)||null;
    const gallery=pick('gallery');
    const book=pick('book me');
    const epk=pick('epk');

    [gallery,book,epk].filter(Boolean).forEach(node=>{
      node.classList.add('music-bottom-swipe-item');
      if(node.parentNode!==rail)rail.appendChild(node);
    });

    const hours=ensureRichTile(rail,'hours');
    const location=ensureRichTile(rail,'location');

    const innerSource=card.querySelector('.music-secondary-row .music-inner-circle')||card.querySelector('.music-inner-circle');
    const showSource=card.querySelector('.music-secondary-row .music-upcoming-show')||card.querySelector('.music-upcoming-show');
    const inner=ensureProxy(rail,innerSource,'inner');
    const show=ensureProxy(rail,showSource,'show');

    /* Reassert a deterministic order even after room/home scripts touch the DOM. */
    [gallery,book,epk,hours,location,inner,show].filter(Boolean).forEach(node=>rail.appendChild(node));
    return [gallery,book,epk,hours,location,inner,show].filter(Boolean);
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
    if(window.lucide)try{lucide.createIcons();}catch(_){}
    return items.length>=5;
  }

  /* Rich sections arrive asynchronously after the card, so keep retries bounded
     but long enough for Supabase/network hydration. */
  [0,90,220,480,900,1500,2400,3400,4800,7000,10000,12000].forEach(delay=>setTimeout(mount,delay));

  document.addEventListener('click',event=>{
    if(!isMusic())return;
    if(event.target?.closest?.('.music-luxe-tile,.music-inner-circle,.music-upcoming-show,.music-bottom-swipe-proxy')){
      setTimeout(mount,120);
      setTimeout(mount,360);
    }
  },true);

  document.addEventListener('liw:card-loader-ready',()=>{
    setTimeout(mount,60);
    setTimeout(mount,420);
    setTimeout(mount,1200);
  });
  window.addEventListener('pageshow',()=>setTimeout(mount,80));
})();