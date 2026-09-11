/* LIW Cards staging — surface-aware automatic contrast.
   Extends the shared LIWAutoContrast engine for cards that mix light and dark
   panels in one experience. Event-driven only: no observers, polling or loops. */
(function(global){
  'use strict';
  if(global.__LIW_AUTO_CONTRAST_SURFACES__)return;
  global.__LIW_AUTO_CONTRAST_SURFACES__=true;

  const engine=global.LIWAutoContrast;
  if(!engine)return;

  function colorParts(value){
    const input=String(value||'').trim().toLowerCase();
    if(!input||input==='transparent')return null;
    if(input[0]==='#'){
      const hex=input.slice(1);
      if(/^[0-9a-f]{3}$/i.test(hex))return {r:parseInt(hex[0]+hex[0],16),g:parseInt(hex[1]+hex[1],16),b:parseInt(hex[2]+hex[2],16),a:1};
      if(/^[0-9a-f]{6}$/i.test(hex))return {r:parseInt(hex.slice(0,2),16),g:parseInt(hex.slice(2,4),16),b:parseInt(hex.slice(4,6),16),a:1};
    }
    const match=input.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
    if(!match)return null;
    return {r:Number(match[1]),g:Number(match[2]),b:Number(match[3]),a:match[4]===undefined?1:Math.max(0,Math.min(1,Number(match[4])))};
  }

  function toHex(parts){
    const hex=n=>Math.max(0,Math.min(255,Math.round(n))).toString(16).padStart(2,'0');
    return `#${hex(parts.r)}${hex(parts.g)}${hex(parts.b)}`;
  }

  function composite(foreground,background){
    const a=Math.max(0,Math.min(1,foreground.a??1));
    return {
      r:foreground.r*a+background.r*(1-a),
      g:foreground.g*a+background.g*(1-a),
      b:foreground.b*a+background.b*(1-a),
      a:1
    };
  }

  function firstGradientColor(value){
    const matches=String(value||'').match(/rgba?\([^)]*\)|#[0-9a-f]{3,6}\b/ig)||[];
    for(const token of matches){
      const parts=colorParts(token);
      if(parts&&parts.a>0.18)return parts;
    }
    return null;
  }

  function resolvedBackground(element,fallback='#ffffff',depth=0){
    const fallbackParts=colorParts(fallback)||{r:255,g:255,b:255,a:1};
    if(!element||depth>5||typeof getComputedStyle!=='function')return toHex(fallbackParts);
    let style;
    try{style=getComputedStyle(element);}catch(_){return toHex(fallbackParts);}

    const parentBackground=element.parentElement
      ? colorParts(resolvedBackground(element.parentElement,fallback,depth+1))||fallbackParts
      : fallbackParts;
    const solid=colorParts(style.backgroundColor);
    if(solid&&solid.a>0){
      return toHex(solid.a>=.995?solid:composite(solid,parentBackground));
    }
    const gradient=firstGradientColor(style.backgroundImage);
    if(gradient)return toHex(gradient.a>=.995?gradient:composite(gradient,parentBackground));
    return toHex(parentBackground);
  }

  function mix(foreground,background,amount=.72){
    const fg=colorParts(foreground);
    const bg=colorParts(background);
    if(!fg||!bg)return foreground;
    const n=Math.max(0,Math.min(1,amount));
    return toHex({r:fg.r*n+bg.r*(1-n),g:fg.g*n+bg.g*(1-n),b:fg.b*n+bg.b*(1-n),a:1});
  }

  function readableMuted(text,background){
    const candidate=mix(text,background,.72);
    return engine.contrastRatio(candidate,background)>=4.5?candidate:text;
  }

  function applySurface(element,{fallback='#ffffff',accent='#0b1438',setColor=true}={}){
    if(!element)return null;
    const background=resolvedBackground(element,fallback);
    const text=engine.bestText(background);
    const muted=readableMuted(text,background);
    const readableAccent=engine.accessibleColor(accent,background,4.5);
    element.dataset.liwContrastSurface='true';
    element.style.setProperty('--liw-surface-bg',background);
    element.style.setProperty('--liw-surface-text',text);
    element.style.setProperty('--liw-surface-muted',muted);
    element.style.setProperty('--liw-surface-accent',readableAccent);
    if(setColor)element.style.setProperty('color',text,'important');
    return {background,text,muted,accent:readableAccent};
  }

  function setColor(node,color){
    if(node&&color)node.style.setProperty('color',color,'important');
  }

  function applyBarber(card,baseBackground,primary,secondary){
    if(!card.classList.contains('barbershop-card-active'))return;

    const home=card.querySelector('.barber-client-home');
    const homeColors=applySurface(home,{fallback:baseBackground,accent:secondary});
    if(home&&homeColors){
      home.style.setProperty('--barber-text',homeColors.text);
      setColor(home.querySelector('h1'),homeColors.text);
      setColor(home.querySelector('.barber-welcome-specialty'),homeColors.muted);
      setColor(home.querySelector('.barber-welcome-kicker'),homeColors.accent);
      const hint=home.querySelector('.barber-client-hint');
      const hintColors=applySurface(hint,{fallback:homeColors.background,accent:secondary});
      if(hintColors){
        setColor(hint,hintColors.muted);
        setColor(hint.querySelector('.barber-hint-symbol'),hintColors.accent);
      }
    }

    const promo=card.querySelector('.barber-client-promo');
    const promoColors=applySurface(promo,{fallback:'#17130d',accent:secondary});
    if(promo&&promoColors){
      promo.style.setProperty('--barber-text',promoColors.text);
      setColor(promo.querySelector('strong'),promoColors.text);
      setColor(promo.querySelector('p'),promoColors.muted);
      setColor(promo.querySelector('.barber-client-promo-label'),promoColors.accent);
      setColor(promo.querySelector('.barber-promo-symbol'),promoColors.accent);
    }

    const frameTop=card.querySelector('.barber-iframe-top');
    const frameColors=applySurface(frameTop,{fallback:'#0d0c0a',accent:secondary});
    if(frameTop&&frameColors){
      frameTop.style.setProperty('--barber-text',frameColors.text);
      setColor(frameTop.querySelector('[data-barber-frame-title]'),frameColors.text);
      setColor(frameTop.querySelector('small'),frameColors.accent);
      setColor(frameTop.querySelector('.barber-iframe-live'),frameColors.muted);
    }

    const booking=card.querySelector('.barber-booking-host');
    const bookingColors=applySurface(booking,{fallback:baseBackground,accent:secondary});
    if(booking&&bookingColors)booking.style.setProperty('--barber-text',bookingColors.text);

    const dock=card.querySelector('.barber-revolve-dock');
    const dockColors=applySurface(dock,{fallback:'#0a0908',accent:secondary,setColor:false});
    if(dock&&dockColors){
      dock.style.setProperty('--barber-text',dockColors.text);
      dock.style.setProperty('--liw-dock-text',dockColors.text);
    }
  }

  function applyStandardSurfaces(card,baseBackground,primary,secondary){
    const surfaces=card.querySelectorAll('.public-section,.swipe-panel,.flow-panel,.music-artist-room,.music-luxe-launcher');
    surfaces.forEach(surface=>{
      const colors=applySurface(surface,{fallback:baseBackground,accent:primary,setColor:false});
      if(!colors)return;
      surface.style.setProperty('--liw-auto-text',colors.text);
      surface.style.setProperty('--liw-auto-accent',colors.accent);
      surface.style.setProperty('--liw-auto-muted',colors.muted);
      const heading=surface.querySelector(':scope > .public-section-heading h2,:scope > .public-rich-head h2');
      if(heading&&engine.contrastRatio(getComputedStyle(heading).color,colors.background)<4.5)setColor(heading,colors.text);
    });
  }

  function applySurfaces(){
    if(typeof document==='undefined')return false;
    const card=document.getElementById('card');
    if(!card||card.hidden)return false;
    let data={};
    try{data=typeof publicCard!=='undefined'&&publicCard?publicCard:{};}catch(_){ }
    const computed=getComputedStyle(card);
    const baseBackground=engine.rgb(data.background_color)?data.background_color:resolvedBackground(card,'#ffffff');
    const primary=engine.rgb(data.primary_color)?data.primary_color:(computed.getPropertyValue('--card-primary').trim()||'#0b1438');
    const secondary=engine.rgb(data.secondary_color)?data.secondary_color:(computed.getPropertyValue('--card-secondary').trim()||primary);

    applyStandardSurfaces(card,baseBackground,primary,secondary);
    applyBarber(card,baseBackground,primary,secondary);
    card.dataset.liwSurfaceContrast='true';
    return true;
  }

  engine.resolvedBackground=resolvedBackground;
  engine.applySurface=applySurface;
  engine.applySurfaces=applySurfaces;

  global.addEventListener('liw:auto-contrast-applied',applySurfaces,{passive:true});
  global.addEventListener('liw:barber-client-ready',applySurfaces,{passive:true});
  global.addEventListener('load',applySurfaces,{once:true,passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applySurfaces,{once:true});
  else applySurfaces();
})(typeof window!=='undefined'?window:globalThis);
