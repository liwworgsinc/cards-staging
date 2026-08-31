/* LIW Cards staging — keep Flow name/title/company aligned with the avatar. */
(function(){
  'use strict';
  if(window.__LIW_FLOW_IDENTITY_FOLLOW_AVATAR__)return;
  window.__LIW_FLOW_IDENTITY_FOLLOW_AVATAR__=true;

  let resizeTimer=0;

  function sync(){
    const card=document.getElementById('card');
    const avatar=document.getElementById('avatar');
    const identity=card?.querySelector('.swipe-fixed-identity');
    const content=card?.querySelector('.public-content');
    if(!card||!avatar||!identity||!content||!card.classList.contains('swipe-card-active'))return false;

    const cardRect=card.getBoundingClientRect();
    const avatarRect=avatar.getBoundingClientRect();
    const contentRect=content.getBoundingClientRect();
    if(!cardRect.width||!avatarRect.width||!contentRect.width)return false;

    const avatarCenter=(avatarRect.left+avatarRect.width/2)-cardRect.left;
    const ratio=avatarCenter/cardRect.width;
    const align=ratio<0.42?'left':ratio>0.58?'right':'center';

    const leftInset=Math.max(0,Math.round(avatarRect.left-contentRect.left));
    const rightInset=Math.max(0,Math.round(contentRect.right-avatarRect.right));

    card.dataset.flowIdentityAlign=align;
    card.style.setProperty('--flow-identity-left-inset',`${leftInset}px`);
    card.style.setProperty('--flow-identity-right-inset',`${rightInset}px`);
    return true;
  }

  function schedule(){
    requestAnimationFrame(()=>requestAnimationFrame(sync));
  }

  const card=document.getElementById('card');
  if(card){
    const observer=new MutationObserver(schedule);
    observer.observe(card,{attributes:true,attributeFilter:['class','style'],childList:true,subtree:true});
  }

  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(schedule,80);
  },{passive:true});

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(sync()||attempts>=80)clearInterval(timer);
  },125);

  if(document.readyState==='complete')schedule();
  else window.addEventListener('load',schedule,{once:true});
})();
