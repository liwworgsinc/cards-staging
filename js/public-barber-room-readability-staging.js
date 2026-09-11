/* LIW Cards staging — Barber iframe-room readability bridge.
   Applies surface-aware contrast and icon visibility to the source DOM immediately
   before the existing client-room engine clones it into sandboxed srcdoc.
   Event-driven only: no polling, MutationObserver, setInterval or animation loop. */
(function(){
  'use strict';
  if(window.__LIW_BARBER_ROOM_READABILITY__)return;
  window.__LIW_BARBER_ROOM_READABILITY__=true;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>Array.from(scope.querySelectorAll(selector));
  const setImportant=(el,name,value)=>{if(el)try{el.style.setProperty(name,value,'important');}catch(_){}};

  function isBarber(){
    const card=q('#card');
    return Boolean(card&&!card.hidden&&card.classList.contains('barbershop-card-active'));
  }

  function cardData(){
    try{return typeof publicCard!=='undefined'&&publicCard?publicCard:{};}catch(_){return {};}
  }

  function parseColor(value){
    const raw=String(value||'').trim();
    if(/^#[0-9a-f]{3}$/i.test(raw)){
      return raw.slice(1).split('').map(ch=>parseInt(ch+ch,16));
    }
    if(/^#[0-9a-f]{6}$/i.test(raw)){
      return [parseInt(raw.slice(1,3),16),parseInt(raw.slice(3,5),16),parseInt(raw.slice(5,7),16)];
    }
    const match=raw.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i);
    return match?[Number(match[1]),Number(match[2]),Number(match[3])]:null;
  }

  function luminance(value){
    const rgb=parseColor(value);
    if(!rgb)return 0;
    const linear=rgb.slice(0,3).map(channel=>{
      const c=Math.max(0,Math.min(255,channel))/255;
      return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);
    });
    return 0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
  }

  function contrast(a,b){
    const la=luminance(a),lb=luminance(b);
    const hi=Math.max(la,lb),lo=Math.min(la,lb);
    return (hi+0.05)/(lo+0.05);
  }

  function bestText(background){
    const softDark='#111827';
    const softLight='#F8FAFC';
    const darkScore=contrast(background,softDark);
    const lightScore=contrast(background,softLight);
    if(Math.max(darkScore,lightScore)>=4.5)return darkScore>=lightScore?softDark:softLight;
    return contrast(background,'#000000')>=contrast(background,'#FFFFFF')?'#000000':'#FFFFFF';
  }

  function bestAccent(background,primary,secondary){
    if(parseColor(primary)&&contrast(background,primary)>=3)return primary;
    if(parseColor(secondary)&&contrast(background,secondary)>=3)return secondary;
    return bestText(background);
  }

  function currentRoomBackground(){
    const data=cardData();
    if(parseColor(data.background_color))return data.background_color;
    const card=q('#card');
    try{
      const bg=getComputedStyle(card).backgroundColor;
      if(parseColor(bg))return bg;
    }catch(_){ }
    return '#090909';
  }

  function sourceFor(key){
    if(key==='cuts')return q('#services-section');
    if(key==='social')return q('#social-section');
    if(key==='shop')return q('#products-section');
    if(key==='inquiry')return q('#lead-section');
    if(key==='gallery')return q('#public-rich-sections [data-public-rich="gallery"]')||q('[data-public-rich="gallery"]');
    if(key==='reviews')return q('#public-rich-sections [data-public-rich="testimonials"]')||q('[data-public-rich="testimonials"]');
    if(key==='map')return q('#public-rich-sections [data-public-rich="location"]')||q('[data-public-rich="location"]');
    return null;
  }

  function styleSvg(svg,color){
    if(!svg||svg.closest('.social-brand-icon'))return;
    setImportant(svg,'color',color);
    setImportant(svg,'opacity','1');
    setImportant(svg,'visibility','visible');
    setImportant(svg,'stroke','currentColor');
    qa('path,line,polyline,circle,rect,polygon',svg).forEach(shape=>{
      const fill=String(shape.getAttribute('fill')||'').toLowerCase();
      const stroke=String(shape.getAttribute('stroke')||'').toLowerCase();
      if(stroke&&stroke!=='none')setImportant(shape,'stroke','currentColor');
      else if(!fill||fill==='none')setImportant(shape,'stroke','currentColor');
      if(fill&&fill!=='none')setImportant(shape,'fill','currentColor');
      setImportant(shape,'opacity','1');
      setImportant(shape,'visibility','visible');
    });
  }

  function stylePanel(panel,panelBackground,panelText,panelAccent){
    setImportant(panel,'background',panelBackground);
    setImportant(panel,'color',panelText);
    setImportant(panel,'border-color',`${panelAccent}38`);

    qa('h1,h2,h3,h4,h5,h6,p,span,strong,small,b,em,.muted,[class*="title"],[class*="price"],[class*="name"],[class*="description"]',panel).forEach(node=>{
      if(node.closest('.social-brand-icon'))return;
      setImportant(node,'color',panelText);
      setImportant(node,'opacity','1');
      setImportant(node,'visibility','visible');
    });

    qa('svg',panel).forEach(svg=>styleSvg(svg,panelAccent));
    qa('i[data-lucide]',panel).forEach(icon=>{
      setImportant(icon,'color',panelAccent);
      setImportant(icon,'opacity','1');
      setImportant(icon,'visibility','visible');
    });
  }

  function prepareRoom(key){
    if(!isBarber())return false;
    const source=sourceFor(key);
    if(!source)return false;

    const data=cardData();
    const background=currentRoomBackground();
    const roomText=bestText(background);
    const primary=parseColor(data.primary_color)?data.primary_color:'#111111';
    const secondary=parseColor(data.secondary_color)?data.secondary_color:'#d4a84f';
    const roomAccent=bestAccent(background,primary,secondary);
    const panelBackground='#12100e';
    const panelText=bestText(panelBackground);
    const panelAccent=bestAccent(panelBackground,primary,secondary);

    source.dataset.liwBarberRoomContrast='surface-aware-v1';
    setImportant(source,'color',roomText);

    qa('.public-section-heading h2,.public-rich-head h2',source).forEach(el=>setImportant(el,'color',roomText));
    qa('.public-section-heading span,.public-rich-head span',source).forEach(el=>setImportant(el,'color',roomAccent));
    qa('.public-section-heading,.public-rich-head',source).forEach(el=>setImportant(el,'border-color',`${roomAccent}35`));

    qa('.public-product-card,.product-card,.public-service-item,.service-card,.public-testimonial,.public-location-card',source)
      .forEach(panel=>stylePanel(panel,panelBackground,panelText,panelAccent));

    qa('svg',source).forEach(svg=>{
      if(svg.closest('.public-product-card,.product-card,.public-service-item,.service-card,.public-testimonial,.public-location-card'))return;
      styleSvg(svg,roomAccent);
    });

    qa('.social-brand-icon img,[data-barber-social-icon-image]',source).forEach(img=>{
      setImportant(img,'display','block');
      setImportant(img,'opacity','1');
      setImportant(img,'visibility','visible');
      setImportant(img,'max-width','24px');
      setImportant(img,'max-height','24px');
    });

    return true;
  }

  function install(){
    const api=window.LIWBarberClientRoom;
    if(!api||typeof api.setRoom!=='function'||api.setRoom.__liwBarberReadabilityWrapped)return false;
    const original=api.setRoom.bind(api);
    const wrapped=function(key){
      if(key&&key!=='home'&&key!=='book')prepareRoom(key);
      return original(key);
    };
    wrapped.__liwBarberReadabilityWrapped=true;
    api.setRoom=wrapped;
    return true;
  }

  window.LIWBarberRoomReadability={prepare:prepareRoom,install};
  if(!install())window.addEventListener('liw:barber-client-ready',install,{once:true,passive:true});
})();
