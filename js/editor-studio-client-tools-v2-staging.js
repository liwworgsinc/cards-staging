/* LIW Cards staging — Studio Client Tools V2.
   Keeps Studio users inside the Control Center while editing the real LIW controls.
   Existing DOM nodes are portaled temporarily so their original listeners/state remain intact. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_CLIENT_TOOLS_V2__)return;
  window.__LIW_STUDIO_CLIENT_TOOLS_V2__=true;

  const TYPES={
    barber:{label:'Barber',short:'Barber',cta:'BOOK BARBER',service:'Barber services',portfolio:'Barber portfolio'},
    hair:{label:'Hair Stylist',short:'Hair',cta:'BOOK HAIR',service:'Hair services',portfolio:'Hair portfolio'},
    braider:{label:'Braider',short:'Braiding',cta:'BOOK BRAIDS',service:'Braiding services',portfolio:'Braiding portfolio'},
    loctician:{label:'Loctician',short:'Loc',cta:'BOOK LOCS',service:'Loc services',portfolio:'Loc portfolio'},
    wig:{label:'Wig / Install Specialist',short:'Install',cta:'BOOK INSTALL',service:'Install services',portfolio:'Install portfolio'},
    nails:{label:'Nail Tech',short:'Nail',cta:'BOOK NAILS',service:'Nail services',portfolio:'Nail portfolio'},
    lashes:{label:'Lash Artist',short:'Lash',cta:'BOOK LASHES',service:'Lash services',portfolio:'Lash portfolio'},
    brows:{label:'Brow Artist',short:'Brow',cta:'BOOK BROWS',service:'Brow services',portfolio:'Brow portfolio'},
    makeup:{label:'Makeup Artist',short:'Makeup',cta:'BOOK MAKEUP',service:'Makeup services',portfolio:'Makeup portfolio'},
    esthetician:{label:'Esthetician',short:'Skin',cta:'BOOK SKIN',service:'Skin treatments',portfolio:'Skin results'},
    wax:{label:'Wax Specialist',short:'Wax',cta:'BOOK WAX',service:'Wax services',portfolio:'Wax portfolio'},
    massage:{label:'Massage Therapist',short:'Massage',cta:'BOOK MASSAGE',service:'Massage services',portfolio:'Wellness portfolio'},
    spa:{label:'Spa / Wellness',short:'Spa',cta:'BOOK SPA',service:'Spa services',portfolio:'Spa portfolio'},
    spraytan:{label:'Spray Tan Artist',short:'Spray Tan',cta:'BOOK TAN',service:'Spray tan services',portfolio:'Glow portfolio'},
    pmu:{label:'Permanent Makeup Artist',short:'PMU',cta:'BOOK PMU',service:'PMU services',portfolio:'PMU portfolio'},
    tattoo:{label:'Tattoo Artist',short:'Tattoo',cta:'REQUEST TATTOO',service:'Tattoo services',portfolio:'Tattoo portfolio'},
    piercing:{label:'Piercer',short:'Piercing',cta:'BOOK PIERCING',service:'Piercing services',portfolio:'Piercing portfolio'},
    toothgem:{label:'Tooth Gem Artist',short:'Tooth Gem',cta:'BOOK GEM',service:'Tooth gem services',portfolio:'Smile portfolio'},
    cosmetics:{label:'Beauty / Cosmetics',short:'Beauty',cta:'BOOK CONSULT',service:'Beauty services',portfolio:'Beauty portfolio'},
    salon:{label:'Salon / Multi-Service Studio',short:'Studio',cta:'BOOK NOW',service:'Studio services',portfolio:'Studio portfolio'},
    other:{label:'Studio Professional',short:'Studio',cta:'BOOK APPOINTMENT',service:'Studio services',portfolio:'Studio portfolio'}
  };

  let overlay=null;
  let portalState=null;
  let savedScroll=0;
  let returnView='tools';

  const q=(s,scope=document)=>scope.querySelector(s);
  const qa=(s,scope=document)=>Array.from(scope.querySelectorAll(s));
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function studioActive(){
    const mode=String(q('[name="color_mode"]')?.value||'').toLowerCase();
    const experience=String(q('[name="card_experience"]')?.value||'classic').toLowerCase();
    return mode==='barbershop'&&experience!=='music';
  }

  function currentType(){
    const select=q('[data-studio-primary]');
    if(select&&TYPES[select.value])return select.value;
    const api=window.LIWStudio?.businessType;
    if(api&&TYPES[api])return api;
    const active=q('[data-studio-business-type].is-active');
    const key=active?.dataset.studioBusinessType;
    return TYPES[key]?key:'other';
  }

  function meta(){return TYPES[currentType()]||TYPES.other;}

  function businessIcon(type,size=20){
    const open='<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
    const paths={
      barber:'<path d="M8 3h8l1 4-1.2 2.2V20H8.2V9.2L7 7l1-4Z"/><path d="M10 6h4M10.2 11.5h3.6M10.2 15h3.6"/>',
      hair:'<path d="M4 9c0-3.1 2.6-5 6.3-5h2.2c3.6 0 6.5 2.2 6.5 5.2 0 2.6-2.2 4.8-5 4.8H9"/><path d="M9 14v6M6.5 20h5"/>',
      nails:'<path d="M9 3h6v4H9z"/><path d="M8 7h8l1 3v10H7V10l1-3Z"/>',
      lashes:'<path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.1"/>',
      makeup:'<path d="m5 19 8.8-8.8 2 2L7 21H5v-2Z"/><path d="m14.4 9.6 3.8-5.3c.7-1 2.2-.9 2.8.1.4.7.3 1.5-.2 2.1l-4.7 4.4"/>',
      esthetician:'<circle cx="11" cy="12" r="7"/><path d="M8.5 11h.01M13.5 11h.01M9 15c1.1.9 2.9.9 4 0"/>',
      spa:'<path d="M12 20c-4.6 0-8-2.4-8-5.8 2.6-.4 4.8.1 6.5 1.5C9 12.1 9.8 8.7 12 5c2.2 3.7 3 7.1 1.5 10.7 1.7-1.4 3.9-1.9 6.5-1.5 0 3.4-3.4 5.8-8 5.8Z"/>',
      tattoo:'<path d="M4 20 15.5 8.5l3 3L7 23H4v-3Z"/><path d="m14 10 2-2 3 3-2 2"/>',
      cosmetics:'<path d="M9 3h6v5H9z"/><path d="M8 8h8v13H8z"/><path d="M10 13h4"/>',
      other:'<path d="M4 7h16v13H4z"/><path d="M8 7V4h8v3"/><path d="M8 12h8M8 16h5"/>'
    };
    const aliases={braider:'hair',loctician:'hair',wig:'hair',brows:'lashes',wax:'esthetician',massage:'spa',spraytan:'esthetician',pmu:'makeup',piercing:'tattoo',toothgem:'cosmetics',salon:'hair'};
    const iconType=paths[type]?type:(aliases[type]||'other');
    return open+(paths[iconType]||paths.other)+'</svg>';
  }

  function ensureStyles(){
    if(q('#liw-studio-client-tools-v2-style'))return;
    const style=document.createElement('style');
    style.id='liw-studio-client-tools-v2-style';
    style.textContent=`
      body.studio-quick-editor-open{overflow:hidden!important}
      .studio-quick-editor{position:fixed;inset:0;z-index:2147483000;display:grid;grid-template-rows:1fr;background:rgba(9,13,25,.58);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);padding:env(safe-area-inset-top) 0 0}
      .studio-quick-editor[hidden]{display:none!important}
      .studio-quick-editor__sheet{align-self:end;width:min(100%,720px);height:min(88dvh,860px);margin:0 auto;display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden;border-radius:26px 26px 0 0;background:#f8f9fc;box-shadow:0 -24px 70px rgba(8,15,35,.28);border:1px solid rgba(11,20,56,.09)}
      .studio-quick-editor__head{display:grid;grid-template-columns:42px minmax(0,1fr) 38px;align-items:center;gap:10px;padding:13px 15px;border-bottom:1px solid #e2e6ee;background:linear-gradient(145deg,#fff,#f3f5f9);position:relative}
      .studio-quick-editor__head::after{content:"";position:absolute;left:64px;right:64px;bottom:-1px;height:2px;border-radius:999px;background:linear-gradient(90deg,transparent,#d4a84f,transparent)}
      .studio-quick-editor__back,.studio-quick-editor__close{border:1px solid #dce1ea;background:#fff;color:#111827;width:38px;height:38px;border-radius:999px;display:grid;place-items:center;font:inherit;font-weight:900;cursor:pointer}
      .studio-quick-editor__copy{min-width:0;display:grid;gap:1px}.studio-quick-editor__copy small{color:#b78a39;font-size:.54rem;font-weight:950;letter-spacing:.13em}.studio-quick-editor__copy strong{font-size:.9rem;color:#111827;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.studio-quick-editor__copy span{font-size:.58rem;color:#747d8f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .studio-quick-editor__body{overflow:auto;-webkit-overflow-scrolling:touch;padding:15px 14px calc(26px + env(safe-area-inset-bottom));background:#f8f9fc}
      .studio-quick-editor__body>.business-tools-content,.studio-quick-editor__body>.editor-panel,.studio-quick-editor__body>.photo-upload,.studio-quick-editor__body>.premium-feature-section{display:block!important;width:100%!important;margin:0!important;max-width:none!important;box-shadow:none!important}
      .studio-quick-editor__body>.editor-panel{padding:0!important;background:transparent!important}
      .studio-quick-editor__body>.editor-panel>.panel-heading,.studio-quick-editor__body>.editor-panel>.editor-step-note,.studio-quick-editor__body>.editor-panel>.form-section:not(.studio-tool-focus),.studio-quick-editor__body>.editor-panel>.contact-block:not(.studio-tool-focus){display:none!important}
      .studio-tool-business-host{display:block!important}
      .studio-tool-business-host>.tool-editor-card,.studio-tool-business-host>#rich-card-builder{display:none!important}
      .studio-tool-business-host>.studio-tool-focus{display:block!important}
      .studio-tool-business-host>#rich-card-builder.studio-tool-focus{display:block!important;margin:0!important}
      .studio-tool-business-host>#rich-card-builder.studio-tool-focus .rich-card-builder-head{display:none!important}
      .studio-tool-business-host>#rich-card-builder.studio-tool-focus .rich-section-editor{display:none!important}
      .studio-tool-business-host>#rich-card-builder.studio-tool-focus .rich-section-editor.studio-tool-gallery-focus{display:block!important}
      .studio-tool-social-panel>*{display:none!important}
      .studio-tool-social-panel>.studio-tool-focus{display:block!important}
      .studio-tool-social-panel>#social-list.studio-tool-focus{display:grid!important}
      .studio-tool-social-panel>#add-social.studio-tool-focus{display:inline-flex!important}
      .studio-tool-social-panel .panel-heading{display:none!important}
      .studio-tool-portaled.tool-editor-card,.studio-tool-business-host>.tool-editor-card.studio-tool-focus,.studio-tool-portaled.premium-feature-section,.studio-tool-portaled.photo-upload{padding:16px!important;border:1px solid #e0e4eb!important;border-radius:20px!important;background:#fff!important;box-shadow:0 10px 28px rgba(15,23,42,.055)!important}
      .studio-tool-business-host>.tool-editor-card.studio-tool-focus{margin:0!important}
      .studio-portfolio-hub{display:grid;gap:10px}.studio-portfolio-intro{margin:0 0 4px;color:#697386;font-size:.7rem;line-height:1.5}.studio-portfolio-choice{display:grid;grid-template-columns:42px minmax(0,1fr) 22px;align-items:center;gap:11px;width:100%;padding:13px;border:1px solid #e0e4eb;border-radius:18px;background:#fff;color:#111827;text-align:left;font:inherit;box-shadow:0 8px 22px rgba(15,23,42,.045);cursor:pointer}.studio-portfolio-choice__icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(145deg,#f6eddc,#fff7e8);color:#b78938}.studio-portfolio-choice__icon svg{width:20px;height:20px}.studio-portfolio-choice strong{display:block;font-size:.76rem}.studio-portfolio-choice small{display:block;margin-top:3px;color:#7a8394;font-size:.6rem;line-height:1.35}.studio-portfolio-choice>span:last-child{font-size:1.35rem;color:#111827}
      #barber-control-center .barber-v5-look-preview.studio-look-preview-v2>span{width:40px!important;min-width:40px!important;height:40px!important;border-radius:12px!important;display:grid!important;place-items:center!important;background:linear-gradient(145deg,rgba(212,168,79,.22),rgba(255,255,255,.08))!important;color:#d4a84f!important}
      #barber-control-center .barber-v5-look-preview.studio-look-preview-v2>span svg{width:21px;height:21px}
      #barber-control-center .barber-v5-look-preview.studio-look-preview-v2 small{letter-spacing:.12em}
      #barber-control-center .barber-v5-look-preview.studio-look-preview-v2 em{border-radius:999px!important;padding:8px 12px!important}
      @media(max-width:540px){.studio-quick-editor__sheet{height:91dvh}.studio-quick-editor__body{padding:13px 12px calc(22px + env(safe-area-inset-bottom))}}
    `;
    document.head.appendChild(style);
  }

  function updateStudioCopy(){
    const center=q('#barber-control-center');
    if(!center||!studioActive())return false;
    const m=meta();
    const type=currentType();

    const lookHead=q('[data-barber-v5-panel="look"] .barber-v5-panel-head',center);
    if(lookHead){
      const strong=q('strong',lookHead);if(strong)strong.textContent='Studio look';
      const span=q('span',lookHead);if(span)span.textContent='Shape the look and feel your clients see before they book.';
    }

    const preview=q('.barber-v5-look-preview',center);
    if(preview){
      preview.classList.add('studio-look-preview-v2');
      const mark=q(':scope > span',preview);
      if(mark){mark.dataset.studioPreviewIcon='true';mark.innerHTML=businessIcon(type,21);}
      const small=q('small',preview);if(small)small.textContent='STUDIO PREVIEW';
      const cta=q('em',preview);if(cta)cta.textContent=m.cta;
    }

    const toolsPanel=q('[data-barber-v5-panel="tools"]',center);
    if(toolsPanel){
      const head=q('.barber-v5-panel-head',toolsPanel);
      const title=q('strong',head);if(title)title.textContent='Client tools';
      const sub=q('span',head);if(sub)sub.textContent='Open the exact Studio editor you need, make changes, then come right back here.';
      const booking=q('[data-barber-v5-jump="booking"]',toolsPanel);
      if(booking){
        const strong=q('strong',booking);if(strong)strong.textContent='Appointments';
        const small=q('small',booking);if(small)small.textContent='Manage booking setup and availability';
      }
      const services=q('[data-barber-v5-jump="services"]',toolsPanel);
      if(services){
        const strong=q('strong',services);if(strong)strong.textContent=m.service;
        const small=q('small',services);if(small)small.textContent='Services, pricing and details';
        const firstIcon=services.querySelector(':scope > svg, :scope > i');
        if(firstIcon&&firstIcon.tagName==='SVG')firstIcon.outerHTML=businessIcon(type,20);
      }
      const photos=q('[data-barber-v5-jump="photos"]',toolsPanel);
      if(photos){
        const strong=q('strong',photos);if(strong)strong.textContent=m.portfolio;
        const small=q('small',photos);if(small)small.textContent='Profile, cover and portfolio gallery';
      }
      const social=q('[data-barber-v5-jump="social"]',toolsPanel);
      if(social){
        const strong=q('strong',social);if(strong)strong.textContent='Social profiles';
        const small=q('small',social);if(small)small.textContent='Instagram, TikTok and more';
      }
    }
    if(window.lucide)try{lucide.createIcons();}catch(_){}
    return true;
  }

  function ensureOverlay(){
    ensureStyles();
    if(overlay?.isConnected)return overlay;
    overlay=document.createElement('div');
    overlay.className='studio-quick-editor';
    overlay.hidden=true;
    overlay.innerHTML=`
      <section class="studio-quick-editor__sheet" role="dialog" aria-modal="true" aria-label="Studio quick editor">
        <header class="studio-quick-editor__head">
          <button type="button" class="studio-quick-editor__back" data-studio-tool-back aria-label="Back">←</button>
          <div class="studio-quick-editor__copy"><small>STUDIO QUICK EDIT</small><strong data-studio-tool-title>Studio tools</strong><span data-studio-tool-subtitle>Edit without leaving Studio</span></div>
          <button type="button" class="studio-quick-editor__close" data-studio-tool-close aria-label="Close">×</button>
        </header>
        <div class="studio-quick-editor__body" data-studio-tool-body></div>
      </section>`;
    document.body.appendChild(overlay);
    q('[data-studio-tool-close]',overlay)?.addEventListener('click',closeOverlay);
    q('[data-studio-tool-back]',overlay)?.addEventListener('click',()=>{
      if(returnView==='portfolio-part'){restorePortal();showPortfolioHub();return;}
      closeOverlay();
    });
    overlay.addEventListener('click',event=>{
      const choice=event.target.closest?.('[data-studio-portfolio-part]');
      if(choice)openPortfolioPart(choice.dataset.studioPortfolioPart);
    });
    return overlay;
  }

  function setHeader(title,subtitle){
    ensureOverlay();
    const t=q('[data-studio-tool-title]',overlay);if(t)t.textContent=title;
    const s=q('[data-studio-tool-subtitle]',overlay);if(s)s.textContent=subtitle||'Edit without leaving Studio';
  }

  function rememberNode(node){
    if(!node?.parentNode)return null;
    const marker=document.createComment('liw-studio-tool-return');
    node.parentNode.insertBefore(marker,node);
    const state={node,marker,hidden:node.hidden};
    node.hidden=false;
    node.classList.add('studio-tool-portaled');
    return state;
  }

  function restorePortal(){
    if(!portalState)return;
    const states=portalState.nodes||[];
    states.slice().reverse().forEach(state=>{
      if(!state?.node)return;
      state.node.classList.remove('studio-tool-portaled','studio-tool-business-host','studio-tool-social-panel');
      qa('.studio-tool-focus,.studio-tool-gallery-focus',state.node).forEach(el=>el.classList.remove('studio-tool-focus','studio-tool-gallery-focus'));
      if(state.marker?.parentNode){
        state.marker.parentNode.insertBefore(state.node,state.marker);
        state.marker.remove();
      }
      state.node.hidden=state.hidden;
    });
    portalState=null;
    const body=q('[data-studio-tool-body]',overlay);
    if(body)body.innerHTML='';
  }

  function openWithNodes(title,subtitle,nodes,{returnTo='tools'}={}){
    ensureOverlay();
    restorePortal();
    const body=q('[data-studio-tool-body]',overlay);
    const states=[];
    nodes.filter(Boolean).forEach(node=>{
      const state=rememberNode(node);
      if(state){states.push(state);body.appendChild(node);}
    });
    if(!states.length){
      try{window.toast?.('That Studio editor is still loading. Try again in a moment.');}catch(_){}
      return false;
    }
    portalState={nodes:states};
    returnView=returnTo;
    setHeader(title,subtitle);
    savedScroll=window.scrollY||0;
    document.body.classList.add('studio-quick-editor-open');
    overlay.hidden=false;
    body.scrollTop=0;
    if(window.lucide)try{lucide.createIcons();}catch(_){}
    return true;
  }

  function businessHostFor(kind){
    const host=q('#business-tools-content');
    if(!host)return null;
    qa('.studio-tool-focus,.studio-tool-gallery-focus',host).forEach(el=>el.classList.remove('studio-tool-focus','studio-tool-gallery-focus'));
    host.classList.add('studio-tool-business-host');
    let focus=null;
    if(kind==='booking')focus=q('[name="booking_enabled"]',host)?.closest('.tool-editor-card');
    if(kind==='services')focus=q('#service-list',host)?.closest('.tool-editor-card');
    if(kind==='gallery'){
      const builder=q('#rich-card-builder',host);
      const gallery=q('[data-rich-section="gallery"]',builder||host);
      if(builder&&gallery){focus=builder;gallery.classList.add('studio-tool-gallery-focus');gallery.open=true;}
    }
    focus?.classList.add('studio-tool-focus');
    return focus?host:null;
  }

  function openBusiness(kind){
    const m=meta();
    const host=businessHostFor(kind);
    if(!host){
      try{window.toast?.('That Studio tool is still loading.');}catch(_){}
      return;
    }
    const title=kind==='booking'?'Appointments':kind==='services'?m.service:m.portfolio;
    const subtitle=kind==='booking'?'Set up how clients book you':kind==='services'?'Edit services, pricing and details':'Add work samples your clients can see';
    openWithNodes(title,subtitle,[host],{returnTo:kind==='gallery'?'portfolio-part':'tools'});
  }

  function socialFocusNodes(panel){
    if(!panel)return;
    qa(':scope > *',panel).forEach(el=>el.classList.remove('studio-tool-focus'));
    const list=q('#social-list',panel);
    const quick=q('.social-quick-section',panel);
    const appearance=q('.social-appearance-details',panel);
    const add=q('#add-social',panel);
    [quick,appearance,list,add].filter(Boolean).forEach(el=>el.classList.add('studio-tool-focus'));
    if(add?.nextElementSibling?.classList.contains('input-help'))add.nextElementSibling.classList.add('studio-tool-focus');
    panel.classList.add('studio-tool-social-panel');
  }

  function openSocial(){
    const list=q('#social-list');
    const panel=list?.closest('.editor-panel');
    if(!panel){try{window.toast?.('Social editor is still loading.');}catch(_){}return;}
    socialFocusNodes(panel);
    openWithNodes('Social profiles','Add and style the profiles clients can follow',[panel]);
  }

  function showPortfolioHub(){
    ensureOverlay();
    restorePortal();
    const m=meta();
    setHeader(m.portfolio,'Choose what you want to edit');
    const body=q('[data-studio-tool-body]',overlay);
    body.innerHTML=`
      <div class="studio-portfolio-hub">
        <p class="studio-portfolio-intro">Keep your Studio visuals together. Choose an area below; Back returns to this menu, and Close returns to Client Tools.</p>
        <button type="button" class="studio-portfolio-choice" data-studio-portfolio-part="profile"><span class="studio-portfolio-choice__icon"><i data-lucide="circle-user-round"></i></span><span><strong>Profile photo</strong><small>Headshot, logo or business image and positioning</small></span><span>›</span></button>
        <button type="button" class="studio-portfolio-choice" data-studio-portfolio-part="cover"><span class="studio-portfolio-choice__icon"><i data-lucide="image"></i></span><span><strong>Cover / hero image</strong><small>The visual banner clients see first</small></span><span>›</span></button>
        <button type="button" class="studio-portfolio-choice" data-studio-portfolio-part="gallery"><span class="studio-portfolio-choice__icon"><i data-lucide="images"></i></span><span><strong>Portfolio gallery</strong><small>Upload work samples and captions</small></span><span>›</span></button>
      </div>`;
    returnView='tools';
    savedScroll=window.scrollY||savedScroll||0;
    document.body.classList.add('studio-quick-editor-open');
    overlay.hidden=false;
    body.scrollTop=0;
    if(window.lucide)try{lucide.createIcons();}catch(_){}
  }

  function openPortfolioPart(part){
    const m=meta();
    if(part==='gallery'){openBusiness('gallery');return;}
    let node=null,title='',subtitle='';
    if(part==='profile'){
      node=q('.photo-upload.profile-photo-editor');
      title='Profile photo';
      subtitle='Update the image and positioning clients see';
    }
    if(part==='cover'){
      node=q('#cover-image-section');
      title='Cover / hero image';
      subtitle='Set the visual banner for your Studio card';
    }
    if(!node){try{window.toast?.('That photo editor is still loading.');}catch(_){}return;}
    openWithNodes(title,subtitle,[node],{returnTo:'portfolio-part'});
  }

  function openTool(kind){
    if(kind==='booking'||kind==='services'){openBusiness(kind);return;}
    if(kind==='photos'){showPortfolioHub();return;}
    if(kind==='social'){openSocial();}
  }

  function closeOverlay(){
    if(!overlay)return;
    restorePortal();
    overlay.hidden=true;
    document.body.classList.remove('studio-quick-editor-open');
    returnView='tools';
    requestAnimationFrame(()=>window.scrollTo({top:savedScroll,behavior:'auto'}));
    setTimeout(updateStudioCopy,0);
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-barber-v5-jump]');
    if(!button||!studioActive())return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openTool(button.dataset.barberV5Jump);
  },true);

  document.addEventListener('change',event=>{
    if(event.target?.matches?.('[data-studio-primary],[data-studio-specialty],[name="color_mode"],[name="card_experience"]'))setTimeout(updateStudioCopy,0);
  },true);
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('[data-studio-business-type]'))setTimeout(updateStudioCopy,0);
  },true);
  window.addEventListener('liw:studio-editor-type-ready',updateStudioCopy,{passive:true});

  function start(){
    ensureStyles();
    updateStudioCopy();
    setTimeout(updateStudioCopy,120);
    setTimeout(updateStudioCopy,500);
    setTimeout(updateStudioCopy,1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.LIWStudioClientToolsV2={refresh:updateStudioCopy,open:openTool,close:closeOverlay};
})();