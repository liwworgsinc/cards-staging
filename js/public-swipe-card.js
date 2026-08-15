(function(){
  const STAGING_HOST='liwworgsinc.github.io';
  const RICH_LABELS={hours:'Hours',gallery:'Gallery',testimonials:'Reviews',faq:'FAQ',location:'Location',cta:'Actions',credentials:'Credentials',featured_links:'Links'};

  function getCardData(){
    try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}
  }

  function visible(element){
    if(!element||element.hidden)return false;
    if(element.id==='business-actions')return Boolean(element.innerHTML.trim());
    if(element.id==='public-rich-sections')return Boolean(element.innerHTML.trim());
    return true;
  }

  function shouldUseSwipe(cardData){
    const featureAccess=globalThis.publicCardFeatureAccess||{};
    const experience=String(cardData?.card_experience||'').toLowerCase();
    const legacySwipe=String(cardData?.card_layout||'').toLowerCase()==='swipe';
    return featureAccess.flow_experience===true&&(experience==='flow'||legacySwipe);
  }

  function makePanel(label,key,elements){
    const usable=(elements||[]).filter(Boolean).filter(element=>{
      if(element.id==='headline'||element.id==='bio')return Boolean(element.textContent.trim());
      return visible(element);
    });
    if(!usable.length)return null;
    const panel=document.createElement('section');
    panel.className=`swipe-panel swipe-${key}-panel`;
    panel.dataset.swipeLabel=label;
    panel.dataset.swipeKey=key;
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-label',label);
    panel.setAttribute('tabindex','-1');
    usable.forEach(element=>panel.appendChild(element));
    return panel;
  }

  function activateSwipe(allowWithoutRich=false){
    const cardData=getCardData();
    const card=document.getElementById('card');
    const content=card?.querySelector('.public-content');
    if(!cardData||!card||!content||card.hidden||card.dataset.swipeReady==='true'||!shouldUseSwipe(cardData))return false;
    if(!allowWithoutRich&&!document.getElementById('public-rich-sections'))return false;

    card.dataset.swipeReady='true';
    card.classList.add('swipe-card-active','public-layout-swipe');

    const name=document.getElementById('name');
    const title=document.getElementById('title');
    const company=document.getElementById('company');
    const headline=document.getElementById('headline');
    const bio=document.getElementById('bio');
    const aboutAnchor=document.getElementById('about-section');
    const actions=document.getElementById('actions');
    const save=document.getElementById('save');
    const businessActions=document.getElementById('business-actions');
    const branding=document.getElementById('branding');
    const topActions=card.querySelector('.public-top-actions');
    const leadSection=document.getElementById('lead-section');

    // Flow only: move Save beside Share + QR.
    if(save&&topActions){
      save.classList.add('flow-top-save');
      save.setAttribute('aria-label','Save to contacts');
      topActions.prepend(save);
    }

    // Flow only: keep the inquiry form, but remove the redundant CTA above it.
    // Classic cards are untouched because this runs only after Flow activates.
    if(businessActions){
      businessActions.querySelectorAll('[data-business-event="lead_form_open"],a[href="#lead-section"]').forEach(element=>element.remove());
    }

    const identity=document.createElement('div');
    identity.className='swipe-fixed-identity';
    [aboutAnchor,name,title,company].filter(Boolean).forEach(element=>identity.appendChild(element));

    const fixedActions=document.createElement('div');
    fixedActions.className='swipe-fixed-actions';
    [actions].filter(Boolean).forEach(element=>fixedActions.appendChild(element));

    const nav=document.createElement('div');
    nav.className='swipe-nav-shell';
    nav.innerHTML='<div class="swipe-section-tabs" role="tablist" aria-label="Card sections"></div><div class="swipe-progress" aria-hidden="true"></div>';

    const viewport=document.createElement('div');
    viewport.className='swipe-viewport';
    viewport.innerHTML='<button class="swipe-edge prev" type="button" aria-label="Previous section"><i data-lucide="chevron-left" size="18"></i></button><div class="swipe-track"></div><button class="swipe-edge next" type="button" aria-label="Next section"><i data-lucide="chevron-right" size="18"></i></button>';
    const track=viewport.querySelector('.swipe-track');

    const panels=[];
    const about=makePanel('About','about',[headline,bio]);
    if(about)panels.push(about);

    const orderedCore=[
      ['Services','services',document.getElementById('services-section')],
      ['Products','products',document.getElementById('products-section')],
      ['Video','video',document.getElementById('video-section')],
      ['Downloads','downloads',document.getElementById('downloads-section')],
      ['Connect','connect',document.getElementById('social-section')],
      ['Pay','payment',document.getElementById('payment-sharing-section')]
    ];
    orderedCore.forEach(([label,key,element])=>{const panel=makePanel(label,key,[element]);if(panel)panels.push(panel);});

    const rich=document.getElementById('public-rich-sections');
    if(rich){
      Array.from(rich.querySelectorAll(':scope > .public-rich-section')).forEach(section=>{
        const type=section.dataset.publicRich||'more';
        const label=RICH_LABELS[type]||section.querySelector('h2')?.textContent?.trim()||'More';
        const panel=makePanel(label,type,[section]);
        if(panel)panels.push(panel);
      });
      rich.remove();
    }

    const contact=makePanel('Contact','contact',[businessActions,leadSection]);
    if(contact)panels.push(contact);

    if(!panels.length){
      const fallback=document.createElement('section');
      fallback.className='swipe-panel swipe-about-panel';
      fallback.dataset.swipeLabel='About';
      fallback.dataset.swipeKey='about';
      fallback.setAttribute('tabindex','-1');
      fallback.innerHTML='<p class="public-bio">Use the contact actions above to connect.</p>';
      panels.push(fallback);
    }

    content.innerHTML='';
    content.append(identity,fixedActions,nav,viewport);
    panels.forEach(panel=>track.appendChild(panel));

    const footer=document.createElement('div');
    footer.className='swipe-card-footer';
    if(branding)footer.appendChild(branding);
    content.appendChild(footer);
    if(!branding||branding.hidden)footer.hidden=true;

    const tabs=nav.querySelector('.swipe-section-tabs');
    const progress=nav.querySelector('.swipe-progress');
    panels.forEach((panel,index)=>{
      const label=panel.dataset.swipeLabel||`Section ${index+1}`;
      const tab=document.createElement('button');
      tab.type='button';
      tab.className='swipe-section-tab';
      tab.setAttribute('role','tab');
      tab.setAttribute('aria-selected',index===0?'true':'false');
      tab.textContent=label;
      tab.addEventListener('click',()=>goTo(index,true));
      tabs.appendChild(tab);
      const dot=document.createElement('span');
      dot.className='swipe-progress-dot';
      progress.appendChild(dot);
    });

    const tabButtons=Array.from(tabs.children);
    const dots=Array.from(progress.children);
    const prev=viewport.querySelector('.swipe-edge.prev');
    const next=viewport.querySelector('.swipe-edge.next');
    let activeIndex=0;
    let raf=0;
    let resizeRaf=0;

    function setActive(index,trackEvent=false){
      activeIndex=Math.max(0,Math.min(panels.length-1,index));
      tabButtons.forEach((button,i)=>{
        const active=i===activeIndex;
        button.classList.toggle('active',active);
        button.setAttribute('aria-selected',active?'true':'false');
      });
      dots.forEach((dot,i)=>dot.classList.toggle('active',i===activeIndex));
      prev.disabled=activeIndex===0;
      next.disabled=activeIndex===panels.length-1;
      tabButtons[activeIndex]?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
      if(trackEvent&&typeof window.track==='function')window.track('swipe_section',panels[activeIndex]?.dataset.swipeKey||null,{label:panels[activeIndex]?.dataset.swipeLabel||''});
    }

    function goTo(index,trackEvent=false,behavior='smooth'){
      const target=Math.max(0,Math.min(panels.length-1,index));
      track.scrollTo({left:target*track.clientWidth,behavior});
      setActive(target,trackEvent);
    }

    track.addEventListener('scroll',()=>{
      viewport.classList.add('swipe-body-used');
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        if(!track.clientWidth)return;
        const index=Math.round(track.scrollLeft/track.clientWidth);
        if(index!==activeIndex)setActive(index,true);
      });
    },{passive:true});

    if(actions){
      actions.addEventListener('scroll',()=>fixedActions.classList.add('swipe-actions-used'),{passive:true});
      actions.addEventListener('pointerdown',()=>fixedActions.classList.add('swipe-actions-used'),{passive:true});
    }

    prev.addEventListener('click',()=>goTo(activeIndex-1,true));
    next.addEventListener('click',()=>goTo(activeIndex+1,true));

    card.addEventListener('keydown',event=>{
      if(event.target!==card)return;
      if(event.key==='ArrowLeft')goTo(activeIndex-1,true);
      if(event.key==='ArrowRight')goTo(activeIndex+1,true);
    });
    card.setAttribute('tabindex','0');

    window.addEventListener('resize',()=>{
      cancelAnimationFrame(resizeRaf);
      resizeRaf=requestAnimationFrame(()=>{
        if(!track.clientWidth)return;
        track.scrollTo({left:activeIndex*track.clientWidth,behavior:'auto'});
      });
    },{passive:true});

    setTimeout(()=>{
      fixedActions.classList.add('swipe-actions-used');
      viewport.classList.add('swipe-body-used');
    },5000);

    setActive(0,false);
    if(window.lucide)lucide.createIcons();
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    const ready=activateSwipe(attempts>24);
    if(ready||attempts>60)clearInterval(timer);
  },250);
})();
