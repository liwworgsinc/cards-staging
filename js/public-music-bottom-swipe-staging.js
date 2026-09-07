/* LIW Cards staging — Music-only swipe rail for Gallery, Book Me, EPK, Inner Circle and Next Show. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_BOTTOM_SWIPE__)return;
  window.__LIW_MUSIC_BOTTOM_SWIPE__=true;

  function data(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(data()?.card_experience||'').toLowerCase()==='music';}

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
    return head;
  }

  function mount(){
    if(!isMusic())return false;
    const card=document.querySelector('#card.music-card-active.music-artist-hub-v3');
    const launcher=card?.querySelector('.music-luxe-launcher');
    const more=launcher?.querySelector('.music-hub-more');
    const moreGrid=more?.querySelector('.music-hub-more-grid');
    const secondary=card?.querySelector('.music-secondary-row');
    if(!card||card.hidden||!launcher||!more||!moreGrid||!secondary)return false;

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
        const amount=Math.max(140,Math.round(rail.clientWidth*.46));
        rail.scrollBy({left:event.key==='ArrowRight'?amount:-amount,behavior:'smooth'});
      });
    }

    if(moreGrid.parentNode!==rail)rail.appendChild(moreGrid);
    if(secondary.parentNode!==rail)rail.appendChild(secondary);
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries+=1;
    if(mount()||tries>=60)clearInterval(timer);
  },100);

  document.addEventListener('click',event=>{
    if(!isMusic())return;
    if(event.target?.closest?.('.music-luxe-tile,.music-inner-circle,.music-upcoming-show'))setTimeout(mount,120);
  },true);

  setTimeout(mount,0);
})();
