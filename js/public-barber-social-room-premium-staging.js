/* LIW Cards staging — premium Barber Social room.
   Decorates the existing LIW Social source immediately before the Barber client
   room clones it. Event-driven only: no polling, observers or animation loops. */
(function(){
  'use strict';
  if(new URLSearchParams(location.search).get('embed')==='1')return;
  if(window.__LIW_BARBER_SOCIAL_ROOM_PREMIUM__)return;
  window.__LIW_BARBER_SOCIAL_ROOM_PREMIUM__=true;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>Array.from(scope.querySelectorAll(selector));
  const cardData=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:{};}catch(_){return {};}};
  const studioMode=()=>document.documentElement.classList.contains('liw-public-studio')||document.body?.classList.contains('liw-public-studio');
  const validHex=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value):fallback;
  function mixHex(a,b,t){
    const A=validHex(a,'#ffffff').slice(1),B=validHex(b,'#111827').slice(1),p=Math.max(0,Math.min(1,Number(t)||0));
    const n=i=>Math.round(parseInt(A.slice(i,i+2),16)*(1-p)+parseInt(B.slice(i,i+2),16)*p).toString(16).padStart(2,'0');
    return '#'+n(0)+n(2)+n(4);
  }
  function studioTheme(){
    const d=cardData();
    const bg=validHex(d.background_color,'#ffffff');
    const text=validHex(d.text_color,'#111827');
    const accent=validHex(d.secondary_color,'#d4a84f');
    return {bg,text,accent,surface:mixHex(bg,text,.055),surface2:mixHex(bg,text,.085),muted:mixHex(text,bg,.42),line:mixHex(bg,text,.14)};
  }
  function studioName(){
    const d=cardData();
    return String(d.company_name||d.full_name||'the Studio').trim().slice(0,55)||'the Studio';
  }

  function isBarber(){
    const card=q('#card');
    return Boolean(card&&!card.hidden&&card.classList.contains('barbershop-card-active'));
  }

  function brandFor(icon){
    if(!icon)return '#d4a84f';
    let brand='';
    try{brand=getComputedStyle(icon).getPropertyValue('--brand').trim();}catch(_){ }
    if(!/^#[0-9a-f]{6}$/i.test(brand)){
      const match=String(icon.getAttribute('style')||'').match(/--brand\s*:\s*(#[0-9a-f]{6})/i);
      brand=match?.[1]||'';
    }
    return /^#[0-9a-f]{6}$/i.test(brand)?brand:'#d4a84f';
  }

  function setImportant(el,name,value){
    if(!el)return;
    try{el.style.setProperty(name,value,'important');}catch(_){ }
  }

  function platformName(anchor){
    const label=qa('span',anchor).find(span=>!span.classList.contains('social-brand-icon'));
    return String(label?.textContent||anchor.textContent||'Social').trim().replace(/\s+/g,' ').slice(0,40)||'Social';
  }

  function ensureHero(section,list){
    let hero=q('[data-barber-social-premium-hero]',section);
    if(!hero){
      hero=document.createElement('div');
      hero.dataset.barberSocialPremiumHero='true';
      hero.innerHTML='<span>STAY CONNECTED</span><strong></strong><p></p>';
      list.insertAdjacentElement('beforebegin',hero);
    }
    setImportant(hero,'display','grid');
    setImportant(hero,'gap','5px');
    setImportant(hero,'margin','0 0 15px');
    setImportant(hero,'padding','16px 16px 15px');
    setImportant(hero,'border','1px solid rgba(255,255,255,.08)');
    setImportant(hero,'border-radius','20px');
    const st=studioTheme();
    setImportant(hero,'background',studioMode()?`linear-gradient(145deg,${st.surface},${st.bg})`:'radial-gradient(circle at 92% 0,rgba(212,168,79,.14),transparent 34%),linear-gradient(145deg,#15151b,#0b0b0f)');
    setImportant(hero,'box-shadow',studioMode()?'0 12px 28px rgba(15,23,42,.10)':'0 12px 30px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.045)');
    const kicker=q('span',hero),title=q('strong',hero),copy=q('p',hero);
    if(studioMode()){title.textContent='Connect with '+studioName();copy.textContent='See new work, openings and Studio updates — tap a platform to connect.';}
    else{title.textContent='Follow the shop';copy.textContent='Fresh work, updates and shop news — tap a platform to connect.';}
    setImportant(kicker,'color',studioMode()?st.accent:'var(--a,#d4a84f)');
    setImportant(kicker,'font-size','.58rem');
    setImportant(kicker,'font-weight','950');
    setImportant(kicker,'letter-spacing','.14em');
    setImportant(title,'color',studioMode()?st.text:'#f8f8fb');
    setImportant(title,'font-size','1.35rem');
    setImportant(title,'line-height','1.05');
    setImportant(title,'letter-spacing','-.025em');
    setImportant(copy,'margin','2px 0 0');
    setImportant(copy,'color',studioMode()?st.muted:'rgba(248,248,251,.64)');
    setImportant(copy,'font-size','.72rem');
    setImportant(copy,'line-height','1.45');
  }

  function ensureFooter(section,list){
    let note=q('[data-barber-social-premium-note]',section);
    if(!note){
      note=document.createElement('div');
      note.dataset.barberSocialPremiumNote='true';
      note.textContent=studioMode()?'Tap any platform to open the official social profile.':'Tap any platform to open the barber’s official social page.';
      list.insertAdjacentElement('afterend',note);
    }
    setImportant(note,'margin','13px 4px 2px');
    setImportant(note,'color',studioMode()?studioTheme().muted:'rgba(248,248,251,.48)');
    setImportant(note,'font-size','.62rem');
    setImportant(note,'line-height','1.45');
    setImportant(note,'text-align','center');
  }

  function decorateCard(anchor,index){
    if(!anchor)return;
    const icon=q('.social-brand-icon',anchor);
    const brand=brandFor(icon);
    const label=platformName(anchor);

    anchor.dataset.barberSocialPremium='true';
    anchor.setAttribute('aria-label',`Open ${label}`);
    setImportant(anchor,'display','grid');
    setImportant(anchor,'grid-template-columns','48px minmax(0,1fr) auto');
    setImportant(anchor,'align-items','center');
    setImportant(anchor,'gap','12px');
    setImportant(anchor,'min-height','70px');
    setImportant(anchor,'padding','10px 12px');
    setImportant(anchor,'border',`1px solid ${brand}42`);
    setImportant(anchor,'border-radius','18px');
    const st=studioTheme();
    setImportant(anchor,'background',studioMode()?`linear-gradient(135deg,${st.surface2},${st.surface})`:'linear-gradient(135deg,#15151b,#0e0e13)');
    setImportant(anchor,'color',studioMode()?st.text:'#f8f8fb');
    setImportant(anchor,'text-decoration','none');
    setImportant(anchor,'box-shadow',`inset 4px 0 0 ${brand},0 8px 18px rgba(0,0,0,.14)`);
    setImportant(anchor,'position','relative');
    setImportant(anchor,'overflow','hidden');

    if(icon){
      setImportant(icon,'display','grid');
      setImportant(icon,'place-items','center');
      setImportant(icon,'width','46px');
      setImportant(icon,'height','46px');
      setImportant(icon,'min-width','46px');
      setImportant(icon,'border-radius','15px');
      setImportant(icon,'background',`${brand}18`);
      setImportant(icon,'border',`1px solid ${brand}3d`);
      setImportant(icon,'color',brand);
      setImportant(icon,'box-shadow',`inset 0 0 0 1px ${brand}10`);
      const svg=q('svg',icon);
      if(svg){
        setImportant(svg,'width','22px');
        setImportant(svg,'height','22px');
        setImportant(svg,'display','block');
      }
    }

    const labelNode=qa('span',anchor).find(span=>!span.classList.contains('social-brand-icon')&&!span.dataset.barberSocialArrow);
    if(labelNode){
      setImportant(labelNode,'color',studioMode()?st.text:'#f8f8fb');
      setImportant(labelNode,'font-size','1rem');
      setImportant(labelNode,'font-weight','800');
      setImportant(labelNode,'letter-spacing','-.01em');
    }

    let arrow=q('[data-barber-social-arrow]',anchor);
    if(!arrow){
      arrow=document.createElement('span');
      arrow.dataset.barberSocialArrow='true';
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent='↗';
      anchor.appendChild(arrow);
    }
    setImportant(arrow,'display','grid');
    setImportant(arrow,'place-items','center');
    setImportant(arrow,'width','30px');
    setImportant(arrow,'height','30px');
    setImportant(arrow,'border-radius','50%');
    setImportant(arrow,'background',`${brand}14`);
    setImportant(arrow,'border',`1px solid ${brand}35`);
    setImportant(arrow,'color',brand);
    setImportant(arrow,'font-size','.92rem');
    setImportant(arrow,'font-weight','900');

    anchor.style.setProperty('--barber-social-index',String(index));
  }

  function decorateSocialRoom(){
    if(!isBarber())return false;
    const section=q('#social-section');
    const list=q('#socials',section)||q('.public-socials',section);
    if(!section||!list)return false;

    const links=qa('a,button',list).filter(item=>!item.hasAttribute('hidden'));
    if(!links.length)return false;

    section.dataset.barberSocialRoomPremium='true';
    setImportant(section,'display','block');
    setImportant(section,'margin','0');
    setImportant(section,'padding','14px');
    const st=studioTheme();
    setImportant(section,'border',studioMode()?`1px solid ${st.line}`:'1px solid rgba(255,255,255,.06)');
    setImportant(section,'border-radius','24px');
    setImportant(section,'background',studioMode()?st.bg:'linear-gradient(180deg,#0f0f14,#09090d)');
    setImportant(section,'box-shadow',studioMode()?'0 16px 34px rgba(15,23,42,.10)':'0 18px 42px rgba(0,0,0,.22)');
    setImportant(section,'color',studioMode()?st.text:'#f8f8fb');

    const oldHeading=q('.public-section-heading',section);
    if(oldHeading)setImportant(oldHeading,'display','none');
    setImportant(list,'display','grid');
    setImportant(list,'gap','11px');

    ensureHero(section,list);
    links.forEach(decorateCard);
    ensureFooter(section,list);
    return true;
  }

  function installRoomBridge(){
    const room=window.LIWBarberClientRoom;
    if(!room||typeof room.setRoom!=='function'||room.setRoom.__barberSocialPremiumWrapped)return false;
    const original=room.setRoom.bind(room);
    const wrapped=function(key){
      if(key==='social'){
        try{window.LIWBarberSocialSvg?.paint?.();}catch(_){ }
        decorateSocialRoom();
      }
      return original(key);
    };
    wrapped.__barberSocialPremiumWrapped=true;
    room.setRoom=wrapped;
    return true;
  }

  function install(){
    if(installRoomBridge())return;
    const once=()=>installRoomBridge();
    window.addEventListener('liw:barber-client-ready',once,{once:true,passive:true});
  }

  window.LIWBarberSocialRoomPremium={decorate:decorateSocialRoom,install:installRoomBridge};
  install();
})();

/* Load the surface-aware Barber room readability bridge after the existing room
   decorators. It stamps contrast/icon styles onto source DOM before iframe cloning. */
(function loadBarberRoomReadability(){
  'use strict';
  if(new URLSearchParams(location.search).get('embed')==='1')return;
  if(document.querySelector('script[data-liw-barber-room-readability]'))return;
  const script=document.createElement('script');
  script.src='js/public-barber-room-readability-staging.js?v=20260911-room-readability-1';
  script.defer=true;
  script.dataset.liwBarberRoomReadability='true';
  document.body.appendChild(script);
})();
